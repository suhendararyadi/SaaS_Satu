import { action, api, page, query, route, type Spec } from "@wasp.sh/spec";
import { SchoolDashboardPage } from "./pages/SchoolDashboardPage" with { type: "ref" };
import { DepartmentsPage } from "./pages/DepartmentsPage" with { type: "ref" };
import { AcademicYearsPage } from "./pages/AcademicYearsPage" with { type: "ref" };
import { ClassRoomsPage } from "./pages/ClassRoomsPage" with { type: "ref" };
import { TeachersPage } from "./pages/TeachersPage" with { type: "ref" };
import { TeacherDetailPage } from "./pages/TeacherDetailPage" with { type: "ref" };
import { TeacherEditPage } from "./pages/TeacherEditPage" with { type: "ref" };
import { StudentsPage } from "./pages/StudentsPage" with { type: "ref" };
import { DailyAttendancePage } from "./pages/DailyAttendancePage" with { type: "ref" };
import { StudentDetailPage } from "./pages/StudentDetailPage" with { type: "ref" };
import { StudentFormPage } from "./pages/StudentFormPage" with { type: "ref" };
import { CsvImportPage } from "./pages/CsvImportPage" with { type: "ref" };
import { AllSchoolsPage } from "./pages/AllSchoolsPage" with { type: "ref" };
import { SchoolSettingsPage } from "./pages/SchoolSettingsPage" with { type: "ref" };
import { WebsiteSchoolPage } from "./pages/WebsiteSchoolPage" with { type: "ref" };
import { SchoolWebsitePreviewPage } from "./pages/SchoolWebsitePreviewPage" with { type: "ref" };
import { FollowUpWorkflowPage } from "./pages/FollowUpWorkflowPage" with { type: "ref" };
import { SarprasInventoryPage } from "./pages/SarprasInventoryPage" with { type: "ref" };
import { StudentAffairsPage } from "./pages/StudentAffairsPage" with { type: "ref" };
import { NotificationCenterPage } from "./pages/NotificationCenterPage" with { type: "ref" };
import { EarlyWarningSystemPage } from "./pages/EarlyWarningSystemPage" with { type: "ref" };
import {
  PublicSchoolHomePage,
  PublicSchoolNewsIndexPage,
  PublicSchoolNewsDetailPage,
  PublicSchoolEventIndexPage,
  PublicSchoolAnnouncementIndexPage,
  PublicSchoolContentPage,
} from "./pages/PublicSchoolWebsitePages" with { type: "ref" };

import {
  getSchoolInfo,
  registerSchool,
  updateSchoolInfo,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getAcademicYears,
  createAcademicYear,
  setActiveAcademicYear,
  getClassRooms,
  createClassRoom,
  updateClassRoom,
  deleteClassRoom,
  getSchoolTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getSchoolStudents,
  deleteStudent,
  getAllSchools,
  switchActiveSchool,
  createSchoolByAdmin,
} from "./operations" with { type: "ref" };
import {
  getSchoolStudentDetail,
  createStudent,
  updateStudent,
  provisionStudentLogin,
  revokeStudentLogin,
} from "./studentOperations" with { type: "ref" };
import { getSchoolTeacherDetail, updateSchoolTeacherProfile } from "./teacherOperations" with { type: "ref" };
import {
  getStudentDashboardData,
  getTeacherDashboardData,
  getSchoolAdminDashboardData,
  getMentorDashboardData,
} from "./dashboardOperations" with { type: "ref" };
import {
  importStudentsFromCsv,
  importTeachersFromCsv,
  importCompaniesFromCsv,
} from "./import/operations" with { type: "ref" };
import {
  previewStudentsFromDapodik,
  importStudentsFromDapodik,
} from "./import/dapodikOperations" with { type: "ref" };
import {
  getSchoolWebsiteAdmin,
  initializeSchoolWebsite,
  updateSchoolWebsiteSettings,
  updateSchoolWebsiteLandingSections,
  publishSchoolWebsite,
  unpublishSchoolWebsite,
  saveSchoolWebsiteContent,
  setSchoolWebsiteContentStatus,
  deleteSchoolWebsiteContent,
  saveSchoolWebsiteNavItem,
  deleteSchoolWebsiteNavItem,
  saveSchoolWebsiteMedia,
  deleteSchoolWebsiteMedia,
  getPublicSchoolSite,
  getPublicSchoolContent,
  getSchoolWebsitePreview,
} from "./websiteOperations" with { type: "ref" };
import { schoolSiteSitemapApi } from "./websitePublicApi" with { type: "ref" };
import { getSchoolSpotlightSearch } from "./spotlightOperations" with { type: "ref" };
import {
  getDailySchoolAttendance,
  saveDailySchoolAttendance,
} from "./dailyAttendanceOperations" with { type: "ref" };
import { getDailyAttendanceReportData } from "./dailyAttendanceReportOperations" with { type: "ref" };
import {
  getFollowUpWorkflowData,
  syncFollowUpFindings,
  createManualFollowUpCase,
  updateFollowUpCase,
  addFollowUpComment,
  ensurePklEwsFollowUp,
} from "./followUpOperations" with { type: "ref" };
import {
  getSarprasInventoryData,
  saveFacilityRoom,
  saveAssetCategory,
  saveAssetItem,
  reportAssetMaintenance,
  updateAssetMaintenance,
  moveAssetItem,
} from "./sarprasOperations" with { type: "ref" };
import {
  getStudentAffairsData,
  createStudentViolation,
  updateStudentViolation,
  saveStudentAchievement,
  createStudentCoaching,
  updateStudentCoaching,
  createStudentPermit,
  updateStudentPermit,
} from "./studentAffairsOperations" with { type: "ref" };
import {
  getNotificationCenterData,
  markNotificationRead,
  markAllNotificationsRead,
} from "./notificationOperations" with { type: "ref" };
import {
  getUnifiedStudentRiskData,
  ensureUnifiedRiskFollowUp,
} from "./studentRiskOperations" with { type: "ref" };

const websiteEntities = ["School", "SchoolSite", "SchoolSiteContent", "SchoolSiteNavItem", "SchoolSiteMedia", "SchoolSiteRevision", "Department", "User"] as const;
const studentRiskEntities = [
  "School",
  "User",
  "StudentProfile",
  "ClassRoom",
  "Department",
  "AcademicYear",
  "SchoolStaffAssignment",
  "WakasekAssignment",
  "SchoolDailyAttendance",
  "StudentViolation",
  "StudentCoaching",
  "StudentPermit",
  "LmsCourse",
  "LmsAssignment",
  "LmsSubmission",
  "Placement",
  "Company",
  "AttendanceLog",
  "DailyJournal",
  "SchoolFollowUpCase",
  "SchoolFollowUpEvent",
] as const;

const notificationEntities = [
  "SchoolNotificationState",
  "School",
  "User",
  "StudentProfile",
  "AcademicYear",
  "ClassRoom",
  "Department",
  "SchoolDailyAttendance",
  "SchoolFollowUpCase",
  "SchoolFollowUpEvent",
  "StudentViolation",
  "StudentCoaching",
  "StudentPermit",
  "LmsCourse",
  "LmsAssignment",
  "LmsSubmission",
  "Placement",
  "Company",
  "AttendanceLog",
  "DailyJournal",
  "WakasekAssignment",
  "SchoolStaffAssignment",
  "AssetMaintenance",
  "AssetItem",
  "DutyTeacherReport",
] as const;

export const schoolSpec: Spec = [
  query(getSchoolInfo, { entities: ["School", "User"] }),
  query(getUnifiedStudentRiskData, { entities: [...studentRiskEntities] }),
  query(getNotificationCenterData, { entities: [...notificationEntities] }),
  query(getDepartments, { entities: ["Department"] }),
  query(getAcademicYears, { entities: ["AcademicYear"] }),
  query(getClassRooms, { entities: ["ClassRoom", "Department", "AcademicYear", "User"] }),
  query(getSchoolTeachers, { entities: ["User", "TeacherProfile", "WakasekAssignment", "SchoolStaffAssignment", "AcademicYear", "Department", "ClassRoom"] }),
  query(getSchoolTeacherDetail, { entities: ["User", "TeacherProfile", "WakasekAssignment", "SchoolStaffAssignment", "AcademicYear", "Department", "ClassRoom"] }),
  action(updateSchoolTeacherProfile, { entities: ["User", "TeacherProfile"] }),
  query(getSchoolStudents, { entities: ["User", "StudentProfile", "ClassRoom", "Placement"] }),
  query(getDailySchoolAttendance, { entities: ["SchoolDailyAttendance", "School", "AcademicYear", "ClassRoom", "Department", "User", "StudentProfile"] }),
  query(getDailyAttendanceReportData, { entities: ["SchoolDailyAttendance", "School", "AcademicYear", "ClassRoom", "Department", "User", "StudentProfile"] }),
  query(getSchoolStudentDetail, { entities: ["User", "StudentProfile", "ClassRoom", "Department", "AcademicYear", "Placement", "Company", "SchoolDailyAttendance", "StudentViolation", "StudentAchievement", "StudentCoaching", "StudentPermit", "SchoolFollowUpCase", "WakasekAssignment", "SchoolStaffAssignment"] }),
  query(getAllSchools, { entities: ["School", "User", "Department", "ClassRoom", "Company", "Placement"] }),
  query(getStudentDashboardData, {
    entities: ["User", "ClassRoom", "AcademicYear", "LmsCourse", "LmsAssignment", "LmsSubmission", "LmsAssessment", "LmsAssessmentResult", "Placement", "Company", "AttendanceLog", "DailyJournal"],
  }),
  query(getTeacherDashboardData, {
    entities: ["User", "TeacherProfile", "WakasekAssignment", "SchoolStaffAssignment", "SchoolFollowUpCase", "ClassRoom", "LmsCourse", "AcademicYear", "LmsAssignment", "LmsSubmission", "Placement", "Company", "DailyJournal"],
  }),
  query(getSchoolAdminDashboardData, {
    entities: ["School", "User", "AcademicYear", "ClassRoom", "LmsCourse", "SchoolDailyAttendance", "SchoolFollowUpCase", "StudentViolation", "StudentCoaching", "StudentPermit", "Company", "Placement", "AttendanceLog", "DailyJournal"],
  }),
  query(getMentorDashboardData, {
    entities: ["User", "Placement", "Company", "AttendanceLog", "DailyJournal", "SchoolFollowUpCase"],
  }),
  query(getSchoolSpotlightSearch, {
    entities: ["User", "StudentProfile", "TeacherProfile", "WakasekAssignment", "ClassRoom", "Department", "AcademicYear", "LmsCourse", "Company", "Placement", "SchoolSiteContent"],
  }),

  query(getStudentAffairsData, {
    entities: [
      "StudentViolation",
      "StudentAchievement",
      "StudentCoaching",
      "StudentPermit",
      "StudentAffairsEvent",
      "SchoolFollowUpCase",
      "SchoolFollowUpEvent",
      "School",
      "User",
      "StudentProfile",
      "ClassRoom",
      "AcademicYear",
      "WakasekAssignment",
      "SchoolStaffAssignment",
    ],
  }),
  query(getSarprasInventoryData, {
    entities: [
      "FacilityRoom",
      "AssetCategory",
      "AssetItem",
      "AssetMaintenance",
      "AssetMovement",
      "SchoolFollowUpCase",
      "SchoolFollowUpEvent",
      "School",
      "User",
      "WakasekAssignment",
      "SchoolStaffAssignment",
    ],
  }),
  query(getFollowUpWorkflowData, {
    entities: [
      "SchoolFollowUpCase",
      "SchoolFollowUpEvent",
      "School",
      "User",
      "ClassRoom",
      "Placement",
      "SchoolStaffAssignment",
      "WakasekAssignment",
    ],
  }),
  query(getSchoolWebsiteAdmin, { entities: [...websiteEntities] }),
  query(getSchoolWebsitePreview, { entities: [...websiteEntities] }),
  query(getPublicSchoolSite, { entities: [...websiteEntities] }),
  query(getPublicSchoolContent, { entities: [...websiteEntities] }),

  action(ensureUnifiedRiskFollowUp, { entities: [...studentRiskEntities] }),
  action(markNotificationRead, { entities: [...notificationEntities] }),
  action(markAllNotificationsRead, { entities: [...notificationEntities] }),

  action(createStudentViolation, {
    entities: ["StudentViolation", "StudentAffairsEvent", "SchoolFollowUpCase", "SchoolFollowUpEvent", "User", "ClassRoom", "AcademicYear", "WakasekAssignment", "SchoolStaffAssignment"],
  }),
  action(updateStudentViolation, {
    entities: ["StudentViolation", "StudentAffairsEvent", "SchoolFollowUpCase", "SchoolFollowUpEvent", "User", "ClassRoom", "AcademicYear", "WakasekAssignment", "SchoolStaffAssignment"],
  }),
  action(saveStudentAchievement, {
    entities: ["StudentAchievement", "StudentAffairsEvent", "User", "ClassRoom", "AcademicYear", "WakasekAssignment", "SchoolStaffAssignment"],
  }),
  action(createStudentCoaching, {
    entities: ["StudentCoaching", "StudentAffairsEvent", "SchoolFollowUpCase", "SchoolFollowUpEvent", "User", "ClassRoom", "AcademicYear", "WakasekAssignment", "SchoolStaffAssignment"],
  }),
  action(updateStudentCoaching, {
    entities: ["StudentCoaching", "StudentAffairsEvent", "SchoolFollowUpCase", "SchoolFollowUpEvent", "User", "ClassRoom", "AcademicYear", "WakasekAssignment", "SchoolStaffAssignment"],
  }),
  action(createStudentPermit, {
    entities: ["StudentPermit", "StudentAffairsEvent", "User", "ClassRoom", "AcademicYear", "WakasekAssignment", "SchoolStaffAssignment"],
  }),
  action(updateStudentPermit, {
    entities: ["StudentPermit", "StudentAffairsEvent", "User", "ClassRoom", "AcademicYear", "WakasekAssignment", "SchoolStaffAssignment"],
  }),
  action(saveFacilityRoom, {
    entities: ["FacilityRoom", "User", "WakasekAssignment", "SchoolStaffAssignment"],
  }),
  action(saveAssetCategory, {
    entities: ["AssetCategory", "WakasekAssignment", "SchoolStaffAssignment"],
  }),
  action(saveAssetItem, {
    entities: ["AssetItem", "AssetCategory", "FacilityRoom", "AssetMovement", "User", "WakasekAssignment", "SchoolStaffAssignment"],
  }),
  action(reportAssetMaintenance, {
    entities: ["AssetItem", "AssetMaintenance", "SchoolFollowUpCase", "SchoolFollowUpEvent", "User", "WakasekAssignment", "SchoolStaffAssignment"],
  }),
  action(updateAssetMaintenance, {
    entities: ["AssetItem", "AssetMaintenance", "SchoolFollowUpCase", "SchoolFollowUpEvent", "User", "WakasekAssignment", "SchoolStaffAssignment"],
  }),
  action(moveAssetItem, {
    entities: ["AssetItem", "FacilityRoom", "AssetMovement", "User", "WakasekAssignment", "SchoolStaffAssignment"],
  }),
  action(syncFollowUpFindings, {
    entities: ["SchoolFollowUpCase", "SchoolFollowUpEvent", "User", "ClassRoom", "SchoolDailyAttendance", "Placement", "AttendanceLog", "DailyJournal", "DutyTeacherReport", "WakasekAssignment"],
  }),
  action(createManualFollowUpCase, {
    entities: ["SchoolFollowUpCase", "SchoolFollowUpEvent", "User", "ClassRoom", "SchoolStaffAssignment", "WakasekAssignment"],
  }),
  action(updateFollowUpCase, {
    entities: ["SchoolFollowUpCase", "SchoolFollowUpEvent", "User", "ClassRoom", "Placement", "SchoolStaffAssignment", "WakasekAssignment"],
  }),
  action(addFollowUpComment, {
    entities: ["SchoolFollowUpCase", "SchoolFollowUpEvent", "User", "ClassRoom", "Placement", "SchoolStaffAssignment", "WakasekAssignment"],
  }),
  action(ensurePklEwsFollowUp, {
    entities: ["SchoolFollowUpCase", "SchoolFollowUpEvent", "User", "Placement", "AttendanceLog", "DailyJournal", "WakasekAssignment"],
  }),
  action(registerSchool, { entities: ["School", "User", "AcademicYear"] }),
  action(updateSchoolInfo, { entities: ["School"] }),
  action(createDepartment, { entities: ["Department"] }),
  action(updateDepartment, { entities: ["Department"] }),
  action(deleteDepartment, { entities: ["Department", "ClassRoom"] }),
  action(createAcademicYear, { entities: ["AcademicYear"] }),
  action(setActiveAcademicYear, { entities: ["AcademicYear"] }),
  action(createClassRoom, { entities: ["ClassRoom", "Department", "AcademicYear"] }),
  action(updateClassRoom, { entities: ["ClassRoom"] }),
  action(deleteClassRoom, { entities: ["ClassRoom", "User"] }),
  action(createTeacher, { entities: ["School", "User", "TeacherProfile", "WakasekAssignment"] }),
  action(updateTeacher, { entities: ["User", "TeacherProfile", "WakasekAssignment"] }),
  action(deleteTeacher, { entities: ["User", "TeacherProfile", "WakasekAssignment", "ClassRoom", "LmsCourse", "Placement"] }),
  action(createStudent, { entities: ["School", "User", "StudentProfile", "ClassRoom"] }),
  action(updateStudent, { entities: ["User", "StudentProfile", "ClassRoom"] }),
  action(provisionStudentLogin, { entities: ["User", "StudentProfile"] }),
  action(revokeStudentLogin, { entities: ["User"] }),
  action(deleteStudent, { entities: ["User", "StudentProfile", "Placement", "StudentViolation", "StudentAchievement", "StudentCoaching", "StudentPermit"] }),
  action(saveDailySchoolAttendance, { entities: ["SchoolDailyAttendance", "AcademicYear", "ClassRoom", "User", "StudentProfile"] }),
  action(importStudentsFromCsv, { entities: ["School", "User", "StudentProfile", "ClassRoom"] }),
  query(previewStudentsFromDapodik, { entities: ["School", "User", "StudentProfile", "ClassRoom"] }),
  action(importStudentsFromDapodik, { entities: ["School", "User", "StudentProfile", "ClassRoom"] }),
  action(importTeachersFromCsv, { entities: ["School", "User", "TeacherProfile", "WakasekAssignment"] }),
  action(importCompaniesFromCsv, { entities: ["School", "Company"] }),
  action(switchActiveSchool, { entities: ["School", "User"] }),
  action(createSchoolByAdmin, { entities: ["School", "AcademicYear", "User"] }),

  action(initializeSchoolWebsite, { entities: [...websiteEntities] }),
  action(updateSchoolWebsiteSettings, { entities: [...websiteEntities] }),
  action(updateSchoolWebsiteLandingSections, { entities: [...websiteEntities] }),
  action(publishSchoolWebsite, { entities: [...websiteEntities] }),
  action(unpublishSchoolWebsite, { entities: [...websiteEntities] }),
  action(saveSchoolWebsiteContent, { entities: [...websiteEntities] }),
  action(setSchoolWebsiteContentStatus, { entities: [...websiteEntities] }),
  action(deleteSchoolWebsiteContent, { entities: [...websiteEntities] }),
  action(saveSchoolWebsiteNavItem, { entities: [...websiteEntities] }),
  action(deleteSchoolWebsiteNavItem, { entities: [...websiteEntities] }),
  action(saveSchoolWebsiteMedia, { entities: [...websiteEntities] }),
  action(deleteSchoolWebsiteMedia, { entities: [...websiteEntities] }),

  route("NotificationCenterRoute", "/school/notifications", page(NotificationCenterPage, { authRequired: true })),
  route("EarlyWarningSystemRoute", "/school/ews", page(EarlyWarningSystemPage, { authRequired: true })),
  route("StudentAffairsRoute", "/school/student-affairs", page(StudentAffairsPage, { authRequired: true })),
  route("SarprasInventoryRoute", "/school/sarpras", page(SarprasInventoryPage, { authRequired: true })),
  route("FollowUpWorkflowRoute", "/school/follow-up", page(FollowUpWorkflowPage, { authRequired: true })),
  route("SchoolDashboardRoute", "/school", page(SchoolDashboardPage, { authRequired: true })),
  route("DepartmentsRoute", "/school/departments", page(DepartmentsPage, { authRequired: true })),
  route("AcademicYearsRoute", "/school/academic-years", page(AcademicYearsPage, { authRequired: true })),
  route("ClassRoomsRoute", "/school/classes", page(ClassRoomsPage, { authRequired: true })),
  route("TeachersRoute", "/school/teachers", page(TeachersPage, { authRequired: true })),
  route("TeacherEditRoute", "/school/teachers/:id/edit", page(TeacherEditPage, { authRequired: true })),
  route("TeacherDetailRoute", "/school/teachers/:id", page(TeacherDetailPage, { authRequired: true })),
  route("StudentsRoute", "/school/students", page(StudentsPage, { authRequired: true })),
  route("DailyAttendanceRoute", "/school/attendance", page(DailyAttendancePage, { authRequired: true })),
  route("StudentCreateRoute", "/school/students/new", page(StudentFormPage, { authRequired: true })),
  route("StudentEditRoute", "/school/students/:id/edit", page(StudentFormPage, { authRequired: true })),
  route("StudentDetailRoute", "/school/students/:id", page(StudentDetailPage, { authRequired: true })),
  route("CsvImportRoute", "/school/import", page(CsvImportPage, { authRequired: true })),
  route("AllSchoolsRoute", "/school/admin/schools", page(AllSchoolsPage, { authRequired: true })),
  route("SchoolSettingsRoute", "/school/settings", page(SchoolSettingsPage, { authRequired: true })),
  route("SchoolWebsiteRoute", "/school/website", page(WebsiteSchoolPage, { authRequired: true })),
  route("SchoolWebsitePreviewRoute", "/school/website/preview", page(SchoolWebsitePreviewPage, { authRequired: true })),

  api("GET", "/site/:schoolSlug/sitemap.xml", schoolSiteSitemapApi, { entities: [...websiteEntities], auth: false }),

  route("PublicSchoolSiteRoute", "/site/:schoolSlug", page(PublicSchoolHomePage)),
  route("PublicSchoolNewsRoute", "/site/:schoolSlug/berita", page(PublicSchoolNewsIndexPage)),
  route("PublicSchoolNewsDetailRoute", "/site/:schoolSlug/berita/:slug", page(PublicSchoolNewsDetailPage)),
  route("PublicSchoolEventRoute", "/site/:schoolSlug/agenda", page(PublicSchoolEventIndexPage)),
  route("PublicSchoolAnnouncementRoute", "/site/:schoolSlug/pengumuman", page(PublicSchoolAnnouncementIndexPage)),
  route("PublicSchoolContentRoute", "/site/:schoolSlug/:slug", page(PublicSchoolContentPage)),
];
