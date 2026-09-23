import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import { jakartaDutyDayCode, isDutyAssignmentForDay } from "../school/staffAssignments";

export function isAttendanceAdmin(user: Pick<User, "role" | "isAdmin">) {
  return !!user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN";
}

export async function getAttendanceStaffScope(user: User) {
  if (!user.schoolId) throw new HttpError(403, "Akun belum terhubung dengan sekolah.");
  if (isAttendanceAdmin(user)) {
    return { canViewAll: true, canManagePolicy: true, canDuty: true, canVerifyAll: true, homeroomClassIds: [] as string[] };
  }
  if (user.role !== "TEACHER") {
    return { canViewAll: false, canManagePolicy: false, canDuty: false, canVerifyAll: false, homeroomClassIds: [] as string[] };
  }

  const now = new Date();
  const [homerooms, waka, staff] = await Promise.all([
    prisma.classRoom.findMany({
      where: { schoolId: user.schoolId, homeroomTeacherId: user.id, academicYear: { isActive: true } },
      select: { id: true },
    }),
    prisma.wakasekAssignment.findMany({
      where: { schoolId: user.schoolId, teacherId: user.id, role: { in: ["KESISWAAN", "KURIKULUM"] } },
      select: { role: true },
    }),
    prisma.schoolStaffAssignment.findMany({
      where: {
        schoolId: user.schoolId,
        teacherId: user.id,
        isActive: true,
        role: { in: ["DUTY_TEACHER", "PRINCIPAL"] },
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
          { OR: [{ academicYearId: null }, { academicYear: { isActive: true } }] },
        ],
      },
      select: { role: true, dutyDays: true },
    }),
  ]);
  const day = jakartaDutyDayCode(now);
  const canDuty = staff.some((row) => row.role === "DUTY_TEACHER" && isDutyAssignmentForDay(row.dutyDays, day));
  const leadership = waka.length > 0 || staff.some((row) => row.role === "PRINCIPAL");
  return {
    canViewAll: leadership || canDuty,
    canManagePolicy: false,
    canDuty,
    canVerifyAll: leadership,
    homeroomClassIds: homerooms.map((row) => row.id),
  };
}

export async function assertAttendanceStudentVisible(user: User, studentId: string) {
  if (!user.schoolId) throw new HttpError(403, "Akun belum terhubung dengan sekolah.");
  const student = await prisma.user.findFirst({
    where: { id: studentId, schoolId: user.schoolId, role: "STUDENT" },
    select: { id: true, name: true, classRoomId: true, classRoom: { select: { id: true, name: true, homeroomTeacherId: true, academicYearId: true, academicYear: { select: { isActive: true } } } } },
  });
  if (!student) throw new HttpError(404, "Siswa tidak ditemukan.");
  if (user.role === "STUDENT") {
    if (student.id !== user.id) throw new HttpError(403, "Anda hanya dapat melihat kehadiran sendiri.");
    return student;
  }
  const scope = await getAttendanceStaffScope(user);
  if (!scope.canViewAll && (!student.classRoomId || !scope.homeroomClassIds.includes(student.classRoomId))) {
    throw new HttpError(403, "Siswa berada di luar cakupan kehadiran Anda.");
  }
  return student;
}
