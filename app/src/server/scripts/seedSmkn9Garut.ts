import type { PrismaClient } from "@prisma/client";

/**
 * Pilot Dataset Seeder for SMK Negeri 9 Garut
 * Duplicates and sets up the complete master academic, PKL, LMS, and governance structure.
 */
export async function seedSmkn9Garut(prisma: PrismaClient) {
  console.log("🏫 Seeding SMKN 9 Garut pilot dataset...");

  // 1. Create / Upsert School
  const school = await prisma.school.upsert({
    where: { slug: "smkn-9-garut" },
    create: {
      name: "SMK Negeri 9 Garut",
      slug: "smkn-9-garut",
      npsn: "20209145",
      address: "Jl. Raya Bayongbong KM. 3",
      city: "Garut",
      province: "Jawa Barat",
      phone: "(0262) 234567",
      email: "info@smkn9garut.sch.id",
      tier: "PRO",
      studentQuota: 500,
      subscriptionStatus: "active",
    },
    update: {
      name: "SMK Negeri 9 Garut",
      tier: "PRO",
      studentQuota: 500,
    },
  });

  // 2. Link default admin user if exists
  const defaultAdmin = await prisma.user.findFirst({
    where: { email: "admin@opensaas.com" },
  });
  if (defaultAdmin) {
    await prisma.user.update({
      where: { id: defaultAdmin.id },
      data: {
        schoolId: school.id,
        role: "SCHOOL_ADMIN",
        name: "Administrator Utama",
      },
    });
  }

  // 3. Departments (Konsentrasi Keahlian)
  const rpl = await prisma.department.upsert({
    where: { schoolId_code: { schoolId: school.id, code: "RPL" } },
    create: {
      schoolId: school.id,
      code: "RPL",
      name: "Rekayasa Perangkat Lunak",
    },
    update: {},
  });

  const tkj = await prisma.department.upsert({
    where: { schoolId_code: { schoolId: school.id, code: "TKJ" } },
    create: {
      schoolId: school.id,
      code: "TKJ",
      name: "Teknik Komputer dan Jaringan",
    },
    update: {},
  });

  const dkv = await prisma.department.upsert({
    where: { schoolId_code: { schoolId: school.id, code: "DKV" } },
    create: {
      schoolId: school.id,
      code: "DKV",
      name: "Desain Komunikasi Visual",
    },
    update: {},
  });

  // 4. Academic Year
  const academicYear = await prisma.academicYear.upsert({
    where: {
      schoolId_yearName_semester: {
        schoolId: school.id,
        yearName: "2026/2027",
        semester: "GANJIL",
      },
    },
    create: {
      schoolId: school.id,
      yearName: "2026/2027",
      semester: "GANJIL",
      isActive: true,
    },
    update: { isActive: true },
  });

  // 5. Teachers & Staff
  const teacherWaka = await prisma.user.upsert({
    where: { email: "asep.mulyana@smkn9garut.sch.id" },
    create: {
      email: "asep.mulyana@smkn9garut.sch.id",
      username: "waka_kurikulum",
      name: "Drs. H. Asep Mulyana, M.Pd.",
      role: "TEACHER",
      schoolId: school.id,
    },
    update: { schoolId: school.id, role: "TEACHER" },
  });
  await prisma.teacherProfile.upsert({
    where: { userId: teacherWaka.id },
    create: {
      userId: teacherWaka.id,
      nip: "196805121994031001",
      title: "M.Pd.",
      phone: "08122334455",
      isWaka: true,
    },
    update: { isWaka: true },
  });

  const teacherSuhendar = await prisma.user.upsert({
    where: { email: "suhendar.aryadi@smkn9garut.sch.id" },
    create: {
      email: "suhendar.aryadi@smkn9garut.sch.id",
      username: "suhendar_rpl",
      name: "Suhendar Aryadi, S.Kom., M.T.",
      role: "TEACHER",
      schoolId: school.id,
    },
    update: { schoolId: school.id, role: "TEACHER" },
  });
  await prisma.teacherProfile.upsert({
    where: { userId: teacherSuhendar.id },
    create: {
      userId: teacherSuhendar.id,
      nip: "198502102009021003",
      title: "S.Kom., M.T.",
      phone: "08133445566",
      isWaka: false,
    },
    update: {},
  });

  const teacherRina = await prisma.user.upsert({
    where: { email: "rina.marlina@smkn9garut.sch.id" },
    create: {
      email: "rina.marlina@smkn9garut.sch.id",
      username: "rina_tkj",
      name: "Rina Marlina, S.Kom.",
      role: "TEACHER",
      schoolId: school.id,
    },
    update: { schoolId: school.id, role: "TEACHER" },
  });
  await prisma.teacherProfile.upsert({
    where: { userId: teacherRina.id },
    create: {
      userId: teacherRina.id,
      nip: "199011152015032002",
      title: "S.Kom.",
      phone: "08155667788",
    },
    update: {},
  });

  // 6. ClassRooms (Rombel)
  const classRpl1 = await prisma.classRoom.upsert({
    where: {
      schoolId_academicYearId_name: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        name: "XII RPL 1",
      },
    },
    create: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      departmentId: rpl.id,
      gradeLevel: 12,
      name: "XII RPL 1",
      homeroomTeacherId: teacherSuhendar.id,
    },
    update: { homeroomTeacherId: teacherSuhendar.id },
  });

  await prisma.classRoom.upsert({
    where: {
      schoolId_academicYearId_name: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        name: "XII TKJ 1",
      },
    },
    create: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      departmentId: tkj.id,
      gradeLevel: 12,
      name: "XII TKJ 1",
      homeroomTeacherId: teacherRina.id,
    },
    update: { homeroomTeacherId: teacherRina.id },
  });

  // 7. Companies (DUDI in Garut)
  let telkom = await prisma.company.findFirst({
    where: { schoolId: school.id, name: "PT Telkom Indonesia Witel Garut" },
  });
  if (!telkom) {
    telkom = await prisma.company.create({
      data: {
        schoolId: school.id,
        name: "PT Telkom Indonesia Witel Garut",
        industrySector: "Telekomunikasi & Jaringan",
        address: "Jl. Pramuka No. 1, Garut",
        picName: "Budi Santoso, S.T.",
        picPhone: "081234567890",
        latitude: -7.2144,
        longitude: 107.9015,
        radiusMeters: 100,
        maxQuota: 6,
      },
    });
  }

  let techno = await prisma.company.findFirst({
    where: { schoolId: school.id, name: "CV Techno Kreatif Solusindo" },
  });
  if (!techno) {
    techno = await prisma.company.create({
      data: {
        schoolId: school.id,
        name: "CV Techno Kreatif Solusindo",
        industrySector: "Software Development & IT Solution",
        address: "Jl. Cimanuk No. 120, Garut",
        picName: "Deni Firmansyah",
        picPhone: "081987654321",
        latitude: -7.2185,
        longitude: 107.9042,
        radiusMeters: 150,
        maxQuota: 5,
      },
    });
  }

  // 8. Students in XII RPL 1
  const studentRizky = await prisma.user.upsert({
    where: { email: "rizky.pratama@siswa.smkn9garut.sch.id" },
    create: {
      email: "rizky.pratama@siswa.smkn9garut.sch.id",
      username: "22231001",
      name: "Muhammad Rizky Pratama",
      role: "STUDENT",
      schoolId: school.id,
      classRoomId: classRpl1.id,
    },
    update: { schoolId: school.id, classRoomId: classRpl1.id },
  });
  await prisma.studentProfile.upsert({
    where: { userId: studentRizky.id },
    create: {
      userId: studentRizky.id,
      nis: "22231001",
      nisn: "0065123456",
      gender: "L",
      status: "ACTIVE",
    },
    update: {},
  });

  const studentSiti = await prisma.user.upsert({
    where: { email: "siti.nurhaliza@siswa.smkn9garut.sch.id" },
    create: {
      email: "siti.nurhaliza@siswa.smkn9garut.sch.id",
      username: "22231002",
      name: "Siti Nurhaliza",
      role: "STUDENT",
      schoolId: school.id,
      classRoomId: classRpl1.id,
    },
    update: { schoolId: school.id, classRoomId: classRpl1.id },
  });
  await prisma.studentProfile.upsert({
    where: { userId: studentSiti.id },
    create: {
      userId: studentSiti.id,
      nis: "22231002",
      nisn: "0065123457",
      gender: "P",
      status: "ACTIVE",
    },
    update: {},
  });

  // 9. PKL Placements
  let p1 = await prisma.placement.findFirst({
    where: { studentId: studentRizky.id, companyId: telkom.id },
  });
  if (!p1) {
    p1 = await prisma.placement.create({
      data: {
        schoolId: school.id,
        studentId: studentRizky.id,
        companyId: telkom.id,
        teacherSupervisorId: teacherSuhendar.id,
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-10-31"),
        status: "ACTIVE",
      },
    });
  }

  let p2 = await prisma.placement.findFirst({
    where: { studentId: studentSiti.id, companyId: telkom.id },
  });
  if (!p2) {
    p2 = await prisma.placement.create({
      data: {
        schoolId: school.id,
        studentId: studentSiti.id,
        companyId: telkom.id,
        teacherSupervisorId: teacherSuhendar.id,
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-10-31"),
        status: "ACTIVE",
      },
    });
  }

  // 10. Sample Attendance Logs and Daily Journals for Rizky
  const existingAttendance = await prisma.attendanceLog.findFirst({
    where: { placementId: p1.id },
  });
  if (!existingAttendance) {
    await prisma.attendanceLog.createMany({
      data: [
        {
          placementId: p1.id,
          timestamp: new Date(),
          dateOnly: new Date().toISOString().split("T")[0],
          type: "CHECK_IN",
          status: "HADIR",
          latitude: -7.2143,
          longitude: 107.9016,
          distanceMeters: 15,
          notes: "Tiba di kantor tepat waktu",
        },
        {
          placementId: p1.id,
          timestamp: new Date(),
          dateOnly: new Date().toISOString().split("T")[0],
          type: "CHECK_OUT",
          status: "HADIR",
          latitude: -7.2144,
          longitude: 107.9015,
          distanceMeters: 10,
          notes: "Selesai jam kerja shift 1",
        },
      ],
    });
  }

  const existingJournal = await prisma.dailyJournal.findFirst({
    where: { placementId: p1.id },
  });
  if (!existingJournal) {
    await prisma.dailyJournal.create({
      data: {
        placementId: p1.id,
        date: new Date(),
        activityDescription:
          "Melakukan instalasi konfigurasi router mikrotik dan troubleshooting kabel fiber optic di ruang server Telkom Witel Garut.",
        obstacleDescription:
          "Terdapat redaman konektor optik yang agak tinggi, telah dibersihkan dengan alcohol swab.",
        status: "APPROVED",
        feedback: "Laporan sangat baik dan terperinci. Pertahankan ketelitian kerja!",
        score: 95,
        approvedAt: new Date(),
        approvedById: teacherSuhendar.id,
      },
    });
  }

  // 11. LMS Course (Pemrograman Web)
  let courseWeb = await prisma.lmsCourse.findFirst({
    where: {
      schoolId: school.id,
      classRoomId: classRpl1.id,
      subjectName: "Pemrograman Web dan Perangkat Bergerak",
    },
  });
  if (!courseWeb) {
    courseWeb = await prisma.lmsCourse.create({
      data: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        classRoomId: classRpl1.id,
        teacherId: teacherSuhendar.id,
        subjectName: "Pemrograman Web dan Perangkat Bergerak",
        description: "Materi full-stack web engineering, React 19, TypeScript, dan Prisma ORM.",
      },
    });
  }

  // Course Agenda
  const existingAgenda = await prisma.lmsAgenda.findFirst({
    where: { courseId: courseWeb.id },
  });
  if (!existingAgenda) {
    await prisma.lmsAgenda.create({
      data: {
        courseId: courseWeb.id,
        date: new Date(),
        period: "Jam ke 1 - 4",
        competency: "Arsitektur Full-Stack Modern dengan React & Wasp",
        summary:
          "Pembelajaran pembuatan API RESTful dan konfigurasi Prisma schema multi-tenant untuk aplikasi sekolah.",
      },
    });
  }

  // Course Material
  const existingMaterial = await prisma.lmsMaterial.findFirst({
    where: { courseId: courseWeb.id },
  });
  if (!existingMaterial) {
    await prisma.lmsMaterial.create({
      data: {
        courseId: courseWeb.id,
        title: "Modul 1: Pengenalan TypeScript & Arsitektur Monorepo",
        description: "Panduan dasar penulisan kode type-safe dan integrasi database relasional.",
        externalUrl: "https://wasp.sh/docs",
      },
    });
  }

  // Course Assignment
  const existingAssignment = await prisma.lmsAssignment.findFirst({
    where: { courseId: courseWeb.id },
  });
  if (!existingAssignment) {
    await prisma.lmsAssignment.create({
      data: {
        courseId: courseWeb.id,
        title: "Tugas 1: Implementasi CRUD Sederhana",
        instruction: "Buatlah skema database dan rute query untuk menampilkan daftar data.",
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // CBT Exam
  let exam = await prisma.lmsAssessment.findFirst({
    where: { courseId: courseWeb.id },
  });
  if (!exam) {
    exam = await prisma.lmsAssessment.create({
      data: {
        courseId: courseWeb.id,
        title: "Kuis Harian: Dasar Web & TypeScript",
        durationMinutes: 45,
        startTime: new Date(),
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        isRandomized: true,
      },
    });

    await prisma.lmsAssessmentQuestion.create({
      data: {
        assessmentId: exam.id,
        questionType: "MULTIPLE_CHOICE",
        prompt: "Manakah tipe data dalam TypeScript yang menunjukkan variabel belum didefinisikan?",
        options: [
          { id: "A", text: "undefined", isCorrect: true },
          { id: "B", text: "null", isCorrect: false },
          { id: "C", text: "void", isCorrect: false },
          { id: "D", text: "never", isCorrect: false },
        ],
        points: 25,
      },
    });
  }

  // 12. Duty Teacher Report
  const existingDuty = await prisma.dutyTeacherReport.findFirst({
    where: { schoolId: school.id, dutyTeacherId: teacherSuhendar.id },
  });
  if (!existingDuty) {
    await prisma.dutyTeacherReport.create({
      data: {
        schoolId: school.id,
        dutyTeacherId: teacherSuhendar.id,
        date: new Date(),
        lateStudentsCount: 2,
        dispensationsCount: 1,
        notes: "KBM hari ini kondusif, 1 siswa izin lomba LKS tingkat kabupaten.",
      },
    });
  }

  console.log("✅ SMKN 9 Garut pilot dataset successfully seeded!");
}
