import { HttpError, prisma } from "wasp/server";
import type { User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { ensureSchoolUser } from "../school/authGuards";
import { getTeachingMonitorScope, isTeachingAdmin } from "./teachingAccess";

const timetableSchema = z.object({ scope: z.enum(["MINE", "ALL"]).optional() });

/**
 * Seluruh jadwal KBM mingguan pada tahun ajaran aktif.
 *
 * Cakupan mengikuti `getTeachingWorkspace`: guru biasa hanya melihat jadwal yang ia ampu;
 * pengelola KBM, Wakasek Kurikulum, Kepala Sekolah, dan Kajur dapat memilih "ALL" untuk
 * melihat seluruh sekolah atau jurusan yang menjadi cakupannya.
 */
export const getTeachingTimetable = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context) as User;
  if (!isTeachingAdmin(user) && user.role !== "TEACHER") {
    throw new HttpError(403, "Jadwal mengajar hanya tersedia untuk guru dan pengelola sekolah.");
  }
  if (!user.schoolId) throw new HttpError(403, "Akun belum terhubung dengan sekolah.");
  const schoolId = user.schoolId;
  const args = ensureArgsSchemaOrThrowHttpError(timetableSchema, rawArgs || {});
  const scope = await getTeachingMonitorScope(user);
  const canViewAll = isTeachingAdmin(user) || scope.schoolWide || scope.departmentIds.length > 0;
  const requested = args.scope ?? (isTeachingAdmin(user) ? "ALL" : "MINE");
  const mode: "MINE" | "ALL" = requested === "ALL" && canViewAll ? "ALL" : "MINE";

  const courseWhere: any = { schoolId, academicYear: { isActive: true } };
  if (mode === "MINE") {
    courseWhere.teacherId = user.id;
  } else if (!isTeachingAdmin(user) && !scope.schoolWide) {
    courseWhere.OR = [
      { teacherId: user.id },
      { classRoom: { departmentId: { in: scope.departmentIds } } },
    ];
  }

  const [academicYear, schedules] = await Promise.all([
    prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true, yearName: true, semester: true },
    }),
    prisma.lmsTeachingSchedule.findMany({
      where: { isActive: true, course: courseWhere },
      select: {
        id: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        roomLabel: true,
        course: {
          select: {
            id: true,
            subjectName: true,
            teacherId: true,
            teacher: { select: { name: true } },
            classRoom: {
              select: { id: true, name: true, department: { select: { code: true } } },
            },
          },
        },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }, { course: { classRoom: { name: "asc" } } }],
    }),
  ]);

  return {
    academicYear,
    mode,
    canViewAll,
    scopeLabel: scope.scopeLabel,
    slots: schedules.map((schedule) => ({
      id: schedule.id,
      courseId: schedule.course.id,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      roomLabel: schedule.roomLabel,
      subjectName: schedule.course.subjectName,
      classRoomId: schedule.course.classRoom.id,
      className: schedule.course.classRoom.name,
      departmentCode: schedule.course.classRoom.department?.code ?? null,
      teacherName: schedule.course.teacher.name,
      isMine: schedule.course.teacherId === user.id,
    })),
  };
};
