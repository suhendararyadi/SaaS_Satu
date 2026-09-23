import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";
import { requireSchoolAdmin } from "../authGuards";
import { DAPODIK_MAX_ROWS, type DapodikStudentRow } from "./dapodikFormat";

const dapodikRowSchema = z.object({
  sourceRow: z.number().int().positive(),
  name: z.string(),
  nis: z.string(),
  gender: z.string(),
  nisn: z.string(),
  birthPlace: z.string(),
  birthDate: z.string(),
  nik: z.string(),
  religion: z.string(),
  address: z.string(),
  rt: z.string(),
  rw: z.string(),
  hamlet: z.string(),
  village: z.string(),
  district: z.string(),
  postalCode: z.string(),
  residenceType: z.string(),
  transportation: z.string(),
  phone: z.string(),
  mobilePhone: z.string(),
  email: z.string(),
  skhun: z.string(),
  receivesKps: z.string(),
  kpsNumber: z.string(),
  fatherName: z.string(),
  fatherBirthYear: z.string(),
  fatherEducation: z.string(),
  fatherOccupation: z.string(),
  fatherIncome: z.string(),
  fatherNik: z.string(),
  motherName: z.string(),
  motherBirthYear: z.string(),
  motherEducation: z.string(),
  motherOccupation: z.string(),
  motherIncome: z.string(),
  motherNik: z.string(),
  guardianName: z.string(),
  guardianBirthYear: z.string(),
  guardianEducation: z.string(),
  guardianOccupation: z.string(),
  guardianIncome: z.string(),
  guardianNik: z.string(),
  currentClassName: z.string(),
  nationalExamNumber: z.string(),
  diplomaSerialNumber: z.string(),
  receivesKip: z.string(),
  kipNumber: z.string(),
  kipName: z.string(),
  kksNumber: z.string(),
  birthCertificateNumber: z.string(),
  bankName: z.string(),
  bankAccountNumber: z.string(),
  bankAccountHolder: z.string(),
  pipEligible: z.string(),
  pipReason: z.string(),
  specialNeeds: z.string(),
  previousSchool: z.string(),
  birthOrder: z.string(),
  latitude: z.string(),
  longitude: z.string(),
  familyCardNumber: z.string(),
  weightKg: z.string(),
  heightCm: z.string(),
  headCircumferenceCm: z.string(),
  siblingCount: z.string(),
  distanceToSchoolKm: z.string(),
});

const rowsSchema = z
  .array(dapodikRowSchema)
  .min(1, "File Dapodik tidak memiliki baris peserta didik.")
  .max(DAPODIK_MAX_ROWS, `Maksimal ${DAPODIK_MAX_ROWS} siswa per proses impor.`);

const previewSchema = z.object({ rows: rowsSchema });
const importSchema = z.object({
  rows: rowsSchema,
  confirm: z.literal(true),
});

type PreviewAction = "CREATE" | "UPDATE" | "INVALID";

type PreviewRow = {
  sourceRow: number;
  name: string;
  nis: string | null;
  nisn: string | null;
  currentClassName: string | null;
  matchedClassName: string | null;
  action: PreviewAction;
  issues: string[];
  existingUserId: string | null;
};

function cleanText(value: string): string | null {
  const clean = value.trim();
  if (!clean || clean === "-" || clean.toLocaleLowerCase("id-ID") === "null") {
    return null;
  }
  return clean;
}

function cleanDigits(value: string): string | null {
  const text = cleanText(value);
  if (!text) return null;
  return text.replace(/\.0$/, "").replace(/\s+/g, "");
}

function parseBoolean(value: string): boolean | null {
  const normalized = value.trim().toLocaleLowerCase("id-ID");
  if (!normalized || normalized === "-") return null;
  if (["ya", "yes", "true", "1"].includes(normalized)) return true;
  if (["tidak", "no", "false", "0"].includes(normalized)) return false;
  return null;
}

function parseOptionalInt(value: string): number | null {
  const text = cleanText(value);
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalFloat(value: string): number | null {
  const text = cleanText(value)?.replace(",", ".");
  if (!text) return null;
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBirthDate(value: string): Date | null {
  const text = cleanText(value);
  if (!text) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? text
    : /^\d{2}[/-]\d{2}[/-]\d{4}$/.test(text)
      ? text.split(/[/-]/).reverse().join("-")
      : null;
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeGender(value: string): "L" | "P" | null {
  const normalized = value.trim().toUpperCase();
  if (normalized.startsWith("L")) return "L";
  if (normalized.startsWith("P")) return "P";
  return null;
}

function normalizeClassKey(value: string): string {
  return value
    .toLocaleLowerCase("id-ID")
    .replace(/\bxii\b/g, "12")
    .replace(/\bxi\b/g, "11")
    .replace(/\bx\b/g, "10")
    .replace(/[^a-z0-9]+/g, "");
}

function normalizedIdentifier(value: string): string | null {
  const clean = cleanDigits(value);
  return clean && clean !== "0" ? clean : null;
}

function rowIdentifiers(row: DapodikStudentRow) {
  return {
    nisn: normalizedIdentifier(row.nisn),
    nik: normalizedIdentifier(row.nik),
    nis: normalizedIdentifier(row.nis),
  };
}

type ExistingStudent = {
  id: string;
  email: string | null;
  username: string | null;
  studentProfile: {
    nis: string | null;
    nisn: string | null;
    nik: string | null;
  } | null;
};

async function analyzeRows(
  admin: User & { schoolId: string },
  rows: DapodikStudentRow[],
) {
  const classes = await prisma.classRoom.findMany({
    where: { schoolId: admin.schoolId },
    select: { id: true, name: true },
  });

  const classMap = new Map(
    classes.map((room) => [normalizeClassKey(room.name), room] as const),
  );

  const allIds = rows.map(rowIdentifiers);
  const nisns = [...new Set(allIds.map((item) => item.nisn).filter(Boolean))] as string[];
  const niks = [...new Set(allIds.map((item) => item.nik).filter(Boolean))] as string[];
  const nises = [...new Set(allIds.map((item) => item.nis).filter(Boolean))] as string[];

  const existing = (await prisma.user.findMany({
    where: {
      schoolId: admin.schoolId,
      role: "STUDENT",
      studentProfile: {
        is: {
          OR: [
            ...(nisns.length ? [{ nisn: { in: nisns } }] : []),
            ...(niks.length ? [{ nik: { in: niks } }] : []),
            ...(nises.length ? [{ nis: { in: nises } }] : []),
          ],
        },
      },
    },
    select: {
      id: true,
      email: true,
      username: true,
      studentProfile: { select: { nis: true, nisn: true, nik: true } },
    },
  })) as ExistingStudent[];

  const byNisn = new Map<string, ExistingStudent>();
  const byNik = new Map<string, ExistingStudent>();
  const byNis = new Map<string, ExistingStudent>();
  existing.forEach((student) => {
    if (student.studentProfile?.nisn) byNisn.set(student.studentProfile.nisn, student);
    if (student.studentProfile?.nik) byNik.set(student.studentProfile.nik, student);
    if (student.studentProfile?.nis) byNis.set(student.studentProfile.nis, student);
  });

  const fileIdentifierCounts = new Map<string, number>();
  for (const ids of allIds) {
    for (const [type, value] of Object.entries(ids)) {
      if (!value) continue;
      const key = `${type}:${value}`;
      fileIdentifierCounts.set(key, (fileIdentifierCounts.get(key) ?? 0) + 1);
    }
  }

  const previewRows: PreviewRow[] = rows.map((row) => {
    const issues: string[] = [];
    const ids = rowIdentifiers(row);
    const name = cleanText(row.name);
    const gender = normalizeGender(row.gender);

    if (!name) issues.push("Nama siswa kosong.");
    if (!ids.nisn && !ids.nik && !ids.nis) {
      issues.push("Minimal salah satu NISN, NIK, atau NIPD harus tersedia.");
    }
    if (row.gender && !gender) issues.push("Kode JK harus L atau P.");
    if (row.birthDate && !parseBirthDate(row.birthDate)) {
      issues.push("Tanggal lahir tidak valid.");
    }

    for (const [type, value] of Object.entries(ids)) {
      if (!value) continue;
      if ((fileIdentifierCounts.get(`${type}:${value}`) ?? 0) > 1) {
        issues.push(`${type.toUpperCase()} duplikat di dalam file.`);
      }
    }

    const candidates = [
      ids.nisn ? byNisn.get(ids.nisn) : null,
      ids.nik ? byNik.get(ids.nik) : null,
      ids.nis ? byNis.get(ids.nis) : null,
    ].filter(Boolean) as ExistingStudent[];

    const uniqueCandidateIds = [...new Set(candidates.map((student) => student.id))];
    if (uniqueCandidateIds.length > 1) {
      issues.push("NISN/NIK/NIPD mengarah ke lebih dari satu siswa yang sudah ada.");
    }

    const matchedClass = row.currentClassName
      ? classMap.get(normalizeClassKey(row.currentClassName)) ?? null
      : null;

    if (row.currentClassName && !matchedClass) {
      issues.push(`Rombel "${row.currentClassName.trim()}" belum ada di School OS.`);
    }

    return {
      sourceRow: row.sourceRow,
      name: name ?? "(tanpa nama)",
      nis: ids.nis,
      nisn: ids.nisn,
      currentClassName: cleanText(row.currentClassName),
      matchedClassName: matchedClass?.name ?? null,
      action: issues.some((issue) =>
        issue.includes("Nama siswa kosong") ||
        issue.includes("Minimal salah satu") ||
        issue.includes("duplikat di dalam file") ||
        issue.includes("lebih dari satu siswa") ||
        issue.includes("Tanggal lahir tidak valid") ||
        issue.includes("Kode JK"),
      )
        ? "INVALID"
        : uniqueCandidateIds[0]
          ? "UPDATE"
          : "CREATE",
      issues,
      existingUserId: uniqueCandidateIds[0] ?? null,
    };
  });

  return { previewRows, classes, classMap };
}

function profileData(row: DapodikStudentRow) {
  return {
    nis: normalizedIdentifier(row.nis),
    nisn: normalizedIdentifier(row.nisn),
    gender: normalizeGender(row.gender),
    birthPlace: cleanText(row.birthPlace),
    birthDate: parseBirthDate(row.birthDate),
    nik: normalizedIdentifier(row.nik),
    religion: cleanText(row.religion),
    status: "ACTIVE",
    address: cleanText(row.address),
    rt: cleanText(row.rt),
    rw: cleanText(row.rw),
    hamlet: cleanText(row.hamlet),
    village: cleanText(row.village),
    district: cleanText(row.district),
    postalCode: cleanText(row.postalCode),
    residenceType: cleanText(row.residenceType),
    transportation: cleanText(row.transportation),
    phone: cleanText(row.phone),
    mobilePhone: cleanText(row.mobilePhone),
    skhun: cleanText(row.skhun),
    currentClassName: cleanText(row.currentClassName),
    nationalExamNumber: cleanText(row.nationalExamNumber),
    diplomaSerialNumber: cleanText(row.diplomaSerialNumber),
    previousSchool: cleanText(row.previousSchool),
    birthCertificateNumber: cleanText(row.birthCertificateNumber),
    receivesKps: parseBoolean(row.receivesKps),
    kpsNumber: cleanText(row.kpsNumber),
    receivesKip: parseBoolean(row.receivesKip),
    kipNumber: cleanText(row.kipNumber),
    kipName: cleanText(row.kipName),
    kksNumber: cleanText(row.kksNumber),
    pipEligible: parseBoolean(row.pipEligible),
    pipReason: cleanText(row.pipReason),
    fatherName: cleanText(row.fatherName),
    fatherBirthYear: parseOptionalInt(row.fatherBirthYear),
    fatherEducation: cleanText(row.fatherEducation),
    fatherOccupation: cleanText(row.fatherOccupation),
    fatherIncome: cleanText(row.fatherIncome),
    fatherNik: normalizedIdentifier(row.fatherNik),
    motherName: cleanText(row.motherName),
    motherBirthYear: parseOptionalInt(row.motherBirthYear),
    motherEducation: cleanText(row.motherEducation),
    motherOccupation: cleanText(row.motherOccupation),
    motherIncome: cleanText(row.motherIncome),
    motherNik: normalizedIdentifier(row.motherNik),
    guardianName: cleanText(row.guardianName),
    guardianBirthYear: parseOptionalInt(row.guardianBirthYear),
    guardianEducation: cleanText(row.guardianEducation),
    guardianOccupation: cleanText(row.guardianOccupation),
    guardianIncome: cleanText(row.guardianIncome),
    guardianNik: normalizedIdentifier(row.guardianNik),
    bankName: cleanText(row.bankName),
    bankAccountNumber: cleanText(row.bankAccountNumber),
    bankAccountHolder: cleanText(row.bankAccountHolder),
    specialNeeds: cleanText(row.specialNeeds),
    birthOrder: parseOptionalInt(row.birthOrder),
    latitude: parseOptionalFloat(row.latitude),
    longitude: parseOptionalFloat(row.longitude),
    familyCardNumber: normalizedIdentifier(row.familyCardNumber),
    weightKg: parseOptionalFloat(row.weightKg),
    heightCm: parseOptionalFloat(row.heightCm),
    headCircumferenceCm: parseOptionalFloat(row.headCircumferenceCm),
    siblingCount: parseOptionalInt(row.siblingCount),
    distanceToSchoolKm: parseOptionalFloat(row.distanceToSchoolKm),
    dapodikImportedAt: new Date(),
  };
}

function cleanEmail(value: string): string | null {
  const email = cleanText(value)?.toLocaleLowerCase("id-ID") ?? null;
  if (!email) return null;
  return z.string().email().safeParse(email).success ? email : null;
}

async function uniqueUsername(baseValue: string, schoolId: string) {
  const sanitized =
    baseValue.toLocaleLowerCase("id-ID").replace(/[^a-z0-9._-]+/g, "") ||
    "siswa";
  const candidates = [
    sanitized,
    `${sanitized}_${schoolId.slice(0, 4)}`,
    `${sanitized}_${schoolId.slice(0, 8)}`,
  ];

  for (const candidate of candidates) {
    const exists = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  return `${sanitized}_${Date.now().toString(36)}`;
}

export const previewStudentsFromDapodik = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(previewSchema, rawArgs);
  const { previewRows } = await analyzeRows(admin, args.rows as DapodikStudentRow[]);

  return {
    totalRows: previewRows.length,
    createCount: previewRows.filter((row) => row.action === "CREATE").length,
    updateCount: previewRows.filter((row) => row.action === "UPDATE").length,
    invalidCount: previewRows.filter((row) => row.action === "INVALID").length,
    unmatchedClassCount: previewRows.filter(
      (row) => row.currentClassName && !row.matchedClassName,
    ).length,
    warningCount: previewRows.reduce(
      (count, row) =>
        count +
        row.issues.filter((issue) => issue.startsWith("Rombel ")).length,
      0,
    ),
    previewRows: previewRows.slice(0, 100).map(({ existingUserId: _id, ...row }) => row),
    previewTruncated: previewRows.length > 100,
  };
};

export const importStudentsFromDapodik = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(importSchema, rawArgs);
  const rows = args.rows as DapodikStudentRow[];
  const { previewRows, classMap } = await analyzeRows(admin, rows);

  const validRows = previewRows.filter((row) => row.action !== "INVALID");
  const creates = validRows.filter((row) => row.action === "CREATE").length;

  const school = await prisma.school.findUnique({
    where: { id: admin.schoolId },
    select: { studentQuota: true },
  });
  const currentStudentCount = await prisma.user.count({
    where: { schoolId: admin.schoolId, role: "STUDENT" },
  });
  const quota = school?.studentQuota || 50;
  if (currentStudentCount + creates > quota) {
    throw new HttpError(
      400,
      `Kuota siswa tidak mencukupi. Kuota: ${quota}, saat ini: ${currentStudentCount}, data baru dari Dapodik: ${creates}. Data update tidak dihitung sebagai siswa baru.`,
    );
  }

  let createdCount = 0;
  let updatedCount = 0;
  let failedCount = previewRows.length - validRows.length;
  const errors = previewRows
    .filter((row) => row.action === "INVALID")
    .map(
      (row) =>
        `Baris ${row.sourceRow}: ${row.name} — ${row.issues.join(" ")}`,
    );

  for (const preview of validRows) {
    const row = rows.find((candidate) => candidate.sourceRow === preview.sourceRow);
    if (!row) continue;

    try {
      const matchedClass = row.currentClassName
        ? classMap.get(normalizeClassKey(row.currentClassName)) ?? null
        : null;
      const data = profileData(row);
      const rowEmail = cleanEmail(row.email);

      if (preview.existingUserId) {
        const existing = await prisma.user.findFirst({
          where: { id: preview.existingUserId, schoolId: admin.schoolId, role: "STUDENT" },
          select: { id: true, email: true },
        });
        if (!existing) throw new Error("Siswa target update tidak ditemukan.");

        let email = existing.email;
        if (rowEmail && rowEmail !== existing.email) {
          const owner = await prisma.user.findUnique({
            where: { email: rowEmail },
            select: { id: true },
          });
          if (!owner || owner.id === existing.id) email = rowEmail;
        }

        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: existing.id },
            data: {
              name: cleanText(row.name),
              email,
              classRoomId: matchedClass?.id ?? undefined,
            },
          });
          await tx.studentProfile.upsert({
            where: { userId: existing.id },
            create: { userId: existing.id, ...data },
            update: data,
          });
        });
        updatedCount += 1;
      } else {
        const ids = rowIdentifiers(row);
        const username = await uniqueUsername(
          ids.nisn || ids.nis || ids.nik || `siswa_${preview.sourceRow}`,
          admin.schoolId,
        );

        let email = rowEmail;
        if (email) {
          const owner = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
          });
          if (owner) email = null;
        }

        await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              name: cleanText(row.name),
              email,
              username,
              role: "STUDENT",
              schoolId: admin.schoolId,
              classRoomId: matchedClass?.id ?? null,
            },
          });
          await tx.studentProfile.create({
            data: { userId: newUser.id, ...data },
          });
        });
        createdCount += 1;
      }
    } catch (error: any) {
      failedCount += 1;
      errors.push(
        `Baris ${preview.sourceRow}: ${preview.name} — ${error?.message || "Gagal menyimpan data."}`,
      );
    }
  }

  return {
    totalProcessed: previewRows.length,
    createdCount,
    updatedCount,
    successCount: createdCount + updatedCount,
    failedCount,
    unmatchedClassCount: previewRows.filter(
      (row) => row.currentClassName && !row.matchedClassName,
    ).length,
    errors: errors.slice(0, 100),
    errorsTruncated: errors.length > 100,
  };
};
