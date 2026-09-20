import { action, page, query, route, type Spec } from "@wasp.sh/spec";
import { CompaniesPage } from "./pages/CompaniesPage" with { type: "ref" };
import { PklFoundationPage } from "./pages/PklFoundationPage" with { type: "ref" };
import { PklDashboardPage } from "./pages/PklDashboardPage" with { type: "ref" };
import { PlacementsPage } from "./pages/PlacementsPage" with { type: "ref" };
import { AttendancePage } from "./pages/AttendancePage" with { type: "ref" };
import { JournalsPage } from "./pages/JournalsPage" with { type: "ref" };
import { MonitoringEwsPage } from "./pages/MonitoringEwsPage" with { type: "ref" };
import { PklReportsPage } from "./pages/PklReportsPage" with { type: "ref" };
import { PklImportPage } from "./pages/PklImportPage" with { type: "ref" };

import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  getPlacements,
  createPlacement,
  updatePlacement,
  recordAttendance,
  getAttendanceLogs,
  createDailyJournal,
  getDailyJournals,
  reviewDailyJournal,
  getPklEwsAlerts,
} from "./operations" with { type: "ref" };

import {
  getPklPeriods,
  createPklPeriod,
  updatePklPeriod,
  deletePklPeriod,
  getDudiMentors,
  createDudiMentor,
  updateDudiMentor,
  deleteDudiMentor,
  setCompanyDepartments,
  getPklCompanyCapacities,
  savePklCompanyCapacity,
  deletePklCompanyCapacity,
} from "./foundationOperations" with { type: "ref" };

import {
  getPlacementWorkspace,
  createPlacementsBulk,
  getPlacementReadiness,
  activatePlacement,
  updatePlacementGen2,
  transferPlacement,
  finalizePlacement,
  getPlacementHistory,
  getPklWorkSchedules,
  savePklWorkSchedule,
  deletePklWorkSchedule,
  getPklEvidenceUploadStatus,
  createPklEvidenceUploadUrl,
  getPklEvidenceSignedUrl,
  recordAttendanceGen2,
  recordAttendanceException,
  setAttendanceDayStatus,
  correctAttendance,
  saveDailyJournalGen2,
  reviewDailyJournalGen2,
  getPklDashboard,
  getPklReportData,
  previewPklImport,
  commitPklImport,
} from "./gen2Operations" with { type: "ref" };

export const pklSpec: Spec = [
  query(getCompanies, {
    entities: [
      "Company", "Placement", "User", "StudentProfile", "CompanyDepartment",
      "Department", "DudiMentorProfile", "PklCompanyCapacity", "PklPeriod",
    ],
  }),
  query(getPklPeriods, {
    entities: ["PklPeriod", "AcademicYear", "PklCompanyCapacity", "Placement", "Company", "Department"],
  }),
  query(getDudiMentors, {
    entities: ["DudiMentorProfile", "User", "Company", "Placement"],
  }),
  query(getPklCompanyCapacities, {
    entities: ["PklCompanyCapacity", "PklPeriod", "Company", "Department"],
  }),

  query(getPlacementWorkspace, {
    entities: [
      "PklPeriod", "Department", "Company", "CompanyDepartment", "PklCompanyCapacity",
      "User", "TeacherProfile", "StudentProfile", "ClassRoom", "DudiMentorProfile",
      "Placement", "AttendanceLog", "DailyJournal",
    ],
  }),
  query(getPlacementReadiness, {
    entities: [
      "Placement", "PklPeriod", "Company", "CompanyDepartment", "PklCompanyCapacity",
      "Department", "User", "DudiMentorProfile", "ClassRoom",
    ],
  }),
  query(getPlacementHistory, { entities: ["Placement", "PklPlacementEvent"] }),
  query(getPklWorkSchedules, { entities: ["PklWorkSchedule", "PklPeriod", "Company"] }),
  query(getPklDashboard, {
    entities: ["Placement", "User", "Company", "PklPeriod", "AttendanceLog", "DailyJournal", "ClassRoom"],
  }),
  query(getPklReportData, {
    entities: [
      "School", "Placement", "User", "StudentProfile", "ClassRoom", "Company",
      "PklPeriod", "Department", "AttendanceLog", "DailyJournal",
    ],
  }),
  query(getPklEvidenceUploadStatus),
  query(getPklEvidenceSignedUrl, { entities: ["AttendanceLog", "DailyJournal", "Placement"] }),

  query(getPlacements, {
    entities: [
      "Placement", "User", "Company", "PklPeriod", "AttendanceLog",
      "DailyJournal", "StudentProfile", "TeacherProfile", "ClassRoom",
    ],
  }),
  query(getAttendanceLogs, { entities: ["AttendanceLog", "Placement", "User", "Company"] }),
  query(getDailyJournals, { entities: ["DailyJournal", "Placement", "User", "Company"] }),
  query(getPklEwsAlerts, {
    entities: [
      "Placement", "User", "Company", "AttendanceLog", "DailyJournal", "ClassRoom",
      "PklPeriod", "PklCompanyCapacity", "DudiMentorProfile",
    ],
  }),

  action(createCompany, { entities: ["Company"] }),
  action(updateCompany, { entities: ["Company"] }),
  action(deleteCompany, { entities: ["Company", "Placement", "DudiMentorProfile", "PklCompanyCapacity"] }),
  action(createPklPeriod, { entities: ["PklPeriod", "AcademicYear"] }),
  action(updatePklPeriod, { entities: ["PklPeriod", "AcademicYear"] }),
  action(deletePklPeriod, { entities: ["PklPeriod", "Placement", "PklCompanyCapacity"] }),
  action(createDudiMentor, { entities: ["DudiMentorProfile", "User", "Company"] }),
  action(updateDudiMentor, { entities: ["DudiMentorProfile", "User", "Company"] }),
  action(deleteDudiMentor, { entities: ["DudiMentorProfile", "User", "Placement"] }),
  action(setCompanyDepartments, { entities: ["CompanyDepartment", "Company", "Department", "PklCompanyCapacity"] }),
  action(savePklCompanyCapacity, { entities: ["PklCompanyCapacity", "CompanyDepartment", "PklPeriod", "Company", "Department"] }),
  action(deletePklCompanyCapacity, { entities: ["PklCompanyCapacity"] }),

  action(createPlacementsBulk, {
    entities: [
      "Placement", "PklPlacementEvent", "PklPeriod", "Company", "CompanyDepartment",
      "PklCompanyCapacity", "Department", "User", "ClassRoom", "StudentProfile", "DudiMentorProfile",
    ],
  }),
  action(activatePlacement, {
    entities: [
      "Placement", "PklPlacementEvent", "PklPeriod", "Company", "CompanyDepartment",
      "PklCompanyCapacity", "Department", "User", "DudiMentorProfile", "ClassRoom",
    ],
  }),
  action(updatePlacementGen2, {
    entities: ["Placement", "PklPlacementEvent", "PklPeriod", "User", "DudiMentorProfile"],
  }),
  action(transferPlacement, {
    entities: [
      "Placement", "PklPlacementEvent", "PklPeriod", "Company", "CompanyDepartment",
      "PklCompanyCapacity", "User", "DudiMentorProfile", "ClassRoom",
    ],
  }),
  action(finalizePlacement, { entities: ["Placement", "PklPlacementEvent"] }),
  action(savePklWorkSchedule, { entities: ["PklWorkSchedule", "PklPeriod", "Company"] }),
  action(deletePklWorkSchedule, { entities: ["PklWorkSchedule"] }),
  action(createPklEvidenceUploadUrl, { entities: ["User"] }),
  action(recordAttendanceGen2, {
    entities: ["AttendanceLog", "Placement", "Company", "PklPeriod", "PklWorkSchedule"],
  }),
  action(recordAttendanceException, { entities: ["AttendanceLog", "Placement"] }),
  action(setAttendanceDayStatus, { entities: ["AttendanceLog", "Placement"] }),
  action(correctAttendance, { entities: ["AttendanceLog", "Placement"] }),
  action(saveDailyJournalGen2, {
    entities: ["DailyJournal", "DailyJournalRevision", "Placement"],
  }),
  action(reviewDailyJournalGen2, { entities: ["DailyJournal", "Placement"] }),
  action(previewPklImport, {
    entities: [
      "PklPeriod", "Department", "Company", "User", "TeacherProfile",
      "DudiMentorProfile", "StudentProfile", "ClassRoom",
    ],
  }),
  action(commitPklImport, {
    entities: [
      "PklPeriod", "Department", "Company", "CompanyDepartment", "PklCompanyCapacity",
      "User", "TeacherProfile", "DudiMentorProfile", "StudentProfile", "ClassRoom",
      "Placement", "PklPlacementEvent",
    ],
  }),

  // Legacy actions retained for backward compatibility until all historical clients are gone.
  action(createPlacement, { entities: ["Placement", "Company", "User"] }),
  action(updatePlacement, { entities: ["Placement"] }),
  action(recordAttendance, { entities: ["AttendanceLog", "Placement", "Company"] }),
  action(createDailyJournal, { entities: ["DailyJournal", "Placement"] }),
  action(reviewDailyJournal, { entities: ["DailyJournal"] }),

  route("PklDashboardRoute", "/school/pkl", page(PklDashboardPage, { authRequired: true })),
  route("PklFoundationRoute", "/school/pkl/foundation", page(PklFoundationPage, { authRequired: true })),
  route("CompaniesRoute", "/school/pkl/companies", page(CompaniesPage, { authRequired: true })),
  route("PlacementsRoute", "/school/pkl/placements", page(PlacementsPage, { authRequired: true })),
  route("AttendanceRoute", "/school/pkl/attendance", page(AttendancePage, { authRequired: true })),
  route("JournalsRoute", "/school/pkl/journals", page(JournalsPage, { authRequired: true })),
  route("MonitoringEwsRoute", "/school/pkl/monitoring", page(MonitoringEwsPage, { authRequired: true })),
  route("PklReportsRoute", "/school/pkl/reports", page(PklReportsPage, { authRequired: true })),
  route("PklImportRoute", "/school/pkl/import", page(PklImportPage, { authRequired: true })),
];
