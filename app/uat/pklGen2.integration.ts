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
  const url = process.env.PKL_UAT_DATABASE_URL || "postgresql://invalid:invalid@127.0.0.1:1/pkl_uat_disabled";
  return {
    prisma: new PrismaClient({ datasources: { db: { url } } }),
    HttpError,
  };
});

import { prisma } from "wasp/server";
import {
  activatePlacement,
  commitPklImport,
  correctAttendance,
  createPlacementsBulk,
  finalizePlacement,
  getPklDashboard,
  getPklReportData,
  getPlacementHistory,
  getPlacementReadiness,
  getPklEvidenceUploadStatus,
  previewPklImport,
  recordAttendanceException,
  recordAttendanceGen2,
  setAttendanceDayStatus,
  reviewDailyJournalGen2,
  saveDailyJournalGen2,
  savePklWorkSchedule,
  transferPlacement,
  updatePlacementGen2,
} from "../src/pkl/gen2Operations";
import {
  getAttendanceLogs,
  getDailyJournals,
  getPklEwsAlerts,
  getPlacements,
} from "../src/pkl/operations";

type AnyUser = any;
const runUat = !!process.env.PKL_UAT_DATABASE_URL;
const uat = runUat ? describe.sequential : describe.skip;

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function jakartaDate(days = 0) {
  const date = daysFromNow(days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

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

uat("PKL Gen2 UAT real-database workflow", () => {
  const f: Record<string, any> = {};

  beforeAll(async () => {
    const dbName = new URL(process.env.PKL_UAT_DATABASE_URL!).pathname.replace(/^\//, "");
    if (!dbName.includes("pkl_uat")) {
      throw new Error("Refusing PKL UAT: database name must contain pkl_uat.");
    }

    const schoolA = await prisma.school.create({
      data: { name: "UAT School A", slug: "uat-school-a", npsn: "UAT-A", studentQuota: 100 },
    });
    const schoolB = await prisma.school.create({
      data: { name: "UAT School B", slug: "uat-school-b", npsn: "UAT-B", studentQuota: 100 },
    });
    f.schoolA = schoolA;
    f.schoolB = schoolB;

    const yearA = await prisma.academicYear.create({
      data: { schoolId: schoolA.id, yearName: "2026/2027", semester: "GANJIL", isActive: true },
    });
    const yearB = await prisma.academicYear.create({
      data: { schoolId: schoolB.id, yearName: "2026/2027", semester: "GANJIL", isActive: true },
    });
    f.yearA = yearA;

    const deptRpl = await prisma.department.create({
      data: { schoolId: schoolA.id, code: "RPL", name: "Rekayasa Perangkat Lunak" },
    });
    const deptTsm = await prisma.department.create({
      data: { schoolId: schoolA.id, code: "TSM", name: "Teknik Sepeda Motor" },
    });
    const deptB = await prisma.department.create({
      data: { schoolId: schoolB.id, code: "RPL", name: "RPL Tenant B" },
    });
    f.deptRpl = deptRpl;
    f.deptTsm = deptTsm;

    const classRpl = await prisma.classRoom.create({
      data: { schoolId: schoolA.id, academicYearId: yearA.id, departmentId: deptRpl.id, gradeLevel: 12, name: "XII RPL UAT" },
    });
    const classTsm = await prisma.classRoom.create({
      data: { schoolId: schoolA.id, academicYearId: yearA.id, departmentId: deptTsm.id, gradeLevel: 12, name: "XII TSM UAT" },
    });
    const classB = await prisma.classRoom.create({
      data: { schoolId: schoolB.id, academicYearId: yearB.id, departmentId: deptB.id, gradeLevel: 12, name: "XII RPL B" },
    });

    const createUser = (data: any) => prisma.user.create({ data });
    f.adminA = await createUser({ schoolId: schoolA.id, role: "SCHOOL_ADMIN", name: "Admin UAT A" });
    f.teacherA = await createUser({ schoolId: schoolA.id, role: "TEACHER", name: "Guru Pembimbing A" });
    f.teacherOtherA = await createUser({ schoolId: schoolA.id, role: "TEACHER", name: "Guru Lain A" });
    f.adminB = await createUser({ schoolId: schoolB.id, role: "SCHOOL_ADMIN", name: "Admin UAT B" });
    f.teacherB = await createUser({ schoolId: schoolB.id, role: "TEACHER", name: "Guru B" });
    await prisma.teacherProfile.create({ data: { userId: f.teacherA.id, nip: "UAT-NIP-001" } });
    await prisma.teacherProfile.create({ data: { userId: f.teacherOtherA.id, nip: "UAT-NIP-002" } });

    for (const [key, nis, nisn, room] of [
      ["s1", "UAT001", "UATN001", classRpl],
      ["s2", "UAT002", "UATN002", classRpl],
      ["s3", "UAT003", "UATN003", classRpl],
      ["s4", "UAT004", "UATN004", classTsm],
      ["s5", "UAT005", "UATN005", classRpl],
      ["s6", "UAT006", "UATN006", classRpl],
      ["s7", "UAT007", "UATN007", classRpl],
      ["s8", "UAT008", "UATN008", classRpl],
      ["s9", "UAT009", "UATN009", classRpl],
      ["s10", "UAT010", "UATN010", classRpl],
    ] as any[]) {
      const user = await createUser({ schoolId: schoolA.id, classRoomId: room.id, role: "STUDENT", name: "Student " + key.toUpperCase() });
      await prisma.studentProfile.create({ data: { userId: user.id, nis, nisn, status: "ACTIVE" } });
      f[key] = user;
    }
    f.studentB = await createUser({ schoolId: schoolB.id, classRoomId: classB.id, role: "STUDENT", name: "Student Tenant B" });
    await prisma.studentProfile.create({ data: { userId: f.studentB.id, nis: "B001", nisn: "BN001" } });

    f.periodA = await prisma.pklPeriod.create({
      data: {
        schoolId: schoolA.id,
        academicYearId: yearA.id,
        name: "PKL UAT 2026",
        startDate: daysFromNow(-10),
        endDate: daysFromNow(30),
        isActive: true,
      },
    });
    f.periodB = await prisma.pklPeriod.create({
      data: { schoolId: schoolB.id, academicYearId: yearB.id, name: "PKL B", startDate: daysFromNow(-10), endDate: daysFromNow(30), isActive: true },
    });

    f.companyA1 = await prisma.company.create({
      data: {
        schoolId: schoolA.id, code: "UAT-DUDI-1", name: "DUDI UAT 1", address: "Alamat 1",
        latitude: -7.2, longitude: 107.9, radiusMeters: 150, partnershipStatus: "ACTIVE", isActive: true,
      },
    });
    f.companyA2 = await prisma.company.create({
      data: {
        schoolId: schoolA.id, code: "UAT-DUDI-2", name: "DUDI UAT 2", address: "Alamat 2",
        latitude: -7.21, longitude: 107.91, radiusMeters: 150, partnershipStatus: "ACTIVE", isActive: true,
      },
    });
    f.companyA3 = await prisma.company.create({
      data: {
        schoolId: schoolA.id, code: "UAT-DUDI-3", name: "DUDI UAT Concurrency", address: "Alamat 3",
        latitude: -7.22, longitude: 107.92, radiusMeters: 150, partnershipStatus: "ACTIVE", isActive: true,
      },
    });
    f.companyTsm = await prisma.company.create({
      data: { schoolId: schoolA.id, code: "UAT-TSM", name: "DUDI TSM", address: "Alamat TSM", partnershipStatus: "ACTIVE", isActive: true },
    });
    f.companyB = await prisma.company.create({
      data: { schoolId: schoolB.id, code: "B-DUDI", name: "DUDI B", address: "Alamat B", partnershipStatus: "ACTIVE", isActive: true },
    });

    await prisma.companyDepartment.createMany({
      data: [
        { schoolId: schoolA.id, companyId: f.companyA1.id, departmentId: deptRpl.id },
        { schoolId: schoolA.id, companyId: f.companyA2.id, departmentId: deptRpl.id },
        { schoolId: schoolA.id, companyId: f.companyA3.id, departmentId: deptRpl.id },
        { schoolId: schoolA.id, companyId: f.companyTsm.id, departmentId: deptTsm.id },
        { schoolId: schoolB.id, companyId: f.companyB.id, departmentId: deptB.id },
      ],
    });
    await prisma.pklCompanyCapacity.createMany({
      data: [
        { schoolId: schoolA.id, periodId: f.periodA.id, companyId: f.companyA1.id, departmentId: deptRpl.id, quota: 2 },
        { schoolId: schoolA.id, periodId: f.periodA.id, companyId: f.companyA2.id, departmentId: deptRpl.id, quota: 3 },
        { schoolId: schoolA.id, periodId: f.periodA.id, companyId: f.companyA3.id, departmentId: deptRpl.id, quota: 1 },
        { schoolId: schoolA.id, periodId: f.periodA.id, companyId: f.companyTsm.id, departmentId: deptTsm.id, quota: 2 },
        { schoolId: schoolB.id, periodId: f.periodB.id, companyId: f.companyB.id, departmentId: deptB.id, quota: 2 },
      ],
    });

    const mentor = async (schoolId: string, companyId: string, name: string) => {
      const user = await createUser({ schoolId, role: "DUDI_MENTOR", name });
      await prisma.dudiMentorProfile.create({ data: { schoolId, companyId, userId: user.id, position: "Pembimbing", isActive: true } });
      return user;
    };
    f.mentorA1 = await mentor(schoolA.id, f.companyA1.id, "Mentor A1");
    f.mentorA2 = await mentor(schoolA.id, f.companyA2.id, "Mentor A2");
    f.mentorA3 = await mentor(schoolA.id, f.companyA3.id, "Mentor A3");
    f.mentorTsm = await mentor(schoolA.id, f.companyTsm.id, "Mentor TSM");
    f.mentorB = await mentor(schoolB.id, f.companyB.id, "Mentor B");

    f.placementB = await prisma.placement.create({
      data: {
        schoolId: schoolB.id, studentId: f.studentB.id, companyId: f.companyB.id,
        pklPeriodId: f.periodB.id, departmentId: deptB.id, teacherSupervisorId: f.teacherB.id,
        dudiMentorId: f.mentorB.id, startDate: daysFromNow(-2), endDate: daysFromNow(20), status: "ACTIVE",
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("01 — bulk placement enforces tenant, department, duplicate, and Gen2 capacity", async () => {
    const created = await createPlacementsBulk({
      studentIds: [f.s1.id, f.s2.id],
      periodId: f.periodA.id,
      companyId: f.companyA1.id,
      teacherSupervisorId: f.teacherA.id,
      dudiMentorId: f.mentorA1.id,
    }, { user: f.adminA });
    expect(created.count).toBe(2);
    expect(created.placements.every((row: any) => row.status === "PLANNED")).toBe(true);
    f.p1 = created.placements.find((row: any) => row.studentId === f.s1.id);
    f.p2 = created.placements.find((row: any) => row.studentId === f.s2.id);

    expectHttp(await capture(() => createPlacementsBulk({
      studentIds: [f.s3.id], periodId: f.periodA.id, companyId: f.companyA1.id,
      teacherSupervisorId: f.teacherA.id, dudiMentorId: f.mentorA1.id,
    }, { user: f.adminA })), 400);

    expectHttp(await capture(() => createPlacementsBulk({
      studentIds: [f.s4.id], periodId: f.periodA.id, companyId: f.companyA1.id,
      teacherSupervisorId: f.teacherA.id, dudiMentorId: f.mentorA1.id,
    }, { user: f.adminA })), 400);

    expectHttp(await capture(() => createPlacementsBulk({
      studentIds: [f.studentB.id], periodId: f.periodA.id, companyId: f.companyA1.id,
      teacherSupervisorId: f.teacherA.id, dudiMentorId: f.mentorA1.id,
    }, { user: f.adminA })), 404);

    expectHttp(await capture(() => createPlacementsBulk({
      studentIds: [f.s1.id], periodId: f.periodA.id, companyId: f.companyA2.id,
      teacherSupervisorId: f.teacherA.id, dudiMentorId: f.mentorA2.id,
    }, { user: f.adminA })), 400);
  });

  it("02 — readiness and activation are assignment-scoped", async () => {
    const ready = await getPlacementReadiness({ id: f.p1.id }, { user: f.adminA });
    expect(ready.ready).toBe(true);

    expectHttp(await capture(() => getPlacementReadiness({ id: f.p1.id }, { user: f.teacherOtherA })), 404);
    expectHttp(await capture(() => getPlacementReadiness({ id: f.p1.id }, { user: f.studentB })), 404);

    await activatePlacement({ id: f.p1.id }, { user: f.adminA });
    const active = await prisma.placement.findUnique({ where: { id: f.p1.id } });
    expect(active?.status).toBe("ACTIVE");
    expect(active?.readinessCheckedAt).not.toBeNull();

    const events = await getPlacementHistory({ id: f.p1.id }, { user: f.teacherA });
    expect(events.map((row: any) => row.eventType)).toEqual(expect.arrayContaining(["CREATED", "ACTIVATED"]));
  });

  it("03 — active placement cannot be made unready and PLANNED cannot be completed", async () => {
    expectHttp(await capture(() => updatePlacementGen2({
      id: f.p1.id,
      teacherSupervisorId: null,
    }, { user: f.adminA })), 400);

    expectHttp(await capture(() => updatePlacementGen2({
      id: f.p1.id,
      dudiMentorId: null,
    }, { user: f.adminA })), 400);

    expectHttp(await capture(() => transferPlacement({
      id: f.p1.id,
      targetCompanyId: f.companyA2.id,
      targetMentorId: null,
      reason: "UAT transfer without mentor",
    }, { user: f.adminA })), 400);

    expectHttp(await capture(() => finalizePlacement({
      id: f.p2.id,
      status: "COMPLETED",
      reason: "Should not complete planned placement",
    }, { user: f.adminA })), 400);
  });

  it("04 — active transfer preserves history and valid reviewer assignment", async () => {
    const moved = await transferPlacement({
      id: f.p1.id,
      targetCompanyId: f.companyA2.id,
      targetMentorId: f.mentorA2.id,
      reason: "UAT valid company transfer",
    }, { user: f.adminA });
    expect(moved.companyId).toBe(f.companyA2.id);
    expect(moved.dudiMentorId).toBe(f.mentorA2.id);
    expect(moved.status).toBe("ACTIVE");

    const events = await getPlacementHistory({ id: f.p1.id }, { user: f.adminA });
    expect(events.some((row: any) => row.eventType === "TRANSFERRED")).toBe(true);
  });

  it("05 — attendance enforces work schedule, ordering, ownership, and day-state conflict", async () => {
    await savePklWorkSchedule({
      periodId: f.periodA.id,
      companyId: f.companyA2.id,
      workingDays: "0,1,2,3,4,5,6",
      checkInStart: "00:00",
      lateAfter: "00:01",
      checkOutStart: "00:02",
      checkOutEnd: "23:59",
      isActive: true,
      notes: "UAT all-days schedule",
    }, { user: f.adminA });

    const outBeforeIn = await capture(() => recordAttendanceGen2({
      placementId: f.p1.id, type: "CHECK_OUT", latitude: -7.21, longitude: 107.91,
    }, { user: f.s1 }));
    if (outBeforeIn.ok) {
      await prisma.attendanceLog.delete({ where: { id: (outBeforeIn.value as any).id } });
    }
    expectHttp(outBeforeIn, 400);

    expectHttp(await capture(() => recordAttendanceGen2({
      placementId: f.p1.id, type: "CHECK_IN", latitude: -7.21, longitude: 107.91,
    }, { user: f.s2 })), 404);

    const checkIn = await recordAttendanceGen2({
      placementId: f.p1.id, type: "CHECK_IN", latitude: -7.21, longitude: 107.91,
    }, { user: f.s1 });
    expect(checkIn.geofenceStatus).toBe("INSIDE");
    expect(checkIn.status).toBe("TERLAMBAT");

    expectHttp(await capture(() => recordAttendanceGen2({
      placementId: f.p1.id, type: "CHECK_IN", latitude: -7.21, longitude: 107.91,
    }, { user: f.s1 })), 409);

    await recordAttendanceGen2({
      placementId: f.p1.id, type: "CHECK_OUT", latitude: -7.21, longitude: 107.91,
    }, { user: f.s1 });

    const exceptionAfterPresence = await capture(() => recordAttendanceException({
      placementId: f.p1.id, status: "SAKIT", notes: "UAT conflict with recorded presence",
    }, { user: f.s1 }));
    if (exceptionAfterPresence.ok) {
      await prisma.attendanceLog.delete({ where: { id: (exceptionAfterPresence.value as any).id } });
    }
    expectHttp(exceptionAfterPresence, 409);

    const logsStudent = await getAttendanceLogs({}, { user: f.s1 });
    const logsOtherStudent = await getAttendanceLogs({}, { user: f.s2 });
    expect(logsStudent.length).toBe(2);
    expect(logsOtherStudent.length).toBe(0);

    await correctAttendance({
      id: checkIn.id,
      status: "HADIR",
      notes: "UAT correction",
      reason: "Validasi operator UAT",
    }, { user: f.adminA });
    const corrected = await prisma.attendanceLog.findUnique({ where: { id: checkIn.id } });
    expect(corrected?.isManualCorrection).toBe(true);
    expect(corrected?.correctedById).toBe(f.adminA.id);
  });

  it("06 — journal Draft → Submit → dual review with strict assignment scope", async () => {
    const dateOnly = jakartaDate();
    const draft = await saveDailyJournalGen2({
      placementId: f.p1.id,
      dateOnly,
      activityDescription: "Mengerjakan pengujian modul aplikasi.",
      competencies: "Testing dan debugging",
      obstacleDescription: "Tidak ada kendala berarti.",
      reflection: "Belajar memvalidasi hasil kerja.",
      submit: false,
    }, { user: f.s1 });
    expect(draft.status).toBe("DRAFT");

    const submitted = await saveDailyJournalGen2({
      placementId: f.p1.id,
      dateOnly,
      activityDescription: "Mengerjakan pengujian modul aplikasi dan mencatat hasil.",
      competencies: "Testing, debugging, dokumentasi",
      obstacleDescription: "Tidak ada kendala berarti.",
      reflection: "Belajar memvalidasi hasil kerja secara sistematis.",
      submit: true,
    }, { user: f.s1 });
    expect(submitted.status).toBe("SUBMITTED");

    expectHttp(await capture(() => reviewDailyJournalGen2({
      id: submitted.id, decision: "APPROVED", feedback: "Tidak berwenang", score: 80,
    }, { user: f.teacherOtherA })), 404);

    const teacherReview = await reviewDailyJournalGen2({
      id: submitted.id, decision: "APPROVED", feedback: "Baik dari guru.", score: 90,
    }, { user: f.teacherA });
    expect(teacherReview.status).toBe("SUBMITTED");
    expect(teacherReview.teacherReviewStatus).toBe("APPROVED");

    const mentorReview = await reviewDailyJournalGen2({
      id: submitted.id, decision: "APPROVED", feedback: "Baik dari DUDI.", score: 80,
    }, { user: f.mentorA2 });
    expect(mentorReview.status).toBe("APPROVED");
    expect(mentorReview.score).toBe(85);

    const own = await getDailyJournals({}, { user: f.s1 });
    const other = await getDailyJournals({}, { user: f.s2 });
    expect(own).toHaveLength(1);
    expect(other).toHaveLength(0);
  });

  it("07 — dashboards and reports never leak another tenant or unrelated assignment", async () => {
    const adminDash = await getPklDashboard({}, { user: f.adminA });
    const teacherDash = await getPklDashboard({}, { user: f.teacherA });
    const unrelatedTeacherDash = await getPklDashboard({}, { user: f.teacherOtherA });
    const studentDash = await getPklDashboard({}, { user: f.s1 });
    const mentorDash = await getPklDashboard({}, { user: f.mentorA2 });

    expect(adminDash.placements.every((p: any) => p.studentId !== f.studentB.id)).toBe(true);
    expect(teacherDash.placements.some((p: any) => p.id === f.p1.id)).toBe(true);
    expect(unrelatedTeacherDash.placements).toHaveLength(0);
    expect(studentDash.placements.every((p: any) => p.studentId === f.s1.id)).toBe(true);
    expect(mentorDash.placements.every((p: any) => p.dudiMentorId === f.mentorA2.id)).toBe(true);

    const studentReport = await getPklReportData({}, { user: f.s1 });
    const teacherReport = await getPklReportData({}, { user: f.teacherA });
    expect(studentReport.placements.every((p: any) => p.studentId === f.s1.id)).toBe(true);
    expect(teacherReport.placements.every((p: any) => p.teacherSupervisorId === f.teacherA.id)).toBe(true);
    expect(studentReport.exports.placementsCsv).toContain("Siswa,NIS,Rombel");
  });

  it("08 — EWS does not raise attendance/journal alarms before an ACTIVE placement starts", async () => {
    const futurePlacement = await prisma.placement.create({
      data: {
        schoolId: f.schoolA.id,
        studentId: f.s5.id,
        companyId: f.companyA2.id,
        pklPeriodId: f.periodA.id,
        departmentId: f.deptRpl.id,
        teacherSupervisorId: f.teacherA.id,
        dudiMentorId: f.mentorA2.id,
        startDate: daysFromNow(5),
        endDate: daysFromNow(20),
        status: "ACTIVE",
      },
    });
    f.futurePlacement = futurePlacement;

    const alerts = await getPklEwsAlerts({}, { user: f.teacherA });
    const futureAlerts = alerts.filter((a: any) => a.placementId === futurePlacement.id);
    expect(futureAlerts.some((a: any) => ["NO_ATTENDANCE", "NO_JOURNAL", "JOURNAL_STALE"].includes(a.code))).toBe(false);
  });

  it("09 — import preview detects aggregate capacity and commit remains atomic", async () => {
    const importedCompanyCsv = [
      "kode_dudi,nama,alamat,konsentrasi",
      "IMP-UAT,Import UAT Company,Alamat Import,RPL",
    ].join("\n");
    const dudiPreview = await previewPklImport({ kind: "DUDI", csvContent: importedCompanyCsv }, { user: f.adminA });
    expect(dudiPreview.invalidRows).toBe(0);
    await commitPklImport({ kind: "DUDI", csvContent: importedCompanyCsv, previewHash: dudiPreview.previewHash }, { user: f.adminA });

    const mentorCsv = [
      "nama,kode_dudi,jabatan,telepon,email",
      "Mentor Import UAT,IMP-UAT,Pembimbing,0800000000,mentor.uat@example.test",
    ].join("\n");
    const mentorPreview = await previewPklImport({ kind: "MENTOR", csvContent: mentorCsv }, { user: f.adminA });
    expect(mentorPreview.invalidRows).toBe(0);
    await commitPklImport({ kind: "MENTOR", csvContent: mentorCsv, previewHash: mentorPreview.previewHash }, { user: f.adminA });

    const importedMentor = await prisma.user.findFirst({
      where: { schoolId: f.schoolA.id, role: "DUDI_MENTOR", name: "Mentor Import UAT" },
    });
    expect(importedMentor?.username).toBeNull();
    expect(importedMentor?.email).toBeNull();

    const capacityCsv = [
      "periode,kode_dudi,konsentrasi,kuota",
      "PKL UAT 2026,IMP-UAT,RPL,1",
    ].join("\n");
    const capacityPreview = await previewPklImport({ kind: "CAPACITY", csvContent: capacityCsv }, { user: f.adminA });
    expect(capacityPreview.invalidRows).toBe(0);
    await commitPklImport({ kind: "CAPACITY", csvContent: capacityCsv, previewHash: capacityPreview.previewHash }, { user: f.adminA });

    const placementCsv = [
      "nisn,periode,kode_dudi,nip_guru,pembimbing_dudi",
      "UATN009,PKL UAT 2026,IMP-UAT,UAT-NIP-001,Mentor Import UAT",
      "UATN010,PKL UAT 2026,IMP-UAT,UAT-NIP-001,Mentor Import UAT",
    ].join("\n");
    const placementPreview = await previewPklImport({ kind: "PLACEMENT", csvContent: placementCsv }, { user: f.adminA });
    expect(placementPreview.invalidRows).toBeGreaterThan(0);

    const countBefore = await prisma.placement.count({ where: { schoolId: f.schoolA.id, source: "IMPORT" } });
    expectHttp(await capture(() => commitPklImport({
      kind: "PLACEMENT", csvContent: placementCsv, previewHash: placementPreview.previewHash,
    }, { user: f.adminA })), 400);
    const countAfter = await prisma.placement.count({ where: { schoolId: f.schoolA.id, source: "IMPORT" } });
    expect(countAfter).toBe(countBefore);
  });

  it("10 — evidence upload status is not exposed to unauthenticated callers", async () => {
    expectHttp(await capture(() => getPklEvidenceUploadStatus({}, {})), 401);
  });

  it("11 — production tenant is absent from the isolated UAT database", async () => {
    const smkn12 = await prisma.school.count({ where: { npsn: "20254283" } });
    expect(smkn12).toBe(0);
  });

  it("12 — work schedule rejects invalid work days and impossible time order", async () => {
    expectHttp(await capture(() => savePklWorkSchedule({
      periodId: f.periodA.id,
      companyId: f.companyA1.id,
      workingDays: "9,foo",
      checkInStart: "07:00",
      lateAfter: "07:15",
      checkOutStart: "15:00",
      checkOutEnd: "17:00",
      isActive: true,
      notes: null,
    }, { user: f.adminA })), 400);

    expectHttp(await capture(() => savePklWorkSchedule({
      periodId: f.periodA.id,
      companyId: f.companyA1.id,
      workingDays: "1,2,3,4,5",
      checkInStart: "08:00",
      lateAfter: "07:00",
      checkOutStart: "06:00",
      checkOutEnd: "05:00",
      isActive: true,
      notes: null,
    }, { user: f.adminA })), 400);
  });

  it("13 — concurrent placement requests cannot overbook the last quota slot", async () => {
    const results = await Promise.allSettled([
      createPlacementsBulk({
        studentIds: [f.s7.id],
        periodId: f.periodA.id,
        companyId: f.companyA3.id,
        teacherSupervisorId: f.teacherA.id,
        dudiMentorId: f.mentorA3.id,
      }, { user: f.adminA }),
      createPlacementsBulk({
        studentIds: [f.s8.id],
        periodId: f.periodA.id,
        companyId: f.companyA3.id,
        teacherSupervisorId: f.teacherA.id,
        dudiMentorId: f.mentorA3.id,
      }, { user: f.adminA }),
    ]);
    expect(results.filter((row) => row.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((row) => row.status === "rejected")).toHaveLength(1);
    expect(await prisma.placement.count({
      where: {
        schoolId: f.schoolA.id,
        companyId: f.companyA3.id,
        pklPeriodId: f.periodA.id,
        departmentId: f.deptRpl.id,
        status: { in: ["PLANNED", "ACTIVE"] },
      },
    })).toBe(1);
  });

  it("14 — concurrent journal saves for the same placement/date produce one journal only", async () => {
    const created = await createPlacementsBulk({
      studentIds: [f.s3.id],
      periodId: f.periodA.id,
      companyId: f.companyA1.id,
      teacherSupervisorId: f.teacherA.id,
      dudiMentorId: f.mentorA1.id,
    }, { user: f.adminA });
    const placement = created.placements[0];
    await activatePlacement({ id: placement.id }, { user: f.adminA });

    const dateOnly = jakartaDate(1);
    await Promise.allSettled(
      Array.from({ length: 5 }, (_, index) => saveDailyJournalGen2({
        placementId: placement.id,
        dateOnly,
        activityDescription: `Concurrent UAT journal attempt ${index + 1}`,
        competencies: "Concurrency",
        reflection: "UAT",
        submit: false,
      }, { user: f.s3 })),
    );
    expect(await prisma.dailyJournal.count({
      where: { placementId: placement.id, dateOnly },
    })).toBe(1);
  });

  it("15 — admin day status cannot be created outside placement date range", async () => {
    expectHttp(await capture(() => setAttendanceDayStatus({
      placementId: f.p1.id,
      dateOnly: jakartaDate(60),
      status: "ALPA",
      notes: "Outside placement",
      correctionReason: "UAT boundary validation",
    }, { user: f.adminA })), 400);
  });
});
