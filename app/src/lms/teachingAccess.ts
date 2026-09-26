import { HttpError, prisma } from "wasp/server";
import type { User } from "wasp/entities";
import { isDutyAssignmentForDay, jakartaDutyDayCode } from "../school/staffAssignments";
import { isTeachingAdmin } from "./teachingAccessPolicy";

export { isTeachingAdmin } from "./teachingAccessPolicy";

export async function getTeachingMonitorScope(user: User) {
  if (!user.schoolId) throw new HttpError(403, "Akun belum terhubung dengan sekolah.");
  if (isTeachingAdmin(user)) {
    return {
      schoolWide: true,
      departmentIds: [] as string[],
      canDuty: true,
      canMonitor: true,
      scopeLabel: "Seluruh sekolah",
    };
  }
  if (user.role !== "TEACHER") {
    return {
      schoolWide: false,
      departmentIds: [] as string[],
      canDuty: false,
      canMonitor: false,
      scopeLabel: "Tidak tersedia",
    };
  }

  const now = new Date();
  const [waka, staff] = await Promise.all([
    prisma.wakasekAssignment.findMany({
      where: { schoolId: user.schoolId, teacherId: user.id },
      select: { role: true },
    }),
    prisma.schoolStaffAssignment.findMany({
      where: {
        schoolId: user.schoolId,
        teacherId: user.id,
        isActive: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
          { OR: [{ academicYearId: null }, { academicYear: { isActive: true } }] },
        ],
      },
      select: { role: true, departmentId: true, dutyDays: true },
    }),
  ]);

  const wakaRoles = new Set(waka.map((item) => item.role));
  const schoolWide =
    wakaRoles.has("KURIKULUM") ||
    staff.some((item) => item.role === "PRINCIPAL");
  const departmentIds = staff
    .filter((item) => item.role === "DEPARTMENT_HEAD" && item.departmentId)
    .map((item) => item.departmentId as string);
  const day = jakartaDutyDayCode(now);
  const canDuty = staff.some(
    (item) =>
      item.role === "DUTY_TEACHER" &&
      isDutyAssignmentForDay(item.dutyDays, day),
  );

  return {
    schoolWide,
    departmentIds,
    canDuty,
    canMonitor: schoolWide || departmentIds.length > 0,
    scopeLabel: schoolWide
      ? "Seluruh sekolah"
      : departmentIds.length
        ? "Program/konsentrasi binaan"
        : "Mapel yang diampu",
  };
}

export async function assertCanMonitorTeachingCourse(
  user: User,
  course: { teacherId: string; classRoom: { departmentId: string | null } },
) {
  if (isTeachingAdmin(user) || course.teacherId === user.id) return;
  const scope = await getTeachingMonitorScope(user);
  if (scope.schoolWide) return;
  if (
    course.classRoom.departmentId &&
    scope.departmentIds.includes(course.classRoom.departmentId)
  ) {
    return;
  }
  throw new HttpError(403, "Ruang pembelajaran berada di luar cakupan monitoring Anda.");
}
