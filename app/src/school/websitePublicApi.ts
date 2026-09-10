import { prisma } from "wasp/server";
import { isAnnouncementActive, isCmsContentPublic } from "./websitePolicyCore";

const PUBLIC_ORIGIN = "https://sekolah.suhendararyadi.com";

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isoDate(value?: Date | string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export const schoolSiteSitemapApi = async (req: any, res: any) => {
  const schoolSlug = String(req.params?.schoolSlug || "").trim();
  if (!/^[a-z0-9-]{1,120}$/.test(schoolSlug)) {
    return res.status(404).send("Not found");
  }

  const now = new Date();
  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { id: true, slug: true, site: true },
  });
  if (!school?.site || school.site.status !== "PUBLISHED") {
    return res.status(404).send("Not found");
  }

  const contents = await prisma.schoolSiteContent.findMany({
    where: {
      schoolId: school.id,
      OR: [
        { status: "PUBLISHED" },
        { status: "SCHEDULED", scheduledAt: { lte: now } },
      ],
    },
    select: {
      type: true,
      slug: true,
      status: true,
      scheduledAt: true,
      publishedAt: true,
      updatedAt: true,
      startsAt: true,
      endsAt: true,
    },
  });

  const publicContents = contents.filter((item) =>
    isCmsContentPublic(item, now) && (item.type !== "ANNOUNCEMENT" || isAnnouncementActive(item, now)),
  );
  const base = `${PUBLIC_ORIGIN}/site/${school.slug}`;
  const urls = new Map<string, string | null>();
  urls.set(base, isoDate(school.site.updatedAt));
  urls.set(`${base}/berita`, isoDate(school.site.updatedAt));
  urls.set(`${base}/agenda`, isoDate(school.site.updatedAt));
  urls.set(`${base}/pengumuman`, isoDate(school.site.updatedAt));

  for (const item of publicContents) {
    const lastmod = isoDate(item.updatedAt || item.publishedAt || item.scheduledAt);
    if (item.type === "PAGE") urls.set(`${base}/${item.slug}`, lastmod);
    if (item.type === "NEWS") urls.set(`${base}/berita/${item.slug}`, lastmod);
  }

  const entries = [...urls.entries()].map(([loc, lastmod]) => {
    const modified = lastmod ? `<lastmod>${xmlEscape(lastmod)}</lastmod>` : "";
    return `<url><loc>${xmlEscape(loc)}</loc>${modified}</url>`;
  }).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`;

  res.set("Content-Type", "application/xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  return res.status(200).send(xml);
};
