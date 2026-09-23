import { describe, expect, it } from "vitest";
import {
  createEmptyStudentForm,
  studentFormKeys,
  studentFormSections,
} from "./studentProfileUi";

describe("Dapodik-aligned student profile UI contract", () => {
  it("keeps only core identity controls required", () => {
    const required = studentFormSections
      .flatMap((section) => section.fields)
      .filter((field) => field.required)
      .map((field) => field.key);

    expect(required).toEqual(["name", "gender"]);
  });

  it("covers the complete grouped school database profile", () => {
    expect(studentFormSections.map((section) => section.id)).toEqual([
      "utama",
      "alamat",
      "dokumen",
      "ayah",
      "ibu",
      "wali",
      "bantuan",
      "bank",
      "tambahan",
    ]);

    expect(studentFormKeys).toEqual(
      expect.arrayContaining([
        "nis",
        "nisn",
        "nik",
        "birthPlace",
        "birthDate",
        "address",
        "fatherName",
        "motherName",
        "guardianName",
        "receivesKip",
        "pipEligible",
        "bankAccountNumber",
        "specialNeeds",
        "familyCardNumber",
        "distanceToSchoolKm",
      ]),
    );
  });

  it("initializes optional Dapodik fields empty without inventing data", () => {
    const form = createEmptyStudentForm();
    expect(form.gender).toBe("L");
    expect(form.status).toBe("ACTIVE");
    expect(form.nis).toBe("");
    expect(form.nisn).toBe("");
    expect(form.nik).toBe("");
    expect(form.fatherName).toBe("");
    expect(form.bankAccountNumber).toBe("");
  });
});
