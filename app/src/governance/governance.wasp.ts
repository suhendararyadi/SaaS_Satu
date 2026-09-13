import { action, page, query, route, type Spec } from "@wasp.sh/spec";
import { WakasekDashboardPage } from "./pages/WakasekDashboardPage" with { type: "ref" };
import { GuruPiketPage } from "./pages/GuruPiketPage" with { type: "ref" };
import { WaliKelasPage } from "./pages/WaliKelasPage" with { type: "ref" };

import {
  getWakaSupervisionData,
  getDutyTeacherReports,
  createDutyTeacherReport,
  getHomeroomDashboardData,
} from "./operations" with { type: "ref" };
import { getWakasekDashboardData } from "./wakasekOperations" with { type: "ref" };

export const governanceSpec: Spec = [
  // Queries
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
  action(createDutyTeacherReport, {
    entities: ["DutyTeacherReport"],
  }),

  // Routes
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
