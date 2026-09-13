import { HttpError } from "wasp/server";
import { type User } from "wasp/entities";
import { z } from "zod";
import { prisma } from "wasp/server";
import { ensureSchoolUser } from "./authGuards";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { isValidDateOnly, jakartaDateOnly } from "./dailyAttendance";
import {
  attendanceRate,
  canUseDailyAttendance,
  isDailyAttendanceAdmin,
  needsAttendanceAttention,
  summarizeAttendanceStatuses,
} from "./dailyAttendanceAccess";

const dateOnlySchema = z.string().refine(isValidDateOnly, "Tanggal tidak valid.");

function assertDailyAttendanceClassAccess(
  user: Pick<User, "id" | "role" | "isAdmin">,
  classRoom: { homeroomTeacherId: string | null },
) {
  if (isDailyAttendanceAdmin(user)) return;
  if (user.role === "TEACHER" && classRoom.homeroomTeacherId === user.id) return;
  throw new HttpError(403, "Laporan presensi hanya dapat diakses oleh admin sekolah atau wali kelas rombel tersebut.");
}

const attendanceReportSchema = z.object({
  dateOnly: dateOnlySchema.optional(),
  classRoomId: z.string().uuid().optional(),
  period: z.enum(["MONTH", "SEMESTER"]).optional(),
  month: z.number().min(1).max(12).optional(),
  year: z.number().min(2000).max(2100).optional(),
  studentId: z.string().uuid().optional(),
}).optional();

export const getDailyAttendanceReportData = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const user = ensureSchoolUser(context);
  const args = ensureArgsSchemaOrThrowHttpError(attendanceReportSchema || z.any(), rawArgs || {});
  const today = jakartaDateOnly();
  const dateOnly = args?.dateOnly || today;
  const [todayYear, todayMonth] = today.split("-").map(Number);
  const selectedYear = args?.year || todayYear;
  const selectedMonth = args?.month || todayMonth;
  const period = args?.period || "MONTH";

  const activeAcademicYear = await prisma.academicYear.findFirst({
    where: { schoolId: user.schoolId, isActive: true },
    select: { id: true, yearName: true, semester: true },
  });

  const isAdmin = isDailyAttendanceAdmin(user);
  const classes = await prisma.classRoom.findMany({
    where: {
      schoolId: user.schoolId,
      ...(activeAcademicYear ? { academicYearId: activeAcademicYear.id } : {}),
      ...(!isAdmin ? { homeroomTeacherId: user.id } : {}),
    },
    select: {
      id: true,
      name: true,
      gradeLevel: true,
      homeroomTeacherId: true,
      homeroomTeacher: { select: { id: true, name: true } },
      department: { select: { code: true, name: true } },
      students: {
        where: { role: "STUDENT" },
        select: {
          id: true,
          name: true,
          studentProfile: { select: { nis: true, nisn: true, gender: true } },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
  });

  if (!canUseDailyAttendance(user, classes.map((classRoom) => classRoom.id))) {
    throw new HttpError(403, "Laporan presensi harian hanya tersedia untuk admin sekolah dan wali kelas.");
  }

  const selectedClass =
    classes.find((classRoom) => classRoom.id === args?.classRoomId) || classes[0] || null;

  if (!selectedClass) {
    return {
      access: { isAdmin, isHomeroomTeacher: !isAdmin, scopeLabel: isAdmin ? "Seluruh sekolah" : "Kelas binaan" },
      activeAcademicYear,
      classes: [],
      selectedClass: null,
      daily: {
        dateOnly,
        rows: [],
        summary: summarizeAttendanceStatuses([]),
        unrecordedClasses: 0,
        completedClasses: 0,
      },
      period: { mode: period, label: "", startDateOnly: "", endDateOnly: "", students: [], attention: [] },
      studentHistory: null,
    };
  }

  assertDailyAttendanceClassAccess(user, selectedClass);

  const classIds = classes.map((classRoom) => classRoom.id);
  const todayRecords = await prisma.schoolDailyAttendance.findMany({
    where: {
      schoolId: user.schoolId,
      classRoomId: { in: classIds },
      dateOnly,
    },
    select: { classRoomId: true, studentId: true, status: true },
  });

  const dailyRows = classes.map((classRoom) => {
    const records = todayRecords.filter((record) => record.classRoomId === classRoom.id);
    const summary = summarizeAttendanceStatuses(records);
    return {
      classRoomId: classRoom.id,
      className: classRoom.name,
      departmentCode: classRoom.department?.code || null,
      homeroomTeacherName: classRoom.homeroomTeacher?.name || null,
      studentCount: classRoom.students.length,
      recordedCount: records.length,
      completed: classRoom.students.length > 0 && records.length === classRoom.students.length,
      rate: attendanceRate(records),
      ...summary,
    };
  });

  const dailySummary = summarizeAttendanceStatuses(todayRecords);
  const unrecordedClasses = dailyRows.filter((row) => !row.completed).length;

  let periodStart: string;
  let periodEndExclusive: string;
  let periodLabel: string;

  if (period === "SEMESTER" && activeAcademicYear) {
    const [startYearText, endYearText] = activeAcademicYear.yearName.split("/");
    const startYear = Number(startYearText);
    const endYear = Number(endYearText);
    if (activeAcademicYear.semester === "GANJIL") {
      periodStart = `${startYear}-07-01`;
      periodEndExclusive = `${endYear}-01-01`;
      periodLabel = `Semester Ganjil ${activeAcademicYear.yearName}`;
    } else {
      periodStart = `${endYear}-01-01`;
      periodEndExclusive = `${endYear}-07-01`;
      periodLabel = `Semester Genap ${activeAcademicYear.yearName}`;
    }
  } else {
    periodStart = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
    const next = new Date(Date.UTC(selectedYear, selectedMonth, 1));
    periodEndExclusive = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01`;
    periodLabel = new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(selectedYear, selectedMonth - 1, 1)));
  }

  const periodRecords = await prisma.schoolDailyAttendance.findMany({
    where: {
      schoolId: user.schoolId,
      classRoomId: selectedClass.id,
      dateOnly: { gte: periodStart, lt: periodEndExclusive },
    },
    select: {
      studentId: true,
      status: true,
      dateOnly: true,
      notes: true,
      recordedBy: { select: { id: true, name: true } },
      updatedAt: true,
    },
    orderBy: { dateOnly: "asc" },
  });

  const students = selectedClass.students.map((student) => {
    const records = periodRecords.filter((record) => record.studentId === student.id);
    const summary = summarizeAttendanceStatuses(records);
    const rate = attendanceRate(records);
    return {
      studentId: student.id,
      name: student.name,
      nis: student.studentProfile?.nis || "-",
      nisn: student.studentProfile?.nisn || "-",
      gender: student.studentProfile?.gender || "-",
      rate,
      ...summary,
    };
  });

  const attention = students
    .filter((student) => needsAttendanceAttention(student))
    .map((student) => ({
      ...student,
      reasons: [
        ...(student.alpa >= 3 ? [`Alpa ${student.alpa} hari`] : []),
        ...(student.terlambat >= 5 ? [`Terlambat ${student.terlambat} kali`] : []),
        ...(student.rate !== null && student.rate < 90 ? [`Kehadiran ${student.rate}%`] : []),
      ],
    }))
    .sort((a, b) => (a.rate ?? 101) - (b.rate ?? 101) || b.alpa - a.alpa || b.terlambat - a.terlambat);

  const selectedStudent =
    selectedClass.students.find((student) => student.id === args?.studentId) ||
    selectedClass.students[0] ||
    null;

  const selectedStudentRecords = selectedStudent
    ? periodRecords.filter((record) => record.studentId === selectedStudent.id)
    : [];

  const selectedStudentSummary = summarizeAttendanceStatuses(selectedStudentRecords);

  return {
    access: {
      isAdmin,
      isHomeroomTeacher: !isAdmin,
      scopeLabel: isAdmin ? "Seluruh sekolah" : selectedClass.name,
    },
    activeAcademicYear,
    classes: classes.map((classRoom) => ({
      id: classRoom.id,
      name: classRoom.name,
      gradeLevel: classRoom.gradeLevel,
      department: classRoom.department,
      homeroomTeacher: classRoom.homeroomTeacher,
      studentCount: classRoom.students.length,
    })),
    selectedClass: {
      id: selectedClass.id,
      name: selectedClass.name,
      department: selectedClass.department,
      homeroomTeacher: selectedClass.homeroomTeacher,
      studentCount: selectedClass.students.length,
    },
    daily: {
      dateOnly,
      rows: dailyRows,
      summary: dailySummary,
      unrecordedClasses,
      completedClasses: dailyRows.filter((row) => row.completed).length,
    },
    period: {
      mode: period,
      label: periodLabel,
      startDateOnly: periodStart,
      endDateOnly: periodEndExclusive,
      students,
      attention,
    },
    studentHistory: selectedStudent
      ? {
          student: {
            id: selectedStudent.id,
            name: selectedStudent.name,
            nis: selectedStudent.studentProfile?.nis || "-",
            nisn: selectedStudent.studentProfile?.nisn || "-",
          },
          summary: {
            ...selectedStudentSummary,
            rate: attendanceRate(selectedStudentRecords),
          },
          records: selectedStudentRecords.map((record) => ({
            dateOnly: record.dateOnly,
            status: record.status,
            notes: record.notes,
            recordedBy: record.recordedBy,
            updatedAt: record.updatedAt,
          })),
        }
      : null,
  };
};
