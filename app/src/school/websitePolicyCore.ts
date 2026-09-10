import * as z from "zod";

export const cmsContentTypeSchema = z.enum(["PAGE", "NEWS", "EVENT", "ANNOUNCEMENT"]);
export const cmsContentStatusSchema = z.enum(["DRAFT", "IN_REVIEW", "SCHEDULED", "PUBLISHED", "ARCHIVED"]);
export const schoolSiteStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);
export const navLocationSchema = z.enum(["HEADER", "FOOTER"]);
export const navTypeSchema = z.enum(["PAGE", "ROUTE", "EXTERNAL"]);

export const contentBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("heading"), text: z.string().trim().min(1).max(180) }),
  z.object({ type: z.literal("paragraph"), text: z.string().trim().min(1).max(4000) }),
  z.object({ type: z.literal("quote"), text: z.string().trim().min(1).max(1200) }),
  z.object({ type: z.literal("callout"), text: z.string().trim().min(1).max(1200) }),
]);

export const contentBlocksSchema = z.array(contentBlockSchema).max(120);
export type CmsContentBlock = z.infer<typeof contentBlockSchema>;

export function slugifyCms(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "konten";
}

export function textToContentBlocks(value: string): CmsContentBlock[] {
  const chunks = value
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 120);

  return chunks.map((part) => {
    if (part.startsWith("## ")) return { type: "heading" as const, text: part.slice(3).trim().slice(0, 180) };
    if (part.startsWith("> ")) return { type: "quote" as const, text: part.slice(2).trim().slice(0, 1200) };
    if (part.startsWith("! ")) return { type: "callout" as const, text: part.slice(2).trim().slice(0, 1200) };
    return { type: "paragraph" as const, text: part.slice(0, 4000) };
  });
}

export function contentBlocksToText(value: unknown): string {
  const parsed = contentBlocksSchema.safeParse(value);
  if (!parsed.success) return "";
  return parsed.data.map((block) => {
    if (block.type === "heading") return `## ${block.text}`;
    if (block.type === "quote") return `> ${block.text}`;
    if (block.type === "callout") return `! ${block.text}`;
    return block.text;
  }).join("\n\n");
}

export function isCmsContentPublic(content: { status: string; scheduledAt?: Date | string | null; publishedAt?: Date | string | null }, now = new Date()): boolean {
  if (content.status === "PUBLISHED") return true;
  if (content.status !== "SCHEDULED" || !content.scheduledAt) return false;
  return new Date(content.scheduledAt).getTime() <= now.getTime();
}

export function isAnnouncementActive(content: { startsAt?: Date | string | null; endsAt?: Date | string | null }, now = new Date()): boolean {
  if (content.startsAt && new Date(content.startsAt).getTime() > now.getTime()) return false;
  if (content.endsAt && new Date(content.endsAt).getTime() < now.getTime()) return false;
  return true;
}

export function sameCmsTenant(resourceSchoolId: string, activeSchoolId: string): boolean {
  return resourceSchoolId === activeSchoolId;
}
