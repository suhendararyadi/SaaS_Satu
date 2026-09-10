import { describe, expect, it } from "vitest";
import { contentBlocksToText, isAnnouncementActive, isCmsContentPublic, sameCmsTenant, slugifyCms, textToContentBlocks } from "./websitePolicyCore";

describe("website CMS policy", () => {
  it("creates stable tenant-safe slugs", () => {
    expect(slugifyCms("Visi & Misi Sekolah 2026")).toBe("visi-misi-sekolah-2026");
  });

  it("keeps draft and future scheduled content private", () => {
    const now = new Date("2026-09-10T12:00:00Z");
    expect(isCmsContentPublic({ status: "DRAFT" }, now)).toBe(false);
    expect(isCmsContentPublic({ status: "SCHEDULED", scheduledAt: "2026-09-11T12:00:00Z" }, now)).toBe(false);
    expect(isCmsContentPublic({ status: "SCHEDULED", scheduledAt: "2026-09-10T11:00:00Z" }, now)).toBe(true);
    expect(isCmsContentPublic({ status: "PUBLISHED" }, now)).toBe(true);
  });

  it("detects tenant boundary mismatches", () => {
    expect(sameCmsTenant("school-a", "school-a")).toBe(true);
    expect(sameCmsTenant("school-b", "school-a")).toBe(false);
  });

  it("honors announcement display windows", () => {
    const now = new Date("2026-09-10T12:00:00Z");
    expect(isAnnouncementActive({ startsAt: "2026-09-10T10:00:00Z", endsAt: "2026-09-10T14:00:00Z" }, now)).toBe(true);
    expect(isAnnouncementActive({ startsAt: "2026-09-11T10:00:00Z" }, now)).toBe(false);
    expect(isAnnouncementActive({ endsAt: "2026-09-09T10:00:00Z" }, now)).toBe(false);
  });

  it("stores only allowlisted text blocks instead of HTML", () => {
    const raw = "## Profil\n\nSekolah berkembang bersama masyarakat.\n\n> Belajar sepanjang hayat.\n\n! Informasi penting.";
    const blocks = textToContentBlocks(raw);
    expect(blocks.map((b) => b.type)).toEqual(["heading", "paragraph", "quote", "callout"]);
    expect(contentBlocksToText(blocks)).toContain("## Profil");
  });
});
