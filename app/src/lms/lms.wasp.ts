import { action, api, page, query, route, type Spec } from "@wasp.sh/spec";
import { LmsCoursesPage } from "./pages/LmsCoursesPage" with { type: "ref" };
import { LmsCourseDetailPage } from "./pages/LmsCourseDetailPage" with { type: "ref" };
import { LmsTeachingWorkspacePage } from "./pages/LmsTeachingWorkspacePage" with { type: "ref" };
import { LmsCourseTeachingPage } from "./pages/LmsCourseTeachingPage" with { type: "ref" };
import { LmsTeachingAuditPage } from "./pages/LmsTeachingAuditPage" with { type: "ref" };
import { teachingEvidenceFileApi, teachingEvidenceUploadApi } from "./teachingEvidenceApi" with { type: "ref" };

import {
  getLmsCourses,
  getLmsCourseDetail,
  getCourseAttendanceSeed,
  createLmsCourse,
  bulkCreateLmsCourses,
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

import {
  getTeachingWorkspace,
  getCourseTeachingData,
  upsertTeachingSchedule,
  deactivateTeachingSchedule,
  startTeachingSession,
  delegateTeachingAbsence,
  finishTeachingSession,
  saveTeachingEngagementScores,
  getTeachingDutyQueue,
  markTeachingDelegationDelivered,
  getTeachingAudit,
} from "./teachingOperations" with { type: "ref" };

const teachingEntities = [
  "School",
  "User",
  "TeacherProfile",
  "AcademicYear",
  "ClassRoom",
  "Department",
  "LmsCourse",
  "LmsTeachingSchedule",
  "LmsTeachingSession",
  "LmsTeachingSessionEvent",
  "LmsEngagementScore",
  "LmsAgenda",
  "LmsAgendaPhoto",
  "LmsAttendanceSession",
  "LmsAttendanceRecord",
  "SchoolAttendancePolicy",
  "SchoolDailyAttendance",
  "StudentAttendanceEvent",
  "SchoolStaffAssignment",
  "WakasekAssignment",
] as const;

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
  query(getCourseAttendanceSeed, {
    entities: ["LmsCourse", "ClassRoom", "User", "SchoolDailyAttendance"],
  }),
  query(getTeachingWorkspace, { entities: [...teachingEntities] }),
  query(getCourseTeachingData, { entities: [...teachingEntities] }),
  query(getTeachingDutyQueue, { entities: [...teachingEntities] }),
  query(getTeachingAudit, { entities: [...teachingEntities] }),

  // Actions
  action(createLmsCourse, { entities: ["LmsCourse"] }),
  action(bulkCreateLmsCourses, { entities: ["LmsCourse"] }),
  action(deleteLmsCourse, { entities: ["LmsCourse"] }),
  action(createCourseAgenda, {
    entities: ["LmsAgenda", "LmsAgendaPhoto", "LmsCourse"],
  }),
  action(recordCourseAttendance, {
    entities: [
      "LmsAttendanceSession",
      "LmsAttendanceRecord",
      "LmsTeachingSession",
      "LmsTeachingSessionEvent",
      "LmsCourse",
      "StudentAttendanceEvent",
      "SchoolDailyAttendance",
      "User",
      "ClassRoom",
      "AcademicYear",
    ],
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
  action(upsertTeachingSchedule, { entities: [...teachingEntities] }),
  action(deactivateTeachingSchedule, { entities: [...teachingEntities] }),
  action(startTeachingSession, { entities: [...teachingEntities] }),
  action(delegateTeachingAbsence, { entities: [...teachingEntities] }),
  action(finishTeachingSession, { entities: [...teachingEntities] }),
  action(saveTeachingEngagementScores, { entities: [...teachingEntities] }),
  action(markTeachingDelegationDelivered, { entities: [...teachingEntities] }),

  api("POST", "/operations/lms-teaching-evidence-upload", teachingEvidenceUploadApi, { auth: true }),
  api("GET", "/operations/lms-teaching-evidence/:id/:kind", teachingEvidenceFileApi, {
    entities: ["LmsTeachingSession", "LmsCourse", "ClassRoom", "User", "SchoolStaffAssignment", "WakasekAssignment"],
    auth: true,
  }),

  // Routes
  route(
    "LmsTeachingWorkspaceRoute",
    "/school/lms/teaching",
    page(LmsTeachingWorkspacePage, { authRequired: true })
  ),
  route(
    "LmsTeachingAuditRoute",
    "/school/lms/teaching/audit",
    page(LmsTeachingAuditPage, { authRequired: true })
  ),
  route(
    "LmsCourseTeachingRoute",
    "/school/lms/courses/:id/teaching",
    page(LmsCourseTeachingPage, { authRequired: true })
  ),
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
