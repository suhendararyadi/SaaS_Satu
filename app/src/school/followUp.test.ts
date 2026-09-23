import { describe, expect, it } from "vitest";
import { defaultFollowUpDueDate, isOpenFollowUpStatus, nextFollowUpStatuses } from "./followUp";

describe("follow-up workflow helpers", () => {
  it("treats resolved and canceled cases as closed", () => {
    expect(isOpenFollowUpStatus("FINDING")).toBe(true);
    expect(isOpenFollowUpStatus("IN_PROGRESS")).toBe(true);
    expect(isOpenFollowUpStatus("RESOLVED")).toBe(false);
    expect(isOpenFollowUpStatus("CANCELED")).toBe(false);
  });

  it("enforces a practical forward workflow", () => {
    expect(nextFollowUpStatuses("FINDING")).toContain("ASSIGNED");
    expect(nextFollowUpStatuses("ASSIGNED")).toContain("IN_PROGRESS");
    expect(nextFollowUpStatuses("IN_PROGRESS")).toContain("RESOLVED");
    expect(nextFollowUpStatuses("RESOLVED")).toEqual(["IN_PROGRESS"]);
  });

  it("gives critical findings the shortest due window", () => {
    const now = new Date("2026-09-14T00:00:00.000Z");
    const critical = defaultFollowUpDueDate("CRITICAL", now);
    const low = defaultFollowUpDueDate("LOW", now);
    expect(critical.getTime() - now.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(low.getTime()).toBeGreaterThan(critical.getTime());
  });
});
