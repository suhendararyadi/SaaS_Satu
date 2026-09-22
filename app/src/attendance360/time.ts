export const DEFAULT_ATTENDANCE_TIMEZONE = "Asia/Jakarta";

export type AttendanceLocalParts = {
  dateOnly: string;
  localTime: string;
  weekday: number;
};

export function attendanceLocalParts(
  date = new Date(),
  timeZone = DEFAULT_ATTENDANCE_TIMEZONE,
): AttendanceLocalParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    dateOnly: `${get("year")}-${get("month")}-${get("day")}`,
    localTime: `${get("hour")}:${get("minute")}`,
    weekday: weekdayMap[get("weekday")] ?? date.getUTCDay(),
  };
}

export function timeToMinutes(value: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

export function isValidClockTime(value: string): boolean {
  return timeToMinutes(value) !== null;
}

export function lateMinutes(localTime: string, lateAfter: string): number {
  const current = timeToMinutes(localTime);
  const threshold = timeToMinutes(lateAfter);
  if (current === null || threshold === null) return 0;
  return Math.max(0, current - threshold);
}
