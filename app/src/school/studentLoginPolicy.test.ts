import { describe, expect, it } from "vitest";
import { STUDENT_LOGIN_EMAIL_DOMAIN, buildStudentTemporaryLoginEmail, studentLoginEmailFromNisn } from "./studentLoginPolicy";

describe("student temporary login policy", () => {
  it("prefers NISN for the temporary login identity", () => {
    expect(
      buildStudentTemporaryLoginEmail({
        id: "c2d35f54-e317-4ea8-a21d-a2a3612848d8",
        username: "fallback",
        nis: "242512",
        nisn: "0071001891",
      }),
    ).toBe("0071001891@students.schoolos.invalid");
  });

  it("can add a stable user-id suffix on identity conflict", () => {
    expect(
      buildStudentTemporaryLoginEmail({
        id: "c2d35f54-e317-4ea8-a21d-a2a3612848d8",
        nisn: "0071001891",
        forceIdSuffix: true,
      }),
    ).toBe("0071001891-c2d35f54@students.schoolos.invalid");
  });
});

describe("student NISN login email", () => {
  it("builds the internal email from a ten-digit NISN", () => {
    expect(studentLoginEmailFromNisn("0071001891")).toBe("0071001891@students.schoolos.invalid");
    expect(studentLoginEmailFromNisn(" 0071 001 891 ")).toBe("0071001891@students.schoolos.invalid");
  });

  it("rejects anything that is not exactly ten ASCII digits", () => {
    for (const bad of ["", "123", "12345678901", "00710018a1", "0071001891@x.com", "٠٠٧١٠٠١٨٩١"]) {
      expect(studentLoginEmailFromNisn(bad), bad).toBeNull();
    }
  });

  it("stays consistent with the address the provisioning flow generates", () => {
    const provisioned = buildStudentTemporaryLoginEmail({ id: "c2d35f54-e317-4ea8-a21d-a2a3612848d8", nisn: "0071001891" });
    expect(studentLoginEmailFromNisn("0071001891")).toBe(provisioned);
    expect(provisioned.endsWith(STUDENT_LOGIN_EMAIL_DOMAIN)).toBe(true);
  });
});
