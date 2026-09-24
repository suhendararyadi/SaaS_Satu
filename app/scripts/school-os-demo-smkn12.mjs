#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TARGET_SLUG = process.env.SCHOOL_OS_DEMO_SCHOOL_SLUG || "smkn-12-garut";
const DEMO_PREFIX = "[DEMO] SMKN12";
const DEMO_NAMESPACE = "smkn12";
const DEMO_DOMAIN = "schoolos-demo.invalid";
const DEMO_DEPT_PREFIX = "DEMO-SMKN12-";
const CLEANUP_CONFIRMATION = "DELETE-SMKN12-DEMO-SCENARIO";

const mode = process.argv[2] || "status";
const dryRun = process.argv.includes("--dry-run");
const confirmation = process.argv.find((arg) => arg.startsWith("--confirm="))?.slice("--confirm=".length);

function atOffset(days, hour = 8) {
  const date = new Date();
  date.setUTCHours(hour, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function startOfUtcDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfUtcDay(date) {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function dateOnly(date) {
  return new Date(date).toISOString().slice(0, 10);
}

async function requireTargetSchool(client) {
  const school = await client.school.findUnique({ where: { slug: TARGET_SLUG } });
  if (!school) throw new Error(`Target school '${TARGET_SLUG}' was not found.`);
  return school;
}

async function demoStatus(client) {
  const school = await requireTargetSchool(client);
  const demoUserWhere = { schoolId: school.id, email: { startsWith: `${DEMO_NAMESPACE}-`, endsWith: `@${DEMO_DOMAIN}` } };
  const demoCourseWhere = { schoolId: school.id, subjectName: { startsWith: DEMO_PREFIX } };
  const demoClassWhere = { schoolId: school.id, name: { startsWith: DEMO_PREFIX } };
  const demoCompanyWhere = { schoolId: school.id, name: { startsWith: DEMO_PREFIX } };

  const [users, teachers, students, mentors, departments, classRooms, companies, placements, courses, agendas, materials, assignments, submissions, assessments, questions, results, attendanceSessions, attendanceRecords, pklAttendanceLogs, journals, dutyReports] = await Promise.all([
    client.user.count({ where: demoUserWhere }),
    client.user.count({ where: { ...demoUserWhere, role: "TEACHER" } }),
    client.user.count({ where: { ...demoUserWhere, role: "STUDENT" } }),
    client.user.count({ where: { ...demoUserWhere, role: "DUDI_MENTOR" } }),
    client.department.count({ where: { schoolId: school.id, code: { startsWith: DEMO_DEPT_PREFIX } } }),
    client.classRoom.count({ where: demoClassWhere }),
    client.company.count({ where: demoCompanyWhere }),
    client.placement.count({ where: { schoolId: school.id, student: { email: { startsWith: `${DEMO_NAMESPACE}-`, endsWith: `@${DEMO_DOMAIN}` } } } }),
    client.lmsCourse.count({ where: demoCourseWhere }),
    client.lmsAgenda.count({ where: { course: demoCourseWhere } }),
    client.lmsMaterial.count({ where: { course: demoCourseWhere } }),
    client.lmsAssignment.count({ where: { course: demoCourseWhere } }),
    client.lmsSubmission.count({ where: { assignment: { course: demoCourseWhere } } }),
    client.lmsAssessment.count({ where: { course: demoCourseWhere } }),
    client.lmsAssessmentQuestion.count({ where: { assessment: { course: demoCourseWhere } } }),
    client.lmsAssessmentResult.count({ where: { assessment: { course: demoCourseWhere } } }),
    client.lmsAttendanceSession.count({ where: { course: demoCourseWhere } }),
    client.lmsAttendanceRecord.count({ where: { session: { course: demoCourseWhere } } }),
    client.attendanceLog.count({ where: { placement: { schoolId: school.id, student: { email: { startsWith: `${DEMO_NAMESPACE}-`, endsWith: `@${DEMO_DOMAIN}` } } } } }),
    client.dailyJournal.count({ where: { placement: { schoolId: school.id, student: { email: { startsWith: `${DEMO_NAMESPACE}-`, endsWith: `@${DEMO_DOMAIN}` } } } } }),
    client.dutyTeacherReport.count({ where: { schoolId: school.id, dutyTeacher: { email: { startsWith: `${DEMO_NAMESPACE}-`, endsWith: `@${DEMO_DOMAIN}` } } } }),
  ]);
  return {
    school: { name: school.name, slug: school.slug },
    demo: { users, teachers, students, mentors, departments, classRooms, companies, placements, courses, agendas, materials, assignments, submissions, assessments, questions, results, attendanceSessions, attendanceRecords, pklAttendanceLogs, journals, dutyReports },
  };
}

async function upsertUser(tx, { index, role, name, classRoomId = null }) {
  const email = `${DEMO_NAMESPACE}-${role.toLowerCase()}-${String(index).padStart(2, "0")}@${DEMO_DOMAIN}`;
  const user = await tx.user.upsert({
    where: { email },
    create: {
      email,
      username: email,
      name: `${DEMO_PREFIX} ${name}`,
      role,
      schoolId: (await requireTargetSchool(tx)).id,
      classRoomId,
      isAdmin: false,
    },
    update: {
      name: `${DEMO_PREFIX} ${name}`,
      role,
      schoolId: (await requireTargetSchool(tx)).id,
      classRoomId,
      isAdmin: false,
    },
  });
  return user;
}

async function ensureCompany(tx, schoolId, spec) {
  const name = `${DEMO_PREFIX} ${spec.name}`;
  const existing = await tx.company.findFirst({ where: { schoolId, name } });
  const data = {
    schoolId,
    name,
    industrySector: spec.industrySector,
    address: spec.address,
    picName: `${DEMO_PREFIX} ${spec.picName}`,
    picPhone: spec.picPhone,
    latitude: spec.latitude,
    longitude: spec.longitude,
    radiusMeters: spec.radiusMeters,
    maxQuota: spec.maxQuota,
  };
  return existing
    ? tx.company.update({ where: { id: existing.id }, data })
    : tx.company.create({ data });
}

async function ensureCourse(tx, data) {
  const existing = await tx.lmsCourse.findFirst({
    where: { schoolId: data.schoolId, classRoomId: data.classRoomId, subjectName: data.subjectName },
  });
  return existing
    ? tx.lmsCourse.update({ where: { id: existing.id }, data })
    : tx.lmsCourse.create({ data });
}

async function ensureAgenda(tx, courseId, spec) {
  const existing = await tx.lmsAgenda.findFirst({ where: { courseId, summary: spec.summary } });
  const data = { courseId, date: spec.date, period: spec.period, competency: spec.competency, summary: spec.summary };
  return existing ? tx.lmsAgenda.update({ where: { id: existing.id }, data }) : tx.lmsAgenda.create({ data });
}

async function ensureMaterial(tx, courseId, spec) {
  const existing = await tx.lmsMaterial.findFirst({ where: { courseId, title: spec.title } });
  const data = { courseId, title: spec.title, description: spec.description, fileUrl: null, externalUrl: spec.externalUrl ?? null };
  return existing ? tx.lmsMaterial.update({ where: { id: existing.id }, data }) : tx.lmsMaterial.create({ data });
}

async function ensureAssignment(tx, courseId, spec) {
  const existing = await tx.lmsAssignment.findFirst({ where: { courseId, title: spec.title } });
  const data = { courseId, title: spec.title, instruction: spec.instruction, deadline: spec.deadline, attachmentUrl: null };
  return existing ? tx.lmsAssignment.update({ where: { id: existing.id }, data }) : tx.lmsAssignment.create({ data });
}

async function ensureAssessment(tx, courseId, spec) {
  const existing = await tx.lmsAssessment.findFirst({ where: { courseId, title: spec.title } });
  const data = {
    courseId,
    title: spec.title,
    durationMinutes: spec.durationMinutes,
    startTime: spec.startTime,
    endTime: spec.endTime,
    isRandomized: spec.isRandomized,
  };
  return existing ? tx.lmsAssessment.update({ where: { id: existing.id }, data }) : tx.lmsAssessment.create({ data });
}

async function ensureQuestion(tx, assessmentId, spec) {
  const existing = await tx.lmsAssessmentQuestion.findFirst({ where: { assessmentId, prompt: spec.prompt } });
  const data = { assessmentId, questionType: spec.questionType, prompt: spec.prompt, imageUrl: null, options: spec.options ?? null, points: spec.points };
  return existing ? tx.lmsAssessmentQuestion.update({ where: { id: existing.id }, data }) : tx.lmsAssessmentQuestion.create({ data });
}

async function ensureAttendanceSession(tx, courseId, spec) {
  const start = startOfUtcDay(spec.date);
  const end = endOfUtcDay(spec.date);
  const existing = await tx.lmsAttendanceSession.findFirst({
    where: { courseId, sessionNumber: spec.sessionNumber, date: { gte: start, lte: end } },
  });
  return existing
    ? tx.lmsAttendanceSession.update({ where: { id: existing.id }, data: { date: spec.date } })
    : tx.lmsAttendanceSession.create({ data: { courseId, date: spec.date, sessionNumber: spec.sessionNumber } });
}

async function ensurePlacement(tx, data) {
  const existing = await tx.placement.findFirst({ where: { studentId: data.studentId, companyId: data.companyId } });
  return existing ? tx.placement.update({ where: { id: existing.id }, data }) : tx.placement.create({ data });
}

async function ensureJournal(tx, placementId, spec) {
  const existing = await tx.dailyJournal.findFirst({ where: { placementId, activityDescription: spec.activityDescription } });
  const data = {
    placementId,
    date: spec.date,
    activityDescription: spec.activityDescription,
    obstacleDescription: spec.obstacleDescription ?? null,
    photoUrl: null,
    status: spec.status,
    feedback: spec.feedback ?? null,
    score: spec.score ?? null,
    approvedAt: spec.approvedAt ?? null,
    approvedById: spec.approvedById ?? null,
  };
  return existing ? tx.dailyJournal.update({ where: { id: existing.id }, data }) : tx.dailyJournal.create({ data });
}

async function ensureDutyReport(tx, data) {
  const existing = await tx.dutyTeacherReport.findFirst({ where: { schoolId: data.schoolId, dutyTeacherId: data.dutyTeacherId, notes: data.notes } });
  return existing ? tx.dutyTeacherReport.update({ where: { id: existing.id }, data }) : tx.dutyTeacherReport.create({ data });
}

async function seedDemo(tx) {
  const school = await requireTargetSchool(tx);
  const academicYear = await tx.academicYear.findFirst({ where: { schoolId: school.id, isActive: true }, orderBy: { yearName: "desc" } });
  if (!academicYear) throw new Error("No active academic year exists. Create/activate one before demo seeding.");

  const existingRpl = await tx.department.findFirst({ where: { schoolId: school.id, code: "RPL" } });
  const rpl = existingRpl ?? await tx.department.upsert({
    where: { schoolId_code: { schoolId: school.id, code: `${DEMO_DEPT_PREFIX}RPL` } },
    create: { schoolId: school.id, code: `${DEMO_DEPT_PREFIX}RPL`, name: `${DEMO_PREFIX} Rekayasa Perangkat Lunak` },
    update: {},
  });
  const tjkt = await tx.department.upsert({
    where: { schoolId_code: { schoolId: school.id, code: `${DEMO_DEPT_PREFIX}TJKT` } },
    create: { schoolId: school.id, code: `${DEMO_DEPT_PREFIX}TJKT`, name: `${DEMO_PREFIX} Teknik Jaringan Komputer` },
    update: { name: `${DEMO_PREFIX} Teknik Jaringan Komputer` },
  });
  const dkv = await tx.department.upsert({
    where: { schoolId_code: { schoolId: school.id, code: `${DEMO_DEPT_PREFIX}DKV` } },
    create: { schoolId: school.id, code: `${DEMO_DEPT_PREFIX}DKV`, name: `${DEMO_PREFIX} Desain Komunikasi Visual` },
    update: { name: `${DEMO_PREFIX} Desain Komunikasi Visual` },
  });

  const teacherSpecs = [
    [1, "Rina Contoh — RPL", false],
    [2, "Dedi Contoh — Basis Data", false],
    [3, "Maya Contoh — TJKT", false],
    [4, "Asep Contoh — DKV", false],
    [5, "Nadia Contoh — Waka Kurikulum", true],
    [6, "Guru Contoh — Belum Memiliki Mapel", false],
  ];
  const teachers = [];
  for (const [index, name, isWaka] of teacherSpecs) {
    const user = await upsertUser(tx, { index, role: "TEACHER", name });
    await tx.teacherProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, nip: `DEMO-SM12-NIP-${String(index).padStart(3, "0")}`, title: "S.Kom.", phone: `080000000${String(index).padStart(2, "0")}`, isWaka },
      update: { nip: `DEMO-SM12-NIP-${String(index).padStart(3, "0")}`, title: "S.Kom.", phone: `080000000${String(index).padStart(2, "0")}`, isWaka },
    });
    teachers.push(user);
  }

  const classSpecs = [
    { name: `${DEMO_PREFIX} 11 RPL 1`, gradeLevel: 11, departmentId: rpl.id, homeroomTeacherId: teachers[0].id },
    { name: `${DEMO_PREFIX} 11 RPL 2`, gradeLevel: 11, departmentId: rpl.id, homeroomTeacherId: teachers[1].id },
    { name: `${DEMO_PREFIX} 12 RPL 1`, gradeLevel: 12, departmentId: rpl.id, homeroomTeacherId: teachers[4].id },
    { name: `${DEMO_PREFIX} 11 TJKT 1`, gradeLevel: 11, departmentId: tjkt.id, homeroomTeacherId: teachers[2].id },
    { name: `${DEMO_PREFIX} 11 DKV 1`, gradeLevel: 11, departmentId: dkv.id, homeroomTeacherId: teachers[3].id },
  ];
  const classes = [];
  for (const spec of classSpecs) {
    classes.push(await tx.classRoom.upsert({
      where: { schoolId_academicYearId_name: { schoolId: school.id, academicYearId: academicYear.id, name: spec.name } },
      create: { schoolId: school.id, academicYearId: academicYear.id, ...spec },
      update: { gradeLevel: spec.gradeLevel, departmentId: spec.departmentId, homeroomTeacherId: spec.homeroomTeacherId },
    }));
  }

  const students = [];
  for (let i = 1; i <= 21; i++) {
    const classRoomId = i <= 20 ? classes[Math.floor((i - 1) / 4)].id : null;
    const student = await upsertUser(tx, { index: i, role: "STUDENT", name: i === 21 ? "Siswa 21 — Belum Masuk Rombel" : `Siswa ${String(i).padStart(2, "0")}`, classRoomId });
    await tx.studentProfile.upsert({
      where: { userId: student.id },
      create: {
        userId: student.id,
        nis: `SM12DM${String(i).padStart(4, "0")}`,
        nisn: `991200${String(i).padStart(4, "0")}`,
        gender: i % 2 === 0 ? "P" : "L",
        birthDate: new Date(Date.UTC(i <= 12 ? 2009 : 2008, (i - 1) % 12, 10 + (i % 15))),
        status: "ACTIVE",
      },
      update: {
        nis: `SM12DM${String(i).padStart(4, "0")}`,
        nisn: `991200${String(i).padStart(4, "0")}`,
        gender: i % 2 === 0 ? "P" : "L",
        status: "ACTIVE",
      },
    });
    students.push(student);
  }

  const mentors = [];
  for (let i = 1; i <= 2; i++) mentors.push(await upsertUser(tx, { index: i, role: "DUDI_MENTOR", name: `Mentor DUDI ${String(i).padStart(2, "0")}` }));

  const companySpecs = [
    { name: "PT Solusi Digital Edu", industrySector: "Pengembangan Perangkat Lunak", address: "Kawasan Industri Contoh, Bandung Barat", picName: "PIC Solusi Digital", picPhone: "08001000001", latitude: -6.93, longitude: 107.40, radiusMeters: 120, maxQuota: 6 },
    { name: "CV Kreasi Media Edu", industrySector: "Desain & Media Digital", address: "Sentra Kreatif Contoh, Bandung Barat", picName: "PIC Kreasi Media", picPhone: "08001000002", latitude: -6.94, longitude: 107.39, radiusMeters: 100, maxQuota: 5 },
    { name: "PT Jaringan Nusantara Edu", industrySector: "Jaringan & Infrastruktur TI", address: "Kompleks Teknologi Contoh, Bandung Barat", picName: "PIC Jaringan", picPhone: "08001000003", latitude: -6.92, longitude: 107.41, radiusMeters: 150, maxQuota: 8 },
    { name: "Studio Otomasi Edu", industrySector: "Otomasi & Internet of Things", address: "Tech Hub Contoh, Bandung Barat", picName: "PIC Otomasi", picPhone: "08001000004", latitude: -6.95, longitude: 107.42, radiusMeters: 110, maxQuota: 4 },
  ];
  const companies = [];
  for (const spec of companySpecs) companies.push(await ensureCompany(tx, school.id, spec));

  const placementStudents = [students[8], students[9], students[10], students[11], students[12], students[13], students[14], students[15]];
  const placements = [];
  for (let i = 0; i < placementStudents.length; i++) {
    placements.push(await ensurePlacement(tx, {
      schoolId: school.id,
      studentId: placementStudents[i].id,
      companyId: companies[i % companies.length].id,
      teacherSupervisorId: teachers[i % 5].id,
      dudiMentorId: mentors[i % mentors.length].id,
      startDate: new Date(Date.UTC(2026, 6, 1, 0, 0, 0)),
      endDate: new Date(Date.UTC(2026, 9, 31, 23, 59, 59)),
      status: "ACTIVE",
    }));
  }

  // Healthy PKL records for placements 0..5. Placement 6 intentionally has no logs/journals.
  for (let i = 0; i < 6; i++) {
    const placement = placements[i];
    for (const offset of [-2, -1, 0]) {
      const d = atOffset(offset, 7);
      const status = i === 5 && offset === -1 ? "DI LUAR RADIUS" : "HADIR";
      await tx.attendanceLog.upsert({
        where: { placementId_dateOnly_type: { placementId: placement.id, dateOnly: dateOnly(d), type: "CHECK_IN" } },
        create: { placementId: placement.id, timestamp: d, dateOnly: dateOnly(d), type: "CHECK_IN", status, latitude: companies[i % companies.length].latitude, longitude: companies[i % companies.length].longitude, distanceMeters: status === "HADIR" ? 20 + i : 420, notes: `${DEMO_PREFIX} Presensi masuk data contoh` },
        update: { timestamp: d, status, distanceMeters: status === "HADIR" ? 20 + i : 420, notes: `${DEMO_PREFIX} Presensi masuk data contoh` },
      });
      await tx.attendanceLog.upsert({
        where: { placementId_dateOnly_type: { placementId: placement.id, dateOnly: dateOnly(d), type: "CHECK_OUT" } },
        create: { placementId: placement.id, timestamp: atOffset(offset, 15), dateOnly: dateOnly(d), type: "CHECK_OUT", status: "HADIR", latitude: companies[i % companies.length].latitude, longitude: companies[i % companies.length].longitude, distanceMeters: 18 + i, notes: `${DEMO_PREFIX} Presensi pulang data contoh` },
        update: { timestamp: atOffset(offset, 15), status: "HADIR", distanceMeters: 18 + i, notes: `${DEMO_PREFIX} Presensi pulang data contoh` },
      });
    }

    await ensureJournal(tx, placement.id, {
      date: i === 5 ? atOffset(-5, 10) : atOffset(-1, 10),
      activityDescription: `${DEMO_PREFIX} Jurnal PKL ${i + 1} — konfigurasi dan dokumentasi pekerjaan`,
      obstacleDescription: i % 2 === 0 ? "Menemukan konfigurasi awal yang perlu diverifikasi ulang." : null,
      status: i % 3 === 0 ? "SUBMITTED" : "APPROVED",
      feedback: i % 3 === 0 ? null : `${DEMO_PREFIX} Pekerjaan sudah sesuai prosedur.`,
      score: i % 3 === 0 ? null : 84 + i,
      approvedAt: i % 3 === 0 ? null : atOffset(0, 12),
      approvedById: i % 3 === 0 ? null : teachers[i % 5].id,
    });
  }
  await ensureJournal(tx, placements[7].id, {
    date: atOffset(0, 11),
    activityDescription: `${DEMO_PREFIX} Jurnal PKL 8 — penyusunan dokumentasi proyek`,
    obstacleDescription: "Menunggu konfirmasi pembimbing untuk tahap berikutnya.",
    status: "REVISION",
    feedback: `${DEMO_PREFIX} Lengkapi bukti langkah pengujian.`,
    score: 76,
    approvedAt: atOffset(0, 13),
    approvedById: teachers[2].id,
  });

  const courseSpecs = [
    { classIndex: 0, teacherIndex: 0, subjectName: `${DEMO_PREFIX} KIK & Kewirausahaan`, description: "Kreativitas, inovasi, peluang usaha, dan pengembangan produk digital." },
    { classIndex: 1, teacherIndex: 0, subjectName: `${DEMO_PREFIX} Pemrograman Web`, description: "Pengembangan aplikasi web dengan alur kerja full-stack." },
    { classIndex: 2, teacherIndex: 1, subjectName: `${DEMO_PREFIX} Basis Data`, description: "Perancangan basis data, SQL, normalisasi, dan implementasi DBMS." },
    { classIndex: 3, teacherIndex: 2, subjectName: `${DEMO_PREFIX} Administrasi Infrastruktur Jaringan`, description: "Konfigurasi layanan jaringan dan troubleshooting terstruktur." },
    { classIndex: 4, teacherIndex: 3, subjectName: `${DEMO_PREFIX} Desain Visual Digital`, description: "Prinsip desain visual, prototipe, dan produksi aset digital." },
    { classIndex: 0, teacherIndex: 4, subjectName: `${DEMO_PREFIX} Projek Kreatif`, description: "Kolaborasi lintas kompetensi untuk menghasilkan solusi sekolah." },
  ];

  const courses = [];
  for (let cIndex = 0; cIndex < courseSpecs.length; cIndex++) {
    const spec = courseSpecs[cIndex];
    const course = await ensureCourse(tx, {
      schoolId: school.id,
      academicYearId: academicYear.id,
      classRoomId: classes[spec.classIndex].id,
      teacherId: teachers[spec.teacherIndex].id,
      subjectName: spec.subjectName,
      description: `${DEMO_PREFIX} ${spec.description}`,
    });
    courses.push(course);

    await ensureAgenda(tx, course.id, { date: atOffset(0, 8), period: "Jam ke 1–3", competency: `${DEMO_PREFIX} Penerapan konsep inti`, summary: `${DEMO_PREFIX} Agenda hari ini untuk ${spec.subjectName.replace(`${DEMO_PREFIX} `, "")}` });
    await ensureAgenda(tx, course.id, { date: atOffset(-3, 9), period: "Jam ke 4–6", competency: `${DEMO_PREFIX} Analisis studi kasus`, summary: `${DEMO_PREFIX} Agenda sebelumnya untuk ${spec.subjectName.replace(`${DEMO_PREFIX} `, "")}` });

    await ensureMaterial(tx, course.id, { title: `${DEMO_PREFIX} Materi 1 — Konsep Dasar`, description: "Ringkasan konsep, contoh, dan pertanyaan pemantik untuk pembelajaran.", externalUrl: null });
    await ensureMaterial(tx, course.id, { title: `${DEMO_PREFIX} Materi 2 — Studi Kasus`, description: "Studi kasus terarah untuk latihan analisis dan diskusi kelas.", externalUrl: null });

    const assignmentPast = await ensureAssignment(tx, course.id, { title: `${DEMO_PREFIX} Tugas Analisis`, instruction: "Analisis kasus yang diberikan, tuliskan temuan utama, dan berikan alasan untuk solusi yang dipilih.", deadline: atOffset(-2, 23) });
    await ensureAssignment(tx, course.id, { title: `${DEMO_PREFIX} Tugas Berikutnya`, instruction: "Siapkan hasil pekerjaan dalam format ringkas untuk dibahas pada pertemuan berikutnya.", deadline: atOffset(4, 23) });

    const classStudents = students.filter((s) => s.classRoomId === classes[spec.classIndex].id);
    for (let sIndex = 0; sIndex < Math.min(3, classStudents.length); sIndex++) {
      const st = classStudents[sIndex];
      await tx.lmsSubmission.upsert({
        where: { assignmentId_studentId: { assignmentId: assignmentPast.id, studentId: st.id } },
        create: { assignmentId: assignmentPast.id, studentId: st.id, submittedAt: atOffset(-3 + sIndex, 19), textContent: `${DEMO_PREFIX} Jawaban tugas analisis siswa ${sIndex + 1}.`, fileUrl: null, grade: sIndex === 1 ? null : 86 + sIndex * 3, feedback: sIndex === 1 ? null : `${DEMO_PREFIX} Analisis sudah runtut.` },
        update: { textContent: `${DEMO_PREFIX} Jawaban tugas analisis siswa ${sIndex + 1}.`, grade: sIndex === 1 ? null : 86 + sIndex * 3, feedback: sIndex === 1 ? null : `${DEMO_PREFIX} Analisis sudah runtut.` },
      });
    }

    const openExam = await ensureAssessment(tx, course.id, { title: `${DEMO_PREFIX} Kuis Formatif`, durationMinutes: 30, startTime: atOffset(-1, 6), endTime: atOffset(3, 21), isRandomized: true });
    const closedExam = await ensureAssessment(tx, course.id, { title: `${DEMO_PREFIX} Asesmen Sebelumnya`, durationMinutes: 45, startTime: atOffset(-12, 7), endTime: atOffset(-9, 21), isRandomized: false });

    const questions = [
      { prompt: `${DEMO_PREFIX} Soal 1 — Apa langkah paling tepat untuk mengidentifikasi inti masalah?`, options: [{ id: "A", text: "Mengumpulkan bukti dan kebutuhan pengguna", isCorrect: true }, { id: "B", text: "Memilih solusi paling mahal", isCorrect: false }, { id: "C", text: "Mengabaikan data", isCorrect: false }, { id: "D", text: "Menyalin solusi tanpa analisis", isCorrect: false }], points: 50 },
      { prompt: `${DEMO_PREFIX} Soal 2 — Mengapa evaluasi hasil diperlukan?`, options: [{ id: "A", text: "Untuk memastikan solusi sesuai tujuan", isCorrect: true }, { id: "B", text: "Agar pekerjaan lebih panjang", isCorrect: false }, { id: "C", text: "Untuk menghindari dokumentasi", isCorrect: false }, { id: "D", text: "Supaya data tidak digunakan", isCorrect: false }], points: 50 },
    ];
    for (const q of questions) {
      await ensureQuestion(tx, openExam.id, { questionType: "MULTIPLE_CHOICE", ...q });
      await ensureQuestion(tx, closedExam.id, { questionType: "MULTIPLE_CHOICE", ...q, prompt: q.prompt.replace("Soal", "Asesmen") });
    }

    for (let sIndex = 0; sIndex < Math.min(3, classStudents.length); sIndex++) {
      const st = classStudents[sIndex];
      await tx.lmsAssessmentResult.upsert({
        where: { assessmentId_studentId: { assessmentId: closedExam.id, studentId: st.id } },
        create: { assessmentId: closedExam.id, studentId: st.id, score: 80 + sIndex * 7, startedAt: atOffset(-11, 8), finishedAt: atOffset(-11, 9), answers: { demo: true, A: "A", B: sIndex === 2 ? "B" : "A" } },
        update: { score: 80 + sIndex * 7, finishedAt: atOffset(-11, 9), answers: { demo: true, A: "A", B: sIndex === 2 ? "B" : "A" } },
      });
    }

    const attendanceDates = [atOffset(-7, 8), atOffset(-2, 8), atOffset(0, 8)];
    for (let sessionIndex = 0; sessionIndex < attendanceDates.length; sessionIndex++) {
      const session = await ensureAttendanceSession(tx, course.id, { date: attendanceDates[sessionIndex], sessionNumber: sessionIndex + 1 });
      for (let sIndex = 0; sIndex < classStudents.length; sIndex++) {
        const statuses = sessionIndex === 2
          ? ["HADIR", "HADIR", "HADIR", cIndex % 3 === 0 ? "SAKIT" : cIndex % 3 === 1 ? "IZIN" : "HADIR"]
          : ["HADIR", "HADIR", "HADIR", sIndex % 2 === 0 ? "HADIR" : "ALPA"];
        const status = statuses[sIndex % statuses.length];
        await tx.lmsAttendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId: session.id, studentId: classStudents[sIndex].id } },
          create: { sessionId: session.id, studentId: classStudents[sIndex].id, status, notes: status === "HADIR" ? null : `${DEMO_PREFIX} Status kehadiran contoh` },
          update: { status, notes: status === "HADIR" ? null : `${DEMO_PREFIX} Status kehadiran contoh` },
        });
      }
    }
  }

  const dutyNotes = [
    `${DEMO_PREFIX} KBM berjalan tertib. Dua siswa datang terlambat dan sudah ditindaklanjuti.`,
    `${DEMO_PREFIX} Kegiatan sekolah kondusif. Satu siswa mendapat dispensasi kegiatan lomba.`,
    `${DEMO_PREFIX} Tidak ada kejadian khusus. Koordinasi piket dan wali kelas berjalan baik.`,
  ];
  for (let i = 0; i < dutyNotes.length; i++) {
    await ensureDutyReport(tx, { schoolId: school.id, dutyTeacherId: teachers[i % 2].id, date: atOffset(-i, 6), lateStudentsCount: i === 0 ? 2 : i, dispensationsCount: i === 1 ? 1 : 0, notes: dutyNotes[i] });
  }

  return demoStatus(tx);
}

async function cleanupDemo(tx) {
  const school = await requireTargetSchool(tx);
  const demoUsers = await tx.user.findMany({ where: { schoolId: school.id, email: { startsWith: `${DEMO_NAMESPACE}-`, endsWith: `@${DEMO_DOMAIN}` } }, select: { id: true, role: true } });
  const demoUserIds = demoUsers.map((u) => u.id);
  const demoStudentIds = demoUsers.filter((u) => u.role === "STUDENT").map((u) => u.id);
  const demoStaffIds = demoUsers.filter((u) => u.role !== "STUDENT").map((u) => u.id);
  const demoClasses = await tx.classRoom.findMany({ where: { schoolId: school.id, name: { startsWith: DEMO_PREFIX } }, select: { id: true } });
  const demoClassIds = demoClasses.map((c) => c.id);
  const demoCompanies = await tx.company.findMany({ where: { schoolId: school.id, name: { startsWith: DEMO_PREFIX } }, select: { id: true } });
  const demoCompanyIds = demoCompanies.map((c) => c.id);

  if (demoClassIds.length) {
    const realStudentsInDemoClasses = await tx.user.count({ where: { classRoomId: { in: demoClassIds }, NOT: { email: { startsWith: `${DEMO_NAMESPACE}-`, endsWith: `@${DEMO_DOMAIN}` } } } });
    const realCoursesInDemoClasses = await tx.lmsCourse.count({ where: { classRoomId: { in: demoClassIds }, NOT: { subjectName: { startsWith: DEMO_PREFIX } } } });
    if (realStudentsInDemoClasses || realCoursesInDemoClasses) {
      throw new Error(`Cleanup refused: demo classes contain ${realStudentsInDemoClasses} non-demo student(s) and ${realCoursesInDemoClasses} non-demo course(s).`);
    }
  }

  await tx.lmsCourse.deleteMany({ where: { schoolId: school.id, subjectName: { startsWith: DEMO_PREFIX } } });
  if (demoStudentIds.length) await tx.placement.deleteMany({ where: { schoolId: school.id, studentId: { in: demoStudentIds } } });
  if (demoStaffIds.length) await tx.dutyTeacherReport.deleteMany({ where: { schoolId: school.id, dutyTeacherId: { in: demoStaffIds } } });
  if (demoStudentIds.length) await tx.user.deleteMany({ where: { id: { in: demoStudentIds } } });
  if (demoClassIds.length) await tx.classRoom.deleteMany({ where: { id: { in: demoClassIds } } });
  if (demoStaffIds.length) await tx.user.deleteMany({ where: { id: { in: demoStaffIds } } });

  for (const companyId of demoCompanyIds) {
    const remainingPlacements = await tx.placement.count({ where: { companyId } });
    if (remainingPlacements === 0) await tx.company.delete({ where: { id: companyId } });
  }
  await tx.department.deleteMany({ where: { schoolId: school.id, code: { startsWith: DEMO_DEPT_PREFIX }, classes: { none: {} } } });

  return demoStatus(tx);
}

async function runTransactional(fn, { rollback = false } = {}) {
  const sentinel = new Error("__DEMO_DRY_RUN_ROLLBACK__");
  let preview;
  try {
    return await prisma.$transaction(async (tx) => {
      preview = await fn(tx);
      if (rollback) throw sentinel;
      return preview;
    }, { maxWait: 10_000, timeout: 120_000 });
  } catch (error) {
    if (error === sentinel || (error instanceof Error && error.message === sentinel.message)) return preview;
    throw error;
  }
}

async function main() {
  if (mode === "status") {
    console.log(JSON.stringify(await demoStatus(prisma), null, 2));
    return;
  }
  if (mode === "seed") {
    const result = await runTransactional(seedDemo, { rollback: dryRun });
    console.log(JSON.stringify({ mode: dryRun ? "seed-dry-run" : "seed", persisted: !dryRun, ...result }, null, 2));
    return;
  }
  if (mode === "cleanup") {
    if (!dryRun && confirmation !== CLEANUP_CONFIRMATION) {
      throw new Error(`Cleanup is destructive for DEMO records. Re-run with --dry-run first, then --confirm=${CLEANUP_CONFIRMATION}.`);
    }
    const result = await runTransactional(cleanupDemo, { rollback: dryRun });
    console.log(JSON.stringify({ mode: dryRun ? "cleanup-dry-run" : "cleanup", persisted: !dryRun, ...result }, null, 2));
    return;
  }
  throw new Error("Usage: node scripts/school-os-demo-data.mjs status|seed [--dry-run]|cleanup --dry-run|cleanup --confirm=DELETE-SMKN12-DEMO-SCENARIO");
}

main()
  .catch((error) => {
    console.error(`DEMO_SEED_ERROR: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
