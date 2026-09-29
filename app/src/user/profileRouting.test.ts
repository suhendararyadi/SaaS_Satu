import { describe, expect, it } from "vitest";
import { canManageSaasAccount, primaryProfileHref, shouldUseSchoolProfile } from "./profileRouting";

describe("profile routing", () => {
  it("routes operational school roles to School Profile", () => {
    for (const role of ["TEACHER", "STUDENT", "DUDI_MENTOR"]) {
      const user = { role, schoolId: "school-a", isAdmin: false };
      expect(shouldUseSchoolProfile(user)).toBe(true);
      expect(primaryProfileHref(user)).toBe("/school/profile");
      expect(canManageSaasAccount(user)).toBe(false);
    }
  });

  it("keeps SaaS account access for tenant and global admins", () => {
    expect(canManageSaasAccount({ role: "SCHOOL_ADMIN", schoolId: "school-a", isAdmin: false })).toBe(true);
    expect(canManageSaasAccount({ role: "SUPERADMIN", schoolId: "school-a", isAdmin: true })).toBe(true);
    expect(primaryProfileHref({ role: "SCHOOL_ADMIN", schoolId: "school-a" })).toBe("/school/profile");
  });

  it("never exposes SaaS account to operational roles even when school link is incomplete", () => {
    const teacher = { role: "TEACHER", schoolId: null, isAdmin: true };
    expect(shouldUseSchoolProfile(teacher)).toBe(true);
    expect(primaryProfileHref(teacher)).toBe("/school/profile");
    expect(canManageSaasAccount(teacher)).toBe(false);
  });

  it("keeps non-school SaaS admins on /account", () => {
    expect(primaryProfileHref({ role: "SUPERADMIN", schoolId: null, isAdmin: true })).toBe("/account");
    expect(shouldUseSchoolProfile({ role: "SUPERADMIN", schoolId: null, isAdmin: true })).toBe(false);
  });
});
