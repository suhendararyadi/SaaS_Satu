import { action, query, type Spec } from "@wasp.sh/spec";
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
  getSchoolStudents,
} from "./operations" with { type: "ref" };
import {
  importStudentsFromCsv,
  importTeachersFromCsv,
  importCompaniesFromCsv,
} from "./import/operations" with { type: "ref" };

export const schoolSpec: Spec = [
  // Queries
  query(getSchoolInfo, { entities: ["School", "User"] }),
  query(getDepartments, { entities: ["Department"] }),
  query(getAcademicYears, { entities: ["AcademicYear"] }),
  query(getClassRooms, { entities: ["ClassRoom", "Department", "AcademicYear", "User"] }),
  query(getSchoolTeachers, { entities: ["User", "TeacherProfile", "ClassRoom"] }),
  query(getSchoolStudents, { entities: ["User", "StudentProfile", "ClassRoom", "Placement"] }),

  // Actions
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
  action(importStudentsFromCsv, { entities: ["School", "User", "StudentProfile", "ClassRoom"] }),
  action(importTeachersFromCsv, { entities: ["School", "User", "TeacherProfile"] }),
  action(importCompaniesFromCsv, { entities: ["School", "Company"] }),
];
