import { describe, expect, it } from "vitest";
import { getSchoolCapabilities, normalizeSchoolLevel } from "./schoolCapabilities";

describe("school level capabilities", () => {
  it("disables jurusan and PKL capabilities for SD / MI", () => {
    expect(getSchoolCapabilities("SD_MI")).toMatchObject({
      level: "SD_MI",
      usesDepartments: false,
      usesPkl: false,
    });
  });

  it("disables jurusan and PKL capabilities for SMP / MTs", () => {
    expect(getSchoolCapabilities("SMP_MTS")).toMatchObject({
      level: "SMP_MTS",
      usesDepartments: false,
      usesPkl: false,
    });
  });

  it("keeps upper-secondary capabilities for the existing SMA / SMK / MA group", () => {
    expect(getSchoolCapabilities("SMA_SMK")).toMatchObject({
      level: "SMA_SMK",
      usesDepartments: true,
      usesPkl: true,
    });
  });

  it("keeps legacy schools backward compatible when level is absent", () => {
    expect(normalizeSchoolLevel(undefined)).toBe("SMA_SMK");
    expect(getSchoolCapabilities(null).usesDepartments).toBe(true);
  });
});
