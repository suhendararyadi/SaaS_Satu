import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import { z } from "zod";
import { ensureSchoolUser, requireSchoolAdmin, requireStudent } from "../school/authGuards";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { DAILY_ATTENDANCE_STATUSES, isValidDateOnly } from "../school/dailyAttendance";
import { getAttendanceStaffScope, isAttendanceAdmin, assertAttendanceStudentVisible } from "./access";
import { parseWorkingDays, resolveAttendanceDay } from "./policy";
import { attendanceLocalParts, isValidClockTime, lateMinutes, timeToMinutes } from "./time";
import {
  createAttendanceEventIdempotent,
  ensureOwnedAttendanceEvidence,
  evaluateSchoolGeofence,
  getAttendancePolicyOrDefault,
  getEffectiveAttendanceDay,
  reconcileStudentDay,
} from "./service";
import { reconcileAttendanceEvidence } from "./reconciliation";

const timeSchema = z.string().refine(isValidClockTime, "Format jam harus HH:mm.");
const dateOnlySchema = z.string().refine(isValidDateOnly, "Tanggal tidak valid.");
const attendanceStatusSchema = z.enum(DAILY_ATTENDANCE_STATUSES);
const calendarTypeSchema = z.enum(["SCHOOL_DAY", "HOLIDAY", "NATIONAL_HOLIDAY", "SEMESTER_BREAK", "SCHOOL_EVENT", "EXAM_DAY", "SPECIAL_SCHEDULE"]);

function schoolIdOf(user: User): string {
  if (!user.schoolId) throw new HttpError(403, "Akun belum terhubung dengan sekolah.");
  return user.schoolId;
}

async function requireAttendanceStaff(user: User, options: { duty?: boolean; viewAll?: boolean } = {}) {
  if (isAttendanceAdmin(user)) return getAttendanceStaffScope(user);
  if (user.role !== "TEACHER") throw new HttpError(403, "Fitur ini hanya tersedia untuk petugas sekolah.");
  const scope = await getAttendanceStaffScope(user);
  if (options.duty && !scope.canDuty) throw new HttpError(403, "Anda tidak terjadwal sebagai Guru Piket hari ini.");
  if (options.viewAll && !scope.canViewAll) throw new HttpError(403, "Akun Anda tidak memiliki cakupan monitoring seluruh sekolah.");
  if (!scope.canViewAll && !scope.homeroomClassIds.length && !scope.canDuty) throw new HttpError(403, "Akun Anda belum memiliki penugasan kehadiran aktif.");
  return scope;
}

const policySchema = z.object({
  timezone: z.string().trim().min(3).max(80).default("Asia/Jakarta"),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  radiusMeters: z.number().int().min(10).max(5000),
  maxGpsAccuracyMeters: z.number().int().min(5).max(500),
  checkInOpen: timeSchema,
  lateAfter: timeSchema,
  checkInClose: timeSchema,
  checkOutOpen: timeSchema,
  checkOutClose: timeSchema,
  allowStudentCheckIn: z.boolean(),
  allowStudentCheckOut: z.boolean(),
  requireCheckInSelfie: z.boolean(),
  requireCheckOutSelfie: z.boolean(),
  workingDays: z.string().trim().min(1).max(30),
  isActive: z.boolean(),
}).superRefine((value, ctx) => {
  const inOpen = timeToMinutes(value.checkInOpen)!;
  const late = timeToMinutes(value.lateAfter)!;
  const inClose = timeToMinutes(value.checkInClose)!;
  const outOpen = timeToMinutes(value.checkOutOpen)!;
  const outClose = timeToMinutes(value.checkOutClose)!;
  if (!(inOpen <= late && late <= inClose)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lateAfter"], message: "Urutan jam masuk tidak valid." });
  if (outOpen > outClose) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["checkOutOpen"], message: "Urutan jam pulang tidak valid." });
  if (!parseWorkingDays(value.workingDays).length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["workingDays"], message: "Minimal satu hari kerja harus dipilih." });
});

export const getAttendanceSettings = async (_args: unknown, context: { user?: User }) => {
  const user = requireSchoolAdmin(context);
  const schoolId = schoolIdOf(user);
  const [policy, calendarDays] = await Promise.all([
    getAttendancePolicyOrDefault(schoolId),
    prisma.schoolCalendarDay.findMany({ where: { schoolId }, orderBy: { dateOnly: "desc" }, take: 180 }),
  ]);
  return { policy, calendarDays };
};

export const saveAttendancePolicy = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireSchoolAdmin(context);
  const schoolId = schoolIdOf(user);
  const args = ensureArgsSchemaOrThrowHttpError(policySchema, rawArgs);
  return prisma.schoolAttendancePolicy.upsert({
    where: { schoolId },
    create: { schoolId, ...args },
    update: args,
  });
};

const calendarSchema = z.object({
  id: z.string().uuid().optional(),
  dateOnly: dateOnlySchema,
  type: calendarTypeSchema,
  label: z.string().trim().min(2).max(200),
  notes: z.string().trim().max(1000).optional().nullable(),
  checkInOpenOverride: timeSchema.optional().nullable(),
  lateAfterOverride: timeSchema.optional().nullable(),
  checkInCloseOverride: timeSchema.optional().nullable(),
  checkOutOpenOverride: timeSchema.optional().nullable(),
  checkOutCloseOverride: timeSchema.optional().nullable(),
});

export const saveAttendanceCalendarDay = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireSchoolAdmin(context);
  const schoolId = schoolIdOf(user);
  const args = ensureArgsSchemaOrThrowHttpError(calendarSchema, rawArgs);
  if (args.id) {
    const existing = await prisma.schoolCalendarDay.findFirst({ where: { id: args.id, schoolId }, select: { id: true } });
    if (!existing) throw new HttpError(404, "Tanggal kalender tidak ditemukan.");
    return prisma.schoolCalendarDay.update({ where: { id: existing.id }, data: { ...args, id: undefined } });
  }
  return prisma.schoolCalendarDay.upsert({
    where: { schoolId_dateOnly: { schoolId, dateOnly: args.dateOnly } },
    create: { schoolId, ...args },
    update: { ...args, id: undefined },
  });
};

export const deleteAttendanceCalendarDay = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireSchoolAdmin(context);
  const schoolId = schoolIdOf(user);
  const args = ensureArgsSchemaOrThrowHttpError(z.object({ id: z.string().uuid() }), rawArgs);
  const row = await prisma.schoolCalendarDay.findFirst({ where: { id: args.id, schoolId }, select: { id: true } });
  if (!row) throw new HttpError(404, "Tanggal kalender tidak ditemukan.");
  await prisma.schoolCalendarDay.delete({ where: { id: row.id } });
  return { ok: true };
};

export const getMyAttendance = async (_args: unknown, context: { user?: User }) => {
  const student = requireStudent(context);
  if (student.role !== "STUDENT") throw new HttpError(403, "Halaman ini khusus peserta didik.");
  const schoolId = schoolIdOf(student);
  const { policy, calendarDay, day } = await getEffectiveAttendanceDay(schoolId);
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 62);
  const startKey = attendanceLocalParts(start, policy.timezone).dateOnly;
  const [studentSummary, events, today, history, pendingPermits] = await Promise.all([
    prisma.user.findFirst({
      where: { id: student.id, schoolId, role: "STUDENT" },
      select: {
        name: true, email: true, username: true,
        classRoom: { select: { name: true } },
        school: { select: { name: true } },
      },
    }),
    prisma.studentAttendanceEvent.findMany({ where: { schoolId, studentId: student.id, dateOnly: day.dateOnly }, orderBy: { occurredAt: "asc" } }),
    prisma.schoolDailyAttendance.findUnique({ where: { schoolId_studentId_dateOnly: { schoolId, studentId: student.id, dateOnly: day.dateOnly } } }),
    prisma.schoolDailyAttendance.findMany({ where: { schoolId, studentId: student.id, dateOnly: { gte: startKey } }, orderBy: { dateOnly: "desc" }, take: 90 }),
    prisma.studentPermit.findMany({ where: { schoolId, studentId: student.id, status: { in: ["REQUESTED", "APPROVED"] } }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  return {
    serverNow: new Date(),
    student: {
      displayName: studentSummary?.name || studentSummary?.username || studentSummary?.email || "Peserta didik",
      className: studentSummary?.classRoom?.name || null,
    },
    school: { name: studentSummary?.school?.name || "Sekolah" },
    policy: { ...policy, latitude: policy.latitude, longitude: policy.longitude },
    calendarDay,
    day,
    events: events.map((event) => ({ ...event, evidenceUrl: event.evidenceKey ? `/operations/attendance-evidence-file/${event.id}` : null, evidenceKey: undefined })),
    today,
    history,
    pendingPermits,
  };
};

const selfAttendanceSchema = z.object({
  type: z.enum(["CHECK_IN", "CHECK_OUT"]),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(5000),
  evidenceKey: z.string().max(1000).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const recordSelfAttendance = async (rawArgs: unknown, context: { user?: User }) => {
  const student = requireStudent(context);
  if (student.role !== "STUDENT") throw new HttpError(403, "Presensi mandiri hanya tersedia untuk peserta didik.");
  const schoolId = schoolIdOf(student);
  const args = ensureArgsSchemaOrThrowHttpError(selfAttendanceSchema, rawArgs);
  if (!student.classRoomId) throw new HttpError(400, "Akun siswa belum terhubung dengan rombel.");
  const activeClass = await prisma.classRoom.findFirst({ where: { id: student.classRoomId, schoolId, academicYear: { isActive: true } }, select: { id: true } });
  if (!activeClass) throw new HttpError(400, "Rombel siswa bukan bagian dari tahun ajaran aktif.");

  const now = new Date();
  const { policy, day } = await getEffectiveAttendanceDay(schoolId, now);
  if (!policy.isActive) throw new HttpError(400, "Presensi mandiri belum diaktifkan oleh sekolah.");
  if (!day.isSchoolDay) throw new HttpError(400, `Presensi terkunci: ${day.dayLabel}.`);
  if (args.type === "CHECK_IN" && !policy.allowStudentCheckIn) throw new HttpError(403, "Check-in mandiri dinonaktifkan oleh sekolah.");
  if (args.type === "CHECK_OUT" && !policy.allowStudentCheckOut) throw new HttpError(403, "Check-out mandiri dinonaktifkan oleh sekolah.");

  const sourceKey = `self:${student.id}:${day.dateOnly}:${args.type}`;
  const existing = await prisma.studentAttendanceEvent.findUnique({ where: { schoolId_sourceKey: { schoolId, sourceKey } } });
  if (existing) {
    const reconciled = await reconcileStudentDay(schoolId, student.id, day.dateOnly, student.id);
    return { ok: true, alreadyRecorded: true, event: existing, daily: reconciled.record };
  }

  const localMinute = timeToMinutes(day.localTime)!;
  const open = timeToMinutes(args.type === "CHECK_IN" ? day.schedule.checkInOpen : day.schedule.checkOutOpen)!;
  const close = timeToMinutes(args.type === "CHECK_IN" ? day.schedule.checkInClose : day.schedule.checkOutClose)!;
  if (localMinute < open || localMinute > close) {
    throw new HttpError(400, args.type === "CHECK_IN"
      ? `Check-in tersedia ${day.schedule.checkInOpen}–${day.schedule.checkInClose} WIB.`
      : `Check-out tersedia ${day.schedule.checkOutOpen}–${day.schedule.checkOutClose} WIB.`);
  }
  if (args.type === "CHECK_OUT") {
    const checkIn = await prisma.studentAttendanceEvent.findUnique({ where: { schoolId_sourceKey: { schoolId, sourceKey: `self:${student.id}:${day.dateOnly}:CHECK_IN` } } });
    if (!checkIn) throw new HttpError(400, "Check-out hanya tersedia setelah check-in tercatat.");
  }

  const geo = evaluateSchoolGeofence({ latitude: args.latitude, longitude: args.longitude, accuracy: args.accuracy, policy });
  if (!geo.isWithin) throw new HttpError(400, `Anda berada sekitar ${geo.distanceMeters} m dari titik sekolah, di luar radius ${policy.radiusMeters} m.`);
  const selfieRequired = args.type === "CHECK_IN" ? policy.requireCheckInSelfie : policy.requireCheckOutSelfie;
  const evidenceKey = await ensureOwnedAttendanceEvidence(student.id, args.evidenceKey);
  if (selfieRequired && !evidenceKey) throw new HttpError(400, "Selfie langsung wajib diambil sebelum presensi.");

  const minutesLate = args.type === "CHECK_IN" ? lateMinutes(day.localTime, day.schedule.lateAfter) : 0;
  const status = args.type === "CHECK_IN" && minutesLate > 0 ? "TERLAMBAT" : "HADIR";
  const { event } = await createAttendanceEventIdempotent({
    schoolId, studentId: student.id, dateOnly: day.dateOnly,
    type: args.type === "CHECK_IN" ? "SELF_CHECK_IN" : "SELF_CHECK_OUT",
    status, source: "STUDENT_SELF", sourceKey, actorId: student.id, occurredAt: now,
    latitude: args.latitude, longitude: args.longitude, gpsAccuracy: args.accuracy,
    distanceMeters: geo.distanceMeters, geofenceStatus: geo.geofenceStatus,
    evidenceKey, notes: args.notes, metadata: { localTime: day.localTime, lateMinutes: minutesLate, radiusMeters: policy.radiusMeters },
  });
  const reconciled = await reconcileStudentDay(schoolId, student.id, day.dateOnly, student.id);
  return { ok: true, alreadyRecorded: false, event, daily: reconciled.record, suggestion: reconciled.suggestion };
};

const permitRequestSchema = z.object({
  type: z.enum(["SICK", "EXIT", "DISPENSATION", "ACTIVITY", "OTHER"]),
  reason: z.string().trim().min(5).max(2000),
  destination: z.string().trim().max(500).optional().nullable(),
  startAt: z.string(),
  endAt: z.string().optional().nullable(),
});

export const submitAttendancePermitRequest = async (rawArgs: unknown, context: { user?: User }) => {
  const student = requireStudent(context);
  if (student.role !== "STUDENT") throw new HttpError(403, "Pengajuan ini khusus peserta didik.");
  const schoolId = schoolIdOf(student);
  const args = ensureArgsSchemaOrThrowHttpError(permitRequestSchema, rawArgs);
  const startAt = new Date(args.startAt);
  const endAt = args.endAt ? new Date(args.endAt) : null;
  if (Number.isNaN(startAt.valueOf()) || (endAt && Number.isNaN(endAt.valueOf()))) throw new HttpError(400, "Tanggal izin tidak valid.");
  if (endAt && endAt < startAt) throw new HttpError(400, "Waktu selesai tidak boleh sebelum waktu mulai.");
  const permit = await prisma.studentPermit.create({
    data: { schoolId, studentId: student.id, type: args.type as any, reason: args.reason, destination: args.destination || null, startAt, endAt, status: "REQUESTED", recordedById: student.id },
  });
  const dateOnly = attendanceLocalParts(startAt).dateOnly;
  await createAttendanceEventIdempotent({
    schoolId, studentId: student.id, dateOnly, type: "PERMIT_STATUS", status: "REQUESTED", source: "STUDENT_PERMIT",
    sourceKey: `permit:${permit.id}:REQUESTED`, actorId: student.id, occurredAt: new Date(), notes: args.reason,
    metadata: { permitId: permit.id, permitType: permit.type },
  });
  return permit;
};

const commandSchema = z.object({ dateOnly: dateOnlySchema.optional() }).optional();
export const getAttendanceCommandCenter = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const scope = await requireAttendanceStaff(user as any);
  const schoolId = schoolIdOf(user as any);
  const args = ensureArgsSchemaOrThrowHttpError(commandSchema || z.any(), rawArgs || {});
  const policy = await getAttendancePolicyOrDefault(schoolId);
  const dateOnly = args?.dateOnly || attendanceLocalParts(new Date(), policy.timezone).dateOnly;
  const classes = await prisma.classRoom.findMany({
    where: { schoolId, academicYear: { isActive: true }, ...(!scope.canViewAll ? { id: { in: scope.homeroomClassIds } } : {}) },
    select: { id: true, name: true, gradeLevel: true, department: { select: { code: true, name: true } }, students: { where: { schoolId, role: "STUDENT" }, select: { id: true } } },
    orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
  });
  const classIds = classes.map((row) => row.id);
  const studentIds = classes.flatMap((row) => row.students.map((student) => student.id));
  const [daily, events] = await Promise.all([
    prisma.schoolDailyAttendance.findMany({ where: { schoolId, classRoomId: { in: classIds }, dateOnly } }),
    prisma.studentAttendanceEvent.findMany({ where: { schoolId, studentId: { in: studentIds }, dateOnly }, select: { studentId: true, type: true, status: true } }),
  ]);
  const statusCount = (status: string) => daily.filter((row) => row.status === status).length;
  const byClass = classes.map((classRoom) => {
    const rows = daily.filter((row) => row.classRoomId === classRoom.id);
    const present = rows.filter((row) => row.status === "HADIR" || row.status === "TERLAMBAT").length;
    return {
      id: classRoom.id, name: classRoom.name, gradeLevel: classRoom.gradeLevel, department: classRoom.department,
      studentCount: classRoom.students.length, recordedCount: rows.length,
      hadir: rows.filter((row) => row.status === "HADIR").length,
      terlambat: rows.filter((row) => row.status === "TERLAMBAT").length,
      sakit: rows.filter((row) => row.status === "SAKIT").length,
      izin: rows.filter((row) => row.status === "IZIN").length,
      alpa: rows.filter((row) => row.status === "ALPA").length,
      needsReview: rows.filter((row) => row.reconciliationStatus === "NEEDS_REVIEW").length,
      rate: rows.length ? Math.round((present / rows.length) * 100) : null,
    };
  });
  const summarizeGroups = (groups: Array<{ key: string; label: string; classIds: string[] }>) => groups.map((group) => {
    const rows = daily.filter((row) => group.classIds.includes(row.classRoomId));
    const members = classes.filter((room) => group.classIds.includes(room.id)).reduce((sum, room) => sum + room.students.length, 0);
    const present = rows.filter((row) => row.status === "HADIR" || row.status === "TERLAMBAT").length;
    return { key: group.key, label: group.label, studentCount: members, recordedCount: rows.length, rate: rows.length ? Math.round((present / rows.length) * 100) : null };
  });
  const gradeGroups = [...new Set(classes.map((room) => room.gradeLevel))].sort((a,b)=>a-b).map((grade) => ({ key: String(grade), label: `Tingkat ${grade}`, classIds: classes.filter((room) => room.gradeLevel === grade).map((room) => room.id) }));
  const departmentKeys = [...new Set(classes.map((room) => room.department?.code || room.department?.name || "UMUM"))];
  const departmentGroups = departmentKeys.map((key) => ({ key, label: key, classIds: classes.filter((room) => (room.department?.code || room.department?.name || "UMUM") === key).map((room) => room.id) }));
  return {
    dateOnly, totalStudents: studentIds.length, recordedCount: daily.length,
    hadir: statusCount("HADIR"), terlambat: statusCount("TERLAMBAT"), sakit: statusCount("SAKIT"), izin: statusCount("IZIN"), alpa: statusCount("ALPA"),
    needsReview: daily.filter((row) => row.reconciliationStatus === "NEEDS_REVIEW").length,
    checkedIn: new Set(events.filter((event) => event.type === "SELF_CHECK_IN").map((event) => event.studentId)).size,
    checkedOut: new Set(events.filter((event) => event.type === "SELF_CHECK_OUT").map((event) => event.studentId)).size,
    earlyLeave: new Set(events.filter((event) => event.type === "DUTY_EARLY_LEAVE").map((event) => event.studentId)).size,
    byClass, byGrade: summarizeGroups(gradeGroups), byDepartment: summarizeGroups(departmentGroups),
    access: scope,
  };
};

const workspaceSchema = z.object({
  classRoomId: z.string().uuid().optional(),
  dateOnly: dateOnlySchema.optional(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
}).optional();

export const getAttendanceReconciliationWorkspace = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const scope = await requireAttendanceStaff(user as any);
  const schoolId = schoolIdOf(user as any);
  const args = ensureArgsSchemaOrThrowHttpError(workspaceSchema || z.any(), rawArgs || {});
  const policy = await getAttendancePolicyOrDefault(schoolId);
  const today = attendanceLocalParts(new Date(), policy.timezone).dateOnly;
  const dateOnly = args?.dateOnly || today;
  const [todayYear, todayMonth] = today.split("-").map(Number);
  const year = args?.year || todayYear;
  const month = args?.month || todayMonth;
  const classes = await prisma.classRoom.findMany({
    where: { schoolId, academicYear: { isActive: true }, ...(!scope.canViewAll ? { id: { in: scope.homeroomClassIds } } : {}) },
    select: { id: true, name: true, gradeLevel: true, homeroomTeacherId: true, students: { where: { schoolId, role: "STUDENT" }, select: { id: true, name: true, studentProfile: { select: { nis: true, nisn: true, gender: true } } }, orderBy: { name: "asc" } } },
    orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
  });
  if (args?.classRoomId && !classes.some((row) => row.id === args.classRoomId)) throw new HttpError(403, "Rombel berada di luar cakupan akses Anda.");
  const selectedClass = classes.find((row) => row.id === args?.classRoomId) || classes[0] || null;
  if (!selectedClass) return { classes, selectedClass: null, dateOnly, rows: [], monthly: { year, month, days: [], students: [] }, access: scope };
  const ids = selectedClass.students.map((student) => student.id);
  const periodStart = `${year}-${String(month).padStart(2,"0")}-01`;
  const next = new Date(Date.UTC(year, month, 1));
  const periodEnd = `${next.getUTCFullYear()}-${String(next.getUTCMonth()+1).padStart(2,"0")}-01`;
  const [events, daily, monthlyRecords] = await Promise.all([
    prisma.studentAttendanceEvent.findMany({ where: { schoolId, studentId: { in: ids }, dateOnly }, orderBy: { occurredAt: "asc" } }),
    prisma.schoolDailyAttendance.findMany({ where: { schoolId, classRoomId: selectedClass.id, dateOnly } }),
    prisma.schoolDailyAttendance.findMany({ where: { schoolId, classRoomId: selectedClass.id, dateOnly: { gte: periodStart, lt: periodEnd } }, orderBy: { dateOnly: "asc" } }),
  ]);
  const rows = selectedClass.students.map((student) => {
    const studentEvents = events.filter((event) => event.studentId === student.id);
    const record = daily.find((row) => row.studentId === student.id) || null;
    const suggestion = reconcileAttendanceEvidence(studentEvents);
    return {
      ...student,
      record,
      suggestion,
      eventCount: studentEvents.length,
      evidence: studentEvents.map((event) => ({ id: event.id, type: event.type, status: event.status, source: event.source, occurredAt: event.occurredAt, notes: event.notes, evidenceUrl: event.evidenceKey ? `/operations/attendance-evidence-file/${event.id}` : null })),
      needsReview: record?.reconciliationStatus === "NEEDS_REVIEW" || (!record && suggestion.reconciliationStatus === "NEEDS_REVIEW"),
    };
  });
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthlyStudents = selectedClass.students.map((student) => {
    const records = monthlyRecords.filter((row) => row.studentId === student.id);
    const counts = { HADIR: 0, TERLAMBAT: 0, SAKIT: 0, IZIN: 0, ALPA: 0 } as Record<string, number>;
    for (const record of records) if (counts[record.status] !== undefined) counts[record.status] += 1;
    const present = counts.HADIR + counts.TERLAMBAT;
    return {
      ...student,
      statuses: Object.fromEntries(records.map((record) => [Number(record.dateOnly.slice(-2)), record.status])),
      counts,
      rate: records.length ? Math.round((present / records.length) * 100) : null,
    };
  });
  return { classes, selectedClass: { ...selectedClass, students: undefined }, dateOnly, rows, monthly: { year, month, days, students: monthlyStudents }, access: scope };
};

const verifySchema = z.object({
  studentId: z.string().uuid(),
  dateOnly: dateOnlySchema,
  status: attendanceStatusSchema,
  notes: z.string().trim().max(1000).optional().nullable(),
  expectedUpdatedAt: z.string().optional().nullable(),
});

export const verifyAttendanceRecord = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const schoolId = schoolIdOf(user as any);
  const args = ensureArgsSchemaOrThrowHttpError(verifySchema, rawArgs);
  const student = await assertAttendanceStudentVisible(user as any, args.studentId);
  const scope = await getAttendanceStaffScope(user as any);
  if (!isAttendanceAdmin(user as any) && !scope.canVerifyAll && (!student.classRoomId || !scope.homeroomClassIds.includes(student.classRoomId))) {
    throw new HttpError(403, "Verifikasi akhir hanya dapat dilakukan wali kelas atau pejabat sekolah yang berwenang.");
  }
  if (!student.classRoom?.academicYear?.isActive || !student.classRoomId) throw new HttpError(400, "Siswa tidak berada pada rombel aktif.");
  const existing = await prisma.schoolDailyAttendance.findUnique({ where: { schoolId_studentId_dateOnly: { schoolId, studentId: student.id, dateOnly: args.dateOnly } } });
  if (args.expectedUpdatedAt && existing && existing.updatedAt.toISOString() !== args.expectedUpdatedAt) throw new HttpError(409, "Presensi telah berubah. Muat ulang sebelum memverifikasi.");
  const now = new Date();
  const sourceKey = `verify:${student.id}:${args.dateOnly}:${args.status}:${args.expectedUpdatedAt || "new"}`;
  return prisma.$transaction(async (tx) => {
    const record = await tx.schoolDailyAttendance.upsert({
      where: { schoolId_studentId_dateOnly: { schoolId, studentId: student.id, dateOnly: args.dateOnly } },
      create: {
        schoolId, academicYearId: student.classRoom!.academicYearId, classRoomId: student.classRoomId!, studentId: student.id,
        dateOnly: args.dateOnly, status: args.status, notes: args.notes || null, recordedById: user.id,
        reconciliationStatus: "VERIFIED", verifiedById: user.id, verifiedAt: now,
      },
      update: { status: args.status, notes: args.notes || null, reconciliationStatus: "VERIFIED", verifiedById: user.id, verifiedAt: now, recordedById: user.id, recordedAt: now },
    });
    await createAttendanceEventIdempotent({
      schoolId, studentId: student.id, dateOnly: args.dateOnly, type: "HOMEROOM_OVERRIDE", status: args.status,
      source: "HOMEROOM_VERIFY", sourceKey, actorId: user.id, occurredAt: now, notes: args.notes,
      metadata: { previousStatus: existing?.status || null, dailyAttendanceId: record.id },
    }, tx);
    return record;
  });
};

const reconcileClassSchema = z.object({ classRoomId: z.string().uuid(), dateOnly: dateOnlySchema });
export const reconcileAttendanceClass = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const schoolId = schoolIdOf(user as any);
  const args = ensureArgsSchemaOrThrowHttpError(reconcileClassSchema, rawArgs);
  const scope = await getAttendanceStaffScope(user as any);
  if (!scope.canViewAll && !scope.homeroomClassIds.includes(args.classRoomId)) throw new HttpError(403, "Rombel berada di luar cakupan rekonsiliasi Anda.");
  const students = await prisma.user.findMany({ where: { schoolId, classRoomId: args.classRoomId, role: "STUDENT", classRoom: { academicYear: { isActive: true } } }, select: { id: true } });
  const results: Awaited<ReturnType<typeof reconcileStudentDay>>[] = [];
  for (const student of students) results.push(await reconcileStudentDay(schoolId, student.id, args.dateOnly, user.id));
  return { ok: true, count: results.length, updated: results.filter((row) => !!row.record && !row.humanProtected).length, humanProtected: results.filter((row) => row.humanProtected).length };
};

const dutyEventSchema = z.object({
  studentId: z.string().uuid(),
  type: z.enum(["LATE", "EARLY_LEAVE", "DISPENSATION"]),
  reason: z.string().trim().min(3).max(1000),
  actionNote: z.string().trim().max(1000).optional().nullable(),
  destination: z.string().trim().max(500).optional().nullable(),
  guardianName: z.string().trim().max(200).optional().nullable(),
});

export const getDutyAttendanceConsole = async (_args: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const scope = await requireAttendanceStaff(user as any, { duty: !isAttendanceAdmin(user as any) });
  const schoolId = schoolIdOf(user as any);
  const policy = await getAttendancePolicyOrDefault(schoolId);
  const dateOnly = attendanceLocalParts(new Date(), policy.timezone).dateOnly;
  const students = await prisma.user.findMany({
    where: { schoolId, role: "STUDENT", classRoom: { academicYear: { isActive: true } } },
    select: { id: true, name: true, classRoomId: true, classRoom: { select: { name: true } }, studentProfile: { select: { nis: true, nisn: true } } },
    orderBy: [{ classRoom: { name: "asc" } }, { name: "asc" }], take: 5000,
  });
  const [events, daily] = await Promise.all([
    prisma.studentAttendanceEvent.findMany({ where: { schoolId, dateOnly, type: { in: ["SELF_CHECK_IN", "DUTY_LATE", "DUTY_EARLY_LEAVE", "DUTY_DISPENSATION"] } }, orderBy: { occurredAt: "desc" }, take: 5000 }),
    prisma.schoolDailyAttendance.findMany({ where: { schoolId, dateOnly } }),
  ]);
  return { dateOnly, students, events, daily, access: scope };
};

export const recordDutyAttendanceEvent = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  await requireAttendanceStaff(user as any, { duty: !isAttendanceAdmin(user as any) });
  const schoolId = schoolIdOf(user as any);
  const args = ensureArgsSchemaOrThrowHttpError(dutyEventSchema, rawArgs);
  const student = await prisma.user.findFirst({ where: { id: args.studentId, schoolId, role: "STUDENT", classRoom: { academicYear: { isActive: true } } }, select: { id: true, name: true, classRoom: { select: { name: true } } } });
  if (!student) throw new HttpError(404, "Siswa tidak ditemukan pada tahun ajaran aktif.");
  const now = new Date();
  const { policy, day } = await getEffectiveAttendanceDay(schoolId, now);
  const eventType = args.type === "LATE" ? "DUTY_LATE" : args.type === "EARLY_LEAVE" ? "DUTY_EARLY_LEAVE" : "DUTY_DISPENSATION";
  const status = args.type === "LATE" ? "TERLAMBAT" : "IZIN";
  const sourceKey = `duty:${eventType}:${student.id}:${day.dateOnly}`;
  const existing = await prisma.studentAttendanceEvent.findUnique({ where: { schoolId_sourceKey: { schoolId, sourceKey } } });
  if (existing) return { ok: true, alreadyRecorded: true, event: existing };
  const minutesLate = args.type === "LATE" ? lateMinutes(day.localTime, day.schedule.lateAfter) : 0;
  let permitId: string | null = null;
  const event = await prisma.$transaction(async (tx) => {
    if (args.type !== "LATE") {
      const permit = await tx.studentPermit.create({
        data: {
          schoolId, studentId: student.id, type: args.type === "EARLY_LEAVE" ? "EXIT" : "DISPENSATION", reason: args.reason,
          destination: args.destination || null, startAt: now, status: "APPROVED", recordedById: user.id, approvedById: user.id,
          approvalNote: args.actionNote || `Dicatat Guru Piket${args.guardianName ? ` · Penjemput: ${args.guardianName}` : ""}`,
        },
      });
      permitId = permit.id;
    }
    const created = await createAttendanceEventIdempotent({
      schoolId, studentId: student.id, dateOnly: day.dateOnly, type: eventType, status, source: "DUTY_TEACHER", sourceKey,
      actorId: user.id, occurredAt: now, notes: args.reason,
      metadata: { lateMinutes: minutesLate, actionNote: args.actionNote || null, destination: args.destination || null, guardianName: args.guardianName || null, permitId },
    }, tx);
    return created.event;
  });
  const reconciled = await reconcileStudentDay(schoolId, student.id, day.dateOnly, user.id);
  return {
    ok: true, alreadyRecorded: false, event, daily: reconciled.record,
    pass: args.type === "LATE" ? { studentName: student.name, className: student.classRoom?.name || "-", recordedAt: now, lateMinutes: minutesLate, verifiedBy: user.name || "Guru Piket" } : null,
  };
};

const activityCreateSchema = z.object({
  dateOnly: dateOnlySchema,
  code: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(2).max(200),
  category: z.string().trim().min(2).max(100),
  startTime: timeSchema.optional().nullable(),
  endTime: timeSchema.optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const getAttendanceActivities = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const scope = await requireAttendanceStaff(user as any);
  const schoolId = schoolIdOf(user as any);
  const args = ensureArgsSchemaOrThrowHttpError(z.object({ dateOnly: dateOnlySchema.optional() }).optional() || z.any(), rawArgs || {});
  const [activities, classes] = await Promise.all([
    prisma.attendanceActivity.findMany({
      where: { schoolId, ...(args?.dateOnly ? { dateOnly: args.dateOnly } : {}) },
      include: { createdBy: { select: { id: true, name: true } }, records: { select: { studentId: true, status: true, notes: true } }, _count: { select: { records: true } } },
      orderBy: [{ dateOnly: "desc" }, { startTime: "asc" }], take: 100,
    }),
    prisma.classRoom.findMany({
      where: { schoolId, academicYear: { isActive: true }, ...(!scope.canViewAll ? { id: { in: scope.homeroomClassIds } } : {}) },
      select: { id: true, name: true, students: { where: { schoolId, role: "STUDENT" }, select: { id: true, name: true, studentProfile: { select: { nis: true } } }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);
  return { activities, classes, access: scope };
};

export const createAttendanceActivity = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const scope = await requireAttendanceStaff(user as any);
  if (!isAttendanceAdmin(user as any) && !scope.canViewAll && !scope.canDuty) throw new HttpError(403, "Penugasan Anda tidak dapat membuat kegiatan pembiasaan sekolah.");
  const schoolId = schoolIdOf(user as any);
  const args = ensureArgsSchemaOrThrowHttpError(activityCreateSchema, rawArgs);
  const academicYear = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true }, select: { id: true } });
  return prisma.attendanceActivity.upsert({
    where: { schoolId_dateOnly_code: { schoolId, dateOnly: args.dateOnly, code: args.code.toUpperCase() } },
    create: { schoolId, academicYearId: academicYear?.id || null, dateOnly: args.dateOnly, code: args.code.toUpperCase(), name: args.name, category: args.category, startTime: args.startTime || null, endTime: args.endTime || null, notes: args.notes || null, createdById: user.id },
    update: { name: args.name, category: args.category, startTime: args.startTime || null, endTime: args.endTime || null, notes: args.notes || null },
  });
};

const activityRecordSchema = z.object({
  activityId: z.string().uuid(),
  records: z.array(z.object({ studentId: z.string().uuid(), status: z.enum(["HADIR", "TIDAK_HADIR", "TERLAMBAT", "DISPENSASI"]), notes: z.string().trim().max(500).optional().nullable() })).min(1),
});
export const recordAttendanceActivity = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const scope = await requireAttendanceStaff(user as any);
  const schoolId = schoolIdOf(user as any);
  const args = ensureArgsSchemaOrThrowHttpError(activityRecordSchema, rawArgs);
  const activity = await prisma.attendanceActivity.findFirst({ where: { id: args.activityId, schoolId, status: { in: ["OPEN", "DRAFT"] } } });
  if (!activity) throw new HttpError(404, "Kegiatan pembiasaan aktif tidak ditemukan.");
  const ids = [...new Set(args.records.map((row) => row.studentId))];
  if (ids.length !== args.records.length) throw new HttpError(400, "Siswa tidak boleh dicatat dua kali pada kegiatan yang sama.");
  const students = await prisma.user.findMany({ where: { id: { in: ids }, schoolId, role: "STUDENT", classRoom: { academicYear: { isActive: true } } }, select: { id: true, classRoomId: true } });
  if (students.length !== ids.length) throw new HttpError(400, "Daftar kegiatan berisi siswa yang tidak valid.");
  if (!scope.canViewAll) {
    const outside = students.some((student) => !student.classRoomId || !scope.homeroomClassIds.includes(student.classRoomId));
    if (outside) throw new HttpError(403, "Ada siswa di luar cakupan rombel Anda.");
  }
  await prisma.$transaction(async (tx) => {
    for (const row of args.records) {
      await tx.attendanceActivityRecord.upsert({
        where: { activityId_studentId: { activityId: activity.id, studentId: row.studentId } },
        create: { activityId: activity.id, studentId: row.studentId, status: row.status, notes: row.notes || null, recordedById: user.id },
        update: { status: row.status, notes: row.notes || null, recordedById: user.id, recordedAt: new Date() },
      });
      await createAttendanceEventIdempotent({
        schoolId, studentId: row.studentId, dateOnly: activity.dateOnly, type: "HABIT_ATTENDANCE", status: row.status,
        source: "HABITUATION", sourceKey: `activity:${activity.id}:${row.studentId}`, actorId: user.id, notes: row.notes,
        metadata: { activityId: activity.id, activityCode: activity.code, activityName: activity.name },
      }, tx);
    }
  });
  return { ok: true, count: args.records.length };
};

export const closeAttendanceActivity = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const scope = await requireAttendanceStaff(user as any);
  const schoolId = schoolIdOf(user as any);
  const args = ensureArgsSchemaOrThrowHttpError(z.object({ id: z.string().uuid() }), rawArgs);
  const activity = await prisma.attendanceActivity.findFirst({ where: { id: args.id, schoolId }, select: { id: true, createdById: true } });
  if (!activity) throw new HttpError(404, "Kegiatan tidak ditemukan.");
  if (!isAttendanceAdmin(user as any) && !scope.canViewAll && activity.createdById !== user.id) throw new HttpError(403, "Anda tidak dapat menutup kegiatan ini.");
  return prisma.attendanceActivity.update({ where: { id: activity.id }, data: { status: "CLOSED" } });
};

const auditSchema = z.object({ dateOnly: dateOnlySchema.optional(), studentId: z.string().uuid().optional(), classRoomId: z.string().uuid().optional() }).optional();
export const getAttendanceAudit = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const scope = await requireAttendanceStaff(user as any);
  const schoolId = schoolIdOf(user as any);
  const args = ensureArgsSchemaOrThrowHttpError(auditSchema || z.any(), rawArgs || {});
  let studentIds: string[] | undefined;
  if (!scope.canViewAll) {
    const students = await prisma.user.findMany({ where: { schoolId, role: "STUDENT", classRoomId: { in: scope.homeroomClassIds } }, select: { id: true } });
    studentIds = students.map((row) => row.id);
  }
  if (args?.studentId) {
    await assertAttendanceStudentVisible(user as any, args.studentId);
    studentIds = [args.studentId];
  }
  if (args?.classRoomId) {
    if (!scope.canViewAll && !scope.homeroomClassIds.includes(args.classRoomId)) throw new HttpError(403, "Rombel berada di luar cakupan audit Anda.");
    const students = await prisma.user.findMany({ where: { schoolId, role: "STUDENT", classRoomId: args.classRoomId }, select: { id: true } });
    studentIds = students.map((row) => row.id);
  }
  return prisma.studentAttendanceEvent.findMany({
    where: { schoolId, ...(args?.dateOnly ? { dateOnly: args.dateOnly } : {}), ...(studentIds ? { studentId: { in: studentIds } } : {}) },
    include: { student: { select: { id: true, name: true, classRoom: { select: { name: true } } } }, actor: { select: { id: true, name: true } } },
    orderBy: { occurredAt: "desc" }, take: 300,
  });
};
