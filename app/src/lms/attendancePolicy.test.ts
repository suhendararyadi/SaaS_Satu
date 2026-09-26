import { describe, expect, it } from "vitest";
import { globalAttendanceToSubjectDefault } from "./attendancePolicy";

describe("LMS attendance seed policy", () => {
  it("prefills subject attendance from the global daily status", () => {
    expect(globalAttendanceToSubjectDefault("HADIR")).toBe("HADIR");
    expect(globalAttendanceToSubjectDefault("TERLAMBAT")).toBe("HADIR");
    expect(globalAttendanceToSubjectDefault("SAKIT")).toBe("SAKIT");
    expect(globalAttendanceToSubjectDefault("IZIN")).toBe("IZIN");
    expect(globalAttendanceToSubjectDefault("ALPA")).toBe("ALPA");
  });

  it("does not invent a subject status when global attendance is unavailable", () => {
    expect(globalAttendanceToSubjectDefault(null)).toBeNull();
    expect(globalAttendanceToSubjectDefault(undefined)).toBeNull();
    expect(globalAttendanceToSubjectDefault("UNKNOWN")).toBeNull();
  });
});
