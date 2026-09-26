import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { rm } from "node:fs/promises";

vi.mock("wasp/server", async () => {
  const { PrismaClient } = await import("@prisma/client");
  class HttpError extends Error {
    statusCode: number;
    data?: unknown;
    constructor(statusCode: number, message?: string, data?: unknown) {
      super(message);
      this.name = "HttpError";
      this.statusCode = statusCode;
      this.data = data;
    }
  }
  const url = process.env.TEACHING_UAT_DATABASE_URL || "postgresql://invalid:invalid@127.0.0.1:1/lms_teaching_uat_disabled";
  return {
    prisma: new PrismaClient({ datasources: { db: { url } } }),
    HttpError,
  };
});

import { prisma } from "wasp/server";
import { attendanceLocalParts } from "../src/attendance360/time";
import { writeAttendanceEvidence } from "../src/attendance360/evidenceStorage";
import {
  getCourseAttendanceSeed,
  recordCourseAttendance,
} from "../src/lms/operations";
import {
  deactivateTeachingSchedule,
  delegateTeachingAbsence,
  finishTeachingSession,
  getCourseTeachingData,
  getTeachingAudit,
  getTeachingDutyQueue,
  getTeachingWorkspace,
  markTeachingDelegationDelivered,
  saveTeachingEngagementScores,
  startTeachingSession,
  upsertTeachingSchedule,
} from "../src/lms/teachingOperations";
import { getUnifiedStudentRiskData } from "../src/school/studentRiskOperations";
import { jakartaDutyDayCode } from "../src/school/staffAssignments";

const PREFIX = "uat-lms-teaching-35b099f6";
const runUat =
  !!process.env.TEACHING_UAT_DATABASE_URL &&
  process.env.TEACHING_UAT_CONFIRM === "SYNTHETIC_PRODUCTION_UAT";
const uat = runUat ? describe.sequential : describe.skip;
const evidenceRoot = process.env.ATTENDANCE_EVIDENCE_LOCAL_DIR || "/tmp/school-os-lms-teaching-uat-evidence";

async function capture<T>(fn: () => Promise<T>) {
  try {
    return { ok: true as const, value: await fn(), error: null };
  } catch (error: any) {
    return { ok: false as const, value: null, error };
  }
}

function expectHttp(result: Awaited<ReturnType<typeof capture>>, status: number) {
  expect(result.ok).toBe(false);
  expect((result.error as any)?.statusCode).toBe(status);
}

function hhmmFromMinutes(total: number) {
  const safe = Math.max(0, Math.min(23 * 60 + 59, total));
  return String(Math.floor(safe / 60)).padStart(2, "0") + ":" + String(safe % 60).padStart(2, "0");
}

function jakartaClockMinutes() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

function activeWindow() {
  const now = jakartaClockMinutes();
  if (now >= 23 * 60 + 45) return { start: "23:00", end: "23:59" };
  return { start: hhmmFromMinutes(Math.max(0, now - 5)), end: hhmmFromMinutes(Math.min(23 * 60 + 59, now + 45)) };
}

function dateOnly(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return attendanceLocalParts(date).dateOnly;
}

async function productionSnapshot() {
  const school = await prisma.school.findFirst({
    where: { slug: "smkn-12-garut" },
    select: { id: true },
  });
  if (!school) return { students: 0, teachingSchedules: 0, teachingSessions: 0, engagement: 0 };
  const [students, teachingSchedules, teachingSessions, engagement] = await Promise.all([
    prisma.user.count({ where: { schoolId: school.id, role: "STUDENT" } }),
    prisma.lmsTeachingSchedule.count({ where: { course: { schoolId: school.id } } }),
    prisma.lmsTeachingSession.count({ where: { course: { schoolId: school.id } } }),
    prisma.lmsEngagementScore.count({ where: { session: { course: { schoolId: school.id } } } }),
  ]);
  return { students, teachingSchedules, teachingSessions, engagement };
}

async function cleanupSynthetic() {
  const schools = await prisma.school.findMany({
    where: { slug: { startsWith: PREFIX } },
    select: { id: true },
  });
  const ids = schools.map((row) => row.id);
  if (!ids.length) return;

  await prisma.lmsEngagementScore.deleteMany({
    where: { session: { course: { schoolId: { in: ids } } } },
  });
  await prisma.lmsTeachingSessionEvent.deleteMany({
    where: { session: { course: { schoolId: { in: ids } } } },
  });
  await prisma.lmsAttendanceSession.deleteMany({
    where: { course: { schoolId: { in: ids } } },
  });
  await prisma.lmsAgenda.deleteMany({
    where: { course: { schoolId: { in: ids } } },
  });
  await prisma.lmsTeachingSession.deleteMany({
    where: { course: { schoolId: { in: ids } } },
  });
  await prisma.lmsTeachingSchedule.deleteMany({
    where: { course: { schoolId: { in: ids } } },
  });
  await prisma.lmsCourse.deleteMany({ where: { schoolId: { in: ids } } });
  await prisma.studentAttendanceEvent.deleteMany({ where: { schoolId: { in: ids } } });
  await prisma.schoolDailyAttendance.deleteMany({ where: { schoolId: { in: ids } } });
  await prisma.schoolAttendancePolicy.deleteMany({ where: { schoolId: { in: ids } } });
  await prisma.schoolStaffAssignment.deleteMany({ where: { schoolId: { in: ids } } });
  await prisma.wakasekAssignment.deleteMany({ where: { schoolId: { in: ids } } });
  await prisma.studentProfile.deleteMany({ where: { user: { schoolId: { in: ids } } } });
  await prisma.classRoom.updateMany({
    where: { schoolId: { in: ids } },
    data: { homeroomTeacherId: null },
  });
  await prisma.user.deleteMany({ where: { schoolId: { in: ids } } });
  await prisma.classRoom.deleteMany({ where: { schoolId: { in: ids } } });
  await prisma.department.deleteMany({ where: { schoolId: { in: ids } } });
  await prisma.academicYear.deleteMany({ where: { schoolId: { in: ids } } });
  await prisma.school.deleteMany({ where: { id: { in: ids } } });
}

uat("LMS Teaching Session Gen1 real DB UAT", () => {
  const f: Record<string, any> = {};
  let baseline: Awaited<ReturnType<typeof productionSnapshot>>;

  beforeAll(async () => {
    const dbName = new URL(process.env.TEACHING_UAT_DATABASE_URL!).pathname.replace(/^\//, "");
    if (!dbName.includes("lms_teaching_uat")) {
      throw new Error("Refusing Teaching UAT outside an lms_teaching_uat database.");
    }
    baseline = await productionSnapshot();
    await cleanupSynthetic();
    await rm(evidenceRoot, { recursive: true, force: true });

    f.schoolA = await prisma.school.create({
      data: { name: "UAT Teaching A", slug: PREFIX + "-a", npsn: "UAT-TEACH-A", studentQuota: 100 },
    });
    f.schoolB = await prisma.school.create({
      data: { name: "UAT Teaching B", slug: PREFIX + "-b", npsn: "UAT-TEACH-B", studentQuota: 100 },
    });
    f.yearA = await prisma.academicYear.create({
      data: { schoolId: f.schoolA.id, yearName: "2026/2027", semester: "GANJIL", isActive: true },
    });
    f.yearB = await prisma.academicYear.create({
      data: { schoolId: f.schoolB.id, yearName: "2026/2027", semester: "GANJIL", isActive: true },
    });
    f.deptA = await prisma.department.create({
      data: { schoolId: f.schoolA.id, code: "RPL-UAT", name: "Rekayasa Perangkat Lunak UAT" },
    });
    f.deptOther = await prisma.department.create({
      data: { schoolId: f.schoolA.id, code: "OT-UAT", name: "Program Lain UAT" },
    });

    const createUser = (schoolId: string, role: any, name: string, extra: any = {}) =>
      prisma.user.create({ data: { schoolId, role, name, ...extra } });

    f.adminA = await createUser(f.schoolA.id, "SCHOOL_ADMIN", "UAT Admin Teaching");
    f.teacherA = await createUser(f.schoolA.id, "TEACHER", "UAT Guru A");
    f.teacherOther = await createUser(f.schoolA.id, "TEACHER", "UAT Guru B");
    f.dutyA = await createUser(f.schoolA.id, "TEACHER", "UAT Guru Piket");
    f.wakaA = await createUser(f.schoolA.id, "TEACHER", "UAT Waka Kurikulum");
    f.deptHeadA = await createUser(f.schoolA.id, "TEACHER", "UAT Kaprog RPL");
    f.teacherB = await createUser(f.schoolB.id, "TEACHER", "UAT Tenant B Teacher");

    f.classA = await prisma.classRoom.create({
      data: {
        schoolId: f.schoolA.id,
        academicYearId: f.yearA.id,
        departmentId: f.deptA.id,
        gradeLevel: 12,
        name: "XII RPL UAT",
      },
    });
    f.classOther = await prisma.classRoom.create({
      data: {
        schoolId: f.schoolA.id,
        academicYearId: f.yearA.id,
        departmentId: f.deptOther.id,
        gradeLevel: 12,
        name: "XII OTHER UAT",
      },
    });
    f.classB = await prisma.classRoom.create({
      data: { schoolId: f.schoolB.id, academicYearId: f.yearB.id, gradeLevel: 12, name: "XII TENANT B" },
    });

    for (const key of ["s1", "s2", "s3"]) {
      f[key] = await createUser(f.schoolA.id, "STUDENT", "UAT Teaching " + key.toUpperCase(), {
        classRoomId: f.classA.id,
      });
      await prisma.studentProfile.create({
        data: { userId: f[key].id, nis: "UAT-" + key.toUpperCase() },
      });
    }
    f.sOther = await createUser(f.schoolA.id, "STUDENT", "UAT Other Student", { classRoomId: f.classOther.id });
    f.studentB = await createUser(f.schoolB.id, "STUDENT", "UAT Tenant B Student", { classRoomId: f.classB.id });

    const makeCourse = (teacherId: string, classRoomId: string, subjectName: string) =>
      prisma.lmsCourse.create({
        data: {
          schoolId: f.schoolA.id,
          academicYearId: f.yearA.id,
          classRoomId,
          teacherId,
          subjectName,
        },
      });
    f.courseA = await makeCourse(f.teacherA.id, f.classA.id, "Basis Data UAT");
    f.courseSameTeacher = await makeCourse(f.teacherA.id, f.classOther.id, "PKK UAT");
    f.courseSameClass = await makeCourse(f.teacherOther.id, f.classA.id, "Informatika UAT");
    f.courseOther = await makeCourse(f.teacherOther.id, f.classOther.id, "Mapel Lain UAT");
    f.courseB = await prisma.lmsCourse.create({
      data: {
        schoolId: f.schoolB.id,
        academicYearId: f.yearB.id,
        classRoomId: f.classB.id,
        teacherId: f.teacherB.id,
        subjectName: "Tenant B Mapel",
      },
    });

    await prisma.schoolStaffAssignment.createMany({
      data: [
        {
          schoolId: f.schoolA.id,
          teacherId: f.dutyA.id,
          role: "DUTY_TEACHER",
          academicYearId: f.yearA.id,
          dutyDays: [],
          isActive: true,
        },
        {
          schoolId: f.schoolA.id,
          teacherId: f.deptHeadA.id,
          role: "DEPARTMENT_HEAD",
          departmentId: f.deptA.id,
          academicYearId: f.yearA.id,
          isActive: true,
        },
      ],
    });
    await prisma.wakasekAssignment.create({
      data: { schoolId: f.schoolA.id, teacherId: f.wakaA.id, role: "KURIKULUM" },
    });

    await prisma.schoolAttendancePolicy.create({
      data: {
        schoolId: f.schoolA.id,
        timezone: "Asia/Jakarta",
        latitude: -7.2,
        longitude: 107.9,
        radiusMeters: 100,
        maxGpsAccuracyMeters: 100,
        checkInOpen: "00:00",
        lateAfter: "23:59",
        checkInClose: "23:59",
        checkOutOpen: "00:00",
        checkOutClose: "23:59",
        allowStudentCheckIn: true,
        allowStudentCheckOut: true,
        requireCheckInSelfie: false,
        requireCheckOutSelfie: false,
        workingDays: "0,1,2,3,4,5,6",
        isActive: true,
      },
    });

    const today = dateOnly();
    await prisma.schoolDailyAttendance.createMany({
      data: [
        { schoolId: f.schoolA.id, academicYearId: f.yearA.id, studentId: f.s1.id, classRoomId: f.classA.id, dateOnly: today, status: "HADIR", recordedById: f.adminA.id },
        { schoolId: f.schoolA.id, academicYearId: f.yearA.id, studentId: f.s2.id, classRoomId: f.classA.id, dateOnly: today, status: "TERLAMBAT", recordedById: f.adminA.id },
        { schoolId: f.schoolA.id, academicYearId: f.yearA.id, studentId: f.s3.id, classRoomId: f.classA.id, dateOnly: today, status: "IZIN", recordedById: f.adminA.id },
      ],
    });

    f.checkInEvidence = await writeAttendanceEvidence(f.teacherA.id, "image/jpeg", Buffer.from("uat-check-in"));
    f.checkOutEvidence = await writeAttendanceEvidence(f.teacherA.id, "image/jpeg", Buffer.from("uat-check-out"));
  }, 60_000);

  afterAll(async () => {
    await cleanupSynthetic();
    await rm(evidenceRoot, { recursive: true, force: true });
    const after = await productionSnapshot();
    expect(after).toEqual(baseline);
    await prisma.$disconnect();
  }, 60_000);

  it("01 production clone baseline is present and synthetic-safe", async () => {
    expect(baseline.students).toBeGreaterThanOrEqual(1539);
  });

  it("02 teacher creates a valid schedule for the current teaching window", async () => {
    const local = attendanceLocalParts(new Date());
    const window = activeWindow();
    f.window = window;
    f.scheduleA = await upsertTeachingSchedule({
      courseId: f.courseA.id,
      dayOfWeek: local.weekday,
      startTime: window.start,
      endTime: window.end,
      roomLabel: "Lab RPL UAT",
    }, { user: f.teacherA });
    expect(f.scheduleA.courseId).toBe(f.courseA.id);
  });

  it("03 anti-conflict blocks overlapping schedule for the same teacher", async () => {
    const local = attendanceLocalParts(new Date());
    expectHttp(await capture(() => upsertTeachingSchedule({
      courseId: f.courseSameTeacher.id,
      dayOfWeek: local.weekday,
      startTime: f.window.start,
      endTime: f.window.end,
    }, { user: f.teacherA })), 409);
  });

  it("04 anti-conflict blocks overlapping schedule for the same class", async () => {
    const local = attendanceLocalParts(new Date());
    expectHttp(await capture(() => upsertTeachingSchedule({
      courseId: f.courseSameClass.id,
      dayOfWeek: local.weekday,
      startTime: f.window.start,
      endTime: f.window.end,
    }, { user: f.teacherOther })), 409);
  });

  it("05 another teacher cannot manage someone else's course schedule", async () => {
    const local = attendanceLocalParts(new Date());
    expectHttp(await capture(() => upsertTeachingSchedule({
      courseId: f.courseA.id,
      dayOfWeek: local.weekday,
      startTime: "00:01",
      endTime: "00:30",
    }, { user: f.teacherOther })), 403);
  });

  it("06 cross-tenant teacher cannot manage the course", async () => {
    const local = attendanceLocalParts(new Date());
    expectHttp(await capture(() => upsertTeachingSchedule({
      courseId: f.courseA.id,
      dayOfWeek: local.weekday,
      startTime: "00:01",
      endTime: "00:30",
    }, { user: f.teacherB })), 404);
  });

  it("07 teacher workspace resolves today's schedule", async () => {
    const workspace: any = await getTeachingWorkspace({}, { user: f.teacherA });
    expect(workspace.rows.some((row: any) => row.id === f.scheduleA.id)).toBe(true);
    expect(workspace.rows.find((row: any) => row.id === f.scheduleA.id).isMine).toBe(true);
  });

  it("08 starting a Teaching Session requires owned selfie evidence", async () => {
    expectHttp(await capture(() => startTeachingSession({
      scheduleId: f.scheduleA.id,
      topic: "Normalisasi Basis Data",
      method: "Demonstrasi dan praktik",
      summary: "Murid melakukan normalisasi tabel sampai bentuk normal ketiga.",
      latitude: -7.2,
      longitude: 107.9,
      accuracy: 5,
      evidenceKey: "attendance-local:not-owner:00000000-0000-0000-0000-000000000000.jpg",
    }, { user: f.teacherA })), 403);
  });

  it("09 server geofence rejects teacher outside school radius", async () => {
    expectHttp(await capture(() => startTeachingSession({
      scheduleId: f.scheduleA.id,
      topic: "Normalisasi Basis Data",
      method: "Demonstrasi dan praktik",
      summary: "Murid melakukan normalisasi tabel sampai bentuk normal ketiga.",
      latitude: -6.0,
      longitude: 106.0,
      accuracy: 5,
      evidenceKey: f.checkInEvidence,
    }, { user: f.teacherA })), 400);
  });

  it("10 valid selfie + GPS starts session and creates mandatory agenda", async () => {
    const result: any = await startTeachingSession({
      scheduleId: f.scheduleA.id,
      topic: "Normalisasi Basis Data",
      method: "Demonstrasi dan praktik",
      summary: "Murid melakukan normalisasi tabel sampai bentuk normal ketiga.",
      latitude: -7.2,
      longitude: 107.9,
      accuracy: 5,
      evidenceKey: f.checkInEvidence,
    }, { user: f.teacherA });
    f.sessionA = result.session;
    expect(f.sessionA.status).toBe("IN_PROGRESS");
    const agenda = await prisma.lmsAgenda.findUnique({ where: { teachingSessionId: f.sessionA.id } });
    expect(agenda?.competency).toBe("Normalisasi Basis Data");
    expect(agenda?.method).toBe("Demonstrasi dan praktik");
  });

  it("11 repeated start is idempotent", async () => {
    const result: any = await startTeachingSession({
      scheduleId: f.scheduleA.id,
      topic: "Normalisasi Basis Data",
      method: "Demonstrasi dan praktik",
      summary: "Murid melakukan normalisasi tabel sampai bentuk normal ketiga.",
      latitude: -7.2,
      longitude: 107.9,
      accuracy: 5,
      evidenceKey: f.checkInEvidence,
    }, { user: f.teacherA });
    expect(result.alreadyStarted).toBe(true);
    expect(await prisma.lmsTeachingSession.count({ where: { scheduleId: f.scheduleA.id, dateOnly: dateOnly() } })).toBe(1);
  });

  it("12 Global Attendance prefills the Teaching Session date correctly", async () => {
    const seed: any = await getCourseAttendanceSeed({
      courseId: f.courseA.id,
      dateOnly: dateOnly(),
    }, { user: f.teacherA });
    const byId = new Map(seed.students.map((row: any) => [row.id, row]));
    expect((byId.get(f.s1.id) as any).defaultStatus).toBe("HADIR");
    expect((byId.get(f.s2.id) as any).defaultStatus).toBe("HADIR");
    expect((byId.get(f.s3.id) as any).defaultStatus).toBe("IZIN");
  });

  it("13 checkout is blocked before full-roster subject attendance exists", async () => {
    expectHttp(await capture(() => finishTeachingSession({
      sessionId: f.sessionA.id,
      version: f.sessionA.version,
      latitude: -7.2,
      longitude: 107.9,
      accuracy: 5,
      evidenceKey: f.checkOutEvidence,
    }, { user: f.teacherA })), 400);
  });

  it("14 linked subject attendance requires the complete current roster", async () => {
    expectHttp(await capture(() => recordCourseAttendance({
      courseId: f.courseA.id,
      teachingSessionId: f.sessionA.id,
      sessionNumber: 1,
      records: [{ studentId: f.s1.id, status: "ALPA" }],
    }, { user: f.teacherA })), 400);
  });

  it("15 full subject attendance saves independently from Global", async () => {
    f.attendanceSession = await recordCourseAttendance({
      courseId: f.courseA.id,
      teachingSessionId: f.sessionA.id,
      sessionNumber: 1,
      records: [
        { studentId: f.s1.id, status: "ALPA", notes: "UAT selective truancy" },
        { studentId: f.s2.id, status: "HADIR" },
        { studentId: f.s3.id, status: "IZIN" },
      ],
    }, { user: f.teacherA });
    const global = await prisma.schoolDailyAttendance.findUnique({
      where: { schoolId_studentId_dateOnly: { schoolId: f.schoolA.id, studentId: f.s1.id, dateOnly: dateOnly() } },
    });
    expect(global?.status).toBe("HADIR");
    expect(await prisma.lmsAttendanceRecord.findUnique({
      where: { sessionId_studentId: { sessionId: f.attendanceSession.id, studentId: f.s1.id } },
    })).toMatchObject({ status: "ALPA" });
  });

  it("16 repeated subject save updates in place rather than duplicating the session", async () => {
    await recordCourseAttendance({
      courseId: f.courseA.id,
      teachingSessionId: f.sessionA.id,
      sessionNumber: 1,
      records: [
        { studentId: f.s1.id, status: "ALPA", notes: "Tetap alpa mapel" },
        { studentId: f.s2.id, status: "TERLAMBAT" },
        { studentId: f.s3.id, status: "IZIN" },
      ],
    }, { user: f.teacherA });
    expect(await prisma.lmsAttendanceSession.count({ where: { teachingSessionId: f.sessionA.id } })).toBe(1);
    const s2 = await prisma.lmsAttendanceRecord.findUnique({
      where: { sessionId_studentId: { sessionId: f.attendanceSession.id, studentId: f.s2.id } },
    });
    expect(s2?.status).toBe("TERLAMBAT");
  });

  it("17 subject event is explicitly non-authoritative for Global", async () => {
    const event: any = await prisma.studentAttendanceEvent.findFirst({
      where: { schoolId: f.schoolA.id, studentId: f.s1.id, source: "LMS_SUBJECT" },
    });
    expect(event).not.toBeNull();
    expect((event.metadata as any)?.affectsGlobalAttendance).toBe(false);
    expect((event.metadata as any)?.teachingSessionId).toBe(f.sessionA.id);
  });

  it("18 engagement rubric persists and derives the expected level", async () => {
    const result: any = await saveTeachingEngagementScores({
      sessionId: f.sessionA.id,
      scores: [
        { studentId: f.s1.id, score: 95, notes: "Aktif praktik" },
        { studentId: f.s2.id, score: 85 },
        { studentId: f.s3.id, score: 65 },
      ],
    }, { user: f.teacherA });
    expect(result.count).toBe(3);
    const rows = await prisma.lmsEngagementScore.findMany({ where: { sessionId: f.sessionA.id }, orderBy: { score: "desc" } });
    expect(rows.map((row) => row.level)).toEqual(["SANGAT_AKTIF", "AKTIF", "PERLU_BIMBINGAN"]);
  });

  it("19 valid full-roster session can check out with optimistic versioning", async () => {
    const fresh = await prisma.lmsTeachingSession.findUniqueOrThrow({ where: { id: f.sessionA.id } });
    const result: any = await finishTeachingSession({
      sessionId: f.sessionA.id,
      version: fresh.version,
      latitude: -7.2,
      longitude: 107.9,
      accuracy: 5,
      evidenceKey: f.checkOutEvidence,
    }, { user: f.teacherA });
    expect(result.session?.status).toBe("COMPLETED");
    f.sessionA = result.session;
  });

  it("20 stale checkout is idempotent after completion and does not duplicate completion", async () => {
    const result: any = await finishTeachingSession({
      sessionId: f.sessionA.id,
      version: 1,
      latitude: -7.2,
      longitude: 107.9,
      accuracy: 5,
      evidenceKey: f.checkOutEvidence,
    }, { user: f.teacherA });
    expect(result.alreadyCompleted).toBe(true);
    expect(await prisma.lmsTeachingSessionEvent.count({ where: { sessionId: f.sessionA.id, actionType: "SESSION_COMPLETED" } })).toBe(1);
  });

  it("21 course history and recaps use the same Teaching Session data", async () => {
    const result: any = await getCourseTeachingData({ courseId: f.courseA.id }, { user: f.teacherA });
    expect(result.sessions.some((row: any) => row.id === f.sessionA.id)).toBe(true);
    const s1 = result.attendanceRecap.find((row: any) => row.studentId === f.s1.id);
    expect(s1.alpa).toBe(1);
    expect(s1.percentage).toBe(0);
    expect(result.engagementRecap.find((row: any) => row.studentId === f.s1.id).average).toBe(95);
  });

  it("22 engagement editing is rejected after the seven-day deadline", async () => {
    f.pastSession = await prisma.lmsTeachingSession.create({
      data: {
        courseId: f.courseA.id,
        dateOnly: dateOnly(-8),
        scheduledStartAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000),
        scheduledEndAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        status: "COMPLETED",
      },
    });
    expectHttp(await capture(() => saveTeachingEngagementScores({
      sessionId: f.pastSession.id,
      scores: [{ studentId: f.s1.id, score: 85 }],
    }, { user: f.teacherA })), 400);
  });

  it("23 teacher absence can be delegated to today's duty queue", async () => {
    const local = attendanceLocalParts(new Date());
    const laterStart = hhmmFromMinutes(Math.min(23 * 60 + 40, jakartaClockMinutes() + 8));
    const laterEnd = hhmmFromMinutes(Math.min(23 * 60 + 59, Math.max(jakartaClockMinutes() + 20, 23 * 60 + 45)));
    const start = laterStart < laterEnd ? laterStart : "23:30";
    const end = laterStart < laterEnd ? laterEnd : "23:59";
    f.delegationSchedule = await upsertTeachingSchedule({
      courseId: f.courseOther.id,
      dayOfWeek: local.weekday,
      startTime: start,
      endTime: end,
      roomLabel: "Ruang Piket UAT",
    }, { user: f.teacherOther });
    f.delegated = await delegateTeachingAbsence({
      scheduleId: f.delegationSchedule.id,
      dateOnly: dateOnly(),
      absenceType: "SAKIT",
      reason: "UAT guru berhalangan hadir",
      dutyInstruction: "Siswa mengerjakan latihan yang sudah disiapkan.",
    }, { user: f.teacherOther });
    expect(f.delegated.status).toBe("DELEGATED");
  });

  it("24 active duty teacher sees delegation and can mark it delivered", async () => {
    const queue: any = await getTeachingDutyQueue(undefined, { user: f.dutyA });
    expect(queue.items.some((item: any) => item.session?.id === f.delegated.id)).toBe(true);
    const delivered: any = await markTeachingDelegationDelivered({ sessionId: f.delegated.id }, { user: f.dutyA });
    expect(delivered.deliveredById).toBe(f.dutyA.id);
    expect(delivered.deliveredAt).not.toBeNull();
  });

  it("25 non-duty ordinary teacher cannot use the duty queue", async () => {
    expectHttp(await capture(() => getTeachingDutyQueue(undefined, { user: f.teacherA })), 403);
  });

  it("26 Waka Kurikulum has school-wide teaching audit access", async () => {
    const audit: any = await getTeachingAudit({ from: dateOnly(-1), to: dateOnly() }, { user: f.wakaA });
    expect(audit.scope.schoolWide).toBe(true);
    expect(audit.sessions.some((row: any) => row.id === f.sessionA.id)).toBe(true);
  });

  it("27 department head sees own department course and is denied another department course", async () => {
    const own: any = await getCourseTeachingData({ courseId: f.courseA.id }, { user: f.deptHeadA });
    expect(own.course.id).toBe(f.courseA.id);
    expectHttp(await capture(() => getCourseTeachingData({ courseId: f.courseOther.id }, { user: f.deptHeadA })), 403);
  });

  it("28 EWS identifies Global-present + subject-ALPA as selective truancy", async () => {
    const overview: any = await getUnifiedStudentRiskData({}, { user: f.adminA });
    const profile = overview.profiles.find((row: any) => row.student.id === f.s1.id);
    expect(profile).toBeTruthy();
    expect(profile.signals.some((signal: any) => signal.code === "SELECTIVE_TRUANCY")).toBe(true);
  });

  it("29 synthetic tenant B remains untouched", async () => {
    expect(await prisma.lmsTeachingSession.count({ where: { course: { schoolId: f.schoolB.id } } })).toBe(0);
    expect(await prisma.lmsTeachingSchedule.count({ where: { course: { schoolId: f.schoolB.id } } })).toBe(0);
    expect(await prisma.schoolDailyAttendance.count({ where: { schoolId: f.schoolB.id } })).toBe(0);
  });

  it("30 schedule deactivation keeps historical sessions intact", async () => {
    await deactivateTeachingSchedule({ scheduleId: f.scheduleA.id }, { user: f.teacherA });
    const schedule = await prisma.lmsTeachingSchedule.findUnique({ where: { id: f.scheduleA.id } });
    expect(schedule?.isActive).toBe(false);
    expect(await prisma.lmsTeachingSession.count({ where: { scheduleId: f.scheduleA.id } })).toBe(1);
  });
});
