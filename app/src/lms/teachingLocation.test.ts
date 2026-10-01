import { describe, expect, it } from "vitest";
import {
  LOCATION_FLAG_LABELS,
  describeSessionLocation,
  formatCoordinate,
  type TeachingSessionLocationSource,
} from "./teachingLocation";

const school = { latitude: -7.2, longitude: 107.9, radiusMeters: 100, maxGpsAccuracyMeters: 50 };
const base: TeachingSessionLocationSource = {
  status: "COMPLETED",
  scheduledStartAt: "2026-10-05T00:00:00.000Z",
  scheduledEndAt: "2026-10-05T01:20:00.000Z",
  teacherCheckInAt: "2026-10-05T00:02:00.000Z",
  teacherCheckOutAt: "2026-10-05T01:21:00.000Z",
  checkInLatitude: -7.2001, checkInLongitude: 107.9002, checkInAccuracy: 12, checkInDistanceM: 17, checkInGeofence: "INSIDE", checkInEvidenceKey: "k1",
  checkOutLatitude: -7.2003, checkOutLongitude: 107.9004, checkOutAccuracy: 20, checkOutDistanceM: 40, checkOutGeofence: "INSIDE", checkOutEvidenceKey: "k2",
};
const now = new Date("2026-10-05T03:00:00.000Z");

describe("describeSessionLocation", () => {
  it("summarises both points and raises no flag for a normal session", () => {
    const result = describeSessionLocation(base, school, now);
    expect(result.flags).toEqual([]);
    expect(result.checkIn).toMatchObject({ latitude: -7.2001, accuracyM: 12, distanceFromSchoolM: 17, distanceIsRecomputed: false, hasEvidence: true, geofence: "INSIDE" });
    expect(result.checkOut).toMatchObject({ distanceFromSchoolM: 40, hasEvidence: true });
    expect(result.checkInToOutM).toBeGreaterThan(0);
    expect(result.checkInToOutM).toBeLessThan(50);
  });

  it("returns no points for a session that never started", () => {
    const result = describeSessionLocation({ status: "PENDING", scheduledStartAt: base.scheduledStartAt, scheduledEndAt: base.scheduledEndAt }, school, now);
    expect(result).toEqual({ checkIn: null, checkOut: null, checkInToOutM: null, flags: [] });
  });

  it("flags a check-in made while the geofence was not configured and recomputes the distance", () => {
    const result = describeSessionLocation({ ...base, checkInGeofence: "UNCONFIGURED", checkInDistanceM: null }, school, now);
    expect(result.flags).toContain("GEOFENCE_UNCONFIGURED");
    expect(result.checkIn?.distanceIsRecomputed).toBe(true);
    expect(result.checkIn?.distanceFromSchoolM).toBeGreaterThan(0);
  });

  it("leaves the distance empty when neither a stored value nor a school point exists", () => {
    const result = describeSessionLocation({ ...base, checkInDistanceM: null }, { ...school, latitude: null, longitude: null }, now);
    expect(result.checkIn?.distanceFromSchoolM).toBeNull();
  });

  it("flags low accuracy against the policy limit", () => {
    expect(describeSessionLocation({ ...base, checkInAccuracy: 80 }, school, now).flags).toContain("LOW_ACCURACY");
    expect(describeSessionLocation({ ...base, checkOutAccuracy: 50 }, school, now).flags).not.toContain("LOW_ACCURACY");
  });

  it("flags a check-in or check-out recorded without coordinates", () => {
    expect(describeSessionLocation({ ...base, checkInLatitude: null }, school, now).flags).toContain("NO_COORDINATES");
    expect(describeSessionLocation({ ...base, checkOutLongitude: null }, school, now).flags).toContain("NO_COORDINATES");
  });

  it("flags a check-out without a check-in", () => {
    const flags = describeSessionLocation({ ...base, teacherCheckInAt: null, checkInLatitude: null, checkInLongitude: null }, school, now).flags;
    expect(flags).toContain("CHECKOUT_WITHOUT_CHECKIN");
  });

  it("flags a late check-in only after the SLA of 15 minutes", () => {
    expect(describeSessionLocation({ ...base, teacherCheckInAt: "2026-10-05T00:15:00.000Z" }, school, now).flags).not.toContain("LATE_CHECKIN");
    expect(describeSessionLocation({ ...base, teacherCheckInAt: "2026-10-05T00:16:00.000Z" }, school, now).flags).toContain("LATE_CHECKIN");
  });

  it("flags a session still in progress after its scheduled end", () => {
    const open = { ...base, status: "IN_PROGRESS", teacherCheckOutAt: null, checkOutLatitude: null, checkOutLongitude: null };
    expect(describeSessionLocation(open, school, now).flags).toContain("MISSING_CHECKOUT");
    expect(describeSessionLocation(open, school, new Date("2026-10-05T01:00:00.000Z")).flags).not.toContain("MISSING_CHECKOUT");
  });

  it("works without a school point", () => {
    expect(describeSessionLocation(base, null, now).flags).toEqual([]);
  });

  it("has a readable label for every flag", () => {
    for (const label of Object.values(LOCATION_FLAG_LABELS)) expect(label.length).toBeGreaterThan(5);
    expect(formatCoordinate(-7.2001166)).toBe("-7.200117");
  });
});
