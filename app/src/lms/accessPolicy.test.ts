import { describe, expect, it } from "vitest";
import { canAccessCourse, canManageCourse } from "./accessPolicy";

const course = { teacherId: "teacher-a", classRoomId: "class-a" };

describe("LMS course access policy", () => {
  it("only lets the assigned teacher manage a course", () => {
    expect(canManageCourse({ id: "teacher-a", role: "TEACHER", isAdmin: false }, course)).toBe(true);
    expect(canManageCourse({ id: "teacher-b", role: "TEACHER", isAdmin: false }, course)).toBe(false);
  });

  it("only lets a student open a course in their own class", () => {
    expect(canAccessCourse({ id: "student-a", role: "STUDENT", isAdmin: false, classRoomId: "class-a" }, course)).toBe(true);
    expect(canAccessCourse({ id: "student-b", role: "STUDENT", isAdmin: false, classRoomId: "class-b" }, course)).toBe(false);
  });
});
