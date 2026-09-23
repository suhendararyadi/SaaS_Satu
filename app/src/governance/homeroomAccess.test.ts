import { describe, expect, it } from "vitest";
import { canUseHomeroomWorkspace } from "./homeroomAccess";

describe("homeroom workspace access", () => {
  it("is a personal workspace for teacher-role homeroom assignments", () => {
    expect(canUseHomeroomWorkspace({ role: "TEACHER" })).toBe(true);
    expect(canUseHomeroomWorkspace({ role: "SCHOOL_ADMIN" })).toBe(false);
    expect(canUseHomeroomWorkspace({ role: "SUPERADMIN" })).toBe(false);
    expect(canUseHomeroomWorkspace({ role: "STUDENT" })).toBe(false);
    expect(canUseHomeroomWorkspace({ role: "DUDI_MENTOR" })).toBe(false);
  });
});
