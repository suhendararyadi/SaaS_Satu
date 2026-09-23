import { describe, expect, it } from "vitest";
import {
  isValidPklDateRange,
  normalizeOptionalPklText,
  normalizePklCode,
  PKL_PARTNERSHIP_STATUSES,
  uniqueIds,
} from "./foundationPolicy";

describe("PKL Foundation Gen2 policy", () => {
  it("normalizes DUDI codes consistently", () => {
    expect(normalizePklCode("  dudi-01 ")).toBe("DUDI-01");
    expect(normalizePklCode("")).toBeNull();
    expect(normalizePklCode(null)).toBeNull();
  });

  it("normalizes optional text without creating empty strings", () => {
    expect(normalizeOptionalPklText("  Mitra aktif  ")).toBe("Mitra aktif");
    expect(normalizeOptionalPklText("   ")).toBeNull();
  });

  it("requires a period end date after its start date", () => {
    expect(
      isValidPklDateRange(
        new Date("2026-10-01T00:00:00Z"),
        new Date("2027-01-31T00:00:00Z"),
      ),
    ).toBe(true);
    expect(
      isValidPklDateRange(
        new Date("2027-01-31T00:00:00Z"),
        new Date("2026-10-01T00:00:00Z"),
      ),
    ).toBe(false);
  });

  it("keeps partnership status values controlled", () => {
    expect(PKL_PARTNERSHIP_STATUSES).toEqual([
      "ACTIVE",
      "DRAFT",
      "EXPIRED",
      "INACTIVE",
    ]);
  });

  it("deduplicates department ids before persistence", () => {
    expect(uniqueIds(["A", "B", "A"])).toEqual(["A", "B"]);
  });
});
