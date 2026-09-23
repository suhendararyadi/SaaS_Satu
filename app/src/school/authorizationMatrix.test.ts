import { describe, expect, it } from "vitest";
import { hasSchoolCapability, schoolAuthorizationMatrix } from "./authorizationMatrix";

describe("schoolAuthorizationMatrix", () => {
  it("allows only school administrators to manage a school", () => {
    expect(hasSchoolCapability("SUPERADMIN", "manageSchool")).toBe(true);
    expect(hasSchoolCapability("SCHOOL_ADMIN", "manageSchool")).toBe(true);
    expect(hasSchoolCapability("TEACHER", "manageSchool")).toBe(false);
    expect(hasSchoolCapability("STUDENT", "manageSchool")).toBe(false);
    expect(hasSchoolCapability("DUDI_MENTOR", "manageSchool")).toBe(false);
  });

  it("keeps school directory data away from students and DUDI mentors", () => {
    expect(hasSchoolCapability("SUPERADMIN", "viewSchoolDirectory")).toBe(true);
    expect(hasSchoolCapability("SCHOOL_ADMIN", "viewSchoolDirectory")).toBe(true);
    expect(hasSchoolCapability("TEACHER", "viewSchoolDirectory")).toBe(true);
    expect(hasSchoolCapability("STUDENT", "viewSchoolDirectory")).toBe(false);
    expect(hasSchoolCapability("DUDI_MENTOR", "viewSchoolDirectory")).toBe(false);
  });

  it("separates learner and mentor capabilities", () => {
    expect(hasSchoolCapability("STUDENT", "learn")).toBe(true);
    expect(hasSchoolCapability("STUDENT", "mentor")).toBe(false);
    expect(hasSchoolCapability("DUDI_MENTOR", "mentor")).toBe(true);
    expect(hasSchoolCapability("DUDI_MENTOR", "learn")).toBe(false);
  });

  it("does not allow students to monitor all PKL placements", () => {
    expect(hasSchoolCapability("STUDENT", "viewPkl")).toBe(true);
    expect(hasSchoolCapability("STUDENT", "monitorPkl")).toBe(false);
    expect(hasSchoolCapability("TEACHER", "monitorPkl")).toBe(true);
    expect(hasSchoolCapability("DUDI_MENTOR", "monitorPkl")).toBe(true);
  });

  it("defines an explicit capability list for every role", () => {
    expect(Object.keys(schoolAuthorizationMatrix).sort()).toEqual(
      ["DUDI_MENTOR", "SCHOOL_ADMIN", "STUDENT", "SUPERADMIN", "TEACHER"].sort(),
    );
  });
});
