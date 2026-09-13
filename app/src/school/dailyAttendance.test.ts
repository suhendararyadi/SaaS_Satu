import { describe, expect, it } from "vitest";
import {
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
});
