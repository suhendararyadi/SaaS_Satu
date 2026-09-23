import { HttpError, prisma } from "wasp/server";
import { isWithinGeofence } from "../shared/geofence";
import { attendanceEvidenceExists, parseAttendanceEvidenceKey } from "./evidenceStorage";
import { resolveAttendanceDay } from "./policy";
import { reconcileAttendanceEvidence } from "./reconciliation";

export const DEFAULT_ATTENDANCE_POLICY = {
  timezone: "Asia/Jakarta",
  latitude: null as number | null,
  longitude: null as number | null,
  radiusMeters: 100,
  maxGpsAccuracyMeters: 50,
  checkInOpen: "05:30",
  lateAfter: "07:00",
  checkInClose: "09:00",
  checkOutOpen: "14:00",
  checkOutClose: "18:00",
  allowStudentCheckIn: true,
  allowStudentCheckOut: true,
  requireCheckInSelfie: true,
  requireCheckOutSelfie: false,
  workingDays: "1,2,3,4,5",
  isActive: false,
};

export async function getAttendancePolicyOrDefault(schoolId: string) {
  const saved = await prisma.schoolAttendancePolicy.findUnique({ where: { schoolId } });
  return saved || { id: null, schoolId, ...DEFAULT_ATTENDANCE_POLICY, createdAt: null, updatedAt: null };
}

export async function getEffectiveAttendanceDay(schoolId: string, now = new Date()) {
  const policy = await getAttendancePolicyOrDefault(schoolId);
  const probe = resolveAttendanceDay(policy, null, now);
  const calendarDay = await prisma.schoolCalendarDay.findUnique({
    where: { schoolId_dateOnly: { schoolId, dateOnly: probe.dateOnly } },
  });
  return { policy, calendarDay, day: resolveAttendanceDay(policy, calendarDay, now) };
}

export async function ensureOwnedAttendanceEvidence(userId: string, key?: string | null) {
  if (!key) return null;
  const parsed = parseAttendanceEvidenceKey(key);
  if (!parsed || parsed.ownerId !== userId) throw new HttpError(403, "Bukti selfie tidak sesuai dengan pemilik akun.");
  if (!(await attendanceEvidenceExists(key))) throw new HttpError(404, "File bukti selfie belum ditemukan.");
  return key;
}

export function evaluateSchoolGeofence(args: {
  latitude: number;
  longitude: number;
  accuracy: number;
  policy: { latitude: number | null; longitude: number | null; radiusMeters: number; maxGpsAccuracyMeters: number };
}) {
  if (args.policy.latitude == null || args.policy.longitude == null) {
    throw new HttpError(400, "Lokasi geofence sekolah belum dikonfigurasi oleh admin.");
  }
  if (!Number.isFinite(args.accuracy) || args.accuracy < 0 || args.accuracy > args.policy.maxGpsAccuracyMeters) {
    throw new HttpError(400, `Akurasi GPS harus ≤ ${args.policy.maxGpsAccuracyMeters} meter. Perbarui lokasi dan coba lagi.`);
  }
  const result = isWithinGeofence(
    args.latitude,
    args.longitude,
    args.policy.latitude,
    args.policy.longitude,
    args.policy.radiusMeters,
  );
  return { ...result, geofenceStatus: result.isWithin ? "INSIDE" as const : "OUTSIDE" as const };
}

export async function createAttendanceEventIdempotent(
  args: {
    schoolId: string;
    studentId: string;
    dateOnly: string;
    type: any;
    status: string;
    source: string;
    sourceKey: string;
    actorId?: string | null;
    occurredAt?: Date;
    latitude?: number | null;
    longitude?: number | null;
    gpsAccuracy?: number | null;
    distanceMeters?: number | null;
    geofenceStatus?: any;
    evidenceKey?: string | null;
    notes?: string | null;
    metadata?: any;
  },
  tx: any = prisma,
) {
  const existing = await tx.studentAttendanceEvent.findUnique({
    where: { schoolId_sourceKey: { schoolId: args.schoolId, sourceKey: args.sourceKey } },
  });
  if (existing) return { event: existing, created: false };
  const event = await tx.studentAttendanceEvent.create({
    data: {
      schoolId: args.schoolId,
      studentId: args.studentId,
      dateOnly: args.dateOnly,
      type: args.type,
      status: args.status,
      source: args.source,
      sourceKey: args.sourceKey,
      actorId: args.actorId ?? null,
      occurredAt: args.occurredAt || new Date(),
      latitude: args.latitude ?? null,
      longitude: args.longitude ?? null,
      gpsAccuracy: args.gpsAccuracy ?? null,
      distanceMeters: args.distanceMeters ?? null,
      geofenceStatus: args.geofenceStatus ?? null,
      evidenceKey: args.evidenceKey ?? null,
      notes: args.notes?.trim() || null,
      metadata: args.metadata ?? undefined,
    },
  });
  return { event, created: true };
}

export async function reconcileStudentDay(
  schoolId: string,
  studentId: string,
  dateOnly: string,
  actorId: string,
  tx: any = prisma,
) {
  const student = await tx.user.findFirst({
    where: {
      id: studentId,
      schoolId,
      role: "STUDENT",
      classRoom: { academicYear: { isActive: true } },
    },
    select: { id: true, classRoomId: true, classRoom: { select: { academicYearId: true } } },
  });
  if (!student?.classRoomId || !student.classRoom?.academicYearId) {
    throw new HttpError(400, "Siswa belum berada pada rombel tahun ajaran aktif.");
  }
  const events = await tx.studentAttendanceEvent.findMany({
    where: { schoolId, studentId, dateOnly },
    orderBy: { occurredAt: "asc" },
  });
  const result = reconcileAttendanceEvidence(events);
  const existing = await tx.schoolDailyAttendance.findUnique({
    where: { schoolId_studentId_dateOnly: { schoolId, studentId, dateOnly } },
  });
  const humanProtected = existing?.reconciliationStatus === "MANUAL" || existing?.reconciliationStatus === "VERIFIED";
  if (!result.status) {
    return { record: existing, suggestion: result, humanProtected };
  }
  if (humanProtected) {
    return { record: existing, suggestion: result, humanProtected: true };
  }
  const data = {
    academicYearId: student.classRoom.academicYearId,
    classRoomId: student.classRoomId,
    status: result.status,
    arrivalAt: result.arrivalAt,
    checkOutAt: result.checkOutAt,
    lateMinutes: result.lateMinutes,
    earlyLeave: result.earlyLeave,
    reconciliationStatus: result.reconciliationStatus,
    evidenceSummary: { ...result.evidenceSummary, reasons: result.reasons } as any,
    recordedById: actorId,
    recordedAt: new Date(),
  };
  const record = await tx.schoolDailyAttendance.upsert({
    where: { schoolId_studentId_dateOnly: { schoolId, studentId, dateOnly } },
    create: { schoolId, studentId, dateOnly, ...data },
    update: data,
  });
  return { record, suggestion: result, humanProtected: false };
}
