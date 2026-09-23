import { describe, expect, it } from "vitest";
import {
  canRunSpotlightDataSearch,
  filterSpotlightMenuItems,
  getSpotlightScopes,
  normalizeSpotlightQuery,
} from "./spotlightPolicy";

describe("School Spotlight policy", () => {
  it("gives school admins the full searchable school scope", () => {
    expect(getSpotlightScopes("SCHOOL_ADMIN")).toEqual([
      "STUDENTS",
      "TEACHERS",
      "CLASSES",
      "COURSES",
      "COMPANIES",
      "PLACEMENTS",
      "WEBSITE",
    ]);
  });

  it("keeps student and DUDI searches scoped to their own capabilities", () => {
    expect(getSpotlightScopes("STUDENT")).toEqual(["COURSES", "PLACEMENTS"]);
    expect(getSpotlightScopes("DUDI_MENTOR")).toEqual(["PLACEMENTS"]);
  });

  it("does not expose teacher or website-wide admin scopes to teachers", () => {
    const scopes = getSpotlightScopes("TEACHER");
    expect(scopes).toEqual(["STUDENTS", "CLASSES", "COURSES", "PLACEMENTS"]);
    expect(scopes).not.toContain("TEACHERS");
    expect(scopes).not.toContain("COMPANIES");
    expect(scopes).not.toContain("WEBSITE");
  });

  it("normalizes whitespace and requires two characters for data search", () => {
    expect(normalizeSpotlightQuery("  RPL   1  ")).toBe("RPL 1");
    expect(canRunSpotlightDataSearch("r")).toBe(false);
    expect(canRunSpotlightDataSearch("rp")).toBe(true);
  });

  it("filters only menu candidates already supplied by the active role", () => {
    const menu = [
      { label: "Data Siswa", section: "AKADEMIK", href: "/school/students" },
      { label: "Website Sekolah", section: "PUBLIKASI", href: "/school/website" },
      { label: "Jurnal Siswa", section: "PKL", href: "/school/pkl/journals" },
    ];

    expect(filterSpotlightMenuItems(menu, "siswa").map((item) => item.href)).toEqual([
      "/school/students",
      "/school/pkl/journals",
    ]);
    expect(filterSpotlightMenuItems(menu, "publikasi").map((item) => item.href)).toEqual([
      "/school/website",
    ]);
  });
});
