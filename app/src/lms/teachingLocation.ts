import { calculateDistanceMeters } from "../shared/geofence";

/** Batas SLA mulai KBM; sama dengan `slaMinutes` pada workspace KBM Hari Ini. */
export const TEACHING_CHECKIN_SLA_MINUTES = 15;

export type SchoolPoint = {
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  maxGpsAccuracyMeters: number;
} | null;

export type LocationFlag =
  | "GEOFENCE_UNCONFIGURED"
  | "NO_COORDINATES"
  | "LOW_ACCURACY"
  | "CHECKOUT_WITHOUT_CHECKIN"
  | "LATE_CHECKIN"
  | "MISSING_CHECKOUT";

export const LOCATION_FLAG_LABELS: Record<LocationFlag, string> = {
  GEOFENCE_UNCONFIGURED: "Geofence belum diatur saat check-in",
  NO_COORDINATES: "Check-in/out tanpa koordinat",
  LOW_ACCURACY: "Akurasi GPS rendah",
  CHECKOUT_WITHOUT_CHECKIN: "Check-out tanpa check-in",
  LATE_CHECKIN: "Check-in terlambat",
  MISSING_CHECKOUT: "Belum check-out",
};

type DateLike = Date | string | null | undefined;

export type TeachingSessionLocationSource = {
  status: string;
  scheduledStartAt: DateLike;
  scheduledEndAt: DateLike;
  teacherCheckInAt?: DateLike;
  teacherCheckOutAt?: DateLike;
  checkInLatitude?: number | null;
  checkInLongitude?: number | null;
  checkInAccuracy?: number | null;
  checkInDistanceM?: number | null;
  checkInGeofence?: string | null;
  checkInEvidenceKey?: string | null;
  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
  checkOutAccuracy?: number | null;
  checkOutDistanceM?: number | null;
  checkOutGeofence?: string | null;
  checkOutEvidenceKey?: string | null;
};

export type SessionPoint = {
  kind: "CHECK_IN" | "CHECK_OUT";
  at: Date | null;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  /** Jarak ke titik sekolah. Memakai nilai yang tercatat saat check-in; bila kosong dihitung dari titik sekolah sekarang. */
  distanceFromSchoolM: number | null;
  distanceIsRecomputed: boolean;
  geofence: string | null;
  hasEvidence: boolean;
};

export type SessionLocation = {
  checkIn: SessionPoint | null;
  checkOut: SessionPoint | null;
  /** Jarak antara titik check-in dan check-out. */
  checkInToOutM: number | null;
  flags: LocationFlag[];
};

function toDate(value: DateLike): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function point(
  kind: SessionPoint["kind"],
  at: DateLike,
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  accuracy: number | null | undefined,
  storedDistance: number | null | undefined,
  geofence: string | null | undefined,
  evidenceKey: string | null | undefined,
  school: SchoolPoint,
): SessionPoint | null {
  if (latitude == null || longitude == null) return null;
  let distanceFromSchoolM: number | null = storedDistance ?? null;
  let distanceIsRecomputed = false;
  if (distanceFromSchoolM === null && school?.latitude != null && school?.longitude != null) {
    distanceFromSchoolM = calculateDistanceMeters(latitude, longitude, school.latitude, school.longitude);
    distanceIsRecomputed = true;
  }
  return {
    kind,
    at: toDate(at),
    latitude,
    longitude,
    accuracyM: accuracy ?? null,
    distanceFromSchoolM,
    distanceIsRecomputed,
    geofence: geofence ?? null,
    hasEvidence: !!evidenceKey,
  };
}

/**
 * Merangkum lokasi check-in/out sebuah sesi KBM dan tanda yang perlu ditinjau.
 * Hanya memakai kondisi objektif; tidak menyimpulkan apakah guru berada di kelas.
 */
export function describeSessionLocation(
  session: TeachingSessionLocationSource,
  school: SchoolPoint,
  now: Date = new Date(),
): SessionLocation {
  const checkIn = point(
    "CHECK_IN", session.teacherCheckInAt, session.checkInLatitude, session.checkInLongitude,
    session.checkInAccuracy, session.checkInDistanceM, session.checkInGeofence, session.checkInEvidenceKey, school,
  );
  const checkOut = point(
    "CHECK_OUT", session.teacherCheckOutAt, session.checkOutLatitude, session.checkOutLongitude,
    session.checkOutAccuracy, session.checkOutDistanceM, session.checkOutGeofence, session.checkOutEvidenceKey, school,
  );

  const checkInAt = toDate(session.teacherCheckInAt);
  const checkOutAt = toDate(session.teacherCheckOutAt);
  const startAt = toDate(session.scheduledStartAt);
  const endAt = toDate(session.scheduledEndAt);
  const flags: LocationFlag[] = [];

  if (session.checkInGeofence === "UNCONFIGURED" || session.checkOutGeofence === "UNCONFIGURED") {
    flags.push("GEOFENCE_UNCONFIGURED");
  }
  if ((checkInAt && !checkIn) || (checkOutAt && !checkOut)) flags.push("NO_COORDINATES");
  const maxAccuracy = school?.maxGpsAccuracyMeters;
  if (maxAccuracy && [checkIn, checkOut].some((p) => p?.accuracyM != null && p.accuracyM > maxAccuracy)) {
    flags.push("LOW_ACCURACY");
  }
  if (checkOutAt && !checkInAt) flags.push("CHECKOUT_WITHOUT_CHECKIN");
  if (checkInAt && startAt && checkInAt.getTime() > startAt.getTime() + TEACHING_CHECKIN_SLA_MINUTES * 60_000) {
    flags.push("LATE_CHECKIN");
  }
  if (session.status === "IN_PROGRESS" && endAt && endAt.getTime() < now.getTime()) flags.push("MISSING_CHECKOUT");

  return {
    checkIn,
    checkOut,
    checkInToOutM: checkIn && checkOut
      ? calculateDistanceMeters(checkIn.latitude, checkIn.longitude, checkOut.latitude, checkOut.longitude)
      : null,
    flags,
  };
}

export function formatCoordinate(value: number): string {
  return value.toFixed(6);
}
