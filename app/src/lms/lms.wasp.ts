import { action, page, query, route, type Spec } from "@wasp.sh/spec";
import { LmsCoursesPage } from "./pages/LmsCoursesPage" with { type: "ref" };
import { LmsCourseDetailPage } from "./pages/LmsCourseDetailPage" with { type: "ref" };

import {
  getLmsCourses,
  getLmsCourseDetail,
  createLmsCourse,
  deleteLmsCourse,
  createCourseAgenda,
  recordCourseAttendance,
  createCourseMaterial,
  createCourseAssignment,
  submitAssignment,
  gradeSubmission,
  createCourseAssessment,
  addAssessmentQuestion,
  submitAssessmentAnswers,
} from "./operations" with { type: "ref" };

export const lmsSpec: Spec = [
  // Queries
  query(getLmsCourses, {
    entities: [
      "LmsCourse",
      "ClassRoom",
      "User",
      "AcademicYear",
      "LmsAgenda",
      "LmsMaterial",
      "LmsAssignment",
      "LmsAssessment",
      "LmsAttendanceSession",
    ],
  }),
  query(getLmsCourseDetail, {
    entities: [
      "LmsCourse",
      "ClassRoom",
      "User",
      "AcademicYear",
      "LmsAgenda",
      "LmsAgendaPhoto",
      "LmsMaterial",
      "LmsAssignment",
      "LmsSubmission",
      "LmsAssessment",
      "LmsAssessmentQuestion",
      "LmsAssessmentResult",
      "LmsAttendanceSession",
      "LmsAttendanceRecord",
      "Department",
      "StudentProfile",
      "TeacherProfile",
    ],
  }),

  // Actions
  action(createLmsCourse, { entities: ["LmsCourse"] }),
  action(deleteLmsCourse, { entities: ["LmsCourse"] }),
  action(createCourseAgenda, {
    entities: ["LmsAgenda", "LmsAgendaPhoto", "LmsCourse"],
  }),
  action(recordCourseAttendance, {
    entities: ["LmsAttendanceSession", "LmsAttendanceRecord", "LmsCourse"],
  }),
  action(createCourseMaterial, { entities: ["LmsMaterial"] }),
  action(createCourseAssignment, { entities: ["LmsAssignment"] }),
  action(submitAssignment, { entities: ["LmsSubmission", "LmsAssignment"] }),
  action(gradeSubmission, { entities: ["LmsSubmission"] }),
  action(createCourseAssessment, { entities: ["LmsAssessment"] }),
  action(addAssessmentQuestion, { entities: ["LmsAssessmentQuestion"] }),
  action(submitAssessmentAnswers, {
    entities: ["LmsAssessmentResult", "LmsAssessment", "LmsAssessmentQuestion"],
  }),

  // Routes
  route(
    "LmsCoursesRoute",
    "/school/lms/courses",
    page(LmsCoursesPage, { authRequired: true })
  ),
  route(
    "LmsCourseDetailRoute",
    "/school/lms/courses/:id",
    page(LmsCourseDetailPage, { authRequired: true })
  ),
];
