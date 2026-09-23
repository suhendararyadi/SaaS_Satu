export function isTeachingAdmin(user: { role: string; isAdmin?: boolean | null }) {
  return !!user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN";
}
