export const WEBSITE_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const WEBSITE_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type WebsiteMediaType = (typeof WEBSITE_MEDIA_TYPES)[number];

export function isWebsiteMediaType(value: string): value is WebsiteMediaType {
  return WEBSITE_MEDIA_TYPES.includes(value as WebsiteMediaType);
}

export function websiteMediaExtension(type: WebsiteMediaType): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export function createWebsiteMediaKey(
  schoolId: string,
  type: WebsiteMediaType,
): string {
  return `website/${schoolId}/${crypto.randomUUID()}.${websiteMediaExtension(type)}`;
}

export function isWebsiteMediaKeyForSchool(
  key: string | null | undefined,
  schoolId: string,
): boolean {
  return !!key && key.startsWith(`website/${schoolId}/`);
}

export function decodeWebsiteMediaHeader(
  value: unknown,
  maxLength: number,
): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return "";
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  return decoded.trim().slice(0, maxLength);
}
