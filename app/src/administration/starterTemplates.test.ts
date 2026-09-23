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

it("allows safe staff and principal placeholders for correspondence", () => {
  expect(ADMINISTRATION_ALLOWED_VARIABLES).toContain("staff.name");
  expect(ADMINISTRATION_ALLOWED_VARIABLES).toContain("staff.nip");
  expect(ADMINISTRATION_ALLOWED_VARIABLES).toContain("principal.name");
  expect(ADMINISTRATION_ALLOWED_VARIABLES).toContain("principal.nip");
  expect(ADMINISTRATION_ALLOWED_VARIABLES).toContain("document.number");
});

it("assignment starter uses selected staff master data", () => {
  const assignment = ADMINISTRATION_STARTER_TEMPLATES.find((template) => template.code === "ASSIGNMENT");
  expect(assignment).toBeTruthy();
  expect(assignment?.bodyHtml).toContain("{{staff.name}}");
  expect(assignment?.bodyHtml).toContain("{{staff.nip}}");
  expect(assignment?.bodyHtml).toContain("{{staff.title}}");
  expect(assignment?.manualFields.some((field) => field.key === "manual.assignee")).toBe(false);
});

it("defines an explicit context contract for every Gen 2 template", () => {
  for (const template of ADMINISTRATION_STARTER_TEMPLATES) {
    expect(template.context).toBeTruthy();
    expect(["hidden", "optional", "required"]).toContain(template.context.student);
    expect(["hidden", "optional", "required"]).toContain(template.context.staff);
    expect(["hidden", "optional", "required"]).toContain(template.context.recipient);
  }
});

it("uses context-aware master-data requirements for key school letters", () => {
  const active = ADMINISTRATION_STARTER_TEMPLATES.find((template) => template.code === "STUDENT-ACTIVE");
  const assignment = ADMINISTRATION_STARTER_TEMPLATES.find((template) => template.code === "ASSIGNMENT");
  const recommendation = ADMINISTRATION_STARTER_TEMPLATES.find((template) => template.code === "RECOMMENDATION");
  const parentCall = ADMINISTRATION_STARTER_TEMPLATES.find((template) => template.code === "PARENT-CALL");
  expect(active?.context.student).toBe("required");
  expect(assignment?.context.staff).toBe("required");
  expect(assignment?.context.student).toBe("hidden");
  expect(recommendation?.context.requireOneOf).toEqual(["student", "staff"]);
  expect(parentCall?.context.student).toBe("required");
});

it("uses structured date/time inputs where administrative wording needs them", () => {
  const assignment = ADMINISTRATION_STARTER_TEMPLATES.find((template) => template.code === "ASSIGNMENT");
  const invitation = ADMINISTRATION_STARTER_TEMPLATES.find((template) => template.code === "INVITATION");
  const parentCall = ADMINISTRATION_STARTER_TEMPLATES.find((template) => template.code === "PARENT-CALL");
  expect(assignment?.manualFields.find((field) => field.key === "manual.activityDate")?.type).toBe("date");
  expect(assignment?.manualFields.find((field) => field.key === "manual.activityTime")?.type).toBe("time");
  expect(invitation?.manualFields.find((field) => field.key === "manual.activityTime")?.required).toBe(true);
  expect(parentCall?.manualFields.find((field) => field.key === "manual.meetingDate")?.type).toBe("date");
});

it("keeps template conditional blocks balanced and non-nested", () => {
  for (const template of ADMINISTRATION_STARTER_TEMPLATES) {
    const tokens = [...template.bodyHtml.matchAll(/\{\{(#(?:if|unless)\s+[a-zA-Z0-9_.-]+|\/(?:if|unless))\}\}/g)].map((match) => match[1]);
    let depth = 0;
    let maxDepth = 0;
    for (const token of tokens) {
      if (token.startsWith("#")) {
        depth += 1;
        maxDepth = Math.max(maxDepth, depth);
      } else {
        depth -= 1;
        expect(depth).toBeGreaterThanOrEqual(0);
      }
    }
    expect(depth).toBe(0);
    expect(maxDepth).toBeLessThanOrEqual(1);
  }
});

it("ships mature starter wording instead of blank generic shells", () => {
  for (const template of ADMINISTRATION_STARTER_TEMPLATES) {
    expect(template.description.toLowerCase()).not.toContain("kerangka umum");
    expect(template.bodyHtml.length).toBeGreaterThan(250);
    expect(template.bodyHtml).toMatch(/Demikian|Atas (?:perhatian|kesempatan)|menerangkan|memberikan tugas/i);
  }
});
