import { page, query, route, type Spec } from "@wasp.sh/spec";
import { ReportsPage } from "./pages/ReportsPage" with { type: "ref" };

import {
  exportPklAttendanceReport,
  exportLmsGradesReport,
  getClassRoomAttendanceReport,
  getActiveStudentCertificateData,
  getSchoolReportContext,
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
  query(getClassRoomAttendanceReport, {
    entities: [
      "School",
      "ClassRoom",
      "Department",
      "AcademicYear",
      "User",
      "StudentProfile",
      "TeacherProfile",
      "SchoolDailyAttendance",
    ],
  }),
  query(getActiveStudentCertificateData, {
    entities: [
      "School",
      "User",
      "StudentProfile",
      "ClassRoom",
      "Department",
      "AcademicYear",
    ],
  }),
  query(getSchoolReportContext, {
    entities: ["School", "ClassRoom", "Department", "User", "StudentProfile"],
  }),

  // Routes
  route("ReportsRoute", "/school/reports", page(ReportsPage, { authRequired: true })),
];
