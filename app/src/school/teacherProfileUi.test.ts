import { describe, expect, it } from "vitest";
import {
  createEmptyTeacherForm,
  sensitiveTeacherProfileKeys,
  teacherProfileSections,
} from "./teacherProfileUi";

describe("teacherProfileSections", () => {
  it("mirrors the editable Dapodik PTK profile fields used by School OS", () => {
    const keys = teacherProfileSections.flatMap((section) =>
      section.fields.map((field) => field.key),
    );

    expect(keys).toEqual(
      expect.arrayContaining([
        "name",
        "nip",
        "nuptk",
        "gender",
        "birthPlace",
        "birthDate",
        "nik",
        "employmentStatus",
        "ptkType",
        "frontTitle",
        "backTitle",
        "educationLevel",
        "educationMajor",
        "certification",
        "workStartDate",
        "additionalDuties",
        "subjectsTaught",
        "additionalDutyHours",
        "teachingHours",
        "totalTeachingHours",
        "studentLoad",
        "competencies",
        "jobTitle",
        "email",
        "phone",
        "role",
      ]),
    );
  });

  it("marks high-sensitivity identifiers and birth data", () => {
    expect(sensitiveTeacherProfileKeys).toEqual(
      expect.arrayContaining(["nuptk", "nik", "birthPlace", "birthDate"]),
    );
  });

  it("provides controlled select choices for gender and School OS role", () => {
    const fields = teacherProfileSections.flatMap((section) => section.fields);
    const gender = fields.find((field) => field.key === "gender");
    const role = fields.find((field) => field.key === "role");

    expect(gender?.type).toBe("select");
    expect(gender?.options?.map((option) => option.value)).toEqual([
      "",
      "L",
      "P",
    ]);
    expect(role?.type).toBe("select");
    expect(role?.options?.map((option) => option.value)).toEqual([
      "TEACHER",
      "SCHOOL_ADMIN",
    ]);
  });

  it("creates a complete blank form with TEACHER as the safe default role", () => {
    const state = createEmptyTeacherForm();
    const keys = teacherProfileSections.flatMap((section) =>
      section.fields.map((field) => field.key),
    );

    expect(Object.keys(state).sort()).toEqual([...keys].sort());
    expect(state.role).toBe("TEACHER");
    expect(state.nik).toBe("");
    expect(state.nuptk).toBe("");
  });
});
