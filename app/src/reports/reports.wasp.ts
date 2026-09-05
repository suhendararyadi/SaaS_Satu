import { page, query, route, type Spec } from "@wasp.sh/spec";
import { ReportsPage } from "./pages/ReportsPage" with { type: "ref" };

import {
  exportPklAttendanceReport,
  exportLmsGradesReport,
} from "./operations" with { type: "ref" };

export const reportsSpec: Spec = [
  // Queries
  query(exportPklAttendanceReport, {
    entities: [
      "School",
      "Placement",
      "User",
      "Company",
      "StudentProfile",
      "TeacherProfile",
      "ClassRoom",
      "AttendanceLog",
      "DailyJournal",
    ],
  }),
  query(exportLmsGradesReport, {
    entities: [
      "School",
      "LmsCourse",
      "ClassRoom",
      "Department",
      "AcademicYear",
      "User",
      "StudentProfile",
      "TeacherProfile",
      "LmsAssignment",
      "LmsSubmission",
      "LmsAssessment",
      "LmsAssessmentResult",
      "LmsAttendanceSession",
      "LmsAttendanceRecord",
    ],
  }),

  // Routes
  route("ReportsRoute", "/school/reports", page(ReportsPage, { authRequired: true })),
];
