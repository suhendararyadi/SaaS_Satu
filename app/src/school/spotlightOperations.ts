import { prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { ensureSchoolUser } from "./authGuards";
import {
  canRunSpotlightDataSearch,
  getSpotlightScopes,
  normalizeSpotlightQuery,
  type SpotlightScope,
} from "./spotlightPolicy";

const spotlightSearchSchema = z.object({
  query: z.string().max(80),
  limit: z.number().int().min(1).max(8).optional(),
});

export type SchoolSpotlightResult = {
  id: string;
  kind:
    | "STUDENT"
    | "TEACHER"
    | "CLASS"
    | "COURSE"
    | "COMPANY"
    | "PLACEMENT"
    | "WEBSITE";
  group: string;
  title: string;
  subtitle?: string | null;
  href: string;
  icon: string;
};

const insensitive = (query: string) => ({
  contains: query,
  mode: "insensitive" as const,
});

function encoded(value: string) {
  return encodeURIComponent(value);
}

function contentTypeLabel(type: string) {
  if (type === "PAGE") return "Halaman";
  if (type === "NEWS") return "Berita";
  if (type === "EVENT") return "Agenda";
  if (type === "ANNOUNCEMENT") return "Pengumuman";
  return "Konten";
}

function contentStatusLabel(status: string) {
  if (status === "DRAFT") return "Draft";
  if (status === "IN_REVIEW") return "Review";
  if (status === "SCHEDULED") return "Terjadwal";
  if (status === "PUBLISHED") return "Terbit";
  if (status === "ARCHIVED") return "Arsip";
  return status;
}

function hasScope(scopes: readonly SpotlightScope[], scope: SpotlightScope) {
  return scopes.includes(scope);
}

export const getSchoolSpotlightSearch = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const user = ensureSchoolUser(context);
  const args = ensureArgsSchemaOrThrowHttpError(spotlightSearchSchema, rawArgs);
  const query = normalizeSpotlightQuery(args.query);
  const take = args.limit ?? 5;

  if (!canRunSpotlightDataSearch(query)) {
    return { query, items: [] as SchoolSpotlightResult[] };
  }

  const scopes = getSpotlightScopes(user.role, user.isAdmin);
  const items: SchoolSpotlightResult[] = [];

  if (hasScope(scopes, "STUDENTS")) {
    const students = await prisma.user.findMany({
      where: {
        schoolId: user.schoolId,
        role: "STUDENT",
        OR: [
          { name: insensitive(query) },
          { username: insensitive(query) },
          { email: insensitive(query) },
          { studentProfile: { is: { nis: insensitive(query) } } },
          { studentProfile: { is: { nisn: insensitive(query) } } },
          { classRoom: { is: { name: insensitive(query) } } },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        studentProfile: { select: { nis: true } },
        classRoom: {
          select: {
            name: true,
            department: { select: { code: true } },
          },
        },
      },
      orderBy: { name: "asc" },
      take,
    });

    for (const student of students) {
      const classLabel = student.classRoom
        ? `${student.classRoom.name}${student.classRoom.department?.code ? ` · ${student.classRoom.department.code}` : ""}`
        : "Belum memiliki rombel";
      const nisLabel = student.studentProfile?.nis
        ? ` · NIS ${student.studentProfile.nis}`
        : "";
      const title = student.name || student.username || "Siswa";
      items.push({
        id: student.id,
        kind: "STUDENT",
        group: "Siswa",
        title,
        subtitle: `${classLabel}${nisLabel}`,
        href: `/school/students?spotlight=${encoded(title)}`,
        icon: "person",
      });
    }
  }

  if (hasScope(scopes, "TEACHERS")) {
    const teachers = await prisma.user.findMany({
      where: {
        schoolId: user.schoolId,
        role: { in: ["TEACHER", "SCHOOL_ADMIN"] },
        OR: [
          { name: insensitive(query) },
          { username: insensitive(query) },
          { email: insensitive(query) },
          { teacherProfile: { is: { nip: insensitive(query) } } },
          { teacherProfile: { is: { title: insensitive(query) } } },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        teacherProfile: { select: { nip: true, title: true, isWaka: true } },
      },
      orderBy: { name: "asc" },
      take,
    });

    for (const teacher of teachers) {
      const title = teacher.name || teacher.username || "Guru";
      const detail = [
        teacher.role === "SCHOOL_ADMIN" ? "Admin Sekolah" : "Guru",
        teacher.teacherProfile?.isWaka ? "Waka" : null,
        teacher.teacherProfile?.nip ? `NIP ${teacher.teacherProfile.nip}` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      items.push({
        id: teacher.id,
        kind: "TEACHER",
        group: "Guru & Tendik",
        title,
        subtitle: detail,
        href: `/school/teachers?spotlight=${encoded(title)}`,
        icon: "badge",
      });
    }
  }

  if (hasScope(scopes, "CLASSES")) {
    const classes = await prisma.classRoom.findMany({
      where: {
        schoolId: user.schoolId,
        academicYear: { isActive: true },
        OR: [
          { name: insensitive(query) },
          { department: { is: { code: insensitive(query) } } },
          { department: { is: { name: insensitive(query) } } },
          { homeroomTeacher: { is: { name: insensitive(query) } } },
        ],
      },
      select: {
        id: true,
        name: true,
        gradeLevel: true,
        department: { select: { code: true, name: true } },
        homeroomTeacher: { select: { name: true } },
        _count: { select: { students: true } },
      },
      orderBy: { name: "asc" },
      take,
    });

    for (const room of classes) {
      const subtitle = [
        room.department?.code || room.department?.name || `Kelas ${room.gradeLevel}`,
        `${room._count.students} siswa`,
        room.homeroomTeacher?.name ? `Wali: ${room.homeroomTeacher.name}` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      items.push({
        id: room.id,
        kind: "CLASS",
        group: "Rombel",
        title: room.name,
        subtitle,
        href: `/school/classes?spotlight=${encoded(room.name)}`,
        icon: "meeting_room",
      });
    }
  }

  if (hasScope(scopes, "COURSES")) {
    if (!(user.role === "STUDENT" && !user.classRoomId)) {
      const courses = await prisma.lmsCourse.findMany({
        where: {
          schoolId: user.schoolId,
          academicYear: { isActive: true },
          ...(user.role === "TEACHER" && !user.isAdmin
            ? { teacherId: user.id }
            : {}),
          ...(user.role === "STUDENT" && user.classRoomId
            ? { classRoomId: user.classRoomId }
            : {}),
          OR: [
            { subjectName: insensitive(query) },
            { classRoom: { is: { name: insensitive(query) } } },
            { teacher: { is: { name: insensitive(query) } } },
          ],
        },
        select: {
          id: true,
          subjectName: true,
          classRoom: { select: { name: true } },
          teacher: { select: { name: true } },
        },
        orderBy: { subjectName: "asc" },
        take,
      });

      for (const course of courses) {
        items.push({
          id: course.id,
          kind: "COURSE",
          group: "Pembelajaran",
          title: course.subjectName,
          subtitle: [course.classRoom.name, course.teacher.name]
            .filter(Boolean)
            .join(" · "),
          href: `/school/lms/courses/${course.id}`,
          icon: "menu_book",
        });
      }
    }
  }

  if (hasScope(scopes, "COMPANIES")) {
    const companies = await prisma.company.findMany({
      where: {
        schoolId: user.schoolId,
        OR: [
          { name: insensitive(query) },
          { industrySector: insensitive(query) },
          { address: insensitive(query) },
          { picName: insensitive(query) },
        ],
      },
      select: {
        id: true,
        name: true,
        industrySector: true,
        address: true,
        _count: { select: { placements: true } },
      },
      orderBy: { name: "asc" },
      take,
    });

    for (const company of companies) {
      items.push({
        id: company.id,
        kind: "COMPANY",
        group: "Mitra DUDI",
        title: company.name,
        subtitle: [
          company.industrySector,
          `${company._count.placements} penempatan`,
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/school/pkl/companies?spotlight=${encoded(company.name)}`,
        icon: "apartment",
      });
    }
  }

  if (hasScope(scopes, "PLACEMENTS")) {
    const placementScope =
      user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN"
        ? {}
        : user.role === "TEACHER"
          ? { teacherSupervisorId: user.id }
          : user.role === "STUDENT"
            ? { studentId: user.id }
            : user.role === "DUDI_MENTOR"
              ? { dudiMentorId: user.id }
              : { id: "__forbidden__" };

    const placements = await prisma.placement.findMany({
      where: {
        schoolId: user.schoolId,
        ...placementScope,
        OR: [
          { student: { is: { name: insensitive(query) } } },
          { company: { is: { name: insensitive(query) } } },
          { company: { is: { industrySector: insensitive(query) } } },
          {
            student: {
              is: {
                studentProfile: { is: { nis: insensitive(query) } },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        status: true,
        student: {
          select: {
            name: true,
            studentProfile: { select: { nis: true } },
            classRoom: { select: { name: true } },
          },
        },
        company: { select: { name: true } },
      },
      orderBy: { startDate: "desc" },
      take,
    });

    for (const placement of placements) {
      const title =
        user.role === "STUDENT"
          ? placement.company.name
          : placement.student.name || "Siswa PKL";
      const subtitle =
        user.role === "STUDENT"
          ? `PKL saya · ${placement.status}`
          : [
              placement.company.name,
              placement.student.classRoom?.name,
              placement.status,
            ]
              .filter(Boolean)
              .join(" · ");

      const href =
        user.role === "STUDENT"
          ? "/school/pkl/journals"
          : user.isAdmin ||
              user.role === "SUPERADMIN" ||
              user.role === "SCHOOL_ADMIN"
            ? `/school/pkl/placements?spotlight=${encoded(placement.student.name || placement.company.name)}`
            : "/school/pkl/monitoring";

      items.push({
        id: placement.id,
        kind: "PLACEMENT",
        group: "PKL",
        title,
        subtitle,
        href,
        icon: "work",
      });
    }
  }

  if (hasScope(scopes, "WEBSITE")) {
    const contents = await prisma.schoolSiteContent.findMany({
      where: {
        schoolId: user.schoolId,
        OR: [
          { title: insensitive(query) },
          { excerpt: insensitive(query) },
          { category: insensitive(query) },
          { slug: insensitive(query) },
        ],
      },
      select: {
        id: true,
        type: true,
        title: true,
        status: true,
        category: true,
      },
      orderBy: { updatedAt: "desc" },
      take,
    });

    for (const content of contents) {
      items.push({
        id: content.id,
        kind: "WEBSITE",
        group: "Website Sekolah",
        title: content.title,
        subtitle: [
          contentTypeLabel(content.type),
          content.category,
          contentStatusLabel(content.status),
        ]
          .filter(Boolean)
          .join(" · "),
        href: "/school/website",
        icon:
          content.type === "NEWS"
            ? "newspaper"
            : content.type === "EVENT"
              ? "event"
              : content.type === "ANNOUNCEMENT"
                ? "campaign"
                : "article",
      });
    }
  }

  return { query, items };
};
