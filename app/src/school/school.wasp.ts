import { action, api, page, query, route, type Spec } from "@wasp.sh/spec";
import { SchoolDashboardPage } from "./pages/SchoolDashboardPage" with { type: "ref" };
import { DepartmentsPage } from "./pages/DepartmentsPage" with { type: "ref" };
import { AcademicYearsPage } from "./pages/AcademicYearsPage" with { type: "ref" };
import { ClassRoomsPage } from "./pages/ClassRoomsPage" with { type: "ref" };
import { TeachersPage } from "./pages/TeachersPage" with { type: "ref" };
import { StudentsPage } from "./pages/StudentsPage" with { type: "ref" };
import { DailyAttendancePage } from "./pages/DailyAttendancePage" with { type: "ref" };
import { StudentDetailPage } from "./pages/StudentDetailPage" with { type: "ref" };
import { StudentFormPage } from "./pages/StudentFormPage" with { type: "ref" };
import { CsvImportPage } from "./pages/CsvImportPage" with { type: "ref" };
import { AllSchoolsPage } from "./pages/AllSchoolsPage" with { type: "ref" };
import { SchoolSettingsPage } from "./pages/SchoolSettingsPage" with { type: "ref" };
import { WebsiteSchoolPage } from "./pages/WebsiteSchoolPage" with { type: "ref" };
import { SchoolWebsitePreviewPage } from "./pages/SchoolWebsitePreviewPage" with { type: "ref" };
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
} from "./studentOperations" with { type: "ref" };
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

const websiteEntities = ["School", "SchoolSite", "SchoolSiteContent", "SchoolSiteNavItem", "SchoolSiteMedia", "SchoolSiteRevision", "Department", "User"] as const;

export const schoolSpec: Spec = [
  query(getSchoolInfo, { entities: ["School", "User"] }),
  query(getDepartments, { entities: ["Department"] }),
  query(getAcademicYears, { entities: ["AcademicYear"] }),
  query(getClassRooms, { entities: ["ClassRoom", "Department", "AcademicYear", "User"] }),
  query(getSchoolTeachers, { entities: ["User", "TeacherProfile", "ClassRoom"] }),
  query(getSchoolStudents, { entities: ["User", "StudentProfile", "ClassRoom", "Placement"] }),
  query(getDailySchoolAttendance, { entities: ["SchoolDailyAttendance", "School", "AcademicYear", "ClassRoom", "Department", "User", "StudentProfile"] }),
  query(getSchoolStudentDetail, { entities: ["User", "StudentProfile", "ClassRoom", "Department", "AcademicYear", "Placement", "Company"] }),
  query(getAllSchools, { entities: ["School", "User", "Department", "ClassRoom", "Company", "Placement"] }),
  query(getStudentDashboardData, {
    entities: ["User", "ClassRoom", "LmsCourse", "LmsAssignment", "LmsSubmission", "LmsAssessment", "LmsAssessmentResult", "Placement", "Company", "AttendanceLog", "DailyJournal"],
  }),
  query(getTeacherDashboardData, {
    entities: ["User", "TeacherProfile", "ClassRoom", "LmsCourse", "AcademicYear", "LmsAssignment", "LmsSubmission", "Placement", "Company", "DailyJournal"],
  }),
  query(getSchoolAdminDashboardData, {
    entities: ["School", "User", "AcademicYear", "ClassRoom", "LmsCourse", "SchoolDailyAttendance", "Company", "Placement", "AttendanceLog", "DailyJournal"],
  }),
  query(getMentorDashboardData, {
    entities: ["User", "Placement", "Company", "DailyJournal"],
  }),
  query(getSchoolSpotlightSearch, {
    entities: ["User", "StudentProfile", "TeacherProfile", "ClassRoom", "Department", "AcademicYear", "LmsCourse", "Company", "Placement", "SchoolSiteContent"],
  }),

  query(getSchoolWebsiteAdmin, { entities: [...websiteEntities] }),
  query(getSchoolWebsitePreview, { entities: [...websiteEntities] }),
  query(getPublicSchoolSite, { entities: [...websiteEntities] }),
  query(getPublicSchoolContent, { entities: [...websiteEntities] }),

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
  action(createTeacher, { entities: ["School", "User", "TeacherProfile"] }),
  action(updateTeacher, { entities: ["User", "TeacherProfile"] }),
  action(deleteTeacher, { entities: ["User", "TeacherProfile", "ClassRoom", "LmsCourse", "Placement"] }),
  action(createStudent, { entities: ["School", "User", "StudentProfile", "ClassRoom"] }),
  action(updateStudent, { entities: ["User", "StudentProfile", "ClassRoom"] }),
  action(deleteStudent, { entities: ["User", "StudentProfile", "Placement"] }),
  action(saveDailySchoolAttendance, { entities: ["SchoolDailyAttendance", "AcademicYear", "ClassRoom", "User", "StudentProfile"] }),
  action(importStudentsFromCsv, { entities: ["School", "User", "StudentProfile", "ClassRoom"] }),
  query(previewStudentsFromDapodik, { entities: ["School", "User", "StudentProfile", "ClassRoom"] }),
  action(importStudentsFromDapodik, { entities: ["School", "User", "StudentProfile", "ClassRoom"] }),
  action(importTeachersFromCsv, { entities: ["School", "User", "TeacherProfile"] }),
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

  route("SchoolDashboardRoute", "/school", page(SchoolDashboardPage, { authRequired: true })),
  route("DepartmentsRoute", "/school/departments", page(DepartmentsPage, { authRequired: true })),
  route("AcademicYearsRoute", "/school/academic-years", page(AcademicYearsPage, { authRequired: true })),
  route("ClassRoomsRoute", "/school/classes", page(ClassRoomsPage, { authRequired: true })),
  route("TeachersRoute", "/school/teachers", page(TeachersPage, { authRequired: true })),
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
