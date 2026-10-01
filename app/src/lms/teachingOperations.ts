import { HttpError, prisma } from "wasp/server";
import type { User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { ensureSchoolUser, requireTeacher } from "../school/authGuards";
import { attendanceLocalParts } from "../attendance360/time";
import {
  ensureOwnedAttendanceEvidence,
  evaluateSchoolGeofence,
  getAttendancePolicyOrDefault,
} from "../attendance360/service";
import {
  canEditEngagementScore,
  deriveTeachingScheduleState,
  engagementDeadline,
  engagementLevelFromScore,
  jakartaDateTime,
  teachingTimeRangesOverlap,
  validateTeachingTimeRange,
  weekdayForDateOnly,
} from "./teachingPolicy";
import {
  assertCanMonitorTeachingCourse,
  getTeachingMonitorScope,
  isTeachingAdmin,
} from "./teachingAccess";

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid.");
const clockSchema = z.string().regex(/^\d{2}:\d{2}$/, "Jam harus menggunakan format HH:mm.");

function schoolIdOf(user: { schoolId?: string | null }) {
  if (!user.schoolId) throw new HttpError(403, "Akun belum terhubung dengan sekolah.");
  return user.schoolId;
}

async function managedCourse(user: User, courseId: string) {
  const schoolId = schoolIdOf(user);
  const course = await prisma.lmsCourse.findFirst({
    where: { id: courseId, schoolId },
    select: {
      id: true,
      schoolId: true,
      teacherId: true,
      classRoomId: true,
      academicYearId: true,
      subjectName: true,
      teacher: { select: { id: true, name: true } },
      classRoom: {
        select: {
          id: true,
          name: true,
          departmentId: true,
          department: { select: { id: true, code: true, name: true } },
        },
      },
      academicYear: { select: { id: true, isActive: true, yearName: true, semester: true } },
    },
  });
  if (!course) throw new HttpError(404, "Ruang mata pelajaran tidak ditemukan.");
  if (!isTeachingAdmin(user) && course.teacherId !== user.id) {
    throw new HttpError(403, "Hanya guru pengampu atau admin sekolah yang dapat mengelola KBM ini.");
  }
  return course;
}

async function courseForMonitoring(user: User, courseId: string) {
  const schoolId = schoolIdOf(user);
  const course = await prisma.lmsCourse.findFirst({
    where: { id: courseId, schoolId },
    select: {
      id: true,
      teacherId: true,
      classRoom: { select: { departmentId: true } },
    },
  });
  if (!course) throw new HttpError(404, "Ruang mata pelajaran tidak ditemukan.");
  await assertCanMonitorTeachingCourse(user, course);
  return course;
}

function boundsForSchedule(
  schedule: { startTime: string; endTime: string },
  dateOnly: string,
) {
  return {
    startAt: jakartaDateTime(dateOnly, schedule.startTime),
    endAt: jakartaDateTime(dateOnly, schedule.endTime),
  };
}

async function teacherGeofence(args: {
  schoolId: string;
  teacherId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  evidenceKey?: string | null;
}) {
  const evidenceKey = await ensureOwnedAttendanceEvidence(args.teacherId, args.evidenceKey);
  if (!evidenceKey) {
    throw new HttpError(400, "Selfie langsung guru wajib diambil sebagai bukti pelaksanaan KBM.");
  }

  const policy = await getAttendancePolicyOrDefault(args.schoolId);
  if (policy.latitude == null || policy.longitude == null) {
    return {
      evidenceKey,
      distanceMeters: null as number | null,
      geofenceStatus: "UNCONFIGURED",
    };
  }
  const result = evaluateSchoolGeofence({
    latitude: args.latitude,
    longitude: args.longitude,
    accuracy: args.accuracy,
    policy,
  });
  if (!result.isWithin) {
    throw new HttpError(
      400,
      `Guru berada sekitar ${result.distanceMeters} m dari titik sekolah, di luar radius ${policy.radiusMeters} m.`,
    );
  }
  return {
    evidenceKey,
    distanceMeters: result.distanceMeters,
    geofenceStatus: result.geofenceStatus,
  };
}

async function sessionWithCourse(user: User, sessionId: string, manage = true) {
  const schoolId = schoolIdOf(user);
  const session = await prisma.lmsTeachingSession.findFirst({
    where: { id: sessionId, course: { schoolId } },
    include: {
      course: {
        select: {
          id: true,
          schoolId: true,
          teacherId: true,
          classRoomId: true,
          subjectName: true,
          classRoom: {
            select: {
              id: true,
              name: true,
              departmentId: true,
              students: { where: { role: "STUDENT" }, select: { id: true } },
            },
          },
        },
      },
      schedule: true,
      agenda: true,
      attendance: { include: { records: true } },
      engagementScores: true,
    },
  });
  if (!session) throw new HttpError(404, "Sesi KBM tidak ditemukan.");
  if (manage) {
    if (!isTeachingAdmin(user) && session.course.teacherId !== user.id) {
      throw new HttpError(403, "Sesi KBM ini bukan bagian dari mata pelajaran yang Anda ampu.");
    }
  } else {
    await assertCanMonitorTeachingCourse(user, session.course);
  }
  return session;
}

const workspaceSchema = z.object({ dateOnly: dateOnlySchema.optional() }).optional();

export const getTeachingWorkspace = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  if (!isTeachingAdmin(user as User) && user.role !== "TEACHER") {
    throw new HttpError(403, "Workspace KBM hanya tersedia untuk guru dan pengelola sekolah.");
  }
  const schoolId = schoolIdOf(user);
  const args = ensureArgsSchemaOrThrowHttpError(workspaceSchema || z.any(), rawArgs || {});
  const now = new Date();
  const today = attendanceLocalParts(now).dateOnly;
  const dateOnly = args?.dateOnly || today;
  const weekday = weekdayForDateOnly(dateOnly);
  const scope = await getTeachingMonitorScope(user as User);

  const courseWhere: any = {
    schoolId,
    academicYear: { isActive: true },
  };
  if (!isTeachingAdmin(user as User) && !scope.schoolWide) {
    if (scope.departmentIds.length) {
      courseWhere.OR = [
        { teacherId: user.id },
        { classRoom: { departmentId: { in: scope.departmentIds } } },
      ];
    } else {
      courseWhere.teacherId = user.id;
    }
  }

  const schedules = await prisma.lmsTeachingSchedule.findMany({
    where: {
      isActive: true,
      dayOfWeek: weekday,
      course: courseWhere,
    },
    include: {
      course: {
        select: {
          id: true,
          subjectName: true,
          teacherId: true,
          teacher: { select: { id: true, name: true } },
          classRoom: {
            select: {
              id: true,
              name: true,
              departmentId: true,
              department: { select: { code: true, name: true } },
            },
          },
        },
      },
      sessions: {
        where: { dateOnly },
        include: {
          agenda: true,
          attendance: { select: { id: true, _count: { select: { records: true } } } },
        },
      },
    },
    orderBy: [{ startTime: "asc" }, { course: { classRoom: { name: "asc" } } }],
  });

  const rows = schedules.map((schedule) => {
    const { startAt, endAt } = boundsForSchedule(schedule, dateOnly);
    const session = schedule.sessions[0] || null;
    const derivedState = deriveTeachingScheduleState({
      now,
      startAt,
      endAt,
      sessionStatus: session?.status,
    });
    return {
      id: schedule.id,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      roomLabel: schedule.roomLabel,
      course: schedule.course,
      session,
      derivedState,
      slaMinutes: 15,
      isMine: schedule.course.teacherId === user.id,
    };
  });

  return {
    dateOnly,
    today,
    scope,
    summary: {
      scheduled: rows.length,
      locked: rows.filter((row) => row.derivedState === "LOCKED").length,
      ready: rows.filter((row) => row.derivedState === "READY").length,
      slaBreaches: rows.filter((row) => row.derivedState === "SLA_BREACH" || row.derivedState === "MISSED").length,
      active: rows.filter((row) => row.derivedState === "IN_PROGRESS").length,
      completed: rows.filter((row) => row.derivedState === "COMPLETED").length,
      delegated: rows.filter((row) => row.derivedState === "DELEGATED").length,
    },
    rows,
  };
};

const courseTeachingDataSchema = z.object({
  courseId: z.string().uuid(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
});

export const getCourseTeachingData = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  if (!isTeachingAdmin(user as User) && user.role !== "TEACHER") {
    throw new HttpError(403, "Riwayat KBM hanya tersedia untuk guru dan pengelola sekolah.");
  }
  const args = ensureArgsSchemaOrThrowHttpError(courseTeachingDataSchema, rawArgs);
  await courseForMonitoring(user as User, args.courseId);
  const course = await prisma.lmsCourse.findFirst({
    where: { id: args.courseId, schoolId: schoolIdOf(user) },
    select: {
      id: true,
      subjectName: true,
      teacherId: true,
      teacher: { select: { id: true, name: true } },
      classRoom: {
        select: {
          id: true,
          name: true,
          department: { select: { code: true, name: true } },
          students: {
            where: { role: "STUDENT" },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          },
        },
      },
      academicYear: { select: { yearName: true, semester: true, isActive: true } },
    },
  });
  if (!course) throw new HttpError(404, "Ruang mata pelajaran tidak ditemukan.");
  const to = args.to || attendanceLocalParts(new Date()).dateOnly;
  const from = args.from || attendanceLocalParts(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).dateOnly;

  const [schedules, sessions] = await Promise.all([
    prisma.lmsTeachingSchedule.findMany({
      where: { courseId: args.courseId, isActive: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.lmsTeachingSession.findMany({
      where: { courseId: args.courseId, dateOnly: { gte: from, lte: to } },
      include: {
        schedule: true,
        agenda: { include: { photos: true } },
        attendance: {
          include: {
            records: {
              include: { student: { select: { id: true, name: true } } },
              orderBy: { student: { name: "asc" } },
            },
          },
        },
        engagementScores: {
          include: { student: { select: { id: true, name: true } } },
          orderBy: { student: { name: "asc" } },
        },
        events: {
          include: { actor: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
        deliveredBy: { select: { id: true, name: true } },
      },
      orderBy: [{ dateOnly: "desc" }, { scheduledStartAt: "desc" }],
    }),
  ]);

  const attendanceByStudent = new Map<string, { studentId: string; studentName: string | null; statuses: string[] }>();
  const engagementByStudent = new Map<string, { studentId: string; studentName: string | null; scores: number[] }>();
  for (const session of sessions) {
    for (const record of session.attendance?.records || []) {
      const current = attendanceByStudent.get(record.studentId) || {
        studentId: record.studentId,
        studentName: record.student.name,
        statuses: [],
      };
      current.statuses.push(record.status);
      attendanceByStudent.set(record.studentId, current);
    }
    for (const score of session.engagementScores) {
      const current = engagementByStudent.get(score.studentId) || {
        studentId: score.studentId,
        studentName: score.student.name,
        scores: [],
      };
      current.scores.push(score.score);
      engagementByStudent.set(score.studentId, current);
    }
  }

  const attendanceRecap = [...attendanceByStudent.values()].map((item) => {
    const total = item.statuses.length;
    const hadir = item.statuses.filter((s) => s === "HADIR" || s === "TERLAMBAT" || s === "DISPENSASI").length;
    return {
      studentId: item.studentId,
      studentName: item.studentName,
      total,
      hadir,
      sakit: item.statuses.filter((s) => s === "SAKIT").length,
      izin: item.statuses.filter((s) => s === "IZIN").length,
      alpa: item.statuses.filter((s) => s === "ALPA").length,
      percentage: total ? Math.round((hadir / total) * 100) : null,
    };
  });

  const engagementRecap = [...engagementByStudent.values()].map((item) => ({
    studentId: item.studentId,
    studentName: item.studentName,
    count: item.scores.length,
    average: item.scores.length
      ? Math.round((item.scores.reduce((sum, score) => sum + score, 0) / item.scores.length) * 10) / 10
      : null,
  }));

  return { course, from, to, schedules, sessions, attendanceRecap, engagementRecap };
};

const scheduleSchema = z.object({
  courseId: z.string().uuid(),
  scheduleId: z.string().uuid().optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: clockSchema,
  endTime: clockSchema,
  roomLabel: z.string().trim().max(120).optional().nullable(),
});

export const upsertTeachingSchedule = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireTeacher(context) as User;
  const args = ensureArgsSchemaOrThrowHttpError(scheduleSchema, rawArgs);
  const course = await managedCourse(user, args.courseId);
  if (!course.academicYear.isActive) {
    throw new HttpError(400, "Jadwal KBM hanya dapat dibuat pada tahun ajaran aktif.");
  }
  if (!validateTeachingTimeRange(args.startTime, args.endTime)) {
    throw new HttpError(400, "Jam selesai harus lebih besar dari jam mulai.");
  }

  if (args.scheduleId) {
    const current = await prisma.lmsTeachingSchedule.findFirst({
      where: { id: args.scheduleId, courseId: course.id },
      select: { id: true },
    });
    if (!current) throw new HttpError(404, "Jadwal mengajar tidak ditemukan.");
  }

  const possibleConflicts = await prisma.lmsTeachingSchedule.findMany({
    where: {
      isActive: true,
      dayOfWeek: args.dayOfWeek,
      id: args.scheduleId ? { not: args.scheduleId } : undefined,
      course: {
        schoolId: course.schoolId,
        academicYearId: course.academicYearId,
        OR: [{ teacherId: course.teacherId }, { classRoomId: course.classRoomId }],
      },
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      course: {
        select: {
          teacherId: true,
          classRoomId: true,
          subjectName: true,
          classRoom: { select: { name: true } },
        },
      },
    },
  });
  const conflict = possibleConflicts.find((item) =>
    teachingTimeRangesOverlap(args.startTime, args.endTime, item.startTime, item.endTime),
  );
  if (conflict) {
    const sameTeacher = conflict.course.teacherId === course.teacherId;
    throw new HttpError(
      409,
      sameTeacher
        ? `Jadwal guru bentrok dengan ${conflict.course.subjectName} ${conflict.startTime}–${conflict.endTime}.`
        : `Rombel ${conflict.course.classRoom.name} sudah memiliki KBM ${conflict.startTime}–${conflict.endTime}.`,
    );
  }

  if (args.scheduleId) {
    return prisma.lmsTeachingSchedule.update({
      where: { id: args.scheduleId },
      data: {
        dayOfWeek: args.dayOfWeek,
        startTime: args.startTime,
        endTime: args.endTime,
        roomLabel: args.roomLabel?.trim() || null,
        isActive: true,
      },
    });
  }
  return prisma.lmsTeachingSchedule.create({
    data: {
      courseId: course.id,
      dayOfWeek: args.dayOfWeek,
      startTime: args.startTime,
      endTime: args.endTime,
      roomLabel: args.roomLabel?.trim() || null,
    },
  });
};

const scheduleIdSchema = z.object({ scheduleId: z.string().uuid() });

export const deactivateTeachingSchedule = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireTeacher(context) as User;
  const { scheduleId } = ensureArgsSchemaOrThrowHttpError(scheduleIdSchema, rawArgs);
  const schedule = await prisma.lmsTeachingSchedule.findFirst({
    where: { id: scheduleId, course: { schoolId: schoolIdOf(user) } },
    include: { course: true },
  });
  if (!schedule) throw new HttpError(404, "Jadwal mengajar tidak ditemukan.");
  if (!isTeachingAdmin(user) && schedule.course.teacherId !== user.id) {
    throw new HttpError(403, "Jadwal ini bukan bagian dari mata pelajaran yang Anda ampu.");
  }
  return prisma.lmsTeachingSchedule.update({
    where: { id: scheduleId },
    data: { isActive: false },
  });
};

const startSessionSchema = z.object({
  scheduleId: z.string().uuid(),
  topic: z.string().trim().min(2).max(500),
  method: z.string().trim().min(2).max(500),
  summary: z.string().trim().min(5).max(5000),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(5000),
  evidenceKey: z.string().max(1000),
});

export const startTeachingSession = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireTeacher(context) as User;
  const args = ensureArgsSchemaOrThrowHttpError(startSessionSchema, rawArgs);
  const schedule = await prisma.lmsTeachingSchedule.findFirst({
    where: {
      id: args.scheduleId,
      isActive: true,
      course: { schoolId: schoolIdOf(user), academicYear: { isActive: true } },
    },
    include: {
      course: {
        select: {
          id: true,
          schoolId: true,
          teacherId: true,
          classRoomId: true,
        },
      },
    },
  });
  if (!schedule) throw new HttpError(404, "Jadwal mengajar aktif tidak ditemukan.");
  if (!isTeachingAdmin(user) && schedule.course.teacherId !== user.id) {
    throw new HttpError(403, "Jadwal ini bukan jadwal mengajar Anda.");
  }

  const now = new Date();
  const local = attendanceLocalParts(now);
  if (local.weekday !== schedule.dayOfWeek) {
    throw new HttpError(400, "Sesi hanya dapat dibuka pada hari jadwal mengajar.");
  }
  const { startAt, endAt } = boundsForSchedule(schedule, local.dateOnly);
  if (now < startAt) {
    throw new HttpError(400, `Sesi KBM terkunci sampai pukul ${schedule.startTime} WIB.`);
  }
  if (now > endAt) {
    throw new HttpError(400, "Jam KBM sudah berakhir. Gunakan riwayat/audit untuk tindak lanjut.");
  }

  const geo = await teacherGeofence({
    schoolId: schedule.course.schoolId,
    teacherId: user.id,
    latitude: args.latitude,
    longitude: args.longitude,
    accuracy: args.accuracy,
    evidenceKey: args.evidenceKey,
  });

  return prisma.$transaction(async (tx) => {
    const existing = await tx.lmsTeachingSession.findUnique({
      where: { scheduleId_dateOnly: { scheduleId: schedule.id, dateOnly: local.dateOnly } },
      include: { agenda: true },
    });
    if (existing?.teacherCheckInAt) {
      return { session: existing, alreadyStarted: true };
    }
    if (existing && ["DELEGATED", "ABSENT", "CANCELLED"].includes(existing.status)) {
      throw new HttpError(409, "Sesi sudah memiliki status ketidakhadiran/delegasi dan tidak dapat dibuka langsung.");
    }

    const session = existing
      ? await tx.lmsTeachingSession.update({
          where: { id: existing.id },
          data: {
            status: "IN_PROGRESS",
            teacherCheckInAt: now,
            checkInLatitude: args.latitude,
            checkInLongitude: args.longitude,
            checkInAccuracy: args.accuracy,
            checkInDistanceM: geo.distanceMeters,
            checkInGeofence: geo.geofenceStatus,
            checkInEvidenceKey: geo.evidenceKey,
            version: { increment: 1 },
          },
        })
      : await tx.lmsTeachingSession.create({
          data: {
            courseId: schedule.course.id,
            scheduleId: schedule.id,
            dateOnly: local.dateOnly,
            scheduledStartAt: startAt,
            scheduledEndAt: endAt,
            status: "IN_PROGRESS",
            teacherCheckInAt: now,
            checkInLatitude: args.latitude,
            checkInLongitude: args.longitude,
            checkInAccuracy: args.accuracy,
            checkInDistanceM: geo.distanceMeters,
            checkInGeofence: geo.geofenceStatus,
            checkInEvidenceKey: geo.evidenceKey,
          },
        });

    await tx.lmsAgenda.upsert({
      where: { teachingSessionId: session.id },
      create: {
        courseId: schedule.course.id,
        teachingSessionId: session.id,
        date: now,
        period: `${schedule.startTime}–${schedule.endTime}`,
        competency: args.topic,
        method: args.method,
        summary: args.summary,
      },
      update: {
        date: now,
        period: `${schedule.startTime}–${schedule.endTime}`,
        competency: args.topic,
        method: args.method,
        summary: args.summary,
      },
    });

    await tx.lmsTeachingSessionEvent.create({
      data: {
        sessionId: session.id,
        actorId: user.id,
        actionType: "SESSION_STARTED",
        metadata: {
          scheduledStartAt: startAt.toISOString(),
          actualStartAt: now.toISOString(),
          distanceMeters: geo.distanceMeters,
          geofenceStatus: geo.geofenceStatus,
        },
      },
    });
    return { session, alreadyStarted: false };
  });
};

const absenceSchema = z.object({
  scheduleId: z.string().uuid(),
  dateOnly: dateOnlySchema,
  absenceType: z.enum(["SAKIT", "IZIN", "DINAS", "LAINNYA"]),
  reason: z.string().trim().min(5).max(2000),
  dutyInstruction: z.string().trim().min(5).max(5000),
  dutyFileUrl: z.string().trim().max(2000).optional().nullable(),
});

export const delegateTeachingAbsence = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireTeacher(context) as User;
  const args = ensureArgsSchemaOrThrowHttpError(absenceSchema, rawArgs);
  const schedule = await prisma.lmsTeachingSchedule.findFirst({
    where: { id: args.scheduleId, isActive: true, course: { schoolId: schoolIdOf(user) } },
    include: { course: true },
  });
  if (!schedule) throw new HttpError(404, "Jadwal mengajar tidak ditemukan.");
  if (!isTeachingAdmin(user) && schedule.course.teacherId !== user.id) {
    throw new HttpError(403, "Jadwal ini bukan jadwal mengajar Anda.");
  }
  if (weekdayForDateOnly(args.dateOnly) !== schedule.dayOfWeek) {
    throw new HttpError(400, "Tanggal delegasi tidak sesuai dengan hari jadwal.");
  }
  const today = attendanceLocalParts(new Date()).dateOnly;
  if (args.dateOnly < today) throw new HttpError(400, "Delegasi tidak dapat dibuat untuk tanggal yang sudah lewat.");
  const { startAt, endAt } = boundsForSchedule(schedule, args.dateOnly);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.lmsTeachingSession.findUnique({
      where: { scheduleId_dateOnly: { scheduleId: schedule.id, dateOnly: args.dateOnly } },
    });
    if (existing?.teacherCheckInAt || existing?.status === "COMPLETED") {
      throw new HttpError(409, "Sesi yang sudah dimulai/selesai tidak dapat dialihkan menjadi delegasi.");
    }
    const session = existing
      ? await tx.lmsTeachingSession.update({
          where: { id: existing.id },
          data: {
            status: "DELEGATED",
            absenceType: args.absenceType,
            absenceReason: args.reason,
            dutyInstruction: args.dutyInstruction,
            dutyFileUrl: args.dutyFileUrl || null,
            delegatedAt: new Date(),
            version: { increment: 1 },
          },
        })
      : await tx.lmsTeachingSession.create({
          data: {
            courseId: schedule.courseId,
            scheduleId: schedule.id,
            dateOnly: args.dateOnly,
            scheduledStartAt: startAt,
            scheduledEndAt: endAt,
            status: "DELEGATED",
            absenceType: args.absenceType,
            absenceReason: args.reason,
            dutyInstruction: args.dutyInstruction,
            dutyFileUrl: args.dutyFileUrl || null,
            delegatedAt: new Date(),
          },
        });
    await tx.lmsTeachingSessionEvent.create({
      data: {
        sessionId: session.id,
        actorId: user.id,
        actionType: "TEACHER_ABSENCE_DELEGATED",
        metadata: {
          absenceType: args.absenceType,
          reason: args.reason,
          dutyInstruction: args.dutyInstruction,
        },
      },
    });
    return session;
  });
};

const finishSessionSchema = z.object({
  sessionId: z.string().uuid(),
  version: z.number().int().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(5000),
  evidenceKey: z.string().max(1000),
});

export const finishTeachingSession = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireTeacher(context) as User;
  const args = ensureArgsSchemaOrThrowHttpError(finishSessionSchema, rawArgs);
  const session = await sessionWithCourse(user, args.sessionId, true);
  if (session.status === "COMPLETED") return { session, alreadyCompleted: true };
  if (session.status !== "IN_PROGRESS" || !session.teacherCheckInAt) {
    throw new HttpError(409, "Check-out hanya tersedia untuk sesi KBM yang sedang berlangsung.");
  }
  if (session.version !== args.version) {
    throw new HttpError(409, "Sesi KBM telah berubah di perangkat lain. Muat ulang sebelum check-out.");
  }

  const rosterIds = session.course.classRoom.students.map((student) => student.id);
  const recordedIds = new Set(session.attendance?.records.map((record) => record.studentId) || []);
  const missing = rosterIds.filter((id) => !recordedIds.has(id));
  if (!rosterIds.length || missing.length) {
    throw new HttpError(
      400,
      `Check-out terkunci. Lengkapi presensi seluruh siswa terlebih dahulu (${missing.length || rosterIds.length} belum lengkap).`,
    );
  }

  const geo = await teacherGeofence({
    schoolId: session.course.schoolId,
    teacherId: user.id,
    latitude: args.latitude,
    longitude: args.longitude,
    accuracy: args.accuracy,
    evidenceKey: args.evidenceKey,
  });
  const now = new Date();
  const earlyByMinutes = Math.max(0, Math.round((session.scheduledEndAt.getTime() - now.getTime()) / 60_000));

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.lmsTeachingSession.updateMany({
      where: { id: session.id, version: args.version, status: "IN_PROGRESS" },
      data: {
        status: "COMPLETED",
        teacherCheckOutAt: now,
        checkOutLatitude: args.latitude,
        checkOutLongitude: args.longitude,
        checkOutAccuracy: args.accuracy,
        checkOutDistanceM: geo.distanceMeters,
        checkOutGeofence: geo.geofenceStatus,
        checkOutEvidenceKey: geo.evidenceKey,
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) {
      throw new HttpError(409, "Sesi KBM telah berubah. Muat ulang sebelum check-out.");
    }
    await tx.lmsTeachingSessionEvent.create({
      data: {
        sessionId: session.id,
        actorId: user.id,
        actionType: "SESSION_COMPLETED",
        metadata: {
          actualEndAt: now.toISOString(),
          earlyByMinutes,
          distanceMeters: geo.distanceMeters,
          geofenceStatus: geo.geofenceStatus,
        },
      },
    });
    return tx.lmsTeachingSession.findUnique({ where: { id: session.id } });
  });
  return { session: updated, alreadyCompleted: false };
};

const scoreSchema = z.object({
  sessionId: z.string().uuid(),
  scores: z.array(
    z.object({
      studentId: z.string().uuid(),
      score: z.number().min(0).max(100),
      notes: z.string().trim().max(2000).optional().nullable(),
      tags: z.array(z.string().trim().min(1).max(120)).max(12).optional(),
    }),
  ).min(1),
});

export const saveTeachingEngagementScores = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireTeacher(context) as User;
  const args = ensureArgsSchemaOrThrowHttpError(scoreSchema, rawArgs);
  const session = await sessionWithCourse(user, args.sessionId, true);
  if (!canEditEngagementScore(session.scheduledEndAt)) {
    throw new HttpError(
      400,
      `Penilaian keaktifan terkunci setelah ${engagementDeadline(session.scheduledEndAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}.`,
    );
  }
  const studentIds = [...new Set(args.scores.map((item) => item.studentId))];
  if (studentIds.length !== args.scores.length) {
    throw new HttpError(400, "Setiap siswa hanya boleh dinilai sekali dalam satu pengiriman.");
  }
  const rosterIds = new Set(session.course.classRoom.students.map((student) => student.id));
  if (studentIds.some((id) => !rosterIds.has(id))) {
    throw new HttpError(400, "Penilaian berisi siswa di luar rombel sesi KBM.");
  }

  await prisma.$transaction(async (tx) => {
    for (const item of args.scores) {
      await tx.lmsEngagementScore.upsert({
        where: { sessionId_studentId: { sessionId: session.id, studentId: item.studentId } },
        create: {
          sessionId: session.id,
          studentId: item.studentId,
          recordedById: user.id,
          level: engagementLevelFromScore(item.score),
          score: item.score,
          notes: item.notes || null,
          tags: item.tags || [],
        },
        update: {
          recordedById: user.id,
          level: engagementLevelFromScore(item.score),
          score: item.score,
          notes: item.notes || null,
          tags: item.tags || [],
          recordedAt: new Date(),
        },
      });
    }
    await tx.lmsTeachingSessionEvent.create({
      data: {
        sessionId: session.id,
        actorId: user.id,
        actionType: "ENGAGEMENT_SCORES_SAVED",
        metadata: { count: args.scores.length },
      },
    });
  });
  return { ok: true, count: args.scores.length };
};

export const getTeachingDutyQueue = async (_rawArgs: unknown, context: { user?: User }) => {
  const user = requireTeacher(context) as User;
  const schoolId = schoolIdOf(user);
  const scope = await getTeachingMonitorScope(user);
  if (!isTeachingAdmin(user) && !scope.canDuty) {
    throw new HttpError(403, "Antrean KBM Piket hanya tersedia untuk Guru Piket yang terjadwal hari ini.");
  }
  const now = new Date();
  const local = attendanceLocalParts(now);
  const schedules = await prisma.lmsTeachingSchedule.findMany({
    where: {
      isActive: true,
      dayOfWeek: local.weekday,
      course: { schoolId, academicYear: { isActive: true } },
    },
    include: {
      course: {
        select: {
          id: true,
          subjectName: true,
          teacher: { select: { id: true, name: true } },
          classRoom: { select: { id: true, name: true } },
        },
      },
      sessions: {
        where: { dateOnly: local.dateOnly },
        include: { deliveredBy: { select: { id: true, name: true } } },
      },
    },
    orderBy: { startTime: "asc" },
  });

  const items: any[] = [];
  for (const schedule of schedules) {
    const session = schedule.sessions[0] || null;
    const { startAt, endAt } = boundsForSchedule(schedule, local.dateOnly);
    const derivedState = deriveTeachingScheduleState({
      now,
      startAt,
      endAt,
      sessionStatus: session?.status,
    });
    if (session?.status === "DELEGATED") {
      items.push({ type: "DELEGATED", schedule, session, derivedState });
    } else if (!session && (derivedState === "SLA_BREACH" || derivedState === "MISSED")) {
      items.push({ type: "SLA_BREACH", schedule, session: null, derivedState });
    }
  }
  return { dateOnly: local.dateOnly, items };
};

const deliveredSchema = z.object({ sessionId: z.string().uuid() });

export const markTeachingDelegationDelivered = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireTeacher(context) as User;
  const { sessionId } = ensureArgsSchemaOrThrowHttpError(deliveredSchema, rawArgs);
  const scope = await getTeachingMonitorScope(user);
  if (!isTeachingAdmin(user) && !scope.canDuty) {
    throw new HttpError(403, "Hanya Guru Piket aktif atau Admin yang dapat menandai tugas telah diteruskan.");
  }
  const session = await prisma.lmsTeachingSession.findFirst({
    where: { id: sessionId, course: { schoolId: schoolIdOf(user) } },
  });
  if (!session) throw new HttpError(404, "Delegasi KBM tidak ditemukan.");
  if (session.status !== "DELEGATED") throw new HttpError(409, "Sesi ini bukan delegasi guru berhalangan.");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.lmsTeachingSession.update({
      where: { id: session.id },
      data: {
        deliveredAt: new Date(),
        deliveredById: user.id,
        version: { increment: 1 },
      },
    });
    await tx.lmsTeachingSessionEvent.create({
      data: {
        sessionId: session.id,
        actorId: user.id,
        actionType: "DUTY_TASK_DELIVERED",
      },
    });
    return updated;
  });
};

const auditSchema = z.object({
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  courseId: z.string().uuid().optional(),
}).optional();

export const getTeachingAudit = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context) as User;
  if (!isTeachingAdmin(user) && user.role !== "TEACHER") {
    throw new HttpError(403, "Audit KBM hanya tersedia untuk pengelola pembelajaran.");
  }
  const args = ensureArgsSchemaOrThrowHttpError(auditSchema || z.any(), rawArgs || {});
  const scope = await getTeachingMonitorScope(user);
  const today = attendanceLocalParts(new Date()).dateOnly;
  const from = args?.from || attendanceLocalParts(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).dateOnly;
  const to = args?.to || today;
  if (!isTeachingAdmin(user) && !scope.canMonitor && !args?.courseId) {
    throw new HttpError(403, "Akun ini belum memiliki penugasan monitoring pembelajaran.");
  }
  if (args?.courseId) await courseForMonitoring(user, args.courseId);

  const courseFilter: any = { schoolId: schoolIdOf(user) };
  if (args?.courseId) courseFilter.id = args.courseId;
  if (!isTeachingAdmin(user) && !scope.schoolWide && !args?.courseId) {
    courseFilter.classRoom = { departmentId: { in: scope.departmentIds } };
  }

  const sessions = await prisma.lmsTeachingSession.findMany({
    where: {
      dateOnly: { gte: from, lte: to },
      course: courseFilter,
    },
    include: {
      course: {
        select: {
          id: true,
          subjectName: true,
          teacher: { select: { id: true, name: true } },
          classRoom: {
            select: {
              id: true,
              name: true,
              department: { select: { code: true, name: true } },
            },
          },
        },
      },
      schedule: true,
      agenda: true,
      attendance: { select: { id: true, _count: { select: { records: true } } } },
      events: {
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
    orderBy: [{ dateOnly: "desc" }, { scheduledStartAt: "desc" }],
    take: 500,
  });

  const completed = sessions.filter((session) => session.status === "COMPLETED").length;
  const startedOnTime = sessions.filter(
    (session) =>
      !!session.teacherCheckInAt &&
      session.teacherCheckInAt.getTime() <= session.scheduledStartAt.getTime() + 15 * 60_000,
  ).length;

  const policy = await getAttendancePolicyOrDefault(schoolIdOf(user));

  return {
    from,
    to,
    scope,
    // Titik sekolah dipakai halaman audit untuk menghitung jarak dan menandai akurasi.
    school: {
      latitude: policy.latitude,
      longitude: policy.longitude,
      radiusMeters: policy.radiusMeters,
      maxGpsAccuracyMeters: policy.maxGpsAccuracyMeters,
    },
    summary: {
      totalSessions: sessions.length,
      completed,
      delegated: sessions.filter((session) => session.status === "DELEGATED").length,
      missingCheckout: sessions.filter((session) => session.status === "IN_PROGRESS" && session.scheduledEndAt < new Date()).length,
      onTimeRate: sessions.length ? Math.round((startedOnTime / sessions.length) * 100) : null,
      completionRate: sessions.length ? Math.round((completed / sessions.length) * 100) : null,
    },
    sessions,
  };
};
