import { action, page, query, route, type Spec } from "@wasp.sh/spec";
import { WakaKurikulumPage } from "./pages/WakaKurikulumPage" with { type: "ref" };
import { GuruPiketPage } from "./pages/GuruPiketPage" with { type: "ref" };
import { WaliKelasPage } from "./pages/WaliKelasPage" with { type: "ref" };

import {
  getWakaSupervisionData,
  getDutyTeacherReports,
  createDutyTeacherReport,
  getHomeroomDashboardData,
} from "./operations" with { type: "ref" };

export const governanceSpec: Spec = [
  // Queries
  query(getWakaSupervisionData, {
    entities: [
      "LmsCourse",
      "User",
      "ClassRoom",
      "LmsAgenda",
      "LmsAgendaPhoto",
      "TeacherProfile",
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
    "WakaKurikulumRoute",
    "/school/governance/waka",
    page(WakaKurikulumPage, { authRequired: true })
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
