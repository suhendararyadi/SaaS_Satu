import { describe, expect, it } from "vitest";
import {
  nextCoachingStatuses,
  nextPermitStatuses,
  nextViolationStatuses,
  shouldAutoCreateViolationFollowUp,
  isFutureHistoricalStudentAffairsDate,
  STUDENT_AFFAIRS_STUDENT_LIMIT,
} from "./studentAffairs";

describe("student affairs workflow helpers", () => {
  it("moves violations through handling to resolution", () => {
    expect(nextViolationStatuses("RECORDED")).toContain("IN_REVIEW");
    expect(nextViolationStatuses("IN_REVIEW")).toContain("RESOLVED");
    expect(nextViolationStatuses("RESOLVED")).toEqual(["IN_REVIEW"]);
  });

  it("requires approved permits before return", () => {
    expect(nextPermitStatuses("REQUESTED")).toContain("APPROVED");
    expect(nextPermitStatuses("REQUESTED")).not.toContain("RETURNED");
    expect(nextPermitStatuses("APPROVED")).toContain("RETURNED");
  });

  it("supports coaching closure and reopening", () => {
    expect(nextCoachingStatuses("OPEN")).toContain("IN_PROGRESS");
    expect(nextCoachingStatuses("IN_PROGRESS")).toContain("COMPLETED");
    expect(nextCoachingStatuses("COMPLETED")).toEqual(["IN_PROGRESS"]);
  });

  it("automatically escalates only high-risk violations", () => {
    expect(shouldAutoCreateViolationFollowUp("MEDIUM")).toBe(false);
    expect(shouldAutoCreateViolationFollowUp("HIGH")).toBe(true);
    expect(shouldAutoCreateViolationFollowUp("CRITICAL")).toBe(true);
  });

  it("covers a large school roster and rejects future historical event dates", () => {
    expect(STUDENT_AFFAIRS_STUDENT_LIMIT).toBeGreaterThanOrEqual(1539);
    const now = new Date("2026-09-22T00:00:00.000Z");
    expect(isFutureHistoricalStudentAffairsDate(new Date("2026-09-21T23:59:59.000Z"), now)).toBe(false);
    expect(isFutureHistoricalStudentAffairsDate(new Date("2026-09-22T00:00:01.000Z"), now)).toBe(true);
  });
});
