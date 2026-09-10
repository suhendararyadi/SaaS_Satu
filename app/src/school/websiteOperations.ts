import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { requireSchoolAdmin } from "./authGuards";
import { isFileUploadConfigured } from "../file-upload/config";
import {
  assertCmsTenant,
  cmsContentStatusSchema,
  cmsContentTypeSchema,
  contentBlocksToText,
  isAnnouncementActive,
  isCmsContentPublic,
  landingSectionsSchema,
  normalizeLandingSections,
  navLocationSchema,
  navTypeSchema,
  slugifyCms,
  textToContentBlocks,
  validateExternalHref,
  validatePublicMediaUrl,
} from "./websitePolicy";

const PUBLIC_ORIGIN = "https://sekolah.suhendararyadi.com";

type SchoolContext = { user?: User };

function nullableTrimmed(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseOptionalDate(value: string | null | undefined, field: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, `${field} tidak valid.`);
  return date;
}

function serializeContent(item: any) {
  return {
    ...item,
    bodyText: contentBlocksToText(item.contentBlocks),
  };
}

function publicStatusWhere(now: Date) {
  return {
    OR: [
      { status: "PUBLISHED" as const },
      { status: "SCHEDULED" as const, scheduledAt: { lte: now } },
    ],
  };
}

function publicDepartments(items: Array<{ id: string; code: string; name: string }>) {
  return items.filter((item) => {
    const code = item.code.trim().toUpperCase();
    const name = item.name.trim().toUpperCase();
    return !code.startsWith("DEMO-") && !name.startsWith("[DEMO]");
  });
}

function jsonSnapshot(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function serializeSite(site: any) {
  if (!site) return null;
  return { ...site, landingSections: normalizeLandingSections(site.landingSections) };
}

async function recordRevision({
  schoolId, resourceType, resourceId, action, snapshot, createdById,
}: {
  schoolId: string; resourceType: "SITE" | "CONTENT" | "NAV" | "MEDIA"; resourceId?: string | null; action: string; snapshot: unknown; createdById: string;
}) {
  return prisma.schoolSiteRevision.create({
    data: { schoolId, resourceType, resourceId: resourceId ?? null, action, snapshot: jsonSnapshot(snapshot), createdById },
  });
}

function normalizeSocialLinks(value: Record<string, string | null | undefined> | null | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!value) return result;
  for (const [key, href] of Object.entries(value)) {
    const trimmed = href?.trim();
    if (!trimmed) continue;
    result[key] = validateExternalHref(trimmed);
  }
  return result;
}

async function requireTenantContent(id: string, schoolId: string) {
  const item = await prisma.schoolSiteContent.findUnique({ where: { id } });
  if (!item) throw new HttpError(404, "Konten website tidak ditemukan.");
  assertCmsTenant(item.schoolId, schoolId);
  return item;
}

async function requireTenantNav(id: string, schoolId: string) {
  const item = await prisma.schoolSiteNavItem.findUnique({ where: { id } });
  if (!item) throw new HttpError(404, "Item navigasi tidak ditemukan.");
  assertCmsTenant(item.schoolId, schoolId);
  return item;
}

async function requireTenantMedia(id: string, schoolId: string) {
  const item = await prisma.schoolSiteMedia.findUnique({ where: { id } });
  if (!item) throw new HttpError(404, "Media website tidak ditemukan.");
  assertCmsTenant(item.schoolId, schoolId);
  return item;
}

export const getSchoolWebsiteAdmin = async (_args: unknown, context: SchoolContext) => {
  const user = requireSchoolAdmin(context);
  const [school, site, contents, navItems, media, revisions] = await Promise.all([
    prisma.school.findUnique({
      where: { id: user.schoolId },
      select: { id: true, name: true, slug: true, logoUrl: true, address: true, city: true, province: true, email: true, phone: true, departments: { select: { id: true, code: true, name: true }, orderBy: { code: "asc" } } },
    }),
    prisma.schoolSite.findUnique({ where: { schoolId: user.schoolId } }),
    prisma.schoolSiteContent.findMany({ where: { schoolId: user.schoolId }, orderBy: [{ type: "asc" }, { updatedAt: "desc" }] }),
    prisma.schoolSiteNavItem.findMany({ where: { schoolId: user.schoolId }, orderBy: [{ location: "asc" }, { order: "asc" }, { label: "asc" }] }),
    prisma.schoolSiteMedia.findMany({ where: { schoolId: user.schoolId }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.schoolSiteRevision.findMany({ where: { schoolId: user.schoolId }, orderBy: { createdAt: "desc" }, take: 60 }),
  ]);
  if (!school) throw new HttpError(404, "Sekolah aktif tidak ditemukan.");

  const counts = contents.reduce((acc: Record<string, number>, item: any) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  const actorIds = [...new Set(revisions.map((item: any) => item.createdById))];
  const actors = actorIds.length ? await prisma.user.findMany({
    where: { id: { in: actorIds }, schoolId: user.schoolId },
    select: { id: true, name: true, email: true },
  }) : [];
  const actorById = new Map(actors.map((item: any) => [item.id, item]));

  return {
    school,
    site: serializeSite(site),
    contents: contents.map(serializeContent),
    navItems,
    media,
    counts,
    revisions: revisions.map((item: any) => ({ ...item, actor: actorById.get(item.createdById) ?? null })),
    mediaUploadEnabled: isFileUploadConfigured(),
    publicUrl: `${PUBLIC_ORIGIN}/site/${school.slug}`,
  };
};

const siteSettingsSchema = z.object({
  siteTitle: z.string().trim().min(3).max(120),
  tagline: z.string().trim().max(220).optional().nullable(),
  heroTitle: z.string().trim().max(180).optional().nullable(),
  heroSubtitle: z.string().trim().max(360).optional().nullable(),
  heroImageUrl: z.string().max(1200).optional().nullable(),
  defaultSeoTitle: z.string().trim().max(70).optional().nullable(),
  defaultSeoDescription: z.string().trim().max(180).optional().nullable(),
  publicEmail: z.string().trim().email().optional().nullable().or(z.literal("")),
  publicPhone: z.string().trim().max(40).optional().nullable(),
  socialLinks: z.object({
    instagram: z.string().max(1200).optional().nullable(),
    youtube: z.string().max(1200).optional().nullable(),
    facebook: z.string().max(1200).optional().nullable(),
    tiktok: z.string().max(1200).optional().nullable(),
  }).optional().nullable(),
  themePreset: z.enum(["CLEAN_SCHOOL", "EDITORIAL", "CAMPUS"]).default("CLEAN_SCHOOL"),
  robotsIndex: z.boolean().default(false),
});

export const initializeSchoolWebsite = async (_args: unknown, context: SchoolContext) => {
  const user = requireSchoolAdmin(context);
  const school = await prisma.school.findUnique({ where: { id: user.schoolId }, select: { name: true, email: true, phone: true } });
  if (!school) throw new HttpError(404, "Sekolah aktif tidak ditemukan.");
  const site = await prisma.schoolSite.upsert({
    where: { schoolId: user.schoolId },
    update: {},
    create: {
      schoolId: user.schoolId,
      siteTitle: school.name,
      heroTitle: school.name,
      tagline: "Website resmi sekolah",
      publicEmail: school.email,
      publicPhone: school.phone,
      landingSections: normalizeLandingSections(null),
    },
  });
  await recordRevision({ schoolId: user.schoolId, resourceType: "SITE", resourceId: site.id, action: "INITIALIZE_SITE", snapshot: serializeSite(site), createdById: user.id });
  return serializeSite(site);
};

export const updateSchoolWebsiteSettings = async (rawArgs: unknown, context: SchoolContext) => {
  const user = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(siteSettingsSchema, rawArgs);
  const site = await prisma.schoolSite.upsert({
    where: { schoolId: user.schoolId },
    update: {
      siteTitle: args.siteTitle,
      tagline: nullableTrimmed(args.tagline),
      heroTitle: nullableTrimmed(args.heroTitle),
      heroSubtitle: nullableTrimmed(args.heroSubtitle),
      heroImageUrl: validatePublicMediaUrl(args.heroImageUrl),
      defaultSeoTitle: nullableTrimmed(args.defaultSeoTitle),
      defaultSeoDescription: nullableTrimmed(args.defaultSeoDescription),
      publicEmail: nullableTrimmed(args.publicEmail),
      publicPhone: nullableTrimmed(args.publicPhone),
      socialLinks: normalizeSocialLinks(args.socialLinks),
      themePreset: args.themePreset,
      robotsIndex: args.robotsIndex,
    },
    create: {
      schoolId: user.schoolId,
      siteTitle: args.siteTitle,
      tagline: nullableTrimmed(args.tagline),
      heroTitle: nullableTrimmed(args.heroTitle),
      heroSubtitle: nullableTrimmed(args.heroSubtitle),
      heroImageUrl: validatePublicMediaUrl(args.heroImageUrl),
      defaultSeoTitle: nullableTrimmed(args.defaultSeoTitle),
      defaultSeoDescription: nullableTrimmed(args.defaultSeoDescription),
      publicEmail: nullableTrimmed(args.publicEmail),
      publicPhone: nullableTrimmed(args.publicPhone),
      socialLinks: normalizeSocialLinks(args.socialLinks),
      themePreset: args.themePreset,
      robotsIndex: args.robotsIndex,
    },
  });
  await recordRevision({ schoolId: user.schoolId, resourceType: "SITE", resourceId: site.id, action: "UPDATE_SETTINGS", snapshot: serializeSite(site), createdById: user.id });
  return serializeSite(site);
};

const landingSectionsInputSchema = z.object({ sections: landingSectionsSchema });

export const updateSchoolWebsiteLandingSections = async (rawArgs: unknown, context: SchoolContext) => {
  const user = requireSchoolAdmin(context);
  const { sections } = ensureArgsSchemaOrThrowHttpError(landingSectionsInputSchema, rawArgs);
  const normalized = normalizeLandingSections(sections);
  const site = await prisma.schoolSite.findUnique({ where: { schoolId: user.schoolId } });
  if (!site) throw new HttpError(404, "Website sekolah belum diinisialisasi.");
  const updated = await prisma.schoolSite.update({ where: { schoolId: user.schoolId }, data: { landingSections: normalized } });
  await recordRevision({ schoolId: user.schoolId, resourceType: "SITE", resourceId: updated.id, action: "UPDATE_LANDING", snapshot: serializeSite(updated), createdById: user.id });
  return serializeSite(updated);
};

export const publishSchoolWebsite = async (_args: unknown, context: SchoolContext) => {
  const user = requireSchoolAdmin(context);
  const site = await prisma.schoolSite.findUnique({ where: { schoolId: user.schoolId } });
  if (!site) throw new HttpError(400, "Inisialisasi website dan simpan identitas terlebih dahulu.");
  if (!site.siteTitle.trim()) throw new HttpError(400, "Judul website wajib diisi sebelum publikasi.");
  const updated = await prisma.schoolSite.update({ where: { schoolId: user.schoolId }, data: { status: "PUBLISHED", publishedAt: site.publishedAt ?? new Date() } });
  await recordRevision({ schoolId: user.schoolId, resourceType: "SITE", resourceId: updated.id, action: "PUBLISH_SITE", snapshot: serializeSite(updated), createdById: user.id });
  return serializeSite(updated);
};

export const unpublishSchoolWebsite = async (_args: unknown, context: SchoolContext) => {
  const user = requireSchoolAdmin(context);
  const site = await prisma.schoolSite.findUnique({ where: { schoolId: user.schoolId } });
  if (!site) throw new HttpError(404, "Website sekolah belum diinisialisasi.");
  const updated = await prisma.schoolSite.update({ where: { schoolId: user.schoolId }, data: { status: "DRAFT" } });
  await recordRevision({ schoolId: user.schoolId, resourceType: "SITE", resourceId: updated.id, action: "UNPUBLISH_SITE", snapshot: serializeSite(updated), createdById: user.id });
  return serializeSite(updated);
};

const contentInputSchema = z.object({
  id: z.string().uuid().optional(),
  type: cmsContentTypeSchema,
  title: z.string().trim().min(3).max(180),
  slug: z.string().trim().max(120).optional(),
  excerpt: z.string().trim().max(420).optional().nullable(),
  bodyText: z.string().max(48000).default(""),
  coverImageUrl: z.string().max(1200).optional().nullable(),
  category: z.string().trim().max(80).optional().nullable(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  location: z.string().trim().max(180).optional().nullable(),
  priority: z.number().int().min(0).max(10).default(0),
  showInNavigation: z.boolean().default(false),
  navigationLabel: z.string().trim().max(60).optional().nullable(),
  navigationOrder: z.number().int().min(0).max(999).optional().nullable(),
  seoTitle: z.string().trim().max(70).optional().nullable(),
  seoDescription: z.string().trim().max(180).optional().nullable(),
});

export const saveSchoolWebsiteContent = async (rawArgs: unknown, context: SchoolContext) => {
  const user = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(contentInputSchema, rawArgs);
  const slug = slugifyCms(args.slug || args.title);
  const startsAt = parseOptionalDate(args.startsAt, "Waktu mulai");
  const endsAt = parseOptionalDate(args.endsAt, "Waktu selesai");
  if (startsAt && endsAt && endsAt < startsAt) throw new HttpError(400, "Waktu selesai tidak boleh lebih awal dari waktu mulai.");
  if (args.type === "EVENT" && !startsAt) throw new HttpError(400, "Agenda memerlukan waktu mulai.");

  const duplicate = await prisma.schoolSiteContent.findFirst({
    where: { schoolId: user.schoolId, type: args.type, slug, ...(args.id ? { NOT: { id: args.id } } : {}) },
    select: { id: true },
  });
  if (duplicate) throw new HttpError(409, `Slug "${slug}" sudah digunakan pada jenis konten ini.`);

  const data = {
    type: args.type,
    title: args.title,
    slug,
    excerpt: nullableTrimmed(args.excerpt),
    contentBlocks: textToContentBlocks(args.bodyText),
    coverImageUrl: validatePublicMediaUrl(args.coverImageUrl),
    category: nullableTrimmed(args.category),
    startsAt,
    endsAt,
    location: nullableTrimmed(args.location),
    priority: args.priority,
    showInNavigation: args.type === "PAGE" ? args.showInNavigation : false,
    navigationLabel: args.type === "PAGE" ? nullableTrimmed(args.navigationLabel) : null,
    navigationOrder: args.type === "PAGE" ? args.navigationOrder ?? null : null,
    seoTitle: nullableTrimmed(args.seoTitle),
    seoDescription: nullableTrimmed(args.seoDescription),
    updatedById: user.id,
  };

  if (args.id) {
    await requireTenantContent(args.id, user.schoolId);
    const updated = await prisma.schoolSiteContent.update({ where: { id: args.id }, data });
    await recordRevision({ schoolId: user.schoolId, resourceType: "CONTENT", resourceId: updated.id, action: "UPDATE_CONTENT", snapshot: serializeContent(updated), createdById: user.id });
    return serializeContent(updated);
  }

  const created = await prisma.schoolSiteContent.create({
    data: { ...data, schoolId: user.schoolId, createdById: user.id },
  });
  await recordRevision({ schoolId: user.schoolId, resourceType: "CONTENT", resourceId: created.id, action: "CREATE_CONTENT", snapshot: serializeContent(created), createdById: user.id });
  return serializeContent(created);
};

const contentStatusSchema = z.object({
  id: z.string().uuid(),
  status: cmsContentStatusSchema,
  scheduledAt: z.string().optional().nullable(),
});

export const setSchoolWebsiteContentStatus = async (rawArgs: unknown, context: SchoolContext) => {
  const user = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(contentStatusSchema, rawArgs);
  const item = await requireTenantContent(args.id, user.schoolId);
  let updated;
  if (args.status === "SCHEDULED") {
    const scheduledAt = parseOptionalDate(args.scheduledAt, "Jadwal publikasi");
    if (!scheduledAt || scheduledAt <= new Date()) throw new HttpError(400, "Jadwal publikasi harus berada di waktu mendatang.");
    updated = await prisma.schoolSiteContent.update({ where: { id: item.id }, data: { status: "SCHEDULED", scheduledAt, updatedById: user.id } });
  } else {
    updated = await prisma.schoolSiteContent.update({
      where: { id: item.id },
      data: {
        status: args.status,
        scheduledAt: null,
        publishedAt: args.status === "PUBLISHED" ? item.publishedAt ?? new Date() : item.publishedAt,
        updatedById: user.id,
      },
    });
  }
  await recordRevision({ schoolId: user.schoolId, resourceType: "CONTENT", resourceId: updated.id, action: `STATUS_${args.status}`, snapshot: serializeContent(updated), createdById: user.id });
  return serializeContent(updated);
};

const idSchema = z.object({ id: z.string().uuid() });

export const deleteSchoolWebsiteContent = async (rawArgs: unknown, context: SchoolContext) => {
  const user = requireSchoolAdmin(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(idSchema, rawArgs);
  const item = await requireTenantContent(id, user.schoolId);
  if (item.publishedAt || item.status === "PUBLISHED" || item.status === "SCHEDULED") {
    throw new HttpError(409, "Konten yang pernah atau sedang dipublikasikan tidak dapat dihapus permanen. Arsipkan konten tersebut.");
  }
  await recordRevision({ schoolId: user.schoolId, resourceType: "CONTENT", resourceId: item.id, action: "DELETE_DRAFT", snapshot: serializeContent(item), createdById: user.id });
  await prisma.schoolSiteContent.delete({ where: { id } });
  return { ok: true };
};

const navInputSchema = z.object({
  id: z.string().uuid().optional(),
  location: navLocationSchema,
  label: z.string().trim().min(1).max(60),
  type: navTypeSchema,
  contentId: z.string().uuid().optional().nullable(),
  href: z.string().max(1200).optional().nullable(),
  order: z.number().int().min(0).max(999).default(0),
  isVisible: z.boolean().default(true),
});

export const saveSchoolWebsiteNavItem = async (rawArgs: unknown, context: SchoolContext) => {
  const user = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(navInputSchema, rawArgs);
  let contentId: string | null = null;
  let href: string | null = null;
  if (args.type === "PAGE") {
    if (!args.contentId) throw new HttpError(400, "Navigasi halaman memerlukan halaman tujuan.");
    const page = await requireTenantContent(args.contentId, user.schoolId);
    if (page.type !== "PAGE") throw new HttpError(400, "Tujuan navigasi PAGE harus berupa Halaman.");
    contentId = page.id;
  } else if (args.type === "ROUTE") {
    const allowed = new Set(["berita", "agenda", "pengumuman"]);
    const routeName = (args.href || "").replace(/^\/+|\/+$/g, "");
    if (!allowed.has(routeName)) throw new HttpError(400, "Route publik harus berita, agenda, atau pengumuman.");
    href = routeName;
  } else {
    if (!args.href) throw new HttpError(400, "Tautan eksternal wajib diisi.");
    href = validateExternalHref(args.href);
  }

  const data = { location: args.location, label: args.label, type: args.type, contentId, href, order: args.order, isVisible: args.isVisible };
  if (args.id) {
    await requireTenantNav(args.id, user.schoolId);
    const updated = await prisma.schoolSiteNavItem.update({ where: { id: args.id }, data });
    await recordRevision({ schoolId: user.schoolId, resourceType: "NAV", resourceId: updated.id, action: "UPDATE_NAV", snapshot: updated, createdById: user.id });
    return updated;
  }
  const created = await prisma.schoolSiteNavItem.create({ data: { ...data, schoolId: user.schoolId } });
  await recordRevision({ schoolId: user.schoolId, resourceType: "NAV", resourceId: created.id, action: "CREATE_NAV", snapshot: created, createdById: user.id });
  return created;
};

export const deleteSchoolWebsiteNavItem = async (rawArgs: unknown, context: SchoolContext) => {
  const user = requireSchoolAdmin(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(idSchema, rawArgs);
  const item = await requireTenantNav(id, user.schoolId);
  await recordRevision({ schoolId: user.schoolId, resourceType: "NAV", resourceId: item.id, action: "DELETE_NAV", snapshot: item, createdById: user.id });
  await prisma.schoolSiteNavItem.delete({ where: { id } });
  return { ok: true };
};

const mediaInputSchema = z.object({
  id: z.string().uuid().optional(),
  url: z.string().max(1200),
  altText: z.string().trim().min(3).max(240),
  caption: z.string().trim().max(400).optional().nullable(),
  width: z.number().int().positive().max(10000).optional().nullable(),
  height: z.number().int().positive().max(10000).optional().nullable(),
});

export const saveSchoolWebsiteMedia = async (rawArgs: unknown, context: SchoolContext) => {
  const user = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(mediaInputSchema, rawArgs);
  const url = validatePublicMediaUrl(args.url);
  if (!url) throw new HttpError(400, "URL media wajib diisi.");
  const data = { url, altText: args.altText, caption: nullableTrimmed(args.caption), width: args.width ?? null, height: args.height ?? null };
  if (args.id) {
    await requireTenantMedia(args.id, user.schoolId);
    const updated = await prisma.schoolSiteMedia.update({ where: { id: args.id }, data });
    await recordRevision({ schoolId: user.schoolId, resourceType: "MEDIA", resourceId: updated.id, action: "UPDATE_MEDIA", snapshot: updated, createdById: user.id });
    return updated;
  }
  const created = await prisma.schoolSiteMedia.create({ data: { ...data, schoolId: user.schoolId, createdById: user.id } });
  await recordRevision({ schoolId: user.schoolId, resourceType: "MEDIA", resourceId: created.id, action: "CREATE_MEDIA", snapshot: created, createdById: user.id });
  return created;
};

export const deleteSchoolWebsiteMedia = async (rawArgs: unknown, context: SchoolContext) => {
  const user = requireSchoolAdmin(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(idSchema, rawArgs);
  const item = await requireTenantMedia(id, user.schoolId);
  await recordRevision({ schoolId: user.schoolId, resourceType: "MEDIA", resourceId: item.id, action: "DELETE_MEDIA", snapshot: item, createdById: user.id });
  await prisma.schoolSiteMedia.delete({ where: { id } });
  return { ok: true };
};

const publicSchoolSchema = z.object({ schoolSlug: z.string().trim().min(1).max(120) });

function resolveNavHref(item: any, schoolSlug: string, pageById: Map<string, any>) {
  if (item.type === "PAGE") {
    const page = item.contentId ? pageById.get(item.contentId) : null;
    return page ? `/site/${schoolSlug}/${page.slug}` : null;
  }
  if (item.type === "ROUTE") return item.href ? `/site/${schoolSlug}/${item.href}` : null;
  if (item.type === "EXTERNAL") return item.href || null;
  return null;
}

export const getPublicSchoolSite = async (rawArgs: unknown) => {
  const { schoolSlug } = ensureArgsSchemaOrThrowHttpError(publicSchoolSchema, rawArgs);
  const now = new Date();
  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: {
      id: true, name: true, slug: true, logoUrl: true, address: true, city: true, province: true,
      site: true,
      departments: { select: { id: true, code: true, name: true }, orderBy: { code: "asc" } },
    },
  });
  if (!school?.site || school.site.status !== "PUBLISHED") throw new HttpError(404, "Website sekolah belum dipublikasikan.");

  const [contents, navItems, media] = await Promise.all([
    prisma.schoolSiteContent.findMany({
      where: { schoolId: school.id, ...publicStatusWhere(now) },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.schoolSiteNavItem.findMany({ where: { schoolId: school.id, isVisible: true }, orderBy: [{ location: "asc" }, { order: "asc" }] }),
    prisma.schoolSiteMedia.findMany({ where: { schoolId: school.id }, orderBy: { createdAt: "desc" }, take: 12 }),
  ]);

  const publicContents = contents.filter((item: any) => isCmsContentPublic(item, now));
  const pages = publicContents.filter((item: any) => item.type === "PAGE");
  const news = publicContents.filter((item: any) => item.type === "NEWS").slice(0, 8);
  const events = publicContents.filter((item: any) => item.type === "EVENT" && (!item.endsAt || new Date(item.endsAt) >= now)).sort((a: any, b: any) => new Date(a.startsAt || a.publishedAt).getTime() - new Date(b.startsAt || b.publishedAt).getTime()).slice(0, 8);
  const announcements = publicContents.filter((item: any) => item.type === "ANNOUNCEMENT" && isAnnouncementActive(item, now)).sort((a: any, b: any) => (b.priority - a.priority) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6);
  const pageById = new Map(pages.map((page: any) => [page.id, page]));
  const nav = navItems.map((item: any) => ({ ...item, resolvedHref: resolveNavHref(item, school.slug, pageById) })).filter((item: any) => !!item.resolvedHref);

  return {
    school: { id: school.id, name: school.name, slug: school.slug, logoUrl: school.logoUrl, address: school.address, city: school.city, province: school.province, departments: publicDepartments(school.departments) },
    site: serializeSite(school.site),
    pages: pages.map(serializeContent),
    news: news.map(serializeContent),
    events: events.map(serializeContent),
    announcements: announcements.map(serializeContent),
    media,
    nav,
  };
};

const publicContentSchema = z.object({
  schoolSlug: z.string().trim().min(1).max(120),
  type: cmsContentTypeSchema,
  slug: z.string().trim().min(1).max(120),
});

export const getPublicSchoolContent = async (rawArgs: unknown) => {
  const args = ensureArgsSchemaOrThrowHttpError(publicContentSchema, rawArgs);
  const now = new Date();
  const school = await prisma.school.findUnique({ where: { slug: args.schoolSlug }, select: { id: true, name: true, slug: true, logoUrl: true, site: true } });
  if (!school?.site || school.site.status !== "PUBLISHED") throw new HttpError(404, "Website sekolah belum dipublikasikan.");
  const item = await prisma.schoolSiteContent.findUnique({
    where: { schoolId_type_slug: { schoolId: school.id, type: args.type, slug: args.slug } },
  });
  if (!item || !isCmsContentPublic(item, now) || (item.type === "ANNOUNCEMENT" && !isAnnouncementActive(item, now))) throw new HttpError(404, "Konten tidak ditemukan atau belum dipublikasikan.");
  return { school: { name: school.name, slug: school.slug, logoUrl: school.logoUrl }, site: serializeSite(school.site), content: serializeContent(item) };
};

export const getSchoolWebsitePreview = async (_args: unknown, context: SchoolContext) => {
  const user = requireSchoolAdmin(context);
  const [school, site, contents, media] = await Promise.all([
    prisma.school.findUnique({ where: { id: user.schoolId }, select: { id: true, name: true, slug: true, logoUrl: true, address: true, city: true, province: true, departments: { select: { id: true, code: true, name: true }, orderBy: { code: "asc" } } } }),
    prisma.schoolSite.findUnique({ where: { schoolId: user.schoolId } }),
    prisma.schoolSiteContent.findMany({ where: { schoolId: user.schoolId, status: { not: "ARCHIVED" } }, orderBy: { updatedAt: "desc" } }),
    prisma.schoolSiteMedia.findMany({ where: { schoolId: user.schoolId }, orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  if (!school) throw new HttpError(404, "Sekolah aktif tidak ditemukan.");
  return { school: { ...school, departments: publicDepartments(school.departments) }, site: serializeSite(site), contents: contents.map(serializeContent), media };
};
