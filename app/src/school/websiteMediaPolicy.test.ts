import { describe, expect, it } from "vitest";
import {
  createWebsiteMediaKey,
  decodeWebsiteMediaHeader,
  isWebsiteMediaKeyForSchool,
  isWebsiteMediaType,
  websiteMediaExtension,
} from "./websiteMediaPolicy";

describe("websiteMediaPolicy", () => {
  it("accepts only safe web image types", () => {
    expect(isWebsiteMediaType("image/jpeg")).toBe(true);
    expect(isWebsiteMediaType("image/png")).toBe(true);
    expect(isWebsiteMediaType("image/webp")).toBe(true);
    expect(isWebsiteMediaType("image/svg+xml")).toBe(false);
    expect(isWebsiteMediaType("text/html")).toBe(false);
  });

  it("creates tenant-scoped immutable storage keys", () => {
    const key = createWebsiteMediaKey("school-a", "image/webp");
    expect(key).toMatch(/^website\/school-a\/[0-9a-f-]+\.webp$/);
    expect(isWebsiteMediaKeyForSchool(key, "school-a")).toBe(true);
    expect(isWebsiteMediaKeyForSchool(key, "school-b")).toBe(false);
  });

  it("uses expected extensions", () => {
    expect(websiteMediaExtension("image/jpeg")).toBe("jpg");
    expect(websiteMediaExtension("image/png")).toBe("png");
    expect(websiteMediaExtension("image/webp")).toBe("webp");
  });

  it("decodes and bounds metadata headers", () => {
    expect(decodeWebsiteMediaHeader("Gedung%20utama", 40)).toBe(
      "Gedung utama",
    );
    expect(decodeWebsiteMediaHeader("  halo  ", 4)).toBe("halo");
    expect(decodeWebsiteMediaHeader(undefined, 20)).toBe("");
  });
});
