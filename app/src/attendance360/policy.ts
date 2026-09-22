import { attendanceLocalParts } from "./time";

export type AttendancePolicyLike = {
  timezone: string;
  workingDays: string;
  checkInOpen: string;
  lateAfter: string;
  checkInClose: string;
  checkOutOpen: string;
  checkOutClose: string;
  isActive: boolean;
};

export type CalendarDayLike = {
  dateOnly: string;
  type: string;
  label: string;
  checkInOpenOverride?: string | null;
  lateAfterOverride?: string | null;
  checkInCloseOverride?: string | null;
  checkOutOpenOverride?: string | null;
  checkOutCloseOverride?: string | null;
} | null;

export function parseWorkingDays(value: string): number[] {
  return [...new Set(
    value.split(",").map((item) => Number(item.trim())).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
  )].sort((a, b) => a - b);
}

export function isClosedCalendarType(type?: string | null): boolean {
  return type === "HOLIDAY" || type === "NATIONAL_HOLIDAY" || type === "SEMESTER_BREAK";
}

export function resolveAttendanceDay(
  policy: AttendancePolicyLike,
  calendarDay: CalendarDayLike,
  now = new Date(),
) {
  const local = attendanceLocalParts(now, policy.timezone);
  const workingDays = parseWorkingDays(policy.workingDays);
  const calendarForDate = calendarDay?.dateOnly === local.dateOnly ? calendarDay : null;
  const forcedSchoolDay = calendarForDate?.type === "SCHOOL_DAY" || calendarForDate?.type === "SCHOOL_EVENT" || calendarForDate?.type === "EXAM_DAY" || calendarForDate?.type === "SPECIAL_SCHEDULE";
  const closed = isClosedCalendarType(calendarForDate?.type);
  const isSchoolDay = policy.isActive && !closed && (forcedSchoolDay || workingDays.includes(local.weekday));
  return {
    ...local,
    isSchoolDay,
    dayLabel: calendarForDate?.label || (isSchoolDay ? "Hari sekolah" : "Di luar hari operasional"),
    schedule: {
      checkInOpen: calendarForDate?.checkInOpenOverride || policy.checkInOpen,
      lateAfter: calendarForDate?.lateAfterOverride || policy.lateAfter,
      checkInClose: calendarForDate?.checkInCloseOverride || policy.checkInClose,
      checkOutOpen: calendarForDate?.checkOutOpenOverride || policy.checkOutOpen,
      checkOutClose: calendarForDate?.checkOutCloseOverride || policy.checkOutClose,
    },
  };
}
