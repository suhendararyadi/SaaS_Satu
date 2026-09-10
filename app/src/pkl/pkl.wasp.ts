import { action, page, query, route, type Spec } from "@wasp.sh/spec";
import { CompaniesPage } from "./pages/CompaniesPage" with { type: "ref" };
import { PlacementsPage } from "./pages/PlacementsPage" with { type: "ref" };
import { AttendancePage } from "./pages/AttendancePage" with { type: "ref" };
import { JournalsPage } from "./pages/JournalsPage" with { type: "ref" };
import { MonitoringEwsPage } from "./pages/MonitoringEwsPage" with { type: "ref" };
import { EarlyWarningSystemPage } from "./pages/EarlyWarningSystemPage" with { type: "ref" };

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

export const pklSpec: Spec = [
  // Queries
  query(getCompanies, {
    entities: ["Company", "Placement", "User", "StudentProfile"],
  }),
  query(getPlacements, {
    entities: [
      "Placement",
      "User",
      "Company",
      "AttendanceLog",
      "DailyJournal",
      "StudentProfile",
      "TeacherProfile",
      "ClassRoom",
    ],
  }),
  query(getAttendanceLogs, {
    entities: ["AttendanceLog", "Placement", "User", "Company"],
  }),
  query(getDailyJournals, {
    entities: ["DailyJournal", "Placement", "User", "Company"],
  }),
  query(getPklEwsAlerts, {
    entities: [
      "Placement",
      "User",
      "Company",
      "AttendanceLog",
      "DailyJournal",
      "ClassRoom",
    ],
  }),

  // Actions
  action(createCompany, { entities: ["Company"] }),
  action(updateCompany, { entities: ["Company"] }),
  action(deleteCompany, { entities: ["Company", "Placement"] }),
  action(createPlacement, { entities: ["Placement", "Company", "User"] }),
  action(updatePlacement, { entities: ["Placement"] }),
  action(recordAttendance, { entities: ["AttendanceLog", "Placement", "Company"] }),
  action(createDailyJournal, { entities: ["DailyJournal", "Placement"] }),
  action(reviewDailyJournal, { entities: ["DailyJournal"] }),

  // Routes
  route(
    "CompaniesRoute",
    "/school/pkl/companies",
    page(CompaniesPage, { authRequired: true })
  ),
  route(
    "PlacementsRoute",
    "/school/pkl/placements",
    page(PlacementsPage, { authRequired: true })
  ),
  route(
    "AttendanceRoute",
    "/school/pkl/attendance",
    page(AttendancePage, { authRequired: true })
  ),
  route(
    "JournalsRoute",
    "/school/pkl/journals",
    page(JournalsPage, { authRequired: true })
  ),
  route(
    "MonitoringEwsRoute",
    "/school/pkl/monitoring",
    page(MonitoringEwsPage, { authRequired: true })
  ),
  route(
    "EarlyWarningSystemRoute",
    "/school/ews",
    page(EarlyWarningSystemPage, { authRequired: true })
  ),
];
