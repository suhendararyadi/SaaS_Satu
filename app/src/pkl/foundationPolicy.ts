export const PKL_PARTNERSHIP_STATUSES = [
  "ACTIVE",
  "DRAFT",
  "EXPIRED",
  "INACTIVE",
] as const;

export type PklPartnershipStatus = (typeof PKL_PARTNERSHIP_STATUSES)[number];

export function normalizePklCode(value?: string | null): string | null {
  const normalized = value?.trim().toUpperCase() || "";
  return normalized || null;
}

export function normalizeOptionalPklText(value?: string | null): string | null {
  const normalized = value?.trim() || "";
  return normalized || null;
}

export function parsePklDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

export function isValidPklDateRange(
  start: Date | null | undefined,
  end: Date | null | undefined,
): boolean {
  if (!start || !end) return true;
  return start < end;
}

export function uniqueIds(values: string[]): string[] {
  return [...new Set(values)];
}
