import { describe, expect, it } from "vitest";
import {
  evaluatePlacementReadiness,
  getScheduleStatus,
  isWorkingDay,
  normalizeTime,
  normalizeWorkingDays,
  resolveJournalOverallStatus,
  toCsv,
} from "./gen2Policy";

describe("PKL Gen2 policy", () => {
  it("blocks activation when core readiness is incomplete", () => {
    const result = evaluatePlacementReadiness({
      hasPeriod: true,
      periodActive: true,
      dateInsidePeriod: true,
      companyActive: true,
      companyPartnershipActive: true,
      acceptsDepartment: true,
      capacityConfigured: true,
      capacityRemaining: 2,
      hasTeacher: true,
      hasMentor: false,
      hasGps: false,
    });
    expect(result.ready).toBe(false);
    expect(result.blockers.map((x) => x.code)).toEqual(["MENTOR"]);
    expect(result.warnings.map((x) => x.code)).toEqual(["GPS"]);
  });

  it("returns ready when all blockers pass", () => {
    expect(evaluatePlacementReadiness({
      hasPeriod: true, periodActive: true, dateInsidePeriod: true,
      companyActive: true, companyPartnershipActive: true,
      acceptsDepartment: true, capacityConfigured: true, capacityRemaining: 1,
      hasTeacher: true, hasMentor: true, hasGps: true,
    }).ready).toBe(true);
  });

  it("normalizes work days and time", () => {
    expect(normalizeWorkingDays("5,1,1,3")).toEqual([1,3,5]);
    expect(isWorkingDay(3, "1,3,5")).toBe(true);
    expect(normalizeTime("7:05")).toBe("07:05");
    expect(normalizeTime("25:00")).toBeNull();
  });

  it("marks late attendance from configured threshold", () => {
    expect(getScheduleStatus("07:00", "07:15")).toBe("ON_TIME");
    expect(getScheduleStatus("07:16", "07:15")).toBe("LATE");
    expect(getScheduleStatus("07:16", null)).toBe("UNSCHEDULED");
  });

  it("resolves dual journal approvals", () => {
    expect(resolveJournalOverallStatus({ teacherRequired: true, mentorRequired: true, teacherStatus: "APPROVED", mentorStatus: null })).toBe("SUBMITTED");
    expect(resolveJournalOverallStatus({ teacherRequired: true, mentorRequired: true, teacherStatus: "APPROVED", mentorStatus: "APPROVED" })).toBe("APPROVED");
    expect(resolveJournalOverallStatus({ teacherRequired: true, mentorRequired: true, teacherStatus: "REVISION", mentorStatus: "APPROVED" })).toBe("REVISION");
  });

  it("escapes CSV output", () => {
    expect(toCsv(["Nama","Catatan"], [["A","x,y"],["B",'a"b']])).toContain('"x,y"');
    expect(toCsv(["Nama","Catatan"], [["A","x,y"],["B",'a"b']])).toContain('"a""b"');
  });
});
