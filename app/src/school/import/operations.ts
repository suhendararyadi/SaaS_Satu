import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";
import { requireSchoolAdmin } from "../authGuards";
import { parseCsv, extractValue } from "./csvParser";

// =========================================================================
// 1. Bulk Student Import
// =========================================================================

const importStudentsSchema = z.object({
  csvContent: z.string().min(1, "Konten CSV tidak boleh kosong"),
  defaultClassRoomId: z.string().uuid().optional(),
});

export const importStudentsFromCsv = async (
  rawArgs: unknown,
  context: { user?: User }
) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(importStudentsSchema, rawArgs);

  const parsedRows = parseCsv(args.csvContent);
  if (parsedRows.length === 0) {
    throw new HttpError(400, "File CSV kosong atau tidak memiliki data yang valid.");
  }

  // Check school quota
  const school = await prisma.school.findUnique({
    where: { id: admin.schoolId },
    select: { studentQuota: true },
  });
  const currentStudentCount = await prisma.user.count({
    where: { schoolId: admin.schoolId, role: "STUDENT" },
  });

  const quota = school?.studentQuota || 50;
  if (currentStudentCount + parsedRows.length > quota) {
    throw new HttpError(
      400,
      `Kuota siswa tidak mencukupi. Kuota: ${quota}, Saat ini: ${currentStudentCount}, Hendak diimpor: ${parsedRows.length}. Silakan upgrade paket sekolah.`
    );
  }

  // Pre-fetch all classes in this school for quick matching
  const classes = await prisma.classRoom.findMany({
    where: { schoolId: admin.schoolId },
    select: { id: true, name: true },
  });
  const classMap = new Map<string, string>();
  for (const c of classes) {
    classMap.set(c.name.toLowerCase().trim(), c.id);
  }

  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    const rowNum = i + 2; // account for 1-based index and header

    const name = extractValue(row, ["nama", "name", "namasiswa", "namalengkap"]);
    if (!name) {
      failedCount++;
      errors.push(`Baris ${rowNum}: Nama siswa kosong.`);
      continue;
    }

    const nis = extractValue(row, ["nis", "noinduk", "nomorinduk"]) || null;
    const nisn = extractValue(row, ["nisn", "nomorinduksiswanasional"]) || null;
    let gender = extractValue(row, ["gender", "jk", "jeniskelamin", "lp"]).toUpperCase();
    if (gender.startsWith("L")) gender = "L";
    else if (gender.startsWith("P")) gender = "P";
    else gender = "L";

    // Class matching
    const className = extractValue(row, ["kelas", "rombel", "rombelsaatini"]);
    let matchedClassId = args.defaultClassRoomId || null;
    if (className && classMap.has(className.toLowerCase())) {
      matchedClassId = classMap.get(className.toLowerCase()) || matchedClassId;
    }

    // Email or username
    const email =
      extractValue(row, ["email"]) ||
      (nis ? `${nis}@${admin.schoolId.slice(0, 8)}.sch.id` : null);
    const username = nis || `sis_${Date.now()}_${i}`;

    try {
      // Find existing user by email or username if exists
      let existingUser: any = null;
      if (email) {
        existingUser = await prisma.user.findUnique({ where: { email } });
      }


      if (existingUser) {
        // Update user
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name,
            role: "STUDENT",
            schoolId: admin.schoolId,
            classRoomId: matchedClassId,
          },
        });

        await prisma.studentProfile.upsert({
          where: { userId: existingUser.id },
          create: {
            userId: existingUser.id,
            nis,
            nisn,
            gender,
            status: "ACTIVE",
          },
          update: {
            nis: nis ?? undefined,
            nisn: nisn ?? undefined,
            gender,
          },
        });
      } else {
        // Create new student
        const newUser = await prisma.user.create({
          data: {
            name,
            email,
            username,
            role: "STUDENT",
            schoolId: admin.schoolId,
            classRoomId: matchedClassId,
          },
        });

        await prisma.studentProfile.create({
          data: {
            userId: newUser.id,
            nis,
            nisn,
            gender,
            status: "ACTIVE",
          },
        });
      }

      successCount++;
    } catch (err: any) {
      failedCount++;
      errors.push(`Baris ${rowNum} (${name}): ${err.message || "Gagal menyimpan data."}`);
    }
  }

  return {
    totalProcessed: parsedRows.length,
    successCount,
    failedCount,
    errors,
  };
};

// =========================================================================
// 2. Bulk Teacher Import
// =========================================================================

const importTeachersSchema = z.object({
  csvContent: z.string().min(1, "Konten CSV tidak boleh kosong"),
});

export const importTeachersFromCsv = async (
  rawArgs: unknown,
  context: { user?: User }
) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(importTeachersSchema, rawArgs);

  const parsedRows = parseCsv(args.csvContent);
  if (parsedRows.length === 0) {
    throw new HttpError(400, "File CSV kosong atau tidak memiliki data yang valid.");
  }

  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    const rowNum = i + 2;

    const name = extractValue(row, ["nama", "name", "namaguru", "namalengkap"]);
    if (!name) {
      failedCount++;
      errors.push(`Baris ${rowNum}: Nama guru kosong.`);
      continue;
    }

    const nip = extractValue(row, ["nip", "nonip"]) || null;
    const title = extractValue(row, ["gelar", "title"]) || null;
    const phone = extractValue(row, ["hp", "telepon", "phone", "nohp"]) || null;
    const rawWaka = extractValue(row, ["iswaka", "waka"]).toLowerCase();
    const isWaka = rawWaka === "ya" || rawWaka === "true" || rawWaka === "1";

    const email =
      extractValue(row, ["email"]) ||
      (nip ? `${nip}@${admin.schoolId.slice(0, 8)}.sch.id` : null);
    const username = nip || `guru_${Date.now()}_${i}`;

    try {
      let existingUser: any = null;
      if (email) {
        existingUser = await prisma.user.findUnique({ where: { email } });
      }


      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name,
            role: "TEACHER",
            schoolId: admin.schoolId,
          },
        });

        await prisma.teacherProfile.upsert({
          where: { userId: existingUser.id },
          create: {
            userId: existingUser.id,
            nip,
            title,
            phone,
            isWaka,
          },
          update: {
            nip: nip ?? undefined,
            title: title ?? undefined,
            phone: phone ?? undefined,
            isWaka,
          },
        });
      } else {
        const newUser = await prisma.user.create({
          data: {
            name,
            email,
            username,
            role: "TEACHER",
            schoolId: admin.schoolId,
          },
        });

        await prisma.teacherProfile.create({
          data: {
            userId: newUser.id,
            nip,
            title,
            phone,
            isWaka,
          },
        });
      }

      successCount++;
    } catch (err: any) {
      failedCount++;
      errors.push(`Baris ${rowNum} (${name}): ${err.message || "Gagal menyimpan guru."}`);
    }
  }

  return {
    totalProcessed: parsedRows.length,
    successCount,
    failedCount,
    errors,
  };
};

// =========================================================================
// 3. Bulk DUDI / Company Import
// =========================================================================

const importCompaniesSchema = z.object({
  csvContent: z.string().min(1, "Konten CSV tidak boleh kosong"),
});

export const importCompaniesFromCsv = async (
  rawArgs: unknown,
  context: { user?: User }
) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(importCompaniesSchema, rawArgs);

  const parsedRows = parseCsv(args.csvContent);
  if (parsedRows.length === 0) {
    throw new HttpError(400, "File CSV kosong atau tidak memiliki data yang valid.");
  }

  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    const rowNum = i + 2;

    const name = extractValue(row, ["namaperusahaan", "nama", "perusahaan", "company"]);
    if (!name) {
      failedCount++;
      errors.push(`Baris ${rowNum}: Nama perusahaan / DUDI kosong.`);
      continue;
    }

    const address = extractValue(row, ["alamat", "address", "lokasi"]) || "Belum diisi";
    const sector = extractValue(row, ["sektor", "industri", "bidangusaha"]) || null;
    const picName = extractValue(row, ["pic", "picnama", "kontakpic"]) || null;
    const picPhone = extractValue(row, ["pichp", "telepon", "hp", "nohp"]) || null;

    const rawLat = parseFloat(extractValue(row, ["latitude", "lat"]));
    const latitude = isNaN(rawLat) ? null : rawLat;

    const rawLng = parseFloat(extractValue(row, ["longitude", "lng", "long"]));
    const longitude = isNaN(rawLng) ? null : rawLng;

    const rawRadius = parseInt(extractValue(row, ["radius", "radiusmeter"]), 10);
    const radiusMeters = isNaN(rawRadius) || rawRadius <= 0 ? 100 : rawRadius;

    const rawQuota = parseInt(extractValue(row, ["kuota", "quota", "maxquota"]), 10);
    const maxQuota = isNaN(rawQuota) || rawQuota <= 0 ? 5 : rawQuota;

    try {
      await prisma.company.create({
        data: {
          schoolId: admin.schoolId,
          name,
          address,
          industrySector: sector,
          picName,
          picPhone,
          latitude,
          longitude,
          radiusMeters,
          maxQuota,
        },
      });
      successCount++;
    } catch (err: any) {
      failedCount++;
      errors.push(`Baris ${rowNum} (${name}): ${err.message || "Gagal menyimpan DUDI."}`);
    }
  }

  return {
    totalProcessed: parsedRows.length,
    successCount,
    failedCount,
    errors,
  };
};
