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
    process.env.TEACHER_LOGIN_UAT_DATABASE_URL ||
    "postgresql://invalid:invalid@127.0.0.1:1/teacher_login_uat_disabled";
  return {
    prisma: new PrismaClient({ datasources: { db: { url } } }),
    HttpError,
  };
});

import { prisma } from "wasp/server";
import {
  provisionTeacherLogin,
  resetTeacherLoginPassword,
  revokeTeacherLogin,
} from "../src/school/teacherOperations";

const PREFIX = "uat-teacher-login-20260929";
const runUat =
  !!process.env.TEACHER_LOGIN_UAT_DATABASE_URL &&
  process.env.TEACHER_LOGIN_UAT_CONFIRM === "SYNTHETIC_PRODUCTION_UAT";
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

async function cleanupSynthetic() {
  const schools = await prisma.school.findMany({
    where: { slug: { startsWith: PREFIX } },
    select: { id: true },
  });
  const ids = schools.map((row) => row.id);
  if (!ids.length) return;
  await prisma.user.deleteMany({ where: { schoolId: { in: ids } } });
  await prisma.school.deleteMany({ where: { id: { in: ids } } });
}

uat("Teacher/GTK login provisioning real DB UAT", () => {
  const f: Record<string, any> = {};
  let firstPassword = "";
  let firstHash = "";

  beforeAll(async () => {
    const dbName = new URL(process.env.TEACHER_LOGIN_UAT_DATABASE_URL!)
      .pathname.replace(/^\//, "");
    if (!dbName.includes("teacher_login_uat")) {
      throw new Error("Refusing Teacher Login UAT outside a teacher_login_uat database.");
    }
    await cleanupSynthetic();

    f.schoolA = await prisma.school.create({
      data: {
        name: "UAT Teacher Login A",
        slug: PREFIX + "-a",
        npsn: "UAT-TLOGIN-A",
        studentQuota: 20,
      },
    });
    f.schoolB = await prisma.school.create({
      data: {
        name: "UAT Teacher Login B",
        slug: PREFIX + "-b",
        npsn: "UAT-TLOGIN-B",
        studentQuota: 20,
      },
    });

    f.adminA = await prisma.user.create({
      data: {
        schoolId: f.schoolA.id,
        role: "SCHOOL_ADMIN",
        name: "UAT School Admin A",
        email: PREFIX + "-admin-a@example.invalid",
      },
    });
    f.teacherA = await prisma.user.create({
      data: {
        schoolId: f.schoolA.id,
        role: "TEACHER",
        name: "UAT Teacher A",
        email: PREFIX + "-teacher-a@example.invalid",
        username: PREFIX + "-teacher-a",
        teacherProfile: { create: { nip: "198001010001" } },
      },
    });
    f.teacherNoEmail = await prisma.user.create({
      data: {
        schoolId: f.schoolA.id,
        role: "TEACHER",
        name: "UAT Teacher No Email",
        username: PREFIX + "-teacher-no-email",
        teacherProfile: { create: { nip: "198001010002" } },
      },
    });
    f.adminTarget = await prisma.user.create({
      data: {
        schoolId: f.schoolA.id,
        role: "SCHOOL_ADMIN",
        name: "UAT Admin Target",
        email: PREFIX + "-admin-target@example.invalid",
      },
    });
    f.teacherB = await prisma.user.create({
      data: {
        schoolId: f.schoolB.id,
        role: "TEACHER",
        name: "UAT Teacher B",
        email: PREFIX + "-teacher-b@example.invalid",
        teacherProfile: { create: { nip: "198001010003" } },
      },
    });
  });

  afterAll(async () => {
    await cleanupSynthetic();
    await prisma.$disconnect();
  });

  it("01 provisions a teacher login with Wasp-hashed provider data", async () => {
    const result: any = await provisionTeacherLogin(
      {
        teacherId: f.teacherA.id,
        confirm: "PROVISION_TEACHER_TEMPORARY_LOGIN",
      },
      { user: f.adminA },
    );

    expect(result.loginEmail).toBe(f.teacherA.email);
    expect(result.temporaryPassword).toMatch(/^TmpGTK-/);
    firstPassword = result.temporaryPassword;

    const auth = await prisma.auth.findUnique({
      where: { userId: f.teacherA.id },
      include: { identities: true },
    });
    expect(auth).toBeTruthy();
    expect(auth!.identities).toHaveLength(1);
    const provider = JSON.parse(auth!.identities[0].providerData);
    expect(provider.isEmailVerified).toBe(true);
    expect(provider.hashedPassword).not.toBe(firstPassword);
    expect(provider.hashedPassword.length).toBeGreaterThan(20);
    firstHash = provider.hashedPassword;
  });

  it("02 rejects duplicate provisioning", async () => {
    expectHttp(
      await capture(() =>
        provisionTeacherLogin(
          {
            teacherId: f.teacherA.id,
            confirm: "PROVISION_TEACHER_TEMPORARY_LOGIN",
          },
          { user: f.adminA },
        ),
      ),
      409,
    );
  });

  it("03 ordinary teacher cannot provision another teacher", async () => {
    expectHttp(
      await capture(() =>
        provisionTeacherLogin(
          {
            teacherId: f.teacherNoEmail.id,
            confirm: "PROVISION_TEACHER_TEMPORARY_LOGIN",
          },
          { user: f.teacherA },
        ),
      ),
      403,
    );
  });

  it("04 admin cannot provision a teacher in another tenant", async () => {
    expectHttp(
      await capture(() =>
        provisionTeacherLogin(
          {
            teacherId: f.teacherB.id,
            confirm: "PROVISION_TEACHER_TEMPORARY_LOGIN",
          },
          { user: f.adminA },
        ),
      ),
      404,
    );
  });

  it("05 SCHOOL_ADMIN target is excluded from teacher provisioning", async () => {
    expectHttp(
      await capture(() =>
        provisionTeacherLogin(
          {
            teacherId: f.adminTarget.id,
            confirm: "PROVISION_TEACHER_TEMPORARY_LOGIN",
          },
          { user: f.adminA },
        ),
      ),
      404,
    );
  });

  it("06 uses staff-domain fallback when teacher has no official email", async () => {
    const result: any = await provisionTeacherLogin(
      {
        teacherId: f.teacherNoEmail.id,
        confirm: "PROVISION_TEACHER_TEMPORARY_LOGIN",
      },
      { user: f.adminA },
    );
    expect(result.loginEmail).toBe("198001010002@staff.schoolos.invalid");
  });

  it("07 reset changes password hash and invalidates active sessions", async () => {
    const auth = await prisma.auth.findUniqueOrThrow({
      where: { userId: f.teacherA.id },
    });
    await prisma.session.create({
      data: {
        id: PREFIX + "-session",
        userId: auth.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const result: any = await resetTeacherLoginPassword(
      {
        teacherId: f.teacherA.id,
        confirm: "RESET_TEACHER_TEMPORARY_PASSWORD",
      },
      { user: f.adminA },
    );

    expect(result.loginEmail).toBe(f.teacherA.email);
    expect(result.temporaryPassword).toMatch(/^TmpGTK-/);
    expect(result.temporaryPassword).not.toBe(firstPassword);
    expect(await prisma.session.count({ where: { userId: auth.id } })).toBe(0);

    const identity = await prisma.authIdentity.findUniqueOrThrow({
      where: {
        providerName_providerUserId: {
          providerName: "email",
          providerUserId: f.teacherA.email,
        },
      },
    });
    const provider = JSON.parse(identity.providerData);
    expect(provider.hashedPassword).not.toBe(firstHash);
    expect(provider.hashedPassword).not.toBe(result.temporaryPassword);
  });

  it("08 revoke deletes Auth but preserves teacher and profile", async () => {
    const result: any = await revokeTeacherLogin(
      {
        teacherId: f.teacherA.id,
        confirm: "REVOKE_TEACHER_LOGIN",
      },
      { user: f.adminA },
    );
    expect(result.revoked).toBe(true);
    expect(await prisma.auth.count({ where: { userId: f.teacherA.id } })).toBe(0);

    const teacher = await prisma.user.findUnique({
      where: { id: f.teacherA.id },
      include: { teacherProfile: true },
    });
    expect(teacher?.role).toBe("TEACHER");
    expect(teacher?.teacherProfile?.nip).toBe("198001010001");
  });

  it("09 revoke is idempotent", async () => {
    const result: any = await revokeTeacherLogin(
      {
        teacherId: f.teacherA.id,
        confirm: "REVOKE_TEACHER_LOGIN",
      },
      { user: f.adminA },
    );
    expect(result.revoked).toBe(false);
  });

  it("10 reset requires an existing login", async () => {
    expectHttp(
      await capture(() =>
        resetTeacherLoginPassword(
          {
            teacherId: f.teacherA.id,
            confirm: "RESET_TEACHER_TEMPORARY_PASSWORD",
          },
          { user: f.adminA },
        ),
      ),
      409,
    );
  });
});
