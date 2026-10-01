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
  const url =
    process.env.TIMETABLE_UAT_DATABASE_URL ||
    "postgresql://invalid:invalid@127.0.0.1:1/timetable_uat_disabled";
  return {
    prisma: new PrismaClient({ datasources: { db: { url } } }),
    HttpError,
  };
});

import { prisma } from "wasp/server";
import { getTeachingTimetable } from "../src/lms/teachingTimetable";

// Hanya berjalan terhadap KLON database (bukan produksi). Mengubah data klon (penugasan Kajur sintetis).
const runUat =
  !!process.env.TIMETABLE_UAT_DATABASE_URL &&
  process.env.TIMETABLE_UAT_CONFIRM === "CLONE_DATABASE_ONLY";
const uat = runUat ? describe.sequential : describe.skip;

async function capture<T>(fn: () => Promise<T>) {
  try {
    return { ok: true as const, value: await fn(), error: null };
  } catch (error: any) {
    return { ok: false as const, value: null, error };
  }
}

const ctx = (user: any) => ({ user });

uat("getTeachingTimetable on a production clone", () => {
  let schoolId = "";
  let totalActive = 0;
  let teacher: any;
  let teacherSlotCount = 0;
  let otherTeacher: any;
  let admin: any;
  let student: any;
  let otherTenantAdmin: any;
  let otherTenantCount = 0;
  let deptId = "";
  let deptClassSchedules = 0;
  let assignmentId = "";

  const activeWhere = (sid: string) => ({
    isActive: true,
    course: { schoolId: sid, academicYear: { isActive: true } },
  });

  beforeAll(async () => {
    const school = await prisma.school.findFirstOrThrow({ where: { slug: "smkn-12-garut" } });
    schoolId = school.id;
    totalActive = await prisma.lmsTeachingSchedule.count({ where: activeWhere(schoolId) });

    const rows = await prisma.lmsTeachingSchedule.findMany({
      where: activeWhere(schoolId),
      select: { course: { select: { teacherId: true } } },
    });
    const perTeacher = new Map<string, number>();
    for (const row of rows) perTeacher.set(row.course.teacherId, (perTeacher.get(row.course.teacherId) ?? 0) + 1);
    const ranked = [...perTeacher.entries()].sort((a, b) => b[1] - a[1]);
    teacher = await prisma.user.findUniqueOrThrow({ where: { id: ranked[0][0] } });
    teacherSlotCount = ranked[0][1];
    otherTeacher = await prisma.user.findUniqueOrThrow({ where: { id: ranked[ranked.length - 1][0] } });

    admin = await prisma.user.findFirstOrThrow({ where: { schoolId, role: "SCHOOL_ADMIN" } });
    student = await prisma.user.findFirstOrThrow({ where: { schoolId, role: "STUDENT" } });

    const other = await prisma.school.findFirstOrThrow({ where: { slug: "smkn-1-rongga" } });
    otherTenantAdmin = await prisma.user.findFirstOrThrow({ where: { schoolId: other.id, role: "SCHOOL_ADMIN" } });
    otherTenantCount = await prisma.lmsTeachingSchedule.count({ where: activeWhere(other.id) });

    // Kajur sintetis (hanya di klon): guru yang bukan pengampu jurusan TSM mendapat cakupan jurusan TSM.
    const dept = await prisma.department.findFirstOrThrow({ where: { schoolId, name: "Teknik Sepeda Motor" } });
    deptId = dept.id;
    deptClassSchedules = await prisma.lmsTeachingSchedule.count({
      where: { ...activeWhere(schoolId), course: { schoolId, academicYear: { isActive: true }, classRoom: { departmentId: deptId } } },
    });
  });

  afterAll(async () => {
    if (assignmentId) await prisma.schoolStaffAssignment.deleteMany({ where: { id: assignmentId } });
    await prisma.$disconnect();
  });

  it("has the imported timetable in the clone", () => {
    expect(totalActive).toBeGreaterThanOrEqual(757);
    expect(teacherSlotCount).toBeGreaterThan(0);
  });

  it("returns only the teacher's own sessions, ordered by day then time", async () => {
    const result = await getTeachingTimetable({}, ctx(teacher));
    expect(result.mode).toBe("MINE");
    expect(result.canViewAll).toBe(false);
    expect(result.slots).toHaveLength(teacherSlotCount);
    expect(result.slots.every((slot) => slot.isMine)).toBe(true);
    expect(result.academicYear?.yearName).toBe("2026/2027");
    const keys = result.slots.map((slot) => slot.dayOfWeek * 10_000 + Number(slot.startTime.replace(":", "")));
    expect([...keys].sort((a, b) => a - b)).toEqual(keys);
    expect(new Set(result.slots.map((slot) => slot.id)).size).toBe(result.slots.length);
  });

  it("does not let a plain teacher widen scope to ALL", async () => {
    const result = await getTeachingTimetable({ scope: "ALL" }, ctx(teacher));
    expect(result.mode).toBe("MINE");
    expect(result.slots).toHaveLength(teacherSlotCount);
    expect(result.slots.every((slot) => slot.isMine)).toBe(true);
  });

  it("gives another teacher a disjoint timetable", async () => {
    const mine = await getTeachingTimetable({}, ctx(teacher));
    const theirs = await getTeachingTimetable({}, ctx(otherTeacher));
    const mineIds = new Set(mine.slots.map((slot) => slot.id));
    expect(theirs.slots.length).toBeGreaterThan(0);
    expect(theirs.slots.some((slot) => mineIds.has(slot.id))).toBe(false);
  });

  it("defaults a school admin to the whole school and respects MINE", async () => {
    const all = await getTeachingTimetable({}, ctx(admin));
    expect(all.mode).toBe("ALL");
    expect(all.canViewAll).toBe(true);
    expect(all.slots).toHaveLength(totalActive);
    const classIds = [...new Set(all.slots.map((slot) => slot.classRoomId))];
    expect(await prisma.classRoom.count({ where: { id: { in: classIds }, schoolId } })).toBe(classIds.length);
    expect(classIds.length).toBeGreaterThanOrEqual(34);

    const mine = await getTeachingTimetable({ scope: "MINE" }, ctx(admin));
    expect(mine.mode).toBe("MINE");
    expect(mine.slots).toHaveLength(0);
  });

  it("keeps tenants isolated", async () => {
    const own = await getTeachingTimetable({}, ctx(otherTenantAdmin));
    expect(own.slots).toHaveLength(otherTenantCount);
    const smkn12 = await getTeachingTimetable({}, ctx(admin));
    const smkn12Ids = new Set(smkn12.slots.map((slot) => slot.id));
    expect(own.slots.some((slot) => smkn12Ids.has(slot.id))).toBe(false);
  });

  it("rejects students", async () => {
    const result = await capture(() => getTeachingTimetable({}, ctx(student)));
    expect(result.ok).toBe(false);
    expect((result.error as any).statusCode).toBe(403);
  });

  it("rejects an invalid scope value", async () => {
    const result = await capture(() => getTeachingTimetable({ scope: "EVERYTHING" }, ctx(teacher)));
    expect(result.ok).toBe(false);
    expect((result.error as any).statusCode).toBe(400);
  });

  it("gives a department head their own sessions plus the department's", async () => {
    const created = await prisma.schoolStaffAssignment.create({
      data: { schoolId, teacherId: otherTeacher.id, role: "DEPARTMENT_HEAD", departmentId: deptId, isActive: true },
    });
    assignmentId = created.id;

    const before = await getTeachingTimetable({}, ctx(otherTeacher));
    expect(before.mode).toBe("MINE");
    expect(before.canViewAll).toBe(true);

    const all = await getTeachingTimetable({ scope: "ALL" }, ctx(otherTeacher));
    expect(all.mode).toBe("ALL");
    const ownIds = new Set(before.slots.map((slot) => slot.id));
    const deptIds = new Set(
      (await prisma.lmsTeachingSchedule.findMany({
        where: { ...activeWhere(schoolId), course: { schoolId, academicYear: { isActive: true }, classRoom: { departmentId: deptId } } },
        select: { id: true },
      })).map((row) => row.id),
    );
    expect(deptIds.size).toBe(deptClassSchedules);
    const expected = new Set([...ownIds, ...deptIds]);
    expect(new Set(all.slots.map((slot) => slot.id))).toEqual(expected);
    expect(all.slots.length).toBeLessThan(totalActive);
  });
});
