import { describe, expect, it } from "vitest";
import { isWakasekRole, normalizeWakasekRoles, parseWakasekRolesText, WAKASEK_ROLE_META } from "./wakasek";

describe("wakasek role helpers", () => {
  it("recognizes supported modular roles", () => {
    expect(isWakasekRole("KURIKULUM")).toBe(true);
    expect(isWakasekRole("KESISWAAN")).toBe(true);
    expect(isWakasekRole("SARPRAS")).toBe(true);
    expect(isWakasekRole("HUMAS_HUBIN")).toBe(true);
    expect(isWakasekRole("KEPALA_SEKOLAH")).toBe(false);
  });

  it("normalizes duplicates, invalid values, and canonical ordering", () => {
    expect(normalizeWakasekRoles(["SARPRAS", "INVALID", "KURIKULUM", "SARPRAS"]))
      .toEqual(["KURIKULUM", "SARPRAS"]);
  });

  it("parses legacy and modular Wakasek text", () => {
    expect(parseWakasekRolesText("ya")).toEqual(["KURIKULUM"]);
    expect(parseWakasekRolesText("Waka Kurikulum; Kesiswaan | Sarpras")).toEqual([
      "KURIKULUM",
      "KESISWAAN",
      "SARPRAS",
    ]);
    expect(parseWakasekRolesText("Humas/Hubin")).toEqual(["HUMAS_HUBIN"]);
  });

  it("provides labels for every supported role", () => {
    expect(WAKASEK_ROLE_META.KURIKULUM.label).toBe("Waka Kurikulum");
    expect(WAKASEK_ROLE_META.KESISWAAN.label).toBe("Waka Kesiswaan");
    expect(WAKASEK_ROLE_META.SARPRAS.label).toBe("Waka Sarpras");
    expect(WAKASEK_ROLE_META.HUMAS_HUBIN.label).toContain("Humas");
  });
});
