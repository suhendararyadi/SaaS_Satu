#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TARGET_SLUG = process.env.SCHOOL_WEBSITE_STARTER_SLUG || "smkn-1-rongga";
const PUBLISH_CONFIRMATION = "PUBLISH-SCHOOL-WEBSITE-STARTER";

const mode = process.argv[2] || "status";
const publishRequested = process.argv.includes("--publish");
const confirmation = process.argv.find((arg) => arg.startsWith("--confirm="))?.slice("--confirm=".length);

function paragraph(text) {
  return { type: "paragraph", text };
}

function heading(text) {
  return { type: "heading", text };
}

async function getTargetSchool(client) {
  const school = await client.school.findUnique({
    where: { slug: TARGET_SLUG },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      province: true,
      npsn: true,
      address: true,
      email: true,
      phone: true,
      users: {
        where: { OR: [{ role: "SCHOOL_ADMIN" }, { role: "SUPERADMIN" }, { isAdmin: true }] },
        select: { id: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });
  if (!school) throw new Error(`Target school '${TARGET_SLUG}' was not found.`);
  if (!school.users[0]) throw new Error("Starter data requires at least one school admin or platform admin assigned to the target school.");
  return { ...school, editorId: school.users[0].id };
}

async function status(client) {
  const school = await getTargetSchool(client);
  const [site, contents, navItems, media] = await Promise.all([
    client.schoolSite.findUnique({ where: { schoolId: school.id }, select: { status: true, siteTitle: true, robotsIndex: true, publishedAt: true } }),
    client.schoolSiteContent.findMany({ where: { schoolId: school.id }, select: { type: true, slug: true, title: true, status: true }, orderBy: [{ type: "asc" }, { slug: "asc" }] }),
    client.schoolSiteNavItem.findMany({ where: { schoolId: school.id }, select: { location: true, label: true, type: true, href: true, order: true }, orderBy: [{ location: "asc" }, { order: "asc" }] }),
    client.schoolSiteMedia.count({ where: { schoolId: school.id } }),
  ]);
  return {
    school: { name: school.name, slug: school.slug },
    site,
    contents,
    navItems,
    mediaCount: media,
  };
}

async function ensureNav(tx, data) {
  const existing = await tx.schoolSiteNavItem.findFirst({
    where: {
      schoolId: data.schoolId,
      location: data.location,
      label: data.label,
    },
  });
  if (existing) return { item: existing, created: false };
  return { item: await tx.schoolSiteNavItem.create({ data }), created: true };
}

async function seedStarter(tx, { publish }) {
  const school = await getTargetSchool(tx);
  const existingSite = await tx.schoolSite.findUnique({ where: { schoolId: school.id } });
  const siteWasCreated = !existingSite;
  const locationText = [school.city, school.province].filter(Boolean).join(", ") || "Indonesia";
  const publicUrl = `https://sekolah.suhendararyadi.com/site/${school.slug}`;

  const site = existingSite ?? await tx.schoolSite.create({
    data: {
      schoolId: school.id,
      status: publish ? "PUBLISHED" : "DRAFT",
      siteTitle: school.name,
      tagline: "Informasi dan publikasi sekolah",
      heroTitle: school.name,
      heroSubtitle: `Informasi sekolah, program keahlian, berita, dan agenda di ${locationText}.`,
      defaultSeoTitle: `${school.name} | Website Sekolah`,
      defaultSeoDescription: `Website ${school.name} untuk informasi profil, program keahlian, berita, dan agenda sekolah.`,
      publicEmail: school.email,
      publicPhone: school.phone,
      themePreset: "CLEAN_SCHOOL",
      robotsIndex: false,
      publishedAt: publish ? new Date() : null,
    },
  });

  const profileKey = { schoolId_type_slug: { schoolId: school.id, type: "PAGE", slug: "profil-sekolah" } };
  let profile = await tx.schoolSiteContent.findUnique({ where: profileKey });
  let profileCreated = false;
  if (!profile) {
    const profileBlocks = [
      heading("Profil Sekolah"),
      paragraph(`${school.name} adalah satuan pendidikan yang berlokasi di ${locationText}.`),
      ...(school.npsn ? [paragraph(`NPSN: ${school.npsn}.`)] : []),
      ...(school.address ? [paragraph(`Alamat: ${school.address}.`)] : []),
      heading("Informasi Publik"),
      paragraph("Halaman ini dikelola melalui School OS sebagai kanal informasi dan publikasi sekolah."),
    ];
    profile = await tx.schoolSiteContent.create({
      data: {
        schoolId: school.id,
        type: "PAGE",
        title: "Profil Sekolah",
        slug: "profil-sekolah",
        excerpt: `Profil singkat ${school.name}.`,
        contentBlocks: profileBlocks,
        status: publish ? "PUBLISHED" : "DRAFT",
        showInNavigation: true,
        navigationLabel: "Profil",
        navigationOrder: 10,
        seoTitle: `Profil ${school.name}`.slice(0, 70),
        seoDescription: `Profil dan informasi publik ${school.name}.`,
        publishedAt: publish ? new Date() : null,
        createdById: school.editorId,
        updatedById: school.editorId,
      },
    });
    profileCreated = true;
  }

  const newsKey = { schoolId_type_slug: { schoolId: school.id, type: "NEWS", slug: "website-sekolah-mulai-tersedia" } };
  let news = await tx.schoolSiteContent.findUnique({ where: newsKey });
  let newsCreated = false;
  if (!news) {
    news = await tx.schoolSiteContent.create({
      data: {
        schoolId: school.id,
        type: "NEWS",
        title: "Website Sekolah Mulai Tersedia",
        slug: "website-sekolah-mulai-tersedia",
        excerpt: "Kanal website sekolah mulai tersedia sebagai ruang informasi dan publikasi resmi sekolah.",
        contentBlocks: [
          heading("Kanal informasi sekolah"),
          paragraph(`${school.name} kini memiliki halaman website yang terintegrasi dengan School OS untuk menyajikan informasi publik sekolah.`),
          paragraph("Berita, agenda, pengumuman, profil, serta informasi lain dapat dikelola dari modul Website Sekolah oleh admin yang berwenang."),
        ],
        category: "Informasi",
        status: publish ? "PUBLISHED" : "DRAFT",
        seoTitle: `Website ${school.name} mulai tersedia`.slice(0, 70),
        seoDescription: `Kanal website ${school.name} mulai tersedia untuk informasi dan publikasi sekolah.`,
        publishedAt: publish ? new Date() : null,
        createdById: school.editorId,
        updatedById: school.editorId,
      },
    });
    newsCreated = true;
  }

  const navSpecs = [
    { schoolId: school.id, location: "HEADER", label: "Profil", type: "PAGE", contentId: profile.id, href: null, order: 10, isVisible: true },
    { schoolId: school.id, location: "HEADER", label: "Berita", type: "ROUTE", contentId: null, href: "berita", order: 20, isVisible: true },
    { schoolId: school.id, location: "HEADER", label: "Agenda", type: "ROUTE", contentId: null, href: "agenda", order: 30, isVisible: true },
    { schoolId: school.id, location: "HEADER", label: "Pengumuman", type: "ROUTE", contentId: null, href: "pengumuman", order: 40, isVisible: true },
  ];
  let navCreated = 0;
  for (const spec of navSpecs) {
    const result = await ensureNav(tx, spec);
    if (result.created) navCreated += 1;
  }

  return {
    publicUrl,
    created: { site: siteWasCreated, profile: profileCreated, news: newsCreated, navItems: navCreated },
    publishedByThisRun: publish && siteWasCreated,
    siteStatus: site.status,
  };
}

async function main() {
  if (mode === "status") {
    console.log(JSON.stringify(await status(prisma), null, 2));
    return;
  }
  if (mode !== "seed") throw new Error("Usage: node scripts/school-website-starter-data.mjs status|seed [--publish --confirm=PUBLISH-SCHOOL-WEBSITE-STARTER]");
  if (publishRequested && confirmation !== PUBLISH_CONFIRMATION) {
    throw new Error(`Publishing starter content requires --confirm=${PUBLISH_CONFIRMATION}.`);
  }
  const result = await prisma.$transaction((tx) => seedStarter(tx, { publish: publishRequested }), { maxWait: 10_000, timeout: 60_000 });
  console.log(JSON.stringify({ mode: "seed", ...result, status: await status(prisma) }, null, 2));
}

main()
  .catch((error) => {
    console.error(`SCHOOL_WEBSITE_STARTER_ERROR: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
