export const SUBJECT_ATTENDANCE_STATUSES = [
  "HADIR",
  "TERLAMBAT",
  "SAKIT",
  "IZIN",
  "DISPENSASI",
  "ALPA",
] as const;

export type SubjectAttendanceStatus = (typeof SUBJECT_ATTENDANCE_STATUSES)[number];

export function globalAttendanceToSubjectDefault(
  status: string | null | undefined,
): SubjectAttendanceStatus | null {
  if (status === "HADIR" || status === "TERLAMBAT") return "HADIR";
  if (status === "SAKIT") return "SAKIT";
  if (status === "IZIN") return "IZIN";
  if (status === "ALPA") return "ALPA";
  return null;
}
