import { HttpError } from "wasp/server";
import { type User } from "wasp/entities";
import { z } from "zod";
import { prisma } from "wasp/server";
import { ensureSchoolUser } from "./authGuards";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import {
  DAILY_ATTENDANCE_STATUSES,
  isValidDateOnly,
  jakartaDateOnly,
  isDateWithinAcademicSemester,
  summarizeDailyAttendance,
} from "./dailyAttendance";
import {
  canUseDailyAttendance,
  isDailyAttendanceAdmin,
} from "./dailyAttendanceAccess";

const dateOnlySchema = z.string().refine(isValidDateOnly, "Tanggal tidak valid.");

function assertDailyAttendanceClassAccess(
  user: Pick<User, "id" | "role" | "isAdmin">,
  classRoom: { homeroomTeacherId: string | null },
) {
  if (isDailyAttendanceAdmin(user)) return;
  if (user.role === "TEACHER" && classRoom.homeroomTeacherId === user.id) return;
  throw new HttpError(403, "Presensi harian hanya dapat dikelola oleh admin sekolah atau wali kelas rombel tersebut.");
}

const getDailyAttendanceSchema = z.object({
  classRoomId: z.string().uuid().optional(),
  dateOnly: dateOnlySchema.optional(),
}).optional();

export const getDailySchoolAttendance = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const user = ensureSchoolUser(context);
  const args = ensureArgsSchemaOrThrowHttpError(getDailyAttendanceSchema || z.any(), rawArgs || {});
  const dateOnly = args?.dateOnly || jakartaDateOnly();

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
      department: { select: { code: true, name: true } },
      homeroomTeacherId: true,
      homeroomTeacher: { select: { id: true, name: true } },
      _count: { select: { students: true } },
    },
    orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
  });

  if (!canUseDailyAttendance(user, classes.map((classRoom) => classRoom.id))) {
    throw new HttpError(403, "Presensi harian hanya tersedia untuk admin sekolah dan wali kelas yang memiliki rombel binaan.");
  }

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
      access: {
        isAdmin,
        isHomeroomTeacher: !isAdmin,
        scopeLabel: isAdmin ? "Semua rombel" : "Kelas binaan",
      },
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
      homeroomTeacherId: true,
      homeroomTeacher: { select: { id: true, name: true } },
    },
  });
  if (!selectedClass) {
    throw new HttpError(404, "Rombel tidak ditemukan pada tahun ajaran aktif.");
  }
  assertDailyAttendanceClassAccess(user, selectedClass);

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
    access: {
      isAdmin,
      isHomeroomTeacher: !isAdmin,
      scopeLabel: isAdmin ? "Semua rombel" : selectedClass.name,
    },
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
  const user = ensureSchoolUser(context);
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
      academicYear: { select: { isActive: true, yearName: true, semester: true } },
      homeroomTeacherId: true,
      students: {
        where: {
          schoolId: user.schoolId,
          role: "STUDENT",
        },
        select: { id: true },
      },
    },
  });
  if (!classRoom) throw new HttpError(404, "Rombel tidak ditemukan.");
  assertDailyAttendanceClassAccess(user, classRoom);
  if (!classRoom.academicYear.isActive) {
    throw new HttpError(400, "Presensi harian hanya dapat dicatat pada tahun ajaran aktif.");
  }
  if (!isDateWithinAcademicSemester(
    args.dateOnly,
    classRoom.academicYear.yearName,
    classRoom.academicYear.semester,
  )) {
    throw new HttpError(400, "Tanggal presensi berada di luar semester aktif.");
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

  const savedAt = new Date();
  await prisma.$transaction(async (tx) => {
    for (const record of args.records) {
      const previous = await tx.schoolDailyAttendance.findUnique({
        where: { schoolId_studentId_dateOnly: { schoolId: user.schoolId, studentId: record.studentId, dateOnly: args.dateOnly } },
        select: { status: true },
      });
      const saved = await tx.schoolDailyAttendance.upsert({
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
          reconciliationStatus: "MANUAL",
          verifiedById: user.id,
          verifiedAt: savedAt,
          recordedById: user.id,
        },
        update: {
          academicYearId: classRoom.academicYearId,
          classRoomId: classRoom.id,
          status: record.status,
          notes: record.notes || null,
          reconciliationStatus: "MANUAL",
          verifiedById: user.id,
          verifiedAt: savedAt,
          recordedById: user.id,
          recordedAt: savedAt,
        },
      });
      await tx.studentAttendanceEvent.create({
        data: {
          schoolId: user.schoolId, studentId: record.studentId, dateOnly: args.dateOnly,
          type: "HOMEROOM_OVERRIDE", status: record.status, source: "DAILY_MANUAL",
          sourceKey: `manual:${saved.id}:${savedAt.toISOString()}`, actorId: user.id, occurredAt: savedAt,
          notes: record.notes || null, metadata: { previousStatus: previous?.status || null, dailyAttendanceId: saved.id },
        },
      });
    }
  });

  return {
    ok: true,
    savedCount: args.records.length,
    dateOnly: args.dateOnly,
    classRoomId: classRoom.id,
  };
};
