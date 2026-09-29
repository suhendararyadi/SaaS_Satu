import { describe, expect, it } from "vitest";
import { buildTeacherTemporaryLoginEmail } from "./teacherLoginPolicy";

describe("teacher login policy", () => {
  it("prefers an existing official email", () => {
    expect(buildTeacherTemporaryLoginEmail({
      id: "12345678-aaaa-bbbb-cccc-123456789012",
      email: " Guru.Example@School.Id ",
      nip: "19800101",
    })).toBe("guru.example@school.id");
  });

  it("falls back to NIP on the staff login domain", () => {
    expect(buildTeacherTemporaryLoginEmail({
      id: "12345678-aaaa-bbbb-cccc-123456789012",
      nip: "1980 01/01",
    })).toBe("19800101@staff.schoolos.invalid");
  });

  it("forces an id suffix when identity collision requires fallback", () => {
    expect(buildTeacherTemporaryLoginEmail({
      id: "12345678-aaaa-bbbb-cccc-123456789012",
      email: "guru@example.id",
      nip: "19800101",
      forceIdSuffix: true,
    })).toBe("19800101-12345678@staff.schoolos.invalid");
  });
});
