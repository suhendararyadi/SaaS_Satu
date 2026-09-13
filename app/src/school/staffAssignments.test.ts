import { describe, expect, it } from "vitest";
import {
  isDutyAssignmentForDay,
  isStaffAssignmentRole,
  normalizeDutyDays,
  staffAssignmentDisplayTitle,
} from "./staffAssignments";

describe("staff assignment helpers", () => {
  it("recognizes supported roles", () => {
    expect(isStaffAssignmentRole("PRINCIPAL")).toBe(true);
    expect(isStaffAssignmentRole("DUTY_TEACHER")).toBe(true);
    expect(isStaffAssignmentRole("WAKASEK")).toBe(false);
  });

  it("normalizes duty days in canonical order", () => {
    expect(normalizeDutyDays(["FRIDAY", "MONDAY", "INVALID", "MONDAY"]))
      .toEqual(["MONDAY", "FRIDAY"]);
  });

  it("treats empty duty days as flexible and never schedules Sunday", () => {
    expect(isDutyAssignmentForDay([], "MONDAY")).toBe(true);
    expect(isDutyAssignmentForDay(["MONDAY"], "TUESDAY")).toBe(false);
    expect(isDutyAssignmentForDay([], "SUNDAY")).toBe(false);
  });

  it("builds useful assignment titles", () => {
    expect(staffAssignmentDisplayTitle({
      role: "DEPARTMENT_HEAD",
      department: { code: "RPL" },
    })).toBe("Kaprog / Kakomli · RPL");
    expect(staffAssignmentDisplayTitle({
      role: "EXTRACURRICULAR_ADVISOR",
      unitName: "Pramuka",
    })).toBe("Pembina · Pramuka");
    expect(staffAssignmentDisplayTitle({
      role: "OTHER",
      customTitle: "Koordinator Literasi",
    })).toBe("Koordinator Literasi");
  });
});
