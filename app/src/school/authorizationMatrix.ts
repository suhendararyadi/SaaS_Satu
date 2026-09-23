import { type UserRole } from "@prisma/client";

export type SchoolCapability =
  | "manageSchool"
  | "viewSchoolDirectory"
  | "teach"
  | "learn"
  | "mentor"
  | "viewPkl"
  | "monitorPkl";

export const schoolAuthorizationMatrix: Record<UserRole, readonly SchoolCapability[]> = {
  SUPERADMIN: [
    "manageSchool",
    "viewSchoolDirectory",
    "teach",
    "learn",
    "mentor",
    "viewPkl",
    "monitorPkl",
  ],
  SCHOOL_ADMIN: [
    "manageSchool",
    "viewSchoolDirectory",
    "teach",
    "viewPkl",
    "monitorPkl",
  ],
  TEACHER: ["viewSchoolDirectory", "teach", "viewPkl", "monitorPkl"],
  STUDENT: ["learn", "viewPkl"],
  DUDI_MENTOR: ["mentor", "viewPkl", "monitorPkl"],
};

export function hasSchoolCapability(
  role: UserRole,
  capability: SchoolCapability,
): boolean {
  return schoolAuthorizationMatrix[role].includes(capability);
}
