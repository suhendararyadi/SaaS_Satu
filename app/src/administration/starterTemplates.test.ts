import { describe, expect, it } from "vitest";
import { ADMINISTRATION_ALLOWED_VARIABLES, ADMINISTRATION_STARTER_TEMPLATES } from "./starterTemplates";

describe("TU starter templates", () => {
  it("ships ten uniquely coded starter templates", () => {
    expect(ADMINISTRATION_STARTER_TEMPLATES).toHaveLength(10);
    const codes = ADMINISTRATION_STARTER_TEMPLATES.map((template) => template.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("uses unique manual-field keys inside each template", () => {
    for (const template of ADMINISTRATION_STARTER_TEMPLATES) {
      const keys = template.manualFields.map((field) => field.key);
      expect(new Set(keys).size).toBe(keys.length);
      expect(keys.every((key) => key.startsWith("manual."))).toBe(true);
    }
  });

  it("does not expose sensitive student identifiers through default variable whitelist", () => {
    expect(ADMINISTRATION_ALLOWED_VARIABLES).not.toContain("student.nik" as any);
    expect(ADMINISTRATION_ALLOWED_VARIABLES).not.toContain("student.familyCardNumber" as any);
    expect(ADMINISTRATION_ALLOWED_VARIABLES).not.toContain("student.bankAccountNumber" as any);
    expect(ADMINISTRATION_ALLOWED_VARIABLES).not.toContain("student.latitude" as any);
    expect(ADMINISTRATION_ALLOWED_VARIABLES).not.toContain("student.longitude" as any);
  });

  it("contains no executable script or iframe markup in starter bodies", () => {
    for (const template of ADMINISTRATION_STARTER_TEMPLATES) {
      expect(template.bodyHtml.toLowerCase()).not.toContain("<script");
      expect(template.bodyHtml.toLowerCase()).not.toContain("<iframe");
      expect(template.bodyHtml.toLowerCase()).not.toContain("onerror=");
    }
  });
});
