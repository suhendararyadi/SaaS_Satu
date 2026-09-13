import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { requireTeacher } from "../school/authGuards";

// ==========================================
// 1. Waka Kurikulum Supervision Operations
// ==========================================

export const getWakaSupervisionData = async (_args: unknown, context: { user?: User }) => {
  const user = requireTeacher(context);
  if (!user.isAdmin && user.role === "TEACHER") {
    const [profile, assignment] = await Promise.all([
      prisma.teacherProfile.findUnique({
        where: { userId: user.id },
        select: { isWaka: true },
      }),
      prisma.wakasekAssignment.findFirst({
        where: { schoolId: user.schoolId, teacherId: user.id, role: "KURIKULUM" },
        select: { id: true },
      }),
    ]);
    if (!profile?.isWaka && !assignment) {
      throw new HttpError(403, "Dashboard supervisi Kurikulum hanya dapat diakses oleh Waka Kurikulum.");
    }
  }

  // Today's date range (Asia/Jakarta)
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // Fetch all courses in school
  const courses = await prisma.lmsCourse.findMany({
    where: { schoolId: user.schoolId },
    include: {
      teacher: { select: { id: true, name: true, teacherProfile: true } },
      classRoom: { select: { id: true, name: true, department: { select: { code: true } } } },
      agendas: {
        where: {
          date: { gte: startOfDay, lte: endOfDay },
        },
        include: { photos: true },
      },
      _count: {
        select: { agendas: true, attendances: true, materials: true, assignments: true },
      },
    },
    orderBy: { subjectName: "asc" },
  });

  // Calculate teacher compliance
  const teacherStatsMap = new Map<
    string,
    {
      teacherId: string;
      teacherName: string;
      totalCourses: number;
      todayAgendasFilled: number;
      totalAgendasSemester: number;
    }
  >();

  for (const c of courses) {
    const tId = c.teacher.id;
    const existing = teacherStatsMap.get(tId) || {
      teacherId: tId,
      teacherName: c.teacher.name || "Guru",
      totalCourses: 0,
      todayAgendasFilled: 0,
      totalAgendasSemester: 0,
    };

    existing.totalCourses += 1;
    existing.todayAgendasFilled += c.agendas.length;
    existing.totalAgendasSemester += c._count.agendas;
    teacherStatsMap.set(tId, existing);
  }

  const teacherCompliance = Array.from(teacherStatsMap.values());

  return {
    courses,
    teacherCompliance,
    todayAgendasCount: courses.reduce((acc, c) => acc + c.agendas.length, 0),
    totalCoursesCount: courses.length,
  };
};

// ==========================================
// 2. Guru Piket Operations
// ==========================================

export const getDutyTeacherReports = async (_args: unknown, context: { user?: User }) => {
  const user = requireTeacher(context);

  return prisma.dutyTeacherReport.findMany({
    where: { schoolId: user.schoolId },
    include: {
      dutyTeacher: { select: { id: true, name: true, email: true } },
    },
    orderBy: { date: "desc" },
    take: 50,
  });
};

const createDutyReportSchema = z.object({
  lateStudentsCount: z.number().int().min(0).default(0),
  dispensationsCount: z.number().int().min(0).default(0),
  notes: z.string().optional().nullable(),
});

export const createDutyTeacherReport = async (rawArgs: unknown, context: { user?: User }) => {
  const teacher = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(createDutyReportSchema, rawArgs);

  return prisma.dutyTeacherReport.create({
    data: {
      schoolId: teacher.schoolId,
      dutyTeacherId: teacher.id,
      date: new Date(),
      lateStudentsCount: args.lateStudentsCount,
      dispensationsCount: args.dispensationsCount,
      notes: args.notes || null,
    },
  });
};

// ==========================================
// 3. Wali Kelas Dashboard Operations
// ==========================================

export const getHomeroomDashboardData = async (_args: unknown, context: { user?: User }) => {
  const user = requireTeacher(context);

  // Find class where user is homeroom teacher
  const homeroomClass = await prisma.classRoom.findFirst({
    where: {
      schoolId: user.schoolId,
      ...(user.isAdmin ? {} : { homeroomTeacherId: user.id }),
    },
    include: {
      department: true,
      academicYear: true,
      students: {
        select: {
          id: true,
          name: true,
          studentProfile: true,
          studentPlacements: {
            where: { status: "ACTIVE" },
            include: {
              company: true,
              attendances: { take: 5, orderBy: { timestamp: "desc" } },
              journals: { take: 5, orderBy: { date: "desc" } },
            },
          },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  return homeroomClass;
};
