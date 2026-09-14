export const NOTIFICATION_CATEGORIES = [
  "FOLLOW_UP",
  "STUDENT_AFFAIRS",
  "ATTENDANCE",
  "PKL_EWS",
  "DUTY_TEACHER",
  "SARPRAS",
  "RESPONSIBILITY",
] as const;

export type NotificationCategoryCode = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_SEVERITIES = ["INFO", "SUCCESS", "WARNING", "CRITICAL"] as const;
export type NotificationSeverityCode = (typeof NOTIFICATION_SEVERITIES)[number];

export const NOTIFICATION_CATEGORY_META: Record<
  NotificationCategoryCode,
  { label: string; icon: string; href: string }
> = {
  FOLLOW_UP: { label: "Tindak Lanjut", icon: "assignment_turned_in", href: "/school/follow-up" },
  STUDENT_AFFAIRS: { label: "Kesiswaan", icon: "school", href: "/school/student-affairs" },
  ATTENDANCE: { label: "Presensi", icon: "fact_check", href: "/school/attendance" },
  PKL_EWS: { label: "PKL / EWS", icon: "warning", href: "/school/pkl/monitoring" },
  DUTY_TEACHER: { label: "Guru Piket", icon: "schedule", href: "/school/governance/piket" },
  SARPRAS: { label: "Sarpras", icon: "inventory_2", href: "/school/sarpras" },
  RESPONSIBILITY: { label: "Penugasan", icon: "assignment_ind", href: "/school/governance/organization" },
};

export const NOTIFICATION_SEVERITY_RANK: Record<NotificationSeverityCode, number> = {
  CRITICAL: 0,
  WARNING: 1,
  INFO: 2,
  SUCCESS: 3,
};

export type NotificationSourceItem = {
  key: string;
  category: NotificationCategoryCode;
  severity: NotificationSeverityCode;
  title: string;
  message: string;
  href: string;
  icon?: string;
  updatedAt: Date;
  actionLabel?: string;
};

export function isNotificationUnread(
  sourceUpdatedAt: Date | string,
  readAt?: Date | string | null,
) {
  if (!readAt) return true;
  const source = new Date(sourceUpdatedAt).getTime();
  const read = new Date(readAt).getTime();
  if (!Number.isFinite(source) || !Number.isFinite(read)) return true;
  return read < source;
}

export function sortNotifications<T extends NotificationSourceItem>(items: T[]) {
  return [...items].sort((a, b) => {
    const severityDiff =
      NOTIFICATION_SEVERITY_RANK[a.severity] - NOTIFICATION_SEVERITY_RANK[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}

export function notificationKey(category: NotificationCategoryCode, ...parts: Array<string | number>) {
  return [category, ...parts].join(":");
}
