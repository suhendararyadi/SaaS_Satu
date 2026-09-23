import { describe, expect, it } from "vitest";
import {
  getAcademicSemesterDateRange,
  isDateWithinAcademicSemester,
  isValidDateOnly,
  jakartaDateOnly,
  summarizeDailyAttendance,
} from "./dailyAttendance";

describe("daily attendance helpers", () => {
  it("validates real YYYY-MM-DD dates", () => {
    expect(isValidDateOnly("2026-09-13")).toBe(true);
    expect(isValidDateOnly("2026-02-31")).toBe(false);
    expect(isValidDateOnly("13-09-2026")).toBe(false);
  });

  it("formats dates using the school timezone", () => {
    expect(jakartaDateOnly(new Date("2026-09-13T18:30:00Z"))).toBe("2026-09-14");
  });

  it("summarizes every supported attendance status", () => {
    expect(
      summarizeDailyAttendance([
        { status: "HADIR" },
        { status: "HADIR" },
        { status: "SAKIT" },
        { status: "IZIN" },
        { status: "ALPA" },
        { status: "TERLAMBAT" },
      ]),
    ).toEqual({
      total: 6,
      hadir: 2,
      sakit: 1,
      izin: 1,
      alpa: 1,
      terlambat: 1,
    });
  });
  it("derives strict active-semester date ranges", () => {
    expect(getAcademicSemesterDateRange("2026/2027", "GANJIL")).toEqual({
      startDateOnly: "2026-07-01",
      endDateOnly: "2026-12-31",
      endDateOnlyExclusive: "2027-01-01",
    });
    expect(getAcademicSemesterDateRange("2026/2027", "GENAP")).toEqual({
      startDateOnly: "2027-01-01",
      endDateOnly: "2027-06-30",
      endDateOnlyExclusive: "2027-07-01",
    });
    expect(getAcademicSemesterDateRange("2026-2027", "GANJIL")).toBeNull();
    expect(getAcademicSemesterDateRange("2026/2028", "GANJIL")).toBeNull();
    expect(getAcademicSemesterDateRange("2026/2027", "LAINNYA")).toBeNull();
  });

  it("accepts attendance dates only inside the active semester", () => {
    expect(isDateWithinAcademicSemester("2026-07-01", "2026/2027", "GANJIL")).toBe(true);
    expect(isDateWithinAcademicSemester("2026-12-31", "2026/2027", "GANJIL")).toBe(true);
    expect(isDateWithinAcademicSemester("2027-01-01", "2026/2027", "GANJIL")).toBe(false);
    expect(isDateWithinAcademicSemester("2026-06-30", "2026/2027", "GANJIL")).toBe(false);
  });

});
