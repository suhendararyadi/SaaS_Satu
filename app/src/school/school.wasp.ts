import { action, page, query, route, type Spec } from "@wasp.sh/spec";
import { SchoolDashboardPage } from "./pages/SchoolDashboardPage" with { type: "ref" };
import { DepartmentsPage } from "./pages/DepartmentsPage" with { type: "ref" };
import { AcademicYearsPage } from "./pages/AcademicYearsPage" with { type: "ref" };
import { ClassRoomsPage } from "./pages/ClassRoomsPage" with { type: "ref" };
import { TeachersPage } from "./pages/TeachersPage" with { type: "ref" };
import { StudentsPage } from "./pages/StudentsPage" with { type: "ref" };
import { CsvImportPage } from "./pages/CsvImportPage" with { type: "ref" };
import { AllSchoolsPage } from "./pages/AllSchoolsPage" with { type: "ref" };
import { SchoolSettingsPage } from "./pages/SchoolSettingsPage" with { type: "ref" };

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
  createStudent,
  updateStudent,
  deleteStudent,
  getAllSchools,
  switchActiveSchool,
  createSchoolByAdmin,
} from "./operations" with { type: "ref" };
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

export const schoolSpec: Spec = [
  query(getSchoolInfo, { entities: ["School", "User"] }),
  query(getDepartments, { entities: ["Department"] }),
  query(getAcademicYears, { entities: ["AcademicYear"] }),
  query(getClassRooms, { entities: ["ClassRoom", "Department", "AcademicYear", "User"] }),
  query(getSchoolTeachers, { entities: ["User", "TeacherProfile", "ClassRoom"] }),
  query(getSchoolStudents, { entities: ["User", "StudentProfile", "ClassRoom", "Placement"] }),
  query(getAllSchools, { entities: ["School", "User", "Department", "ClassRoom", "Company", "Placement"] }),
  query(getStudentDashboardData, {
    entities: ["User", "ClassRoom", "LmsCourse", "LmsAssignment", "LmsSubmission", "LmsAssessment", "LmsAssessmentResult", "Placement", "Company", "AttendanceLog", "DailyJournal"],
  }),
  query(getTeacherDashboardData, {
    entities: ["User", "TeacherProfile", "ClassRoom", "LmsCourse", "AcademicYear", "LmsAssignment", "LmsSubmission", "Placement", "Company", "DailyJournal"],
  }),
  query(getSchoolAdminDashboardData, {
    entities: ["School", "User", "AcademicYear", "ClassRoom", "LmsCourse", "Company", "Placement"],
  }),
  query(getMentorDashboardData, {
    entities: ["User", "Placement", "Company", "DailyJournal"],
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
  action(createTeacher, { entities: ["School", "User", "TeacherProfile"] }),
  action(updateTeacher, { entities: ["User", "TeacherProfile"] }),
  action(deleteTeacher, { entities: ["User", "TeacherProfile", "ClassRoom", "LmsCourse", "Placement"] }),
  action(createStudent, { entities: ["School", "User", "StudentProfile", "ClassRoom"] }),
  action(updateStudent, { entities: ["User", "StudentProfile", "ClassRoom"] }),
  action(deleteStudent, { entities: ["User", "StudentProfile", "Placement"] }),
  action(importStudentsFromCsv, { entities: ["School", "User", "StudentProfile", "ClassRoom"] }),
  action(importTeachersFromCsv, { entities: ["School", "User", "TeacherProfile"] }),
  action(importCompaniesFromCsv, { entities: ["School", "Company"] }),
  action(switchActiveSchool, { entities: ["School", "User"] }),
  action(createSchoolByAdmin, { entities: ["School", "AcademicYear", "User"] }),

  route("SchoolDashboardRoute", "/school", page(SchoolDashboardPage, { authRequired: true })),
  route("DepartmentsRoute", "/school/departments", page(DepartmentsPage, { authRequired: true })),
  route("AcademicYearsRoute", "/school/academic-years", page(AcademicYearsPage, { authRequired: true })),
  route("ClassRoomsRoute", "/school/classes", page(ClassRoomsPage, { authRequired: true })),
  route("TeachersRoute", "/school/teachers", page(TeachersPage, { authRequired: true })),
  route("StudentsRoute", "/school/students", page(StudentsPage, { authRequired: true })),
  route("CsvImportRoute", "/school/import", page(CsvImportPage, { authRequired: true })),
  route("AllSchoolsRoute", "/school/admin/schools", page(AllSchoolsPage, { authRequired: true })),
  route("SchoolSettingsRoute", "/school/settings", page(SchoolSettingsPage, { authRequired: true })),
];
