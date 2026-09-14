import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import {
  requireSchoolAdmin,
  requireSchoolDirectoryAccess,
} from "./authGuards";
import { resolveStudentAffairsAccess } from "./studentAffairsAccess";

const optionalText = z.string().trim().optional().nullable();
const optionalEmail = z
  .string()
  .trim()
  .email("Format email tidak valid")
  .optional()
  .nullable()
  .or(z.literal(""));
const optionalBooleanText = z.enum(["", "YA", "TIDAK"]).optional().default("");

const studentInputSchema = z.object({
  name: z.string().trim().min(1, "Nama lengkap siswa wajib diisi"),
  gender: z.enum(["L", "P"], {
    error: "Jenis kelamin wajib dipilih",
  }),
  nis: optionalText,
  nisn: optionalText,
  nik: optionalText,
  birthPlace: optionalText,
  birthDate: optionalText,
  religion: optionalText,
  classRoomId: z
    .string()
    .uuid("ID rombel tidak valid")
    .optional()
    .nullable()
    .or(z.literal("")),
  email: optionalEmail,
  status: z
    .enum(["ACTIVE", "SUSPENDED", "GRADUATED"])
    .optional()
    .default("ACTIVE"),

  address: optionalText,
  rt: optionalText,
  rw: optionalText,
  hamlet: optionalText,
  village: optionalText,
  district: optionalText,
  postalCode: optionalText,
  residenceType: optionalText,
  transportation: optionalText,
  phone: optionalText,
  mobilePhone: optionalText,

  skhun: optionalText,
  nationalExamNumber: optionalText,
  diplomaSerialNumber: optionalText,
  previousSchool: optionalText,
  birthCertificateNumber: optionalText,

  receivesKps: optionalBooleanText,
  kpsNumber: optionalText,
  receivesKip: optionalBooleanText,
  kipNumber: optionalText,
  kipName: optionalText,
  kksNumber: optionalText,
  pipEligible: optionalBooleanText,
  pipReason: optionalText,

  fatherName: optionalText,
  fatherBirthYear: optionalText,
  fatherEducation: optionalText,
  fatherOccupation: optionalText,
  fatherIncome: optionalText,
  fatherNik: optionalText,

  motherName: optionalText,
  motherBirthYear: optionalText,
  motherEducation: optionalText,
  motherOccupation: optionalText,
  motherIncome: optionalText,
  motherNik: optionalText,

  guardianName: optionalText,
  guardianBirthYear: optionalText,
  guardianEducation: optionalText,
  guardianOccupation: optionalText,
  guardianIncome: optionalText,
  guardianNik: optionalText,

  bankName: optionalText,
  bankAccountNumber: optionalText,
  bankAccountHolder: optionalText,

  specialNeeds: optionalText,
  birthOrder: optionalText,
  latitude: optionalText,
  longitude: optionalText,
  familyCardNumber: optionalText,
  weightKg: optionalText,
  heightCm: optionalText,
  headCircumferenceCm: optionalText,
  siblingCount: optionalText,
  distanceToSchoolKm: optionalText,
});

const createStudentSchema = studentInputSchema;
const updateStudentSchema = studentInputSchema.extend({
  id: z.string().uuid("ID siswa tidak valid"),
});
const getStudentDetailSchema = z.object({
  id: z.string().uuid("ID siswa tidak valid"),
});

type StudentInput = z.infer<typeof studentInputSchema>;

function cleanText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function cleanIdentifier(value: string | null | undefined): string | null {
  const text = cleanText(value);
  if (!text) return null;
  return text.replace(/\.0$/, "").replace(/\s+/g, "");
}

function optionalInt(
  value: string | null | undefined,
  label: string,
): number | null {
  const text = cleanText(value);
  if (!text) return null;
  const number = Number.parseInt(text, 10);
  if (!Number.isFinite(number)) {
    throw new HttpError(400, `${label} harus berupa angka.`);
  }
  return number;
}

function optionalFloat(
  value: string | null | undefined,
  label: string,
): number | null {
  const text = cleanText(value)?.replace(",", ".");
  if (!text) return null;
  const number = Number.parseFloat(text);
  if (!Number.isFinite(number)) {
    throw new HttpError(400, `${label} harus berupa angka.`);
  }
  return number;
}

function optionalBoolean(value: "" | "YA" | "TIDAK" | undefined) {
  if (!value) return null;
  return value === "YA";
}

function optionalDate(value: string | null | undefined): Date | null {
  const text = cleanText(value);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new HttpError(400, "Tanggal lahir harus menggunakan format tanggal yang valid.");
  }
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, "Tanggal lahir tidak valid.");
  }
  return date;
}

function profileData(args: StudentInput, className: string | null) {
  return {
    nis: cleanIdentifier(args.nis),
    nisn: cleanIdentifier(args.nisn),
    gender: args.gender,
    birthPlace: cleanText(args.birthPlace),
    birthDate: optionalDate(args.birthDate),
    nik: cleanIdentifier(args.nik),
    religion: cleanText(args.religion),
    status: args.status,

    address: cleanText(args.address),
    rt: cleanText(args.rt),
    rw: cleanText(args.rw),
    hamlet: cleanText(args.hamlet),
    village: cleanText(args.village),
    district: cleanText(args.district),
    postalCode: cleanIdentifier(args.postalCode),
    residenceType: cleanText(args.residenceType),
    transportation: cleanText(args.transportation),
    phone: cleanText(args.phone),
    mobilePhone: cleanText(args.mobilePhone),

    skhun: cleanText(args.skhun),
    currentClassName: className,
    nationalExamNumber: cleanText(args.nationalExamNumber),
    diplomaSerialNumber: cleanText(args.diplomaSerialNumber),
    previousSchool: cleanText(args.previousSchool),
    birthCertificateNumber: cleanText(args.birthCertificateNumber),

    receivesKps: optionalBoolean(args.receivesKps),
    kpsNumber: cleanText(args.kpsNumber),
    receivesKip: optionalBoolean(args.receivesKip),
    kipNumber: cleanText(args.kipNumber),
    kipName: cleanText(args.kipName),
    kksNumber: cleanText(args.kksNumber),
    pipEligible: optionalBoolean(args.pipEligible),
    pipReason: cleanText(args.pipReason),

    fatherName: cleanText(args.fatherName),
    fatherBirthYear: optionalInt(args.fatherBirthYear, "Tahun lahir ayah"),
    fatherEducation: cleanText(args.fatherEducation),
    fatherOccupation: cleanText(args.fatherOccupation),
    fatherIncome: cleanText(args.fatherIncome),
    fatherNik: cleanIdentifier(args.fatherNik),

    motherName: cleanText(args.motherName),
    motherBirthYear: optionalInt(args.motherBirthYear, "Tahun lahir ibu"),
    motherEducation: cleanText(args.motherEducation),
    motherOccupation: cleanText(args.motherOccupation),
    motherIncome: cleanText(args.motherIncome),
    motherNik: cleanIdentifier(args.motherNik),

    guardianName: cleanText(args.guardianName),
    guardianBirthYear: optionalInt(args.guardianBirthYear, "Tahun lahir wali"),
    guardianEducation: cleanText(args.guardianEducation),
    guardianOccupation: cleanText(args.guardianOccupation),
    guardianIncome: cleanText(args.guardianIncome),
    guardianNik: cleanIdentifier(args.guardianNik),

    bankName: cleanText(args.bankName),
    bankAccountNumber: cleanIdentifier(args.bankAccountNumber),
    bankAccountHolder: cleanText(args.bankAccountHolder),

    specialNeeds: cleanText(args.specialNeeds),
    birthOrder: optionalInt(args.birthOrder, "Anak ke"),
    latitude: optionalFloat(args.latitude, "Lintang"),
    longitude: optionalFloat(args.longitude, "Bujur"),
    familyCardNumber: cleanIdentifier(args.familyCardNumber),
    weightKg: optionalFloat(args.weightKg, "Berat badan"),
    heightCm: optionalFloat(args.heightCm, "Tinggi badan"),
    headCircumferenceCm: optionalFloat(
      args.headCircumferenceCm,
      "Lingkar kepala",
    ),
    siblingCount: optionalInt(args.siblingCount, "Jumlah saudara kandung"),
    distanceToSchoolKm: optionalFloat(
      args.distanceToSchoolKm,
      "Jarak rumah ke sekolah",
    ),
  };
}

async function validateClassRoom(
  schoolId: string,
  classRoomId: string | null | undefined,
) {
  const cleanId = cleanText(classRoomId);
  if (!cleanId) return null;

  const classRoom = await prisma.classRoom.findFirst({
    where: { id: cleanId, schoolId },
    select: { id: true, name: true },
  });
  if (!classRoom) {
    throw new HttpError(
      400,
      "Rombel kelas yang dipilih tidak valid untuk sekolah ini.",
    );
  }
  return classRoom;
}

async function assertUniqueIdentifiers(
  schoolId: string,
  identifiers: { nis: string | null; nisn: string | null; nik: string | null },
  excludeUserId?: string,
) {
  const checks = [
    ["NIPD/NIS", "nis", identifiers.nis],
    ["NISN", "nisn", identifiers.nisn],
    ["NIK", "nik", identifiers.nik],
  ] as const;

  for (const [label, field, value] of checks) {
    if (!value) continue;
    const existing = await prisma.studentProfile.findFirst({
      where: {
        [field]: value,
        user: { schoolId },
        ...(excludeUserId ? { NOT: { userId: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new HttpError(
        400,
        `${label} ${value} sudah digunakan siswa lain di sekolah ini.`,
      );
    }
  }
}

async function assertEmailAvailable(email: string | null, excludeUserId?: string) {
  if (!email) return;
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing && existing.id !== excludeUserId) {
    throw new HttpError(400, "Email sudah terdaftar untuk pengguna lain.");
  }
}

async function uniqueStudentUsername(
  schoolId: string,
  preferred: string | null,
): Promise<string> {
  const base =
    preferred?.toLocaleLowerCase("id-ID").replace(/[^a-z0-9._-]+/g, "") ||
    `siswa_${Date.now().toString(36)}`;
  const candidates = [
    base,
    `${base}_${schoolId.slice(0, 4)}`,
    `${base}_${Date.now().toString(36)}`,
  ];
  for (const candidate of candidates) {
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  return `${base}_${Math.random().toString(36).slice(2, 8)}`;
}

export const getSchoolStudentDetail = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const user = requireSchoolDirectoryAccess(context);
  const args = ensureArgsSchemaOrThrowHttpError(getStudentDetailSchema, rawArgs);

  const student = await prisma.user.findFirst({
    where: {
      id: args.id,
      schoolId: user.schoolId,
      role: "STUDENT",
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      classRoom: {
        select: {
          id: true,
          name: true,
          department: { select: { code: true, name: true } },
          academicYear: { select: { id: true, yearName: true, semester: true, isActive: true } },
        },
      },
      studentProfile: true,
      studentPlacements: {
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
          company: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!student) {
    throw new HttpError(404, "Data siswa tidak ditemukan di unit sekolah ini.");
  }

  const canManage =
    !!user.isAdmin ||
    user.role === "SUPERADMIN" ||
    user.role === "SCHOOL_ADMIN";

  const affairsAccess = await resolveStudentAffairsAccess(user);
  const canViewStudentAffairs =
    affairsAccess.canAccess &&
    (affairsAccess.canManageAll ||
      (!!student.classRoom?.id &&
        affairsAccess.homeroomClassIds.includes(student.classRoom.id)));

  let studentAffairs: any = null;
  if (canViewStudentAffairs) {
    const [violations, achievements, coachings, permits, attendance, followUps] =
      await Promise.all([
        prisma.studentViolation.findMany({
          where: { schoolId: user.schoolId, studentId: student.id },
          select: {
            id: true,
            title: true,
            category: true,
            severity: true,
            status: true,
            points: true,
            incidentAt: true,
            resolutionNote: true,
          },
          orderBy: { incidentAt: "desc" },
          take: 20,
        }),
        prisma.studentAchievement.findMany({
          where: { schoolId: user.schoolId, studentId: student.id },
          select: {
            id: true,
            title: true,
            category: true,
            level: true,
            award: true,
            achievementDate: true,
          },
          orderBy: { achievementDate: "desc" },
          take: 20,
        }),
        prisma.studentCoaching.findMany({
          where: { schoolId: user.schoolId, studentId: student.id },
          select: {
            id: true,
            type: true,
            topic: true,
            status: true,
            nextAction: true,
            nextReviewAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        prisma.studentPermit.findMany({
          where: { schoolId: user.schoolId, studentId: student.id },
          select: {
            id: true,
            type: true,
            reason: true,
            status: true,
            startAt: true,
            endAt: true,
          },
          orderBy: { startAt: "desc" },
          take: 20,
        }),
        prisma.schoolDailyAttendance.findMany({
          where: { schoolId: user.schoolId, studentId: student.id },
          select: { id: true, dateOnly: true, status: true, notes: true },
          orderBy: { dateOnly: "desc" },
          take: 20,
        }),
        prisma.schoolFollowUpCase.findMany({
          where: {
            schoolId: user.schoolId,
            subjectStudentId: student.id,
            sourceType: "STUDENT_AFFAIRS",
          },
          select: { id: true, status: true, severity: true, sourceKey: true },
        }),
      ]);

    const timeline = [
      ...violations.map((item) => ({
        id: "violation:" + item.id,
        type: "VIOLATION",
        date: item.incidentAt,
        title: item.title,
        subtitle: item.category,
        status: item.status,
        severity: item.severity,
      })),
      ...achievements.map((item) => ({
        id: "achievement:" + item.id,
        type: "ACHIEVEMENT",
        date: item.achievementDate,
        title: item.title,
        subtitle: item.award || item.category,
        status: item.level,
        severity: null,
      })),
      ...coachings.map((item) => ({
        id: "coaching:" + item.id,
        type: "COACHING",
        date: item.createdAt,
        title: item.topic,
        subtitle: item.type,
        status: item.status,
        severity: null,
      })),
      ...permits.map((item) => ({
        id: "permit:" + item.id,
        type: "PERMIT",
        date: item.startAt,
        title: item.reason,
        subtitle: item.type,
        status: item.status,
        severity: null,
      })),
      ...attendance.map((item) => ({
        id: "attendance:" + item.id,
        type: "ATTENDANCE",
        date: new Date(item.dateOnly + "T00:00:00+07:00"),
        title: "Presensi " + item.status,
        subtitle: item.notes || "Presensi harian sekolah",
        status: item.status,
        severity: item.status === "ALPA" ? "HIGH" : item.status === "TERLAMBAT" ? "MEDIUM" : null,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);

    studentAffairs = {
      stats: {
        openViolations: violations.filter(
          (item) => item.status === "RECORDED" || item.status === "IN_REVIEW",
        ).length,
        achievements: achievements.length,
        openCoachings: coachings.filter(
          (item) => item.status === "OPEN" || item.status === "IN_PROGRESS",
        ).length,
        activePermits: permits.filter(
          (item) => item.status === "REQUESTED" || item.status === "APPROVED",
        ).length,
        activeFollowUps: followUps.filter(
          (item) => item.status !== "RESOLVED" && item.status !== "CANCELED",
        ).length,
      },
      timeline,
    };
  }

  if (!canManage && student.studentProfile) {
    const hidden = {
      ...student.studentProfile,
      nik: null,
      fatherNik: null,
      motherNik: null,
      guardianNik: null,
      familyCardNumber: null,
      bankAccountNumber: null,
      birthCertificateNumber: null,
      kpsNumber: null,
      kipNumber: null,
      kksNumber: null,
    };
    return { student: { ...student, studentProfile: hidden }, canManage, studentAffairs };
  }

  return { student, canManage, studentAffairs };
};

export const createStudent = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(createStudentSchema, rawArgs);

  const school = await prisma.school.findUnique({
    where: { id: admin.schoolId },
    select: { studentQuota: true },
  });
  const currentStudentCount = await prisma.user.count({
    where: { schoolId: admin.schoolId, role: "STUDENT" },
  });
  const quota = school?.studentQuota || 50;
  if (currentStudentCount >= quota) {
    throw new HttpError(
      400,
      `Kuota siswa telah mencapai batas maksimal (${currentStudentCount}/${quota}).`,
    );
  }

  const classRoom = await validateClassRoom(admin.schoolId, args.classRoomId);
  const identifiers = {
    nis: cleanIdentifier(args.nis),
    nisn: cleanIdentifier(args.nisn),
    nik: cleanIdentifier(args.nik),
  };
  await assertUniqueIdentifiers(admin.schoolId, identifiers);

  const email = cleanText(args.email)?.toLocaleLowerCase("id-ID") ?? null;
  await assertEmailAvailable(email);

  const username = await uniqueStudentUsername(
    admin.schoolId,
    identifiers.nisn || identifiers.nis || identifiers.nik,
  );
  const data = profileData(args, classRoom?.name ?? null);

  return prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: args.name.trim(),
        email,
        username,
        role: "STUDENT",
        schoolId: admin.schoolId,
        classRoomId: classRoom?.id ?? null,
      },
    });
    await tx.studentProfile.create({
      data: {
        userId: newUser.id,
        ...data,
      },
    });
    return { id: newUser.id };
  });
};

export const updateStudent = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(updateStudentSchema, rawArgs);

  const target = await prisma.user.findFirst({
    where: {
      id: args.id,
      schoolId: admin.schoolId,
      role: "STUDENT",
    },
    select: {
      id: true,
      email: true,
    },
  });
  if (!target) {
    throw new HttpError(404, "Data siswa tidak ditemukan di unit sekolah ini.");
  }

  const classRoom = await validateClassRoom(admin.schoolId, args.classRoomId);
  const identifiers = {
    nis: cleanIdentifier(args.nis),
    nisn: cleanIdentifier(args.nisn),
    nik: cleanIdentifier(args.nik),
  };
  await assertUniqueIdentifiers(admin.schoolId, identifiers, target.id);

  const email = cleanText(args.email)?.toLocaleLowerCase("id-ID") ?? null;
  await assertEmailAvailable(email, target.id);
  const data = profileData(args, classRoom?.name ?? null);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: {
        name: args.name.trim(),
        email,
        classRoomId: classRoom?.id ?? null,
      },
    });

    await tx.studentProfile.upsert({
      where: { userId: target.id },
      create: { userId: target.id, ...data },
      update: data,
    });
  });

  return { id: target.id };
};
