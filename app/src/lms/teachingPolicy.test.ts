import { describe, expect, it } from "vitest";
import {
  attendanceRateForSubject,
  canEditEngagementScore,
  deriveTeachingScheduleState,
  engagementLevelFromScore,
  formatTimetableDuration,
  groupTimetableByDay,
  jakartaDateTime,
  summarizeTimetable,
  teachingTimeRangesOverlap,
  timetableSlotMinutes,
  timetableSlotPhase,
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

describe("teaching timetable helpers", () => {
  const slots = [
    { id: "c", dayOfWeek: 3, startTime: "13:00", endTime: "14:20", classRoomId: "k1", courseId: "m1" },
    { id: "a", dayOfWeek: 1, startTime: "09:40", endTime: "11:00", classRoomId: "k1", courseId: "m1" },
    { id: "b", dayOfWeek: 1, startTime: "07:20", endTime: "08:40", classRoomId: "k2", courseId: "m2" },
  ];

  it("groups by day, sorts by start time and always keeps Monday to Friday", () => {
    const days = groupTimetableByDay(slots);
    expect(days.map((day) => day.label)).toEqual(["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]);
    expect(days[0].slots.map((slot) => slot.id)).toEqual(["b", "a"]);
    expect(days[0].minutes).toBe(80 + 80);
    expect(days[1].slots).toEqual([]);
  });

  it("only shows Saturday and Sunday when they have sessions, Sunday last", () => {
    const days = groupTimetableByDay([
      ...slots,
      { id: "s", dayOfWeek: 6, startTime: "08:00", endTime: "09:00", classRoomId: "k1", courseId: "m1" },
      { id: "m", dayOfWeek: 0, startTime: "08:00", endTime: "09:00", classRoomId: "k1", courseId: "m1" },
    ]);
    expect(days.map((day) => day.label)).toEqual(["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]);
  });

  it("summarises sessions, minutes, days, classes and courses", () => {
    expect(summarizeTimetable(slots)).toEqual({ sessions: 3, minutes: 240, activeDays: 2, classes: 2, courses: 2 });
    expect(summarizeTimetable([])).toEqual({ sessions: 0, minutes: 0, activeDays: 0, classes: 0, courses: 0 });
  });

  it("treats invalid ranges as zero minutes", () => {
    expect(timetableSlotMinutes({ startTime: "10:00", endTime: "09:00" })).toBe(0);
    expect(timetableSlotMinutes({ startTime: "xx", endTime: "09:00" })).toBe(0);
  });

  it("formats durations in Indonesian", () => {
    expect(formatTimetableDuration(0)).toBe("0 menit");
    expect(formatTimetableDuration(40)).toBe("40 menit");
    expect(formatTimetableDuration(120)).toBe("2 jam");
    expect(formatTimetableDuration(160)).toBe("2 jam 40 menit");
  });

  it("places a slot before, during and after the current time on the same weekday only", () => {
    const slot = { dayOfWeek: 2, startTime: "08:00", endTime: "09:20" };
    expect(timetableSlotPhase(slot, { weekday: 2, localTime: "07:59" })).toBe("UPCOMING");
    expect(timetableSlotPhase(slot, { weekday: 2, localTime: "08:00" })).toBe("NOW");
    expect(timetableSlotPhase(slot, { weekday: 2, localTime: "09:19" })).toBe("NOW");
    expect(timetableSlotPhase(slot, { weekday: 2, localTime: "09:20" })).toBe("DONE");
    expect(timetableSlotPhase(slot, { weekday: 3, localTime: "08:30" })).toBe("OTHER_DAY");
  });
});
