import { describe, expect, it } from "vitest";
import { canReadDutyTeacherReports } from "./dutyTeacherAccess";

describe("duty teacher report access", () => {
  it("always allows school admins", () => {
    expect(canReadDutyTeacherReports({
      isAdmin: true,
      configuredAssignmentCount: 3,
      hasActiveAssignment: false,
    })).toBe(true);
  });

  it("keeps compatibility mode while no official duty assignment exists", () => {
    expect(canReadDutyTeacherReports({
      isAdmin: false,
      configuredAssignmentCount: 0,
      hasActiveAssignment: false,
    })).toBe(true);
  });

  it("allows assigned teachers after official scheduling is configured", () => {
    expect(canReadDutyTeacherReports({
      isAdmin: false,
      configuredAssignmentCount: 4,
      hasActiveAssignment: true,
    })).toBe(true);
  });

  it("blocks ordinary teachers after official scheduling is configured", () => {
    expect(canReadDutyTeacherReports({
      isAdmin: false,
      configuredAssignmentCount: 4,
      hasActiveAssignment: false,
    })).toBe(false);
  });
});
