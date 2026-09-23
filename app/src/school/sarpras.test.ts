import { describe, expect, it } from "vitest";
import { nextMaintenanceStatuses } from "./sarpras";

describe("sarpras workflow helpers", () => {
  it("allows reported maintenance to be planned or started", () => {
    expect(nextMaintenanceStatuses("REPORTED")).toContain("PLANNED");
    expect(nextMaintenanceStatuses("REPORTED")).toContain("IN_PROGRESS");
  });

  it("only closes active work through completion or cancellation", () => {
    expect(nextMaintenanceStatuses("IN_PROGRESS")).toEqual(["COMPLETED", "CANCELED"]);
  });

  it("supports reopening completed maintenance", () => {
    expect(nextMaintenanceStatuses("COMPLETED")).toEqual(["IN_PROGRESS"]);
  });
});
