import { describe, expect, it } from "vitest";
import { buildStudentTemporaryLoginEmail } from "./studentLoginPolicy";

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
