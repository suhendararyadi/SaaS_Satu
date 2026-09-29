export type ProfileRoutingUser = {
  role?: string | null;
  schoolId?: string | null;
  isAdmin?: boolean | null;
};

const SCHOOL_OPERATIONAL_ROLES = new Set(["TEACHER", "STUDENT", "DUDI_MENTOR"]);

export function shouldUseSchoolProfile(user: ProfileRoutingUser | null | undefined) {
  return !!user && SCHOOL_OPERATIONAL_ROLES.has(String(user.role || ""));
}

export function canManageSaasAccount(user: ProfileRoutingUser | null | undefined) {
  if (!user || shouldUseSchoolProfile(user)) return false;
  return !!user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN";
}

export function primaryProfileHref(user: ProfileRoutingUser | null | undefined) {
  return shouldUseSchoolProfile(user) || !!user?.schoolId ? "/school/profile" : "/account";
}
