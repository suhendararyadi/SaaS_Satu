#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TARGET_SLUG = "smkn-12-garut";
const DEMO_PREFIX = "[DEMO] SMKN12";
const DEMO_NAMESPACE = "smkn12";
const DEMO_DOMAIN = "schoolos-demo.invalid";
const CLEANUP_CONFIRMATION = "DELETE-SMKN12-DEMO-SCENARIO";

const mode = process.argv[2] || "status";
const dryRun = process.argv.includes("--dry-run");
const confirmation = process.argv.find((arg) => arg.startsWith("--confirm="))?.slice("--confirm=".length);

function localDateOnly(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function localDateTime(dateOnly, time) {
  return new Date(`${dateOnly}T${time}:00+07:00`);
}

function weekday(dateOnly = localDateOnly()) {
  const d = new Date(`${dateOnly}T12:00:00+07:00`);
  const short = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", weekday: "short" }).format(d);
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[short];
}

async function schoolContext(tx) {
  const school = await tx.school.findUnique({ where: { slug: TARGET_SLUG } });
  if (!school) throw new Error("SMKN 12 Garut not found.");
  const academicYear = await tx.academicYear.findFirst({
    where: { schoolId: school.id, isActive: true },
    orderBy: { yearName: "desc" },
  });
  if (!academicYear) throw new Error("Active academic year not found.");
  return { school, academicYear };
}

const demoEmailWhere = {
  startsWith: `${DEMO_NAMESPACE}-`,
  endsWith: `@${DEMO_DOMAIN}`,
};

async function getDemoEntities(tx) {
  const { school, academicYear } = await schoolContext(tx);
  const users = await tx.user.findMany({
    where: { schoolId: school.id, email: demoEmailWhere },
    include: { classRoom: true },
    orderBy: { email: "asc" },
  });
  const teachers = users.filter((u) => u.role === "TEACHER");
  const students = users.filter((u) => u.role === "STUDENT");
  const mentors = users.filter((u) => u.role === "DUDI_MENTOR");
  const courses = await tx.lmsCourse.findMany({
    where: { schoolId: school.id, subjectName: { startsWith: DEMO_PREFIX } },
    include: { classRoom: true },
    orderBy: { subjectName: "asc" },
  });
  const companies = await tx.company.findMany({
    where: { schoolId: school.id, name: { startsWith: DEMO_PREFIX } },
    orderBy: { name: "asc" },
  });
  const placements = await tx.placement.findMany({
    where: { schoolId: school.id, student: { email: demoEmailWhere } },
    include: { student: { include: { classRoom: true } }, company: true },
    orderBy: { student: { email: "asc" } },
  });
  const departments = await tx.department.findMany({
    where: { schoolId: school.id, code: { startsWith: "DEMO-SMKN12-" } },
    orderBy: { code: "asc" },
  });
  return { school, academicYear, users, teachers, students, mentors, courses, companies, placements, departments };
}

async function ensureDemoReady(tx) {
  const entities = await getDemoEntities(tx);
  if (entities.students.length < 20 || entities.teachers.length < 5 || entities.courses.length < 5 || entities.placements.length < 8) {
    throw new Error("Base SMKN12 demo dataset is incomplete. Run school-os-demo-smkn12.mjs seed first.");
  }
  return entities;
}

async function ensureStaffAssignments(tx, e) {
  const todayCode = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][weekday()];
  await tx.schoolStaffAssignment.deleteMany({
    where: {
      schoolId: e.school.id,
      teacherId: { in: e.teachers.map((t) => t.id) },
      role: { in: ["DUTY_TEACHER", "DEPARTMENT_HEAD"] },
    },
  });
  await tx.schoolStaffAssignment.create({
    data: {
      schoolId: e.school.id,
      teacherId: e.teachers[0].id,
      role: "DUTY_TEACHER",
      academicYearId: e.academicYear.id,
      dutyDays: [todayCode],
      customTitle: `${DEMO_PREFIX} Guru Piket Demo`,
      notes: `${DEMO_PREFIX} Penugasan untuk demonstrasi Teaching Session dan Attendance 360.`,
      isActive: true,
    },
  });
  if (e.departments[0]) {
    await tx.schoolStaffAssignment.create({
      data: {
        schoolId: e.school.id,
        teacherId: e.teachers[1].id,
        role: "DEPARTMENT_HEAD",
        academicYearId: e.academicYear.id,
        departmentId: e.departments[0].id,
        customTitle: `${DEMO_PREFIX} Ketua Program Demo`,
        notes: `${DEMO_PREFIX} Scope audit Teaching Session demo.`,
        isActive: true,
      },
    });
  }
  await tx.wakasekAssignment.upsert({
    where: {
      schoolId_teacherId_role: {
        schoolId: e.school.id,
        teacherId: e.teachers[4].id,
        role: "KURIKULUM",
      },
    },
    create: { schoolId: e.school.id, teacherId: e.teachers[4].id, role: "KURIKULUM" },
    update: {},
  });
}

async function seedGlobalAttendance(tx, e) {
  const classed = e.students.filter((s) => s.classRoomId);
  const patterns = [
    ["HADIR", "HADIR", "TERLAMBAT", "HADIR", "IZIN", "HADIR", "HADIR", "SAKIT", "HADIR", "HADIR"],
    ["HADIR", "HADIR", "HADIR", "HADIR", "HADIR", "HADIR", "TERLAMBAT", "HADIR", "HADIR", "ALPA"],
    ["HADIR", "HADIR", "HADIR", "IZIN", "HADIR", "HADIR", "HADIR", "HADIR", "SAKIT", "HADIR"],
    ["HADIR", "TERLAMBAT", "HADIR", "HADIR", "HADIR", "HADIR", "HADIR", "ALPA", "HADIR", "HADIR"],
    ["HADIR", "TERLAMBAT", "HADIR", "IZIN", "HADIR", "HADIR", "SAKIT", "HADIR", "ALPA", "HADIR"],
  ];

  for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
    const d = localDateOnly(dayIndex - 4);
    for (let i = 0; i < classed.length; i++) {
      const student = classed[i];
      const status = patterns[dayIndex][i % patterns[dayIndex].length];
      const late = status === "TERLAMBAT";
      const present = status === "HADIR" || late;
      const arrivalAt = present ? localDateTime(d, late ? "07:17" : "06:48") : null;
      const checkOutAt = present ? localDateTime(d, "15:05") : null;
      await tx.schoolDailyAttendance.upsert({
        where: { schoolId_studentId_dateOnly: { schoolId: e.school.id, studentId: student.id, dateOnly: d } },
        create: {
          schoolId: e.school.id,
          academicYearId: e.academicYear.id,
          classRoomId: student.classRoomId,
          studentId: student.id,
          dateOnly: d,
          status,
          notes: `${DEMO_PREFIX} Kehadiran Global demo.`,
          arrivalAt,
          checkOutAt,
          lateMinutes: late ? 17 : null,
          reconciliationStatus: "MANUAL",
          evidenceSummary: { demo: true, source: "SMKN12_DEMO_SCENARIO" },
          recordedById: e.teachers[0].id,
        },
        update: {
          status,
          notes: `${DEMO_PREFIX} Kehadiran Global demo.`,
          arrivalAt,
          checkOutAt,
          lateMinutes: late ? 17 : null,
          reconciliationStatus: "MANUAL",
          evidenceSummary: { demo: true, source: "SMKN12_DEMO_SCENARIO" },
          recordedById: e.teachers[0].id,
        },
      });
      const sourceKey = `demo-smkn12-global:${d}:${student.id}`;
      await tx.studentAttendanceEvent.upsert({
        where: { schoolId_sourceKey: { schoolId: e.school.id, sourceKey } },
        create: {
          schoolId: e.school.id,
          studentId: student.id,
          dateOnly: d,
          type: "HOMEROOM_OVERRIDE",
          status,
          source: "DEMO_SEED",
          sourceKey,
          occurredAt: arrivalAt || localDateTime(d, "07:00"),
          actorId: e.teachers[0].id,
          notes: `${DEMO_PREFIX} Evidence kehadiran demo.`,
          metadata: { demo: true, authoritative: true },
        },
        update: {
          status,
          occurredAt: arrivalAt || localDateTime(d, "07:00"),
          actorId: e.teachers[0].id,
          notes: `${DEMO_PREFIX} Evidence kehadiran demo.`,
          metadata: { demo: true, authoritative: true },
        },
      });
    }
  }
}

async function seedHabituation(tx, e) {
  const d = localDateOnly();
  const activity = await tx.attendanceActivity.upsert({
    where: { schoolId_dateOnly_code: { schoolId: e.school.id, dateOnly: d, code: "DEMO-SMKN12-APEL" } },
    create: {
      schoolId: e.school.id,
      academicYearId: e.academicYear.id,
      dateOnly: d,
      code: "DEMO-SMKN12-APEL",
      name: `${DEMO_PREFIX} Apel Pagi & Budaya Kerja`,
      category: "PEMBIASAAN",
      startTime: "06:45",
      endTime: "07:00",
      status: "CLOSED",
      createdById: e.teachers[0].id,
      notes: `${DEMO_PREFIX} Aktivitas pembiasaan untuk demo Attendance 360.`,
    },
    update: {
      name: `${DEMO_PREFIX} Apel Pagi & Budaya Kerja`,
      status: "CLOSED",
      notes: `${DEMO_PREFIX} Aktivitas pembiasaan untuk demo Attendance 360.`,
    },
  });
  const classed = e.students.filter((s) => s.classRoomId);
  for (let i = 0; i < classed.length; i++) {
    const status = i === 3 ? "TERLAMBAT" : i === 8 ? "TIDAK_HADIR" : "HADIR";
    await tx.attendanceActivityRecord.upsert({
      where: { activityId_studentId: { activityId: activity.id, studentId: classed[i].id } },
      create: {
        activityId: activity.id,
        studentId: classed[i].id,
        status,
        recordedById: e.teachers[0].id,
        notes: status === "HADIR" ? null : `${DEMO_PREFIX} Status pembiasaan demo.`,
      },
      update: {
        status,
        recordedById: e.teachers[0].id,
        notes: status === "HADIR" ? null : `${DEMO_PREFIX} Status pembiasaan demo.`,
      },
    });
  }
}

async function findTodayLegacyRecords(tx, courseId) {
  const start = localDateTime(localDateOnly(), "00:00");
  const end = localDateTime(localDateOnly(), "23:59");
  const agenda = await tx.lmsAgenda.findFirst({
    where: { courseId, date: { gte: start, lte: end } },
    orderBy: { date: "desc" },
  });
  const attendance = await tx.lmsAttendanceSession.findFirst({
    where: { courseId, date: { gte: start, lte: end } },
    orderBy: { sessionNumber: "desc" },
    include: { records: true },
  });
  return { agenda, attendance };
}

async function seedTeachingSessions(tx, e) {
  const d = localDateOnly();
  const day = weekday(d);
  const specs = [
    { start: "07:00", end: "08:30", status: "COMPLETED", method: "Demonstrasi dan praktik terbimbing" },
    { start: "09:00", end: "10:30", status: "COMPLETED", method: "Problem Based Learning" },
    { start: "07:00", end: "08:30", status: "COMPLETED", method: "Praktik SQL dan diskusi" },
    { start: "09:00", end: "10:30", status: "DELEGATED", method: "Tugas terstruktur melalui Guru Piket" },
    { start: "11:00", end: "12:30", status: "COMPLETED", method: "Project Based Learning" },
    { start: "13:00", end: "14:30", status: null, method: "Kolaborasi proyek" },
  ];
  const picked = e.courses.slice(0, Math.min(specs.length, e.courses.length));
  for (let i = 0; i < picked.length; i++) {
    const course = picked[i];
    const spec = specs[i];
    const schedule = await tx.lmsTeachingSchedule.upsert({
      where: {
        courseId_dayOfWeek_startTime_endTime: {
          courseId: course.id,
          dayOfWeek: day,
          startTime: spec.start,
          endTime: spec.end,
        },
      },
      create: {
        courseId: course.id,
        dayOfWeek: day,
        startTime: spec.start,
        endTime: spec.end,
        roomLabel: `${DEMO_PREFIX} ${i % 2 === 0 ? "Lab Komputer 1" : "Ruang Kelas Demo"}`,
        isActive: true,
      },
      update: { isActive: true },
    });
    if (!spec.status) continue;

    const legacy = await findTodayLegacyRecords(tx, course.id);
    const session = await tx.lmsTeachingSession.upsert({
      where: { scheduleId_dateOnly: { scheduleId: schedule.id, dateOnly: d } },
      create: {
        courseId: course.id,
        scheduleId: schedule.id,
        dateOnly: d,
        scheduledStartAt: localDateTime(d, spec.start),
        scheduledEndAt: localDateTime(d, spec.end),
        status: spec.status,
        teacherCheckInAt: spec.status === "COMPLETED" ? localDateTime(d, spec.start === "07:00" ? "07:03" : spec.start) : null,
        teacherCheckOutAt: spec.status === "COMPLETED" ? localDateTime(d, spec.end) : null,
        checkInLatitude: spec.status === "COMPLETED" ? -7.216 : null,
        checkInLongitude: spec.status === "COMPLETED" ? 107.900 : null,
        checkInAccuracy: spec.status === "COMPLETED" ? 8 : null,
        checkInDistanceM: spec.status === "COMPLETED" ? 18 + i : null,
        checkInGeofence: spec.status === "COMPLETED" ? "INSIDE" : null,
        checkOutLatitude: spec.status === "COMPLETED" ? -7.216 : null,
        checkOutLongitude: spec.status === "COMPLETED" ? 107.900 : null,
        checkOutAccuracy: spec.status === "COMPLETED" ? 7 : null,
        checkOutDistanceM: spec.status === "COMPLETED" ? 15 + i : null,
        checkOutGeofence: spec.status === "COMPLETED" ? "INSIDE" : null,
        absenceType: spec.status === "DELEGATED" ? "SAKIT" : null,
        absenceReason: spec.status === "DELEGATED" ? `${DEMO_PREFIX} Guru berhalangan hadir.` : null,
        dutyInstruction: spec.status === "DELEGATED" ? `${DEMO_PREFIX} Siswa mengerjakan LKPD dan mengumpulkan hasil ke LMS.` : null,
        delegatedAt: spec.status === "DELEGATED" ? localDateTime(d, "06:20") : null,
      },
      update: {
        status: spec.status,
        teacherCheckInAt: spec.status === "COMPLETED" ? localDateTime(d, spec.start === "07:00" ? "07:03" : spec.start) : null,
        teacherCheckOutAt: spec.status === "COMPLETED" ? localDateTime(d, spec.end) : null,
        absenceType: spec.status === "DELEGATED" ? "SAKIT" : null,
        absenceReason: spec.status === "DELEGATED" ? `${DEMO_PREFIX} Guru berhalangan hadir.` : null,
        dutyInstruction: spec.status === "DELEGATED" ? `${DEMO_PREFIX} Siswa mengerjakan LKPD dan mengumpulkan hasil ke LMS.` : null,
        delegatedAt: spec.status === "DELEGATED" ? localDateTime(d, "06:20") : null,
      },
    });

    if (legacy.agenda) {
      await tx.lmsAgenda.update({
        where: { id: legacy.agenda.id },
        data: { teachingSessionId: session.id, method: spec.method },
      });
    }
    if (legacy.attendance) {
      await tx.lmsAttendanceSession.update({
        where: { id: legacy.attendance.id },
        data: { teachingSessionId: session.id },
      });
      if (i === 0 && legacy.attendance.records.length) {
        await tx.lmsAttendanceRecord.update({
          where: {
            sessionId_studentId: {
              sessionId: legacy.attendance.id,
              studentId: legacy.attendance.records[0].studentId,
            },
          },
          data: { status: "ALPA", notes: `${DEMO_PREFIX} Selective truancy: hadir di sekolah, alpa di mapel.` },
        });
      }
    }

    const classStudents = e.students.filter((s) => s.classRoomId === course.classRoomId);
    if (spec.status === "COMPLETED") {
      for (let sIndex = 0; sIndex < classStudents.length; sIndex++) {
        const score = [95, 85, 75, 65][sIndex % 4];
        const level = score >= 90 ? "SANGAT_AKTIF" : score >= 80 ? "AKTIF" : score >= 70 ? "CUKUP" : "PERLU_BIMBINGAN";
        await tx.lmsEngagementScore.upsert({
          where: { sessionId_studentId: { sessionId: session.id, studentId: classStudents[sIndex].id } },
          create: {
            sessionId: session.id,
            studentId: classStudents[sIndex].id,
            recordedById: course.teacherId,
            level,
            score,
            notes: `${DEMO_PREFIX} Observasi keaktifan pertemuan demo.`,
            tags: ["DEMO", sIndex % 2 === 0 ? "DISKUSI" : "PRAKTIK"],
          },
          update: {
            recordedById: course.teacherId,
            level,
            score,
            notes: `${DEMO_PREFIX} Observasi keaktifan pertemuan demo.`,
            tags: ["DEMO", sIndex % 2 === 0 ? "DISKUSI" : "PRAKTIK"],
          },
        });
      }
    }
    const eventType = spec.status === "COMPLETED" ? "SESSION_COMPLETED" : "TEACHER_ABSENCE_DELEGATED";
    const existingEvent = await tx.lmsTeachingSessionEvent.findFirst({ where: { sessionId: session.id, actionType: eventType } });
    if (!existingEvent) {
      await tx.lmsTeachingSessionEvent.create({
        data: {
          sessionId: session.id,
          actorId: course.teacherId,
          actionType: eventType,
          metadata: { demo: true, method: spec.method },
        },
      });
    }
  }
}

async function seedPklGen2(tx, e) {
  let period = await tx.pklPeriod.findFirst({ where: { schoolId: e.school.id, name: `${DEMO_PREFIX} PKL 2026 Semester Ganjil` } });
  if (!period) {
    period = await tx.pklPeriod.create({
      data: {
        schoolId: e.school.id,
        academicYearId: e.academicYear.id,
        name: `${DEMO_PREFIX} PKL 2026 Semester Ganjil`,
        startDate: localDateTime(localDateOnly(-60), "00:00"),
        endDate: localDateTime(localDateOnly(60), "23:59"),
        isActive: true,
        notes: `${DEMO_PREFIX} Periode PKL untuk demonstrasi.`,
      },
    });
  }

  for (let i = 0; i < e.companies.length; i++) {
    const company = e.companies[i];
    await tx.company.update({
      where: { id: company.id },
      data: {
        code: `DEMO-SMKN12-PKL-${String(i + 1).padStart(2, "0")}`,
        notes: `${DEMO_PREFIX} Mitra industri sintetis untuk demonstrasi PKL Gen2.`,
        partnershipStatus: "ACTIVE",
        isActive: true,
      },
    });
    const placementDeps = [...new Set(e.placements.filter((p) => p.companyId === company.id).map((p) => p.student.classRoom?.departmentId).filter(Boolean))];
    for (const departmentId of placementDeps) {
      await tx.companyDepartment.upsert({
        where: { companyId_departmentId: { companyId: company.id, departmentId } },
        create: { schoolId: e.school.id, companyId: company.id, departmentId, notes: `${DEMO_PREFIX} Link kompetensi demo.` },
        update: { isActive: true, notes: `${DEMO_PREFIX} Link kompetensi demo.` },
      });
      await tx.pklCompanyCapacity.upsert({
        where: { periodId_companyId_departmentId: { periodId: period.id, companyId: company.id, departmentId } },
        create: { schoolId: e.school.id, periodId: period.id, companyId: company.id, departmentId, quota: 6, notes: `${DEMO_PREFIX} Kuota demo.` },
        update: { quota: 6, notes: `${DEMO_PREFIX} Kuota demo.` },
      });
    }
    await tx.pklWorkSchedule.upsert({
      where: { periodId_companyId: { periodId: period.id, companyId: company.id } },
      create: {
        schoolId: e.school.id,
        periodId: period.id,
        companyId: company.id,
        workingDays: "1,2,3,4,5",
        checkInStart: "07:30",
        lateAfter: "08:00",
        checkOutStart: "15:30",
        checkOutEnd: "17:00",
        notes: `${DEMO_PREFIX} Jadwal kerja industri demo.`,
      },
      update: {
        workingDays: "1,2,3,4,5",
        checkInStart: "07:30",
        lateAfter: "08:00",
        checkOutStart: "15:30",
        checkOutEnd: "17:00",
        notes: `${DEMO_PREFIX} Jadwal kerja industri demo.`,
      },
    });
  }

  for (let i = 0; i < Math.min(e.mentors.length, 2); i++) {
    await tx.dudiMentorProfile.upsert({
      where: { userId: e.mentors[i].id },
      create: {
        schoolId: e.school.id,
        userId: e.mentors[i].id,
        companyId: e.companies[i].id,
        position: i === 0 ? "Lead Developer" : "Supervisor Kreatif",
        phone: `08120000${i + 1}00`,
        email: e.mentors[i].email,
        notes: `${DEMO_PREFIX} Pembimbing DUDI demo.`,
      },
      update: {
        companyId: e.companies[i].id,
        position: i === 0 ? "Lead Developer" : "Supervisor Kreatif",
        notes: `${DEMO_PREFIX} Pembimbing DUDI demo.`,
        isActive: true,
      },
    });
  }

  for (let i = 0; i < e.placements.length; i++) {
    const placement = e.placements[i];
    const departmentId = placement.student.classRoom?.departmentId || null;
    await tx.placement.update({
      where: { id: placement.id },
      data: {
        pklPeriodId: period.id,
        departmentId,
        source: "DEMO_SEED",
        notes: `${DEMO_PREFIX} Placement PKL demo terintegrasi.`,
        readinessCheckedAt: localDateTime(localDateOnly(-30), "10:00"),
        activatedAt: localDateTime(localDateOnly(-29), "08:00"),
      },
    });
    const exists = await tx.pklPlacementEvent.findFirst({ where: { placementId: placement.id, eventType: "ACTIVATED" } });
    if (!exists) {
      await tx.pklPlacementEvent.create({
        data: {
          schoolId: e.school.id,
          placementId: placement.id,
          eventType: "ACTIVATED",
          actorId: e.teachers[0].id,
          reason: `${DEMO_PREFIX} Aktivasi placement demo.`,
          snapshotAfter: { demo: true, status: "ACTIVE" },
        },
      });
    }
    const logs = await tx.attendanceLog.findMany({ where: { placementId: placement.id } });
    for (const log of logs) {
      await tx.attendanceLog.update({
        where: { id: log.id },
        data: {
          geofenceStatus: log.distanceMeters != null && log.distanceMeters > 150 ? "OUTSIDE" : "INSIDE",
          scheduleStatus: log.type === "CHECK_IN" && i === 1 ? "LATE" : "ON_TIME",
          evidenceUrl: null,
        },
      });
    }
    const journals = await tx.dailyJournal.findMany({ where: { placementId: placement.id } });
    for (const journal of journals) {
      await tx.dailyJournal.update({
        where: { id: journal.id },
        data: {
          dateOnly: localDateOnly(journal.date < new Date() ? -1 : 0),
          competencies: i % 2 === 0 ? "Komunikasi kerja; Dokumentasi; Implementasi teknis" : "Kolaborasi; Analisis masalah; Pelaporan",
          reflection: `${DEMO_PREFIX} Saya memahami pentingnya dokumentasi dan koordinasi di lingkungan industri.`,
          submittedAt: journal.status === "DRAFT" ? null : journal.date,
          teacherReviewStatus: journal.status === "APPROVED" ? "APPROVED" : journal.status === "REVISION" ? "REVISION" : "PENDING",
          teacherFeedback: journal.feedback,
          teacherScore: journal.score,
          teacherReviewedAt: journal.approvedAt,
          teacherReviewedById: journal.approvedById,
        },
      });
    }
  }
}

async function ensureViolation(tx, e) {
  const student = e.students[0];
  let violation = await tx.studentViolation.findFirst({
    where: { schoolId: e.school.id, studentId: student.id, title: `${DEMO_PREFIX} Keterlambatan berulang` },
  });
  const data = {
    schoolId: e.school.id,
    studentId: student.id,
    category: "Kedisiplinan",
    title: `${DEMO_PREFIX} Keterlambatan berulang`,
    description: `${DEMO_PREFIX} Siswa terlambat beberapa kali dan perlu pembinaan ringan.`,
    severity: "HIGH",
    points: 15,
    incidentAt: localDateTime(localDateOnly(-1), "07:20"),
    location: "Gerbang sekolah",
    status: "IN_REVIEW",
    reportedById: e.teachers[0].id,
    handledById: e.teachers[2].id,
    actionTaken: "Pembinaan awal dan koordinasi wali kelas.",
  };
  violation = violation
    ? await tx.studentViolation.update({ where: { id: violation.id }, data })
    : await tx.studentViolation.create({ data });

  let coaching = await tx.studentCoaching.findFirst({
    where: { schoolId: e.school.id, studentId: e.students[1].id, topic: `${DEMO_PREFIX} Pembinaan kedisiplinan` },
  });
  const coachingData = {
    schoolId: e.school.id,
    studentId: e.students[1].id,
    type: "COACHING",
    topic: `${DEMO_PREFIX} Pembinaan kedisiplinan`,
    summary: `${DEMO_PREFIX} Diskusi kebiasaan hadir tepat waktu dan target perbaikan satu minggu.`,
    attendees: "Siswa, wali kelas, guru BK/pembina",
    agreement: "Datang sebelum 06.50 dan melapor bila ada kendala.",
    nextAction: "Monitoring kehadiran satu minggu.",
    nextReviewAt: localDateTime(localDateOnly(7), "10:00"),
    status: "IN_PROGRESS",
    recordedById: e.teachers[2].id,
    assignedToId: e.teachers[0].id,
  };
  coaching = coaching
    ? await tx.studentCoaching.update({ where: { id: coaching.id }, data: coachingData })
    : await tx.studentCoaching.create({ data: coachingData });

  let permit = await tx.studentPermit.findFirst({
    where: { schoolId: e.school.id, studentId: e.students[3].id, reason: `${DEMO_PREFIX} Mengikuti kegiatan lomba sekolah.` },
  });
  const permitData = {
    schoolId: e.school.id,
    studentId: e.students[3].id,
    type: "DISPENSATION",
    reason: `${DEMO_PREFIX} Mengikuti kegiatan lomba sekolah.`,
    destination: "Gedung kegiatan kabupaten",
    startAt: localDateTime(localDateOnly(), "09:00"),
    endAt: localDateTime(localDateOnly(), "14:00"),
    status: "APPROVED",
    recordedById: e.teachers[0].id,
    approvedById: e.teachers[2].id,
    approvalNote: `${DEMO_PREFIX} Dispensasi demo disetujui.`,
  };
  permit = permit
    ? await tx.studentPermit.update({ where: { id: permit.id }, data: permitData })
    : await tx.studentPermit.create({ data: permitData });

  let achievement = await tx.studentAchievement.findFirst({
    where: { schoolId: e.school.id, studentId: e.students[4].id, title: `${DEMO_PREFIX} Juara Lomba Produk Digital` },
  });
  const achData = {
    schoolId: e.school.id,
    studentId: e.students[4].id,
    category: "Teknologi",
    title: `${DEMO_PREFIX} Juara Lomba Produk Digital`,
    level: "REGENCY",
    award: "Juara 2",
    organizer: "Forum Pendidikan Demo",
    achievementDate: localDateTime(localDateOnly(-10), "10:00"),
    notes: `${DEMO_PREFIX} Prestasi sintetis untuk demonstrasi Kesiswaan.`,
    recordedById: e.teachers[2].id,
  };
  achievement = achievement
    ? await tx.studentAchievement.update({ where: { id: achievement.id }, data: achData })
    : await tx.studentAchievement.create({ data: achData });

  const follow = await tx.schoolFollowUpCase.upsert({
    where: {
      schoolId_sourceType_sourceKey: {
        schoolId: e.school.id,
        sourceType: "STUDENT_AFFAIRS",
        sourceKey: "demo-smkn12:violation:late-repeat",
      },
    },
    create: {
      schoolId: e.school.id,
      sourceType: "STUDENT_AFFAIRS",
      sourceKey: "demo-smkn12:violation:late-repeat",
      sourceUrl: "/school/student-affairs",
      title: `${DEMO_PREFIX} Tindak lanjut kedisiplinan`,
      description: `${DEMO_PREFIX} Perlu monitoring hasil pembinaan dan kehadiran siswa.`,
      severity: "HIGH",
      status: "IN_PROGRESS",
      subjectStudentId: student.id,
      assignedToId: e.teachers[2].id,
      createdById: e.teachers[0].id,
      dueAt: localDateTime(localDateOnly(3), "15:00"),
      metadata: { demo: true, violationId: violation.id, coachingId: coaching.id },
    },
    update: {
      status: "IN_PROGRESS",
      assignedToId: e.teachers[2].id,
      dueAt: localDateTime(localDateOnly(3), "15:00"),
      metadata: { demo: true, violationId: violation.id, coachingId: coaching.id },
    },
  });
  const event = await tx.schoolFollowUpEvent.findFirst({ where: { caseId: follow.id, type: "COMMENT" } });
  if (!event) {
    await tx.schoolFollowUpEvent.create({
      data: {
        caseId: follow.id,
        actorId: e.teachers[2].id,
        type: "COMMENT",
        note: `${DEMO_PREFIX} Wali kelas sudah melakukan pembinaan awal.`,
        metadata: { demo: true },
      },
    });
  }
}

async function seedDutyReports(tx, e) {
  const note = `${DEMO_PREFIX} Teaching Session terpantau. Satu delegasi tugas guru dan dua siswa terlambat sudah ditindaklanjuti.`;
  const existing = await tx.dutyTeacherReport.findFirst({ where: { schoolId: e.school.id, dutyTeacherId: e.teachers[0].id, notes: note } });
  if (!existing) {
    await tx.dutyTeacherReport.create({
      data: {
        schoolId: e.school.id,
        dutyTeacherId: e.teachers[0].id,
        date: new Date(),
        lateStudentsCount: 2,
        dispensationsCount: 1,
        notes: note,
      },
    });
  }
}

async function status(tx) {
  const e = await getDemoEntities(tx);
  const userIds = e.users.map((u) => u.id);
  const studentIds = e.students.map((u) => u.id);
  const courseIds = e.courses.map((c) => c.id);
  const placementIds = e.placements.map((p) => p.id);
  const [
    globalAttendance,
    attendanceEvents,
    activities,
    activityRecords,
    schedules,
    sessions,
    engagement,
    sessionEvents,
    pklPeriods,
    pklEvents,
    mentorProfiles,
    companyLinks,
    capacities,
    workSchedules,
    violations,
    achievements,
    coachings,
    permits,
    followUps,
  ] = await Promise.all([
    tx.schoolDailyAttendance.count({ where: { schoolId: e.school.id, studentId: { in: studentIds } } }),
    tx.studentAttendanceEvent.count({ where: { schoolId: e.school.id, studentId: { in: studentIds }, source: "DEMO_SEED" } }),
    tx.attendanceActivity.count({ where: { schoolId: e.school.id, code: { startsWith: "DEMO-SMKN12-" } } }),
    tx.attendanceActivityRecord.count({ where: { studentId: { in: studentIds }, activity: { code: { startsWith: "DEMO-SMKN12-" } } } }),
    tx.lmsTeachingSchedule.count({ where: { courseId: { in: courseIds } } }),
    tx.lmsTeachingSession.count({ where: { courseId: { in: courseIds } } }),
    tx.lmsEngagementScore.count({ where: { studentId: { in: studentIds }, session: { courseId: { in: courseIds } } } }),
    tx.lmsTeachingSessionEvent.count({ where: { session: { courseId: { in: courseIds } } } }),
    tx.pklPeriod.count({ where: { schoolId: e.school.id, name: { startsWith: DEMO_PREFIX } } }),
    tx.pklPlacementEvent.count({ where: { schoolId: e.school.id, placementId: { in: placementIds } } }),
    tx.dudiMentorProfile.count({ where: { schoolId: e.school.id, userId: { in: userIds } } }),
    tx.companyDepartment.count({ where: { schoolId: e.school.id, companyId: { in: e.companies.map((c) => c.id) } } }),
    tx.pklCompanyCapacity.count({ where: { schoolId: e.school.id, companyId: { in: e.companies.map((c) => c.id) } } }),
    tx.pklWorkSchedule.count({ where: { schoolId: e.school.id, companyId: { in: e.companies.map((c) => c.id) } } }),
    tx.studentViolation.count({ where: { schoolId: e.school.id, studentId: { in: studentIds }, title: { startsWith: DEMO_PREFIX } } }),
    tx.studentAchievement.count({ where: { schoolId: e.school.id, studentId: { in: studentIds }, title: { startsWith: DEMO_PREFIX } } }),
    tx.studentCoaching.count({ where: { schoolId: e.school.id, studentId: { in: studentIds }, topic: { startsWith: DEMO_PREFIX } } }),
    tx.studentPermit.count({ where: { schoolId: e.school.id, studentId: { in: studentIds }, reason: { startsWith: DEMO_PREFIX } } }),
    tx.schoolFollowUpCase.count({ where: { schoolId: e.school.id, sourceKey: { startsWith: "demo-smkn12:" } } }),
  ]);
  return {
    school: e.school.name,
    modernDemo: {
      globalAttendance,
      attendanceEvents,
      activities,
      activityRecords,
      schedules,
      sessions,
      engagement,
      sessionEvents,
      pklPeriods,
      pklEvents,
      mentorProfiles,
      companyLinks,
      capacities,
      workSchedules,
      violations,
      achievements,
      coachings,
      permits,
      followUps,
    },
  };
}

async function seedModern(tx) {
  const e = await ensureDemoReady(tx);
  await ensureStaffAssignments(tx, e);
  await seedGlobalAttendance(tx, e);
  await seedHabituation(tx, e);
  await seedTeachingSessions(tx, e);
  await seedPklGen2(tx, e);
  await ensureViolation(tx, e);
  await seedDutyReports(tx, e);
  return status(tx);
}

async function cleanupModern(tx) {
  const e = await getDemoEntities(tx);
  const studentIds = e.students.map((u) => u.id);
  const teacherIds = e.teachers.map((u) => u.id);
  const courseIds = e.courses.map((c) => c.id);
  const companyIds = e.companies.map((c) => c.id);

  await tx.schoolFollowUpCase.deleteMany({ where: { schoolId: e.school.id, sourceKey: { startsWith: "demo-smkn12:" } } });
  await tx.studentPermit.deleteMany({ where: { schoolId: e.school.id, studentId: { in: studentIds }, reason: { startsWith: DEMO_PREFIX } } });
  await tx.studentCoaching.deleteMany({ where: { schoolId: e.school.id, studentId: { in: studentIds }, topic: { startsWith: DEMO_PREFIX } } });
  await tx.studentAchievement.deleteMany({ where: { schoolId: e.school.id, studentId: { in: studentIds }, title: { startsWith: DEMO_PREFIX } } });
  await tx.studentViolation.deleteMany({ where: { schoolId: e.school.id, studentId: { in: studentIds }, title: { startsWith: DEMO_PREFIX } } });
  await tx.attendanceActivity.deleteMany({ where: { schoolId: e.school.id, code: { startsWith: "DEMO-SMKN12-" } } });
  await tx.studentAttendanceEvent.deleteMany({ where: { schoolId: e.school.id, studentId: { in: studentIds }, source: "DEMO_SEED" } });
  await tx.schoolDailyAttendance.deleteMany({ where: { schoolId: e.school.id, studentId: { in: studentIds } } });
  await tx.lmsTeachingSession.deleteMany({ where: { courseId: { in: courseIds } } });
  await tx.lmsTeachingSchedule.deleteMany({ where: { courseId: { in: courseIds } } });
  await tx.pklPlacementEvent.deleteMany({ where: { schoolId: e.school.id, placementId: { in: e.placements.map((p) => p.id) } } });
  await tx.companyDepartment.deleteMany({ where: { schoolId: e.school.id, companyId: { in: companyIds } } });
  await tx.pklPeriod.deleteMany({ where: { schoolId: e.school.id, name: { startsWith: DEMO_PREFIX } } });
  await tx.dudiMentorProfile.deleteMany({ where: { schoolId: e.school.id, userId: { in: e.mentors.map((m) => m.id) } } });
  await tx.schoolStaffAssignment.deleteMany({ where: { schoolId: e.school.id, teacherId: { in: teacherIds } } });
  await tx.wakasekAssignment.deleteMany({ where: { schoolId: e.school.id, teacherId: { in: teacherIds } } });
  await tx.dutyTeacherReport.deleteMany({ where: { schoolId: e.school.id, dutyTeacherId: { in: teacherIds }, notes: { startsWith: DEMO_PREFIX } } });

  return status(tx);
}

async function runTransactional(fn, { rollback = false } = {}) {
  const sentinel = new Error("__DEMO_MODERN_DRY_RUN__");
  let preview;
  try {
    return await prisma.$transaction(async (tx) => {
      preview = await fn(tx);
      if (rollback) throw sentinel;
      return preview;
    }, { maxWait: 10000, timeout: 120000 });
  } catch (error) {
    if (error === sentinel || error?.message === sentinel.message) return preview;
    throw error;
  }
}

async function main() {
  if (mode === "status") {
    console.log(JSON.stringify(await status(prisma), null, 2));
    return;
  }
  if (mode === "seed") {
    const result = await runTransactional(seedModern, { rollback: dryRun });
    console.log(JSON.stringify({ mode: dryRun ? "seed-dry-run" : "seed", persisted: !dryRun, ...result }, null, 2));
    return;
  }
  if (mode === "cleanup") {
    if (!dryRun && confirmation !== CLEANUP_CONFIRMATION) {
      throw new Error(`Cleanup requires --confirm=${CLEANUP_CONFIRMATION}`);
    }
    const result = await runTransactional(cleanupModern, { rollback: dryRun });
    console.log(JSON.stringify({ mode: dryRun ? "cleanup-dry-run" : "cleanup", persisted: !dryRun, ...result }, null, 2));
    return;
  }
  throw new Error("Usage: node scripts/school-os-demo-smkn12-modern.mjs status|seed [--dry-run]|cleanup --dry-run|cleanup --confirm=DELETE-SMKN12-DEMO-SCENARIO");
}

main()
  .catch((error) => {
    console.error(`DEMO_MODERN_ERROR: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
