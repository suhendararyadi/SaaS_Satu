import { describe, expect, it } from "vitest";
import {
  attendanceRate,
  canUseDailyAttendance,
  isDailyAttendanceAdmin,
  isRequestedIdWithinScope,
  needsAttendanceAttention,
  summarizeAttendanceStatuses,
} from "./dailyAttendanceAccess";

const base = { id: "u1", schoolId: "s1", isAdmin: false } as const;

describe("daily attendance access and reporting helpers", () => {
  it("allows school admins and homeroom teachers, not ordinary teachers", () => {
    expect(isDailyAttendanceAdmin({ ...base, role: "SCHOOL_ADMIN" } as any)).toBe(true);
    expect(isDailyAttendanceAdmin({ ...base, role: "SUPERADMIN" } as any)).toBe(true);
    expect(isDailyAttendanceAdmin({ ...base, role: "TEACHER", isAdmin: true } as any)).toBe(true);
    expect(canUseDailyAttendance({ ...base, role: "TEACHER" } as any, ["c1"])).toBe(true);
    expect(canUseDailyAttendance({ ...base, role: "TEACHER" } as any, [])).toBe(false);
    expect(canUseDailyAttendance({ ...base, role: "STUDENT" } as any, ["c1"])).toBe(false);
    expect(canUseDailyAttendance({ ...base, role: "DUDI_MENTOR" } as any, ["c1"])).toBe(false);
  });

  it("counts statuses and treats late students as present for the rate", () => {
    const records = [
      { status: "HADIR" },
      { status: "TERLAMBAT" },
      { status: "SAKIT" },
      { status: "ALPA" },
    ];
    expect(summarizeAttendanceStatuses(records)).toEqual({
      hadir: 1,
      sakit: 1,
      izin: 0,
      alpa: 1,
      terlambat: 1,
      total: 4,
    });
    expect(attendanceRate(records)).toBe(50);
    expect(attendanceRate([])).toBeNull();
  });

  it("flags the agreed attendance attention thresholds", () => {
    expect(needsAttendanceAttention({ alpa: 3, terlambat: 0, rate: 95 })).toBe(true);
    expect(needsAttendanceAttention({ alpa: 0, terlambat: 5, rate: 95 })).toBe(true);
    expect(needsAttendanceAttention({ alpa: 0, terlambat: 0, rate: 89 })).toBe(true);
    expect(needsAttendanceAttention({ alpa: 1, terlambat: 2, rate: 96 })).toBe(false);
  });
  it("rejects explicit class/student selections outside the scoped collection", () => {
    const scoped = [{ id: "a" }, { id: "b" }];
    expect(isRequestedIdWithinScope(scoped)).toBe(true);
    expect(isRequestedIdWithinScope(scoped, "a")).toBe(true);
    expect(isRequestedIdWithinScope(scoped, "outside")).toBe(false);
  });

});
