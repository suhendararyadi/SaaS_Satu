import { describe, expect, it } from "vitest";
import { calculateDistanceMeters, isWithinGeofence } from "../shared/geofence";
import { attendanceLocalParts, lateMinutes, timeToMinutes } from "./time";
import { parseWorkingDays, resolveAttendanceDay } from "./policy";
import { reconcileAttendanceEvidence } from "./reconciliation";

const policy = {
  timezone: "Asia/Jakarta",
  workingDays: "1,2,3,4,5",
  checkInOpen: "05:30",
  lateAfter: "07:00",
  checkInClose: "09:00",
  checkOutOpen: "15:00",
  checkOutClose: "17:00",
  isActive: true,
};

describe("Attendance 360 core", () => {
  it("uses Jakarta server-local date/time deterministically", () => {
    expect(attendanceLocalParts(new Date("2026-09-22T00:05:00.000Z"))).toEqual({ dateOnly: "2026-09-22", localTime: "07:05", weekday: 2 });
    expect(timeToMinutes("07:05")).toBe(425);
    expect(lateMinutes("07:05", "07:00")).toBe(5);
  });

  it("normalizes working days and respects a holiday override", () => {
    expect(parseWorkingDays("5,1,2,2,3,4")).toEqual([1,2,3,4,5]);
    const normal = resolveAttendanceDay(policy, null, new Date("2026-09-22T00:00:00.000Z"));
    expect(normal.isSchoolDay).toBe(true);
    const holiday = resolveAttendanceDay(policy, { dateOnly: "2026-09-22", type: "HOLIDAY", label: "Libur khusus" }, new Date("2026-09-22T00:00:00.000Z"));
    expect(holiday.isSchoolDay).toBe(false);
    expect(holiday.dayLabel).toBe("Libur khusus");
  });

  it("reuses geofence math for school and PKL attendance", () => {
    expect(calculateDistanceMeters(-7.00113124, 107.27165777, -7.00113124, 107.27165777)).toBe(0);
    expect(isWithinGeofence(-7.00113124, 107.27165777, -7.00113124, 107.27165777, 100).isWithin).toBe(true);
  });

  it("reconciles valid check-in and subject presence to present", () => {
    const result = reconcileAttendanceEvidence([
      { type: "SELF_CHECK_IN", status: "HADIR", occurredAt: new Date("2026-09-22T00:00:00Z"), metadata: { lateMinutes: 0 } },
      { type: "SUBJECT_ATTENDANCE", status: "HADIR", occurredAt: new Date("2026-09-22T01:00:00Z") },
    ]);
    expect(result.status).toBe("HADIR");
    expect(result.reconciliationStatus).toBe("AUTO");
  });

  it("retains presence when a verified early-leave event exists", () => {
    const result = reconcileAttendanceEvidence([
      { type: "SELF_CHECK_IN", status: "HADIR", occurredAt: new Date("2026-09-22T00:00:00Z") },
      { type: "DUTY_EARLY_LEAVE", status: "IZIN", occurredAt: new Date("2026-09-22T04:00:00Z") },
    ]);
    expect(result.status).toBe("HADIR");
    expect(result.earlyLeave).toBe(true);
  });

  it("keeps global presence independent from repeated subject absence", () => {
    const result = reconcileAttendanceEvidence([
      { type: "SELF_CHECK_IN", status: "HADIR", occurredAt: new Date("2026-09-22T00:00:00Z") },
      { type: "SUBJECT_ATTENDANCE", status: "ALPA", occurredAt: new Date("2026-09-22T01:00:00Z") },
      { type: "SUBJECT_ATTENDANCE", status: "ALPA", occurredAt: new Date("2026-09-22T02:00:00Z") },
    ]);
    expect(result.status).toBe("HADIR");
    expect(result.reconciliationStatus).toBe("AUTO");
    expect(result.evidenceSummary.subjectAbsentCount).toBe(2);
  });

  it("does not derive global attendance from subject attendance alone", () => {
    const result = reconcileAttendanceEvidence([
      { type: "SUBJECT_ATTENDANCE", status: "HADIR", occurredAt: new Date("2026-09-22T01:00:00Z") },
      { type: "SUBJECT_ATTENDANCE", status: "ALPA", occurredAt: new Date("2026-09-22T02:00:00Z") },
    ]);
    expect(result.status).toBeNull();
    expect(result.arrivalAt).toBeNull();
    expect(result.reconciliationStatus).toBe("AUTO");
  });
});
