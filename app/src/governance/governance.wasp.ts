import { action, page, query, route, type Spec } from "@wasp.sh/spec";
import { WakasekDashboardPage } from "./pages/WakasekDashboardPage" with { type: "ref" };
import { GuruPiketPage } from "./pages/GuruPiketPage" with { type: "ref" };
import { WaliKelasPage } from "./pages/WaliKelasPage" with { type: "ref" };
import { OrganizationAssignmentCenterPage } from "./pages/OrganizationAssignmentCenterPage" with { type: "ref" };

import {
  getWakaSupervisionData,
  getDutyTeacherReports,
  createDutyTeacherReport,
  getHomeroomDashboardData,
} from "./operations" with { type: "ref" };
import { getWakasekDashboardData } from "./wakasekOperations" with { type: "ref" };
import {
  getSchoolOrganizationData,
  saveSchoolStaffAssignment,
  archiveSchoolStaffAssignment,
  setHomeroomTeacherAssignment,
  setWakasekOrganizationAssignment,
} from "./organizationOperations" with { type: "ref" };

export const governanceSpec: Spec = [
  // Queries
  query(getSchoolOrganizationData, {
    entities: [
      "School",
      "User",
      "TeacherProfile",
      "WakasekAssignment",
      "SchoolStaffAssignment",
      "AcademicYear",
      "ClassRoom",
      "Department",
    ],
  }),
  query(getWakasekDashboardData, {
    entities: [
      "WakasekAssignment",
      "School",
      "User",
      "TeacherProfile",
      "AcademicYear",
      "LmsCourse",
      "LmsAgenda",
      "ClassRoom",
      "Department",
      "SchoolDailyAttendance",
      "Company",
      "Placement",
      "SchoolSite",
      "SchoolSiteContent",
      "FacilityRoom",
      "AssetItem",
      "AssetMaintenance",
    ],
  }),
  query(getWakaSupervisionData, {
    entities: [
      "LmsCourse",
      "User",
      "ClassRoom",
      "LmsAgenda",
      "LmsAgendaPhoto",
      "TeacherProfile",
      "WakasekAssignment",
    ],
  }),
  query(getDutyTeacherReports, {
    entities: ["DutyTeacherReport", "User"],
  }),
  query(getHomeroomDashboardData, {
    entities: [
      "ClassRoom",
      "Department",
      "AcademicYear",
      "User",
      "StudentProfile",
      "Placement",
      "Company",
      "AttendanceLog",
      "DailyJournal",
    ],
  }),

  // Actions
  action(saveSchoolStaffAssignment, {
    entities: ["SchoolStaffAssignment", "School", "User", "AcademicYear", "Department"],
  }),
  action(archiveSchoolStaffAssignment, {
    entities: ["SchoolStaffAssignment"],
  }),
  action(setHomeroomTeacherAssignment, {
    entities: ["ClassRoom", "User"],
  }),
  action(setWakasekOrganizationAssignment, {
    entities: ["WakasekAssignment", "User", "TeacherProfile"],
  }),
  action(createDutyTeacherReport, {
    entities: ["DutyTeacherReport", "SchoolStaffAssignment", "AcademicYear"],
  }),

  // Routes
  route(
    "OrganizationAssignmentCenterRoute",
    "/school/governance/organization",
    page(OrganizationAssignmentCenterPage, { authRequired: true })
  ),
  route(
    "WakasekDashboardRoute",
    "/school/governance/wakasek",
    page(WakasekDashboardPage, { authRequired: true })
  ),
  route(
    "WakaKurikulumRoute",
    "/school/governance/waka",
    page(WakasekDashboardPage, { authRequired: true })
  ),
  route(
    "GuruPiketRoute",
    "/school/governance/piket",
    page(GuruPiketPage, { authRequired: true })
  ),
  route(
    "WaliKelasRoute",
    "/school/governance/walikelas",
    page(WaliKelasPage, { authRequired: true })
  ),
];
