import { HttpError } from "wasp/server";
import { type User } from "wasp/entities";
import { type UserRole, type SchoolScopedUser, type SchoolContext } from "./types";

/**
 * Ensures the request is from an authenticated user.
 */
export function ensureAuthenticated(context: SchoolContext): asserts context is { user: User } {
  if (!context.user) {
    throw new HttpError(401, "Silakan login terlebih dahulu untuk melanjutkan.");
  }
}

/**
 * Ensures the request is from a global Super Admin (or isAdmin flag is true).
 */
export function ensureSuperAdmin(context: SchoolContext): User {
  ensureAuthenticated(context);
  if (!context.user.isAdmin && context.user.role !== "SUPERADMIN") {
    throw new HttpError(403, "Hanya Super Admin yang memiliki hak akses untuk operasi ini.");
  }
  return context.user;
}

/**
 * Ensures the user belongs to a specific school tenant and has one of the allowed roles.
 * Super Admins can access if a fallback schoolId is present or provided.
 */
export function ensureSchoolUser(
  context: SchoolContext,
  allowedRoles?: UserRole[]
): SchoolScopedUser {
  ensureAuthenticated(context);

  const user = context.user;
  const isSuper = user.isAdmin || user.role === "SUPERADMIN";

  if (!user.schoolId && !isSuper) {
    throw new HttpError(
      403,
      "Akun Anda belum terdaftar atau terhubung dengan unit sekolah manapun."
    );
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.includes(user.role as UserRole);
    if (!hasRole && !isSuper) {
      throw new HttpError(
        403,
        `Akses ditolak. Operasi ini membutuhkan salah satu peran berikut: ${allowedRoles.join(
          ", "
        )}.`
      );
    }
  }

  return user as SchoolScopedUser;
}

export function requireSchoolAdmin(context: SchoolContext): SchoolScopedUser {
  return ensureSchoolUser(context, ["SCHOOL_ADMIN", "SUPERADMIN"]);
}

export function requireTeacher(context: SchoolContext): SchoolScopedUser {
  return ensureSchoolUser(context, ["TEACHER", "SCHOOL_ADMIN", "SUPERADMIN"]);
}

export function requireStudent(context: SchoolContext): SchoolScopedUser {
  return ensureSchoolUser(context, ["STUDENT", "SUPERADMIN"]);
}

export function requireDudiMentor(context: SchoolContext): SchoolScopedUser {
  return ensureSchoolUser(context, ["DUDI_MENTOR", "SUPERADMIN"]);
}
