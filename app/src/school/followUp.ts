export const FOLLOW_UP_STATUSES = ["FINDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CANCELED"] as const;
export type FollowUpStatusCode = (typeof FOLLOW_UP_STATUSES)[number];

export const FOLLOW_UP_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type FollowUpSeverityCode = (typeof FOLLOW_UP_SEVERITIES)[number];

export const FOLLOW_UP_STATUS_META: Record<FollowUpStatusCode, { label: string; icon: string }> = {
  FINDING: { label: "Temuan", icon: "flag" },
  ASSIGNED: { label: "Ditugaskan", icon: "assignment_ind" },
  IN_PROGRESS: { label: "Diproses", icon: "pending_actions" },
  RESOLVED: { label: "Selesai", icon: "task_alt" },
  CANCELED: { label: "Dibatalkan", icon: "cancel" },
};

export const FOLLOW_UP_SEVERITY_META: Record<FollowUpSeverityCode, { label: string; rank: number }> = {
  LOW: { label: "Rendah", rank: 1 },
  MEDIUM: { label: "Sedang", rank: 2 },
  HIGH: { label: "Tinggi", rank: 3 },
  CRITICAL: { label: "Kritis", rank: 4 },
};

export function isOpenFollowUpStatus(status: string): boolean {
  return status !== "RESOLVED" && status !== "CANCELED";
}

export function nextFollowUpStatuses(status: FollowUpStatusCode): FollowUpStatusCode[] {
  switch (status) {
    case "FINDING":
      return ["ASSIGNED", "IN_PROGRESS", "CANCELED"];
    case "ASSIGNED":
      return ["IN_PROGRESS", "RESOLVED", "CANCELED"];
    case "IN_PROGRESS":
      return ["RESOLVED", "CANCELED"];
    case "RESOLVED":
      return ["IN_PROGRESS"];
    case "CANCELED":
      return ["FINDING"];
  }
}

export function defaultFollowUpDueDate(severity: FollowUpSeverityCode, now = new Date()): Date {
  const hours = severity === "CRITICAL" ? 24 : severity === "HIGH" ? 72 : severity === "MEDIUM" ? 168 : 336;
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}
