import { HttpError } from "wasp/server";
import { type User } from "wasp/entities";
import { z } from "zod";
import { prisma } from "wasp/server";
import { requireTeacher } from "./authGuards";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import {
  DAILY_ATTENDANCE_STATUSES,
  isValidDateOnly,
  jakartaDateOnly,
  summarizeDailyAttendance,
} from "./dailyAttendance";

const dateOnlySchema = z.string().refine(isValidDateOnly, "Tanggal tidak valid.");

const getDailyAttendanceSchema = z.object({
  classRoomId: z.string().uuid().optional(),
  dateOnly: dateOnlySchema.optional(),
}).optional();

export const getDailySchoolAttendance = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const user = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(getDailyAttendanceSchema || z.any(), rawArgs || {});
  const dateOnly = args?.dateOnly || jakartaDateOnly();

  const activeAcademicYear = await prisma.academicYear.findFirst({
    where: { schoolId: user.schoolId, isActive: true },
    select: { id: true, yearName: true, semester: true },
  });

  const classes = await prisma.classRoom.findMany({
    where: {
      schoolId: user.schoolId,
      ...(activeAcademicYear ? { academicYearId: activeAcademicYear.id } : {}),
    },
    select: {
      id: true,
      name: true,
      gradeLevel: true,
      department: { select: { code: true, name: true } },
      _count: { select: { students: true } },
    },
    orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
  });

  const classRoomId = args?.classRoomId || classes[0]?.id;
  if (!classRoomId) {
    return {
      dateOnly,
      activeAcademicYear,
      classes,
      selectedClass: null,
      students: [],
      summary: summarizeDailyAttendance([]),
      savedCount: 0,
    };
  }

  const selectedClass = await prisma.classRoom.findFirst({
    where: {
      id: classRoomId,
      schoolId: user.schoolId,
      ...(activeAcademicYear ? { academicYearId: activeAcademicYear.id } : {}),
    },
    select: {
      id: true,
      name: true,
      gradeLevel: true,
      academicYearId: true,
      department: { select: { code: true, name: true } },
    },
  });
  if (!selectedClass) {
    throw new HttpError(404, "Rombel tidak ditemukan pada tahun ajaran aktif.");
  }

  const students = await prisma.user.findMany({
    where: {
      schoolId: user.schoolId,
      classRoomId,
      role: "STUDENT",
    },
    select: {
      id: true,
      name: true,
      studentProfile: { select: { nis: true, nisn: true, gender: true } },
    },
    orderBy: [{ name: "asc" }],
  });

  const savedRecords = await prisma.schoolDailyAttendance.findMany({
    where: { schoolId: user.schoolId, classRoomId, dateOnly },
    select: {
      id: true,
      studentId: true,
      status: true,
      notes: true,
      recordedAt: true,
      updatedAt: true,
      recordedBy: { select: { id: true, name: true } },
    },
  });
  const byStudent = new Map(savedRecords.map((record) => [record.studentId, record]));

  const rows = students.map((student) => {
    const saved = byStudent.get(student.id);
    return {
      ...student,
      attendance: saved
        ? {
            id: saved.id,
            status: saved.status,
            notes: saved.notes,
            recordedAt: saved.recordedAt,
            updatedAt: saved.updatedAt,
            recordedBy: saved.recordedBy,
          }
        : null,
    };
  });

  return {
    dateOnly,
    activeAcademicYear,
    classes,
    selectedClass,
    students: rows,
    summary: summarizeDailyAttendance(savedRecords),
    savedCount: savedRecords.length,
  };
};

const saveDailyAttendanceSchema = z.object({
  classRoomId: z.string().uuid(),
  dateOnly: dateOnlySchema,
  records: z.array(
    z.object({
      studentId: z.string().uuid(),
      status: z.enum(DAILY_ATTENDANCE_STATUSES),
      notes: z.string().trim().max(500).optional().nullable(),
    }),
  ).min(1, "Minimal satu siswa harus dicatat."),
});

export const saveDailySchoolAttendance = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const user = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(saveDailyAttendanceSchema, rawArgs);

  if (args.dateOnly > jakartaDateOnly()) {
    throw new HttpError(400, "Presensi harian tidak dapat dicatat untuk tanggal yang akan datang.");
  }

  const uniqueStudentIds = [...new Set(args.records.map((record) => record.studentId))];
  if (uniqueStudentIds.length !== args.records.length) {
    throw new HttpError(400, "Setiap siswa hanya boleh dicatat sekali.");
  }

  const classRoom = await prisma.classRoom.findFirst({
    where: { id: args.classRoomId, schoolId: user.schoolId },
    select: {
      id: true,
      academicYearId: true,
      academicYear: { select: { isActive: true } },
      students: {
        where: {
          role: "STUDENT",
        },
        select: { id: true },
      },
    },
  });
  if (!classRoom) throw new HttpError(404, "Rombel tidak ditemukan.");
  if (!classRoom.academicYear.isActive) {
    throw new HttpError(400, "Presensi harian hanya dapat dicatat pada tahun ajaran aktif.");
  }

  const classStudentIds = new Set(classRoom.students.map((student) => student.id));
  if (
    args.records.length !== classStudentIds.size ||
    uniqueStudentIds.some((studentId) => !classStudentIds.has(studentId))
  ) {
    throw new HttpError(
      400,
      "Daftar presensi harus memuat seluruh siswa aktif pada rombel ini tepat satu kali.",
    );
  }

  await prisma.$transaction(
    args.records.map((record) =>
      prisma.schoolDailyAttendance.upsert({
        where: {
          schoolId_studentId_dateOnly: {
            schoolId: user.schoolId,
            studentId: record.studentId,
            dateOnly: args.dateOnly,
          },
        },
        create: {
          schoolId: user.schoolId,
          academicYearId: classRoom.academicYearId,
          classRoomId: classRoom.id,
          studentId: record.studentId,
          dateOnly: args.dateOnly,
          status: record.status,
          notes: record.notes || null,
          recordedById: user.id,
        },
        update: {
          academicYearId: classRoom.academicYearId,
          classRoomId: classRoom.id,
          status: record.status,
          notes: record.notes || null,
          recordedById: user.id,
          recordedAt: new Date(),
        },
      }),
    ),
  );

  return {
    ok: true,
    savedCount: args.records.length,
    dateOnly: args.dateOnly,
    classRoomId: classRoom.id,
  };
};
