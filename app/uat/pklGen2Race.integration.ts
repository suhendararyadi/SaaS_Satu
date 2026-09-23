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
  createPlacementsBulk,
  previewPklImport,
  recordAttendanceGen2,
  savePklWorkSchedule,
  setAttendanceDayStatus,
  transferPlacement,
} from "../src/pkl/gen2Operations";

const runUat = !!process.env.PKL_UAT_DATABASE_URL;
const uat = runUat ? describe.sequential : describe.skip;
const f: Record<string, any> = {};

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
function jakartaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
async function capture<T>(fn: () => Promise<T>) {
  try {
    return { ok: true as const, value: await fn(), error: null };
  } catch (error: any) {
    return { ok: false as const, value: null, error };
  }
}

uat("PKL Gen2 UAT concurrency hardening", () => {
  beforeAll(async () => {
    const dbName = new URL(process.env.PKL_UAT_DATABASE_URL!).pathname.replace(/^\//, "");
    if (!dbName.includes("pkl_uat")) throw new Error("Refusing UAT outside pkl_uat DB.");

    f.school = await prisma.school.create({
      data: { name: "UAT Race School", slug: "uat-race-school", npsn: "UAT-RACE", studentQuota: 50 },
    });
    f.year = await prisma.academicYear.create({
      data: { schoolId: f.school.id, yearName: "2026/2027-RACE", semester: "GANJIL", isActive: true },
    });
    f.department = await prisma.department.create({
      data: { schoolId: f.school.id, code: "RACE", name: "Concurrency Program" },
    });
    f.classRoom = await prisma.classRoom.create({
      data: {
        schoolId: f.school.id,
        academicYearId: f.year.id,
        departmentId: f.department.id,
        gradeLevel: 12,
        name: "XII RACE",
      },
    });
    f.admin = await prisma.user.create({ data: { schoolId: f.school.id, role: "SCHOOL_ADMIN", name: "Race Admin" } });
    f.teacher = await prisma.user.create({ data: { schoolId: f.school.id, role: "TEACHER", name: "Race Teacher" } });
    await prisma.teacherProfile.create({ data: { userId: f.teacher.id, nip: "RACE-NIP-001" } });

    for (let i = 1; i <= 6; i++) {
      const user = await prisma.user.create({
        data: { schoolId: f.school.id, classRoomId: f.classRoom.id, role: "STUDENT", name: `Race Student ${i}` },
      });
      await prisma.studentProfile.create({
        data: { userId: user.id, nis: `RACE00${i}`, nisn: `RACEN00${i}`, status: "ACTIVE" },
      });
      f[`s${i}`] = user;
    }

    f.period = await prisma.pklPeriod.create({
      data: {
        schoolId: f.school.id,
        academicYearId: f.year.id,
        name: "PKL Race 2026",
        startDate: daysFromNow(-5),
        endDate: daysFromNow(20),
        isActive: true,
      },
    });

    async function company(code: string, name: string, quota: number) {
      const row = await prisma.company.create({
        data: {
          schoolId: f.school.id,
          code,
          name,
          address: "UAT Race Address",
          partnershipStatus: "ACTIVE",
          isActive: true,
          latitude: -7.20,
          longitude: 107.90,
          radiusMeters: 150,
        },
      });
      await prisma.companyDepartment.create({
        data: { schoolId: f.school.id, companyId: row.id, departmentId: f.department.id, isActive: true },
      });
      await prisma.pklCompanyCapacity.create({
        data: {
          schoolId: f.school.id,
          periodId: f.period.id,
          companyId: row.id,
          departmentId: f.department.id,
          quota,
        },
      });
      const mentorUser = await prisma.user.create({
        data: { schoolId: f.school.id, role: "DUDI_MENTOR", name: name + " Mentor" },
      });
      await prisma.dudiMentorProfile.create({
        data: { schoolId: f.school.id, companyId: row.id, userId: mentorUser.id, position: "Mentor", isActive: true },
      });
      return { row, mentorUser };
    }

    const source = await company("RACE-SRC", "Race Source", 3);
    const target = await company("RACE-TGT", "Race Target", 1);
    const imp = await company("RACE-IMP", "Race Import", 1);
    f.source = source.row; f.sourceMentor = source.mentorUser;
    f.target = target.row; f.targetMentor = target.mentorUser;
    f.importCompany = imp.row; f.importMentor = imp.mentorUser;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("16 — two concurrent transfers cannot overbook one target slot", async () => {
    const a = await createPlacementsBulk({
      studentIds: [f.s1.id],
      periodId: f.period.id,
      companyId: f.source.id,
      teacherSupervisorId: f.teacher.id,
      dudiMentorId: f.sourceMentor.id,
    }, { user: f.admin });
    const b = await createPlacementsBulk({
      studentIds: [f.s2.id],
      periodId: f.period.id,
      companyId: f.source.id,
      teacherSupervisorId: f.teacher.id,
      dudiMentorId: f.sourceMentor.id,
    }, { user: f.admin });

    const results = await Promise.allSettled([
      transferPlacement({
        id: a.placements[0].id,
        targetCompanyId: f.target.id,
        targetMentorId: f.targetMentor.id,
        reason: "Concurrent transfer A",
      }, { user: f.admin }),
      transferPlacement({
        id: b.placements[0].id,
        targetCompanyId: f.target.id,
        targetMentorId: f.targetMentor.id,
        reason: "Concurrent transfer B",
      }, { user: f.admin }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect(await prisma.placement.count({
      where: {
        schoolId: f.school.id,
        companyId: f.target.id,
        pklPeriodId: f.period.id,
        departmentId: f.department.id,
        status: { in: ["PLANNED", "ACTIVE"] },
      },
    })).toBe(1);
  });

  it("17 — import commit and manual plotting cannot race past one quota slot", async () => {
    const csv = [
      "nisn,periode,kode_dudi,nip_guru,pembimbing_dudi",
      "RACEN003,PKL Race 2026,RACE-IMP,RACE-NIP-001,Race Import Mentor",
    ].join("\n");
    const preview = await previewPklImport({ kind: "PLACEMENT", csvContent: csv }, { user: f.admin });
    expect(preview.invalidRows).toBe(0);

    const results = await Promise.allSettled([
      commitPklImport({ kind: "PLACEMENT", csvContent: csv, previewHash: preview.previewHash }, { user: f.admin }),
      createPlacementsBulk({
        studentIds: [f.s4.id],
        periodId: f.period.id,
        companyId: f.importCompany.id,
        teacherSupervisorId: f.teacher.id,
        dudiMentorId: f.importMentor.id,
      }, { user: f.admin }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect(await prisma.placement.count({
      where: {
        schoolId: f.school.id,
        companyId: f.importCompany.id,
        pklPeriodId: f.period.id,
        departmentId: f.department.id,
        status: { in: ["PLANNED", "ACTIVE"] },
      },
    })).toBe(1);
  });

  it("18 — admin day status cannot coexist with a recorded presence", async () => {
    const created = await createPlacementsBulk({
      studentIds: [f.s5.id],
      periodId: f.period.id,
      companyId: f.source.id,
      teacherSupervisorId: f.teacher.id,
      dudiMentorId: f.sourceMentor.id,
    }, { user: f.admin });
    const placement = created.placements[0];
    await activatePlacement({ id: placement.id }, { user: f.admin });
    await savePklWorkSchedule({
      periodId: f.period.id,
      companyId: f.source.id,
      workingDays: "0,1,2,3,4,5,6",
      checkInStart: "00:00",
      lateAfter: "23:59",
      checkOutStart: "23:59",
      checkOutEnd: "23:59",
      isActive: true,
      notes: "UAT",
    }, { user: f.admin });
    await recordAttendanceGen2({
      placementId: placement.id,
      type: "CHECK_IN",
      latitude: -7.20,
      longitude: 107.90,
    }, { user: f.s5 });

    const result = await capture(() => setAttendanceDayStatus({
      placementId: placement.id,
      dateOnly: jakartaDate(),
      status: "SAKIT",
      notes: "Conflict test",
      correctionReason: "Use correction instead",
    }, { user: f.admin }));
    expect(result.ok).toBe(false);
    expect((result.error as any)?.statusCode).toBe(409);
  });

  it("19 — concurrent plotting of one student to different DUDI creates only one open placement", async () => {
    const alt = await prisma.company.create({
      data: {
        schoolId: f.school.id,
        code: "RACE-ALT",
        name: "Race Alternate",
        address: "UAT",
        partnershipStatus: "ACTIVE",
        isActive: true,
      },
    });
    await prisma.companyDepartment.create({
      data: { schoolId: f.school.id, companyId: alt.id, departmentId: f.department.id },
    });
    await prisma.pklCompanyCapacity.create({
      data: { schoolId: f.school.id, periodId: f.period.id, companyId: alt.id, departmentId: f.department.id, quota: 3 },
    });
    const altMentor = await prisma.user.create({
      data: { schoolId: f.school.id, role: "DUDI_MENTOR", name: "Alt Mentor" },
    });
    await prisma.dudiMentorProfile.create({
      data: { schoolId: f.school.id, companyId: alt.id, userId: altMentor.id, isActive: true },
    });

    const results = await Promise.allSettled([
      createPlacementsBulk({
        studentIds: [f.s6.id], periodId: f.period.id, companyId: f.source.id,
        teacherSupervisorId: f.teacher.id, dudiMentorId: f.sourceMentor.id,
      }, { user: f.admin }),
      createPlacementsBulk({
        studentIds: [f.s6.id], periodId: f.period.id, companyId: alt.id,
        teacherSupervisorId: f.teacher.id, dudiMentorId: altMentor.id,
      }, { user: f.admin }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.placement.count({
      where: { schoolId: f.school.id, studentId: f.s6.id, status: { in: ["PLANNED", "ACTIVE"] } },
    })).toBe(1);
  });
});
