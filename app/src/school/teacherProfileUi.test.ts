import { describe, expect, it } from "vitest";
import { teacherProfileSections } from "./teacherProfileUi";

describe("teacherProfileSections", () => {
  it("mirrors the Dapodik PTK profile fields used by School OS", () => {
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
    const sensitive = teacherProfileSections
      .flatMap((section) => section.fields)
      .filter((field) => field.sensitive)
      .map((field) => field.key);

    expect(sensitive).toEqual(
      expect.arrayContaining(["nuptk", "nik", "birthPlace", "birthDate"]),
    );
  });
});
