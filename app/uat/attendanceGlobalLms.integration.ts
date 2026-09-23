import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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
  const url = process.env.ATTENDANCE_UAT_DATABASE_URL || "postgresql://invalid:invalid@127.0.0.1:1/attendance_uat_disabled";
  return {
    prisma: new PrismaClient({ datasources: { db: { url } } }),
    HttpError,
  };
});

import { prisma } from "wasp/server";
import { recordSelfAttendance } from "../src/attendance360/operations";
import { createAttendanceEventIdempotent, reconcileStudentDay } from "../src/attendance360/service";
import { attendanceLocalParts } from "../src/attendance360/time";
import { getCourseAttendanceSeed, recordCourseAttendance } from "../src/lms/operations";
import { getDailySchoolAttendance, saveDailySchoolAttendance } from "../src/school/dailyAttendanceOperations";

const PREFIX = "uat-attendance-oneway-1e53806d";
const runUat = !!process.env.ATTENDANCE_UAT_DATABASE_URL
  && process.env.ATTENDANCE_UAT_CONFIRM === "SYNTHETIC_PRODUCTION_UAT";
const uat = runUat ? describe.sequential : describe.skip;

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

function dateOnly(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return attendanceLocalParts(date).dateOnly;
}

async function productionSnapshot() {
  const school = await prisma.school.findFirst({
    where: { name: "SMKN 12 Garut" },
    select: { id: true },
  });
  if (!school) return { students: 0, daily: 0, events: 0 };
  const [students, daily, events] = await Promise.all([
    prisma.user.count({ where: { schoolId: school.id, role: "STUDENT" } }),
    prisma.schoolDailyAttendance.count({ where: { schoolId: school.id } }),
    prisma.studentAttendanceEvent.count({ where: { schoolId: school.id } }),
  ]);
  return { students, daily, events };
}

async function cleanupSynthetic() {
  const schools = await prisma.school.findMany({
    where: { slug: { startsWith: PREFIX } },
    select: { id: true },
  });
  const ids = schools.map((row) => row.id);
  if (!ids.length) return;

  await prisma.lmsAttendanceSession.deleteMany({
    where: { course: { schoolId: { in: ids } } },
  });
  await prisma.lmsCourse.deleteMany({ where: { schoolId: { in: ids } } });
  await prisma.studentAttendanceEvent.deleteMany({ where: { schoolId: { in: ids } } });
  await prisma.schoolDailyAttendance.deleteMany({ where: { schoolId: { in: ids } } });
  await prisma.schoolAttendancePolicy.deleteMany({ where: { schoolId: { in: ids } } });
  await prisma.schoolStaffAssignment.deleteMany({ where: { schoolId: { in: ids } } });
  await prisma.classRoom.updateMany({
    where: { schoolId: { in: ids } },
    data: { homeroomTeacherId: null },
  });
  await prisma.user.deleteMany({ where: { schoolId: { in: ids } } });
  await prisma.classRoom.deleteMany({ where: { schoolId: { in: ids } } });
  await prisma.academicYear.deleteMany({ where: { schoolId: { in: ids } } });
  await prisma.school.deleteMany({ where: { id: { in: ids } } });
}

uat("Attendance Global -> LMS one-way real DB UAT", () => {
  const f: Record<string, any> = {};
  let baseline: { students: number; daily: number; events: number };

  beforeAll(async () => {
    const dbName = new URL(process.env.ATTENDANCE_UAT_DATABASE_URL!).pathname.replace(/^\//, "");
    if (!dbName.includes("attendance_uat")) {
      throw new Error("Refusing Attendance UAT outside an attendance_uat database.");
    }
    baseline = await productionSnapshot();
    await cleanupSynthetic();

    f.schoolA = await prisma.school.create({
      data: {
        name: "UAT Attendance OneWay A",
        slug: PREFIX + "-a",
        npsn: "UAT-ATT-A",
        studentQuota: 100,
      },
    });
    f.schoolB = await prisma.school.create({
      data: {
        name: "UAT Attendance OneWay B",
        slug: PREFIX + "-b",
        npsn: "UAT-ATT-B",
        studentQuota: 100,
      },
    });

    f.yearA = await prisma.academicYear.create({
      data: {
        schoolId: f.schoolA.id,
        yearName: "2026/2027",
        semester: "GANJIL",
        isActive: true,
      },
    });
    f.yearB = await prisma.academicYear.create({
      data: {
        schoolId: f.schoolB.id,
        yearName: "2026/2027",
        semester: "GANJIL",
        isActive: true,
      },
    });

    const createUser = (schoolId: string, role: any, name: string, extra: any = {}) =>
      prisma.user.create({ data: { schoolId, role, name, ...extra } });

    f.adminA = await createUser(f.schoolA.id, "SCHOOL_ADMIN", "UAT Admin A");
    f.homeroomA = await createUser(f.schoolA.id, "TEACHER", "UAT Wali A");
    f.dutyA = await createUser(f.schoolA.id, "TEACHER", "UAT Piket A");
    f.teacherA = await createUser(f.schoolA.id, "TEACHER", "UAT Guru Mapel A");
    f.teacherOther = await createUser(f.schoolA.id, "TEACHER", "UAT Guru Lain");
    f.teacherB = await createUser(f.schoolB.id, "TEACHER", "UAT Guru Tenant B");

    f.classA = await prisma.classRoom.create({
      data: {
        schoolId: f.schoolA.id,
        academicYearId: f.yearA.id,
        gradeLevel: 12,
        name: "XII UAT A",
        homeroomTeacherId: f.homeroomA.id,
      },
    });
    f.classOther = await prisma.classRoom.create({
      data: {
        schoolId: f.schoolA.id,
        academicYearId: f.yearA.id,
        gradeLevel: 12,
        name: "XII UAT OTHER",
      },
    });
    f.classB = await prisma.classRoom.create({
      data: {
        schoolId: f.schoolB.id,
        academicYearId: f.yearB.id,
        gradeLevel: 12,
        name: "XII UAT B",
      },
    });

    for (const key of ["s1", "s2", "s3", "s4", "s5"]) {
      f[key] = await createUser(f.schoolA.id, "STUDENT", "UAT " + key.toUpperCase(), {
        classRoomId: f.classA.id,
      });
    }
    f.s6 = await createUser(f.schoolA.id, "STUDENT", "UAT S6", {
      classRoomId: f.classOther.id,
    });
    f.studentB = await createUser(f.schoolB.id, "STUDENT", "UAT Student B", {
      classRoomId: f.classB.id,
    });

    f.courseA = await prisma.lmsCourse.create({
      data: {
        schoolId: f.schoolA.id,
        academicYearId: f.yearA.id,
        classRoomId: f.classA.id,
        teacherId: f.teacherA.id,
        subjectName: "UAT Informatika",
      },
    });
    f.courseOther = await prisma.lmsCourse.create({
      data: {
        schoolId: f.schoolA.id,
        academicYearId: f.yearA.id,
        classRoomId: f.classOther.id,
        teacherId: f.teacherOther.id,
        subjectName: "UAT Mapel Lain",
      },
    });
    f.courseB = await prisma.lmsCourse.create({
      data: {
        schoolId: f.schoolB.id,
        academicYearId: f.yearB.id,
        classRoomId: f.classB.id,
        teacherId: f.teacherB.id,
        subjectName: "UAT Tenant B",
      },
    });

    await prisma.schoolStaffAssignment.create({
      data: {
        schoolId: f.schoolA.id,
        teacherId: f.dutyA.id,
        role: "DUTY_TEACHER",
        academicYearId: f.yearA.id,
        dutyDays: [],
        isActive: true,
      },
    });

    await prisma.schoolAttendancePolicy.create({
      data: {
        schoolId: f.schoolA.id,
        timezone: "Asia/Jakarta",
        latitude: -7.2000,
        longitude: 107.9000,
        radiusMeters: 1000,
        maxGpsAccuracyMeters: 1000,
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
  });

  afterAll(async () => {
    await cleanupSynthetic();
    const after = await productionSnapshot();
    expect(after).toEqual(baseline);
    await prisma.$disconnect();
  });

  it("01 self check-in creates Global HADIR", async () => {
    const result: any = await recordSelfAttendance({
      type: "CHECK_IN",
      latitude: -7.2000,
      longitude: 107.9000,
      accuracy: 10,
    }, { user: f.s1 });
    expect(result.daily?.status).toBe("HADIR");
    expect(result.daily?.studentId).toBe(f.s1.id);
  });

  it("02 repeated self check-in is idempotent", async () => {
    const result: any = await recordSelfAttendance({
      type: "CHECK_IN",
      latitude: -7.2000,
      longitude: 107.9000,
      accuracy: 10,
    }, { user: f.s1 });
    expect(result.alreadyRecorded).toBe(true);
    const count = await prisma.studentAttendanceEvent.count({
      where: { schoolId: f.schoolA.id, studentId: f.s1.id, type: "SELF_CHECK_IN" },
    });
    expect(count).toBe(1);
  });

  it("03 subject-only evidence does not create Global attendance", async () => {
    const today = dateOnly();
    await createAttendanceEventIdempotent({
      schoolId: f.schoolA.id,
      studentId: f.s6.id,
      dateOnly: today,
      type: "SUBJECT_ATTENDANCE",
      status: "ALPA",
      source: "LMS_SUBJECT",
      sourceKey: "uat:subject-only:" + f.s6.id,
      actorId: f.teacherOther.id,
      occurredAt: new Date(),
    });
    const result = await reconcileStudentDay(f.schoolA.id, f.s6.id, today, f.teacherOther.id);
    expect(result.record).toBeNull();
    expect(result.suggestion.status).toBeNull();
  });

  it("04 admin can establish the official Global roster snapshot", async () => {
    const today = dateOnly();
    const saved: any = await saveDailySchoolAttendance({
      classRoomId: f.classA.id,
      dateOnly: today,
      records: [
        { studentId: f.s1.id, status: "HADIR" },
        { studentId: f.s2.id, status: "TERLAMBAT" },
        { studentId: f.s3.id, status: "SAKIT" },
        { studentId: f.s4.id, status: "IZIN" },
        { studentId: f.s5.id, status: "ALPA" },
      ],
    }, { user: f.adminA });
    expect(saved.savedCount).toBe(5);
  });

  it("05 LMS prefill maps Global statuses one-way", async () => {
    const seed: any = await getCourseAttendanceSeed({ courseId: f.courseA.id }, { user: f.teacherA });
    const byId = new Map(seed.students.map((row: any) => [row.id, row]));
    expect((byId.get(f.s1.id) as any).defaultStatus).toBe("HADIR");
    expect((byId.get(f.s2.id) as any).defaultStatus).toBe("HADIR");
    expect((byId.get(f.s3.id) as any).defaultStatus).toBe("SAKIT");
    expect((byId.get(f.s4.id) as any).defaultStatus).toBe("IZIN");
    expect((byId.get(f.s5.id) as any).defaultStatus).toBe("ALPA");
  });

  it("06 no Global record means no invented LMS default", async () => {
    const seed: any = await getCourseAttendanceSeed({ courseId: f.courseOther.id }, { user: f.teacherOther });
    expect(seed.students).toHaveLength(1);
    expect(seed.students[0].globalStatus).toBeNull();
    expect(seed.students[0].defaultStatus).toBeNull();
  });

  it("07 another teacher cannot read attendance seed for an unmanaged course", async () => {
    expectHttp(await capture(() =>
      getCourseAttendanceSeed({ courseId: f.courseA.id }, { user: f.teacherOther })
    ), 404);
  });

  it("08 cross-tenant teacher cannot read attendance seed", async () => {
    expectHttp(await capture(() =>
      getCourseAttendanceSeed({ courseId: f.courseA.id }, { user: f.teacherB })
    ), 404);
  });

  it("09 subject ALPA is stored but does not change Global HADIR", async () => {
    const session: any = await recordCourseAttendance({
      courseId: f.courseA.id,
      sessionNumber: 1,
      records: [{ studentId: f.s1.id, status: "ALPA", notes: "UAT bolos mapel" }],
    }, { user: f.teacherA });
    f.session1 = session;
    const [subject, global] = await Promise.all([
      prisma.lmsAttendanceRecord.findUnique({
        where: { sessionId_studentId: { sessionId: session.id, studentId: f.s1.id } },
      }),
      prisma.schoolDailyAttendance.findUnique({
        where: { schoolId_studentId_dateOnly: {
          schoolId: f.schoolA.id,
          studentId: f.s1.id,
          dateOnly: dateOnly(),
        } },
      }),
    ]);
    expect(subject?.status).toBe("ALPA");
    expect(global?.status).toBe("HADIR");
  });

  it("10 subject HADIR does not replace Global SAKIT", async () => {
    await recordCourseAttendance({
      courseId: f.courseA.id,
      sessionNumber: 2,
      records: [{ studentId: f.s3.id, status: "HADIR" }],
    }, { user: f.teacherA });
    const global = await prisma.schoolDailyAttendance.findUnique({
      where: { schoolId_studentId_dateOnly: {
        schoolId: f.schoolA.id,
        studentId: f.s3.id,
        dateOnly: dateOnly(),
      } },
    });
    expect(global?.status).toBe("SAKIT");
  });

  it("11 subject evidence is explicitly non-authoritative for Global", async () => {
    const event: any = await prisma.studentAttendanceEvent.findFirst({
      where: {
        schoolId: f.schoolA.id,
        studentId: f.s1.id,
        type: "SUBJECT_ATTENDANCE",
        source: "LMS_SUBJECT",
      },
      orderBy: { createdAt: "desc" },
    });
    expect(event).not.toBeNull();
    expect((event?.metadata as any)?.affectsGlobalAttendance).toBe(false);
  });

  it("12 homeroom teacher can correct Global for own class", async () => {
    await saveDailySchoolAttendance({
      classRoomId: f.classA.id,
      dateOnly: dateOnly(),
      records: [
        { studentId: f.s1.id, status: "IZIN", notes: "UAT koreksi wali" },
        { studentId: f.s2.id, status: "TERLAMBAT" },
        { studentId: f.s3.id, status: "SAKIT" },
        { studentId: f.s4.id, status: "IZIN" },
        { studentId: f.s5.id, status: "ALPA" },
      ],
    }, { user: f.homeroomA });
    const global = await prisma.schoolDailyAttendance.findUnique({
      where: { schoolId_studentId_dateOnly: {
        schoolId: f.schoolA.id,
        studentId: f.s1.id,
        dateOnly: dateOnly(),
      } },
    });
    expect(global?.status).toBe("IZIN");
  });

  it("13 later Global correction does not rewrite saved LMS session", async () => {
    const subject = await prisma.lmsAttendanceRecord.findUnique({
      where: { sessionId_studentId: { sessionId: f.session1.id, studentId: f.s1.id } },
    });
    expect(subject?.status).toBe("ALPA");
  });

  it("14 ordinary teacher cannot edit Global attendance", async () => {
    expectHttp(await capture(() =>
      saveDailySchoolAttendance({
        classRoomId: f.classA.id,
        dateOnly: dateOnly(),
        records: [
          { studentId: f.s1.id, status: "HADIR" },
          { studentId: f.s2.id, status: "HADIR" },
          { studentId: f.s3.id, status: "HADIR" },
          { studentId: f.s4.id, status: "HADIR" },
          { studentId: f.s5.id, status: "HADIR" },
        ],
      }, { user: f.teacherOther })
    ), 403);
  });

  it("15 active duty teacher can see all active classes today", async () => {
    const data: any = await getDailySchoolAttendance({ dateOnly: dateOnly() }, { user: f.dutyA });
    expect(data.access.isDutyTeacher).toBe(true);
    expect(data.classes.map((row: any) => row.id)).toEqual(
      expect.arrayContaining([f.classA.id, f.classOther.id]),
    );
  });

  it("16 active duty teacher can correct Global in another class today", async () => {
    await saveDailySchoolAttendance({
      classRoomId: f.classOther.id,
      dateOnly: dateOnly(),
      records: [{ studentId: f.s6.id, status: "TERLAMBAT", notes: "UAT koreksi piket" }],
    }, { user: f.dutyA });
    const [global, event] = await Promise.all([
      prisma.schoolDailyAttendance.findUnique({
        where: { schoolId_studentId_dateOnly: {
          schoolId: f.schoolA.id,
          studentId: f.s6.id,
          dateOnly: dateOnly(),
        } },
      }),
      prisma.studentAttendanceEvent.findFirst({
        where: {
          schoolId: f.schoolA.id,
          studentId: f.s6.id,
          source: "DUTY_TEACHER",
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    expect(global?.status).toBe("TERLAMBAT");
    expect((event?.metadata as any)?.overrideRole).toBe("DUTY");
  });

  it("17 duty teacher cannot edit Global for a past date", async () => {
    expectHttp(await capture(() =>
      saveDailySchoolAttendance({
        classRoomId: f.classOther.id,
        dateOnly: dateOnly(-1),
        records: [{ studentId: f.s6.id, status: "HADIR" }],
      }, { user: f.dutyA })
    ), 403);
  });

  it("18 homeroom teacher cannot edit another class", async () => {
    expectHttp(await capture(() =>
      saveDailySchoolAttendance({
        classRoomId: f.classOther.id,
        dateOnly: dateOnly(),
        records: [{ studentId: f.s6.id, status: "HADIR" }],
      }, { user: f.homeroomA })
    ), 403);
  });

  it("19 LMS rejects duplicate and cross-class student records", async () => {
    expectHttp(await capture(() =>
      recordCourseAttendance({
        courseId: f.courseA.id,
        sessionNumber: 3,
        records: [
          { studentId: f.s2.id, status: "HADIR" },
          { studentId: f.s2.id, status: "ALPA" },
        ],
      }, { user: f.teacherA })
    ), 400);

    expectHttp(await capture(() =>
      recordCourseAttendance({
        courseId: f.courseA.id,
        sessionNumber: 3,
        records: [{ studentId: f.s6.id, status: "HADIR" }],
      }, { user: f.teacherA })
    ), 400);
  });

  it("20 synthetic tenant B remains untouched", async () => {
    expect(await prisma.schoolDailyAttendance.count({ where: { schoolId: f.schoolB.id } })).toBe(0);
    expect(await prisma.studentAttendanceEvent.count({ where: { schoolId: f.schoolB.id } })).toBe(0);
    expect(await prisma.lmsAttendanceSession.count({ where: { course: { schoolId: f.schoolB.id } } })).toBe(0);
  });
});
