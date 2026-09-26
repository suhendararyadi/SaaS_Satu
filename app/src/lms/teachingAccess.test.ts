import { describe, expect, it } from "vitest";
import { isTeachingAdmin } from "./teachingAccessPolicy";

describe("teaching access", () => {
  it("recognizes school administration roles", () => {
    expect(isTeachingAdmin({ role: "SCHOOL_ADMIN" as any, isAdmin: false })).toBe(true);
    expect(isTeachingAdmin({ role: "SUPERADMIN" as any, isAdmin: false })).toBe(true);
    expect(isTeachingAdmin({ role: "TEACHER" as any, isAdmin: true })).toBe(true);
    expect(isTeachingAdmin({ role: "TEACHER" as any, isAdmin: false })).toBe(false);
  });
});
