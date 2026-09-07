import { HttpError } from "wasp/server";
import { type User } from "wasp/entities";
import { type UserRole, type SchoolScopedUser, type SchoolContext } from "./types";
import { hasSchoolCapability, type SchoolCapability } from "./authorizationMatrix";

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

  if (!user.schoolId) {
    throw new HttpError(
      403,
      isSuper
        ? "Pilih unit sekolah aktif sebelum mengakses data sekolah."
        : "Akun Anda belum terdaftar atau terhubung dengan unit sekolah manapun.",
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

export function requireSchoolCapability(
  context: SchoolContext,
  capability: SchoolCapability,
): SchoolScopedUser {
  const user = ensureSchoolUser(context);
  if (!hasSchoolCapability(user.role, capability) && !user.isAdmin) {
    throw new HttpError(403, "Akun Anda tidak memiliki izin untuk operasi ini.");
  }
  return user;
}


export function requireAnySchoolCapability(
  context: SchoolContext,
  capabilities: readonly SchoolCapability[],
): SchoolScopedUser {
  const user = ensureSchoolUser(context);
  if (!user.isAdmin && !capabilities.some((capability) => hasSchoolCapability(user.role, capability))) {
    throw new HttpError(403, "Akun Anda tidak memiliki izin untuk operasi ini.");
  }
  return user;
}

export function requireSchoolDirectoryAccess(context: SchoolContext): SchoolScopedUser {
  return requireSchoolCapability(context, "viewSchoolDirectory");
}

export function requirePklAccess(context: SchoolContext): SchoolScopedUser {
  return requireSchoolCapability(context, "viewPkl");
}

export function requirePklMonitoring(context: SchoolContext): SchoolScopedUser {
  return requireSchoolCapability(context, "monitorPkl");
}

export function requireSchoolAdmin(context: SchoolContext): SchoolScopedUser {
  return requireSchoolCapability(context, "manageSchool");
}

export function requireTeacher(context: SchoolContext): SchoolScopedUser {
  return requireSchoolCapability(context, "teach");
}

export function requireStudent(context: SchoolContext): SchoolScopedUser {
  return requireSchoolCapability(context, "learn");
}

export function requireDudiMentor(context: SchoolContext): SchoolScopedUser {
  return requireSchoolCapability(context, "mentor");
}
