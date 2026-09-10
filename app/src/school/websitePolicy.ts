import { HttpError } from "wasp/server";
export {
  cmsContentTypeSchema,
  cmsContentStatusSchema,
  schoolSiteStatusSchema,
  navLocationSchema,
  navTypeSchema,
  contentBlockSchema,
  contentBlocksSchema,
  slugifyCms,
  textToContentBlocks,
  contentBlocksToText,
  isCmsContentPublic,
  isAnnouncementActive,
} from "./websitePolicyCore";
import { sameCmsTenant } from "./websitePolicyCore";

export function assertCmsTenant(resourceSchoolId: string, activeSchoolId: string): void {
  if (!sameCmsTenant(resourceSchoolId, activeSchoolId)) throw new HttpError(404, "Konten website tidak ditemukan pada sekolah aktif.");
}

export function validatePublicMediaUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed.slice(0, 1200);
  let url: URL;
  try { url = new URL(trimmed); } catch { throw new HttpError(400, "URL media tidak valid."); }
  if (url.protocol !== "https:") throw new HttpError(400, "Media publik wajib menggunakan HTTPS.");
  return url.toString().slice(0, 1200);
}

export function validateExternalHref(value: string): string {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new HttpError(400, "Tautan eksternal tidak valid."); }
  if (url.protocol !== "https:") throw new HttpError(400, "Tautan eksternal wajib menggunakan HTTPS.");
  return url.toString().slice(0, 1200);
}
