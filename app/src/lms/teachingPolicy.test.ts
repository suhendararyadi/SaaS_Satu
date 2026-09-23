import { describe, expect, it } from "vitest";
import {
  attendanceRateForSubject,
  canEditEngagementScore,
  deriveTeachingScheduleState,
  engagementLevelFromScore,
  jakartaDateTime,
  teachingTimeRangesOverlap,
  validateTeachingTimeRange,
  weekdayForDateOnly,
} from "./teachingPolicy";

describe("teaching session policy", () => {
  it("validates schedule ranges and detects overlap", () => {
    expect(validateTeachingTimeRange("08:00", "09:30")).toBe(true);
    expect(validateTeachingTimeRange("09:30", "09:30")).toBe(false);
    expect(teachingTimeRangesOverlap("08:00", "09:30", "09:00", "10:00")).toBe(true);
    expect(teachingTimeRangesOverlap("08:00", "09:30", "09:30", "10:00")).toBe(false);
  });

  it("constructs Jakarta timestamps and weekday", () => {
    expect(jakartaDateTime("2026-09-23", "08:00").toISOString()).toBe("2026-09-23T01:00:00.000Z");
    expect(weekdayForDateOnly("2026-09-23")).toBe(3);
  });

  it("derives locked, ready, sla breach and missed schedule states", () => {
    const startAt = jakartaDateTime("2026-09-23", "08:00");
    const endAt = jakartaDateTime("2026-09-23", "09:30");
    expect(deriveTeachingScheduleState({ now: jakartaDateTime("2026-09-23", "07:59"), startAt, endAt })).toBe("LOCKED");
    expect(deriveTeachingScheduleState({ now: jakartaDateTime("2026-09-23", "08:10"), startAt, endAt })).toBe("READY");
    expect(deriveTeachingScheduleState({ now: jakartaDateTime("2026-09-23", "08:16"), startAt, endAt })).toBe("SLA_BREACH");
    expect(deriveTeachingScheduleState({ now: jakartaDateTime("2026-09-23", "09:31"), startAt, endAt })).toBe("MISSED");
    expect(deriveTeachingScheduleState({ now: startAt, startAt, endAt, sessionStatus: "IN_PROGRESS" })).toBe("IN_PROGRESS");
  });

  it("maps engagement rubric levels", () => {
    expect(engagementLevelFromScore(95)).toBe("SANGAT_AKTIF");
    expect(engagementLevelFromScore(85)).toBe("AKTIF");
    expect(engagementLevelFromScore(75)).toBe("CUKUP");
    expect(engagementLevelFromScore(65)).toBe("PERLU_BIMBINGAN");
  });

  it("locks engagement editing after seven days", () => {
    const endAt = jakartaDateTime("2026-09-23", "09:30");
    expect(canEditEngagementScore(endAt, new Date(endAt.getTime() + 7 * 24 * 60 * 60 * 1000))).toBe(true);
    expect(canEditEngagementScore(endAt, new Date(endAt.getTime() + 7 * 24 * 60 * 60 * 1000 + 1))).toBe(false);
  });

  it("calculates subject attendance rate", () => {
    expect(attendanceRateForSubject(["HADIR", "TERLAMBAT", "IZIN", "ALPA"])).toBe(50);
    expect(attendanceRateForSubject([])).toBeNull();
  });
});
