import { timeToMinutes } from "../attendance360/time";

export const TEACHING_SESSION_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "DELEGATED",
  "ABSENT",
  "CANCELLED",
] as const;

export type TeachingSessionStatus = (typeof TEACHING_SESSION_STATUSES)[number];

export function validateTeachingTimeRange(startTime: string, endTime: string) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return start !== null && end !== null && end > start;
}

export function teachingTimeRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
) {
  const a0 = timeToMinutes(aStart);
  const a1 = timeToMinutes(aEnd);
  const b0 = timeToMinutes(bStart);
  const b1 = timeToMinutes(bEnd);
  if ([a0, a1, b0, b1].some((value) => value === null)) return false;
  return (a0 as number) < (b1 as number) && (b0 as number) < (a1 as number);
}

export function jakartaDateTime(dateOnly: string, time: string) {
  return new Date(`${dateOnly}T${time}:00+07:00`);
}

export function weekdayForDateOnly(dateOnly: string) {
  const date = new Date(`${dateOnly}T12:00:00+07:00`);
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      weekday: "short",
    })
      .formatToParts(date)
      .find((part) => part.type === "weekday")
      ?.value
      .replace("Sun", "0")
      .replace("Mon", "1")
      .replace("Tue", "2")
      .replace("Wed", "3")
      .replace("Thu", "4")
      .replace("Fri", "5")
      .replace("Sat", "6") ?? -1,
  );
}

export function deriveTeachingScheduleState(args: {
  now: Date;
  startAt: Date;
  endAt: Date;
  sessionStatus?: string | null;
  slaMinutes?: number;
}) {
  const slaMinutes = args.slaMinutes ?? 15;
  const status = args.sessionStatus || null;
  if (status === "COMPLETED") return "COMPLETED" as const;
  if (status === "IN_PROGRESS") return "IN_PROGRESS" as const;
  if (status === "DELEGATED") return "DELEGATED" as const;
  if (status === "ABSENT") return "ABSENT" as const;
  if (status === "CANCELLED") return "CANCELLED" as const;
  if (args.now < args.startAt) return "LOCKED" as const;
  if (args.now > args.endAt) return "MISSED" as const;
  const slaAt = new Date(args.startAt.getTime() + slaMinutes * 60_000);
  if (args.now > slaAt) return "SLA_BREACH" as const;
  return "READY" as const;
}

export function engagementLevelFromScore(score: number) {
  if (score >= 90) return "SANGAT_AKTIF" as const;
  if (score >= 80) return "AKTIF" as const;
  if (score >= 70) return "CUKUP" as const;
  return "PERLU_BIMBINGAN" as const;
}

export function engagementDeadline(endAt: Date) {
  return new Date(endAt.getTime() + 7 * 24 * 60 * 60 * 1000);
}

export function canEditEngagementScore(endAt: Date, now = new Date()) {
  return now <= engagementDeadline(endAt);
}

export function attendanceRateForSubject(statuses: readonly string[]) {
  if (!statuses.length) return null;
  const present = statuses.filter((status) => status === "HADIR" || status === "TERLAMBAT" || status === "DISPENSASI").length;
  return Math.round((present / statuses.length) * 100);
}
