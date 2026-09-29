import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SCHOOL_SLUG = "smkn-12-garut";
const CONFIRM = "ACTIVATE-SMKN12-WEBSITE";
const source = {
  kemendikdasmenIdentity:
    "https://referensi.data.kemendikdasmen.go.id/tabs.php?npsn=20254283",
  kemendikdasmenProfile:
    "https://referensi.data.kemendikdasmen.go.id/snpmb/site/sekolah?npsn=20254283",
  spmb2026:
    "https://garut.pikiran-rakyat.com/pendidikan/pr-5210338644/spmb-di-smkn-12-garut-20262027-berjalan-kondusif-heryatno-penentuan-kelulusan-sepenuhnya-sesuai-sistem",
  revitalisasi2026:
    "https://suarametroindonesia.id/2026/07/16/proyek-revitalisasi-dana-bantuan-apbn-tahun-anggaran-2026-smkn-12-garut-percepatan-fasilitas-pendidikan",
  sarpras2025:
    "https://garut.pikiran-rakyat.com/pendidikan/pr-529040414/selaras-dengan-rencana-program-gubernur-kdm-kepala-smkn-12-garut-sukses-wujudkan-sarpras-refresentatif",
};

function blocks(parts) {
  return parts.map((part) => {
    if (part.startsWith("## "))
      return { type: "heading", text: part.slice(3).trim().slice(0, 180) };
    if (part.startsWith("> "))
      return { type: "quote", text: part.slice(2).trim().slice(0, 1200) };
    if (part.startsWith("! "))
      return { type: "callout", text: part.slice(2).trim().slice(0, 1200) };
    return { type: "paragraph", text: part.trim().slice(0, 4000) };
  });
}

async function getContext() {
  const school = await prisma.school.findUnique({
    where: { slug: SCHOOL_SLUG },
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      province: true,
    },
  });
  if (!school) throw new Error("SMKN 12 Garut tenant not found.");

  const actor =
    (await prisma.user.findFirst({
      where: {
        schoolId: school.id,
        role: "SCHOOL_ADMIN",
        email: "admin-smkn12garut@schoolos-bootstrap.invalid",
      },
      select: { id: true, name: true },
    })) ||
    (await prisma.user.findFirst({
      where: {
        schoolId: school.id,
        OR: [{ role: "SCHOOL_ADMIN" }, { isAdmin: true }],
      },
      orderBy: [{ isAdmin: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }));

  if (!actor) throw new Error("No school admin actor found for audit fields.");
  return { school, actor };
}

async function upsertContent(input) {
  const data = {
    title: input.title,
    excerpt: input.excerpt,
    contentBlocks: blocks(input.body),
    coverImageUrl: null,
    category: input.category || null,
    status: "PUBLISHED",
    startsAt: null,
    endsAt: null,
    location: null,
    priority: 0,
    showInNavigation: !!input.showInNavigation,
    navigationLabel: input.navigationLabel || null,
    navigationOrder:
      input.navigationOrder === undefined ? null : input.navigationOrder,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    publishedAt: input.publishedAt,
    scheduledAt: null,
    updatedById: input.actorId,
  };

  return prisma.schoolSiteContent.upsert({
    where: {
      schoolId_type_slug: {
        schoolId: input.schoolId,
        type: input.type,
        slug: input.slug,
      },
    },
    update: data,
    create: {
      ...data,
      schoolId: input.schoolId,
      type: input.type,
      slug: input.slug,
      createdById: input.actorId,
    },
  });
}

async function ensureNav(input) {
  const existing = await prisma.schoolSiteNavItem.findFirst({
    where: {
      schoolId: input.schoolId,
      location: input.location,
      label: input.label,
    },
    orderBy: { createdAt: "asc" },
  });

  const data = {
    type: input.type,
    contentId: input.contentId || null,
    href: input.href || null,
    order: input.order,
    isVisible: true,
  };

  if (existing) {
    return prisma.schoolSiteNavItem.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.schoolSiteNavItem.create({
    data: {
      schoolId: input.schoolId,
      location: input.location,
      label: input.label,
      ...data,
    },
  });
}

async function preview() {
  const { school, actor } = await getContext();
  const counts = await Promise.all([
    prisma.schoolSite.count({ where: { schoolId: school.id } }),
    prisma.schoolSiteContent.count({ where: { schoolId: school.id } }),
    prisma.schoolSiteMedia.count({ where: { schoolId: school.id } }),
    prisma.schoolSiteNavItem.count({ where: { schoolId: school.id } }),
  ]);

  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        school,
        actor,
        current: {
          site: counts[0],
          content: counts[1],
          media: counts[2],
          nav: counts[3],
        },
        planned: {
          siteStatus: "PUBLISHED",
          pages: ["profil", "sarana-dan-lingkungan-belajar"],
          news: [
            "spmb-2026-2027-berjalan-kondusif",
            "revitalisasi-sarana-pendidikan-2026",
            "penguatan-sarana-pendukung-pembelajaran",
          ],
          headerNav: ["Profil", "Berita", "Agenda", "Pengumuman"],
          mediaImportedFromInternet: 0,
          heroImageExternalOfficialSource: true,
        },
        sources: source,
      },
      null,
      2,
    ),
  );
}

async function apply() {
  const { school, actor } = await getContext();
  const now = new Date();
  const landingSections = [
    { type: "HERO", enabled: true },
    { type: "QUICK_LINKS", enabled: true },
    { type: "ABOUT", enabled: true },
    { type: "PROGRAMS", enabled: true },
    { type: "NEWS", enabled: true },
    { type: "ANNOUNCEMENTS", enabled: true },
    { type: "EVENTS", enabled: true },
    { type: "GALLERY", enabled: true },
    { type: "CONTACT", enabled: true },
  ];

  const siteData = {
    status: "PUBLISHED",
    siteTitle: "SMKN 12 Garut",
    tagline:
      "Sekolah menengah kejuruan negeri di Tarogong Kidul, Kabupaten Garut.",
    heroTitle: "SMKN 12 Garut",
    heroSubtitle:
      "Informasi profil, program keahlian, berita, agenda, dan layanan publik sekolah.",
    heroImageUrl: "https://file.data.kemendikdasmen.go.id/sekolahkita/20/2025/20254283-2.jpg",
    defaultSeoTitle: "SMKN 12 Garut | Website Resmi School OS",
    defaultSeoDescription:
      "Website publik SMKN 12 Garut, NPSN 20254283, beralamat di Jl. Cimanuk No. 285, Tarogong Kidul, Kabupaten Garut.",
    themePreset: "CLEAN_SCHOOL",
    robotsIndex: true,
    publicEmail: "smkn12garut@gmail.com",
    publicPhone: "02622541479",
    socialLinks: {},
    landingSections,
    publishedAt: now,
  };

  const site = await prisma.schoolSite.upsert({
    where: { schoolId: school.id },
    update: siteData,
    create: { schoolId: school.id, ...siteData },
  });

  const officialHeroUrl = "https://file.data.kemendikdasmen.go.id/sekolahkita/20/2025/20254283-2.jpg";
  const existingOfficialMedia = await prisma.schoolSiteMedia.findFirst({
    where: { schoolId: school.id, url: officialHeroUrl },
  });
  if (!existingOfficialMedia) {
    await prisma.schoolSiteMedia.create({
      data: {
        schoolId: school.id,
        url: officialHeroUrl,
        altText: "Gerbang SMKN 12 Garut di Jl. Cimanuk No. 285",
        caption: "Foto sekolah dari portal Sekolah Kita Kemendikdasmen.",
        createdById: actor.id,
      },
    });
  }

  const profile = await upsertContent({
    schoolId: school.id,
    actorId: actor.id,
    type: "PAGE",
    title: "Profil SMKN 12 Garut",
    slug: "profil",
    excerpt:
      "Profil singkat SMKN 12 Garut berdasarkan data publik Kemendikdasmen dan informasi sekolah yang tersedia.",
    showInNavigation: true,
    navigationLabel: "Profil",
    navigationOrder: 0,
    seoTitle: "Profil SMKN 12 Garut",
    seoDescription:
      "Profil SMKN 12 Garut, NPSN 20254283, sekolah menengah kejuruan negeri di Tarogong Kidul, Kabupaten Garut.",
    publishedAt: now,
    body: [
      "SMKN 12 Garut adalah satuan pendidikan negeri jenjang Sekolah Menengah Kejuruan dengan NPSN 20254283. Data Pendidikan Kemendikdasmen mencantumkan alamat sekolah di Jl. Cimanuk No. 285, Kelurahan Pataruman, Kecamatan Tarogong Kidul, Kabupaten Garut, Provinsi Jawa Barat.",
      "## Identitas sekolah",
      "Status sekolah tercatat Negeri dengan bentuk pendidikan SMK. Data resmi juga mencantumkan nomor SK operasional 23/B.III/D/65 dengan TMT operasional 24 September 1965 serta akreditasi B.",
      "## Pimpinan sekolah",
      "Portal informasi satuan pendidikan Kemendikdasmen mencantumkan Heryatno sebagai Kepala SMKN 12 Garut. Pemberitaan pelaksanaan SPMB tahun ajaran 2026/2027 pada Juli 2026 juga menyebut Heryatno sebagai kepala sekolah.",
      "## Program keahlian",
      "Program keahlian yang tampil pada website ini dibaca dari master data School OS SMKN 12 Garut agar tetap mengikuti struktur program sekolah yang sedang digunakan pada sistem.",
      "## Kontak",
      "Kontak publik yang tercantum pada Data Pendidikan Kemendikdasmen adalah email smkn12garut@gmail.com dan telepon 02622541479.",
      "! Profil ini merupakan konten awal sementara yang disusun dari sumber publik Kemendikdasmen dan publikasi sekolah/media. Visi, misi, sejarah rinci, serta informasi kelembagaan lain akan diperbarui ketika dokumen resmi sekolah tersedia.",
    ],
  });

  await upsertContent({
    schoolId: school.id,
    actorId: actor.id,
    type: "PAGE",
    title: "Sarana dan Lingkungan Belajar",
    slug: "sarana-dan-lingkungan-belajar",
    excerpt:
      "Ringkasan pengembangan sarana pembelajaran SMKN 12 Garut berdasarkan publikasi yang tersedia.",
    seoTitle: "Sarana Pembelajaran SMKN 12 Garut",
    seoDescription:
      "Informasi awal sarana dan pengembangan lingkungan belajar SMKN 12 Garut.",
    publishedAt: now,
    body: [
      "SMKN 12 Garut terus melakukan penguatan sarana untuk mendukung kegiatan pembelajaran. Publikasi pada Februari 2025 melaporkan penyelesaian fasilitas seperti laboratorium biologi, laboratorium bahasa, ruang kelas baru, serta fasilitas sanitasi.",
      "Pada Juli 2026, sekolah juga diberitakan menerima program revitalisasi satuan pendidikan yang mencakup percepatan peningkatan fasilitas, antara lain ruang kelas dan renovasi toilet.",
      "## Pengembangan berkelanjutan",
      "Informasi sarana pada halaman ini adalah ringkasan awal dari sumber publik. Data inventaris rinci dan kondisi terbaru akan diperbarui dari sumber internal sekolah setelah proses verifikasi.",
      "! Sumber sementara: Pikiran Rakyat Garut, 6 Februari 2025; Suara Metro Indonesia, 16 Juli 2026.",
    ],
  });

  await upsertContent({
    schoolId: school.id,
    actorId: actor.id,
    type: "NEWS",
    title: "SPMB 2026/2027 di SMKN 12 Garut Berjalan Kondusif",
    slug: "spmb-2026-2027-berjalan-kondusif",
    excerpt:
      "Pelaksanaan SPMB tahun ajaran 2026/2027 diberitakan berlangsung lancar, transparan, objektif, dan akuntabel.",
    category: "Sekolah",
    seoTitle: "SPMB SMKN 12 Garut 2026/2027",
    seoDescription:
      "Ringkasan informasi pelaksanaan SPMB tahun ajaran 2026/2027 di SMKN 12 Garut.",
    publishedAt: new Date("2026-07-17T08:47:00+07:00"),
    body: [
      "Pelaksanaan Seleksi Penerimaan Murid Baru tahun ajaran 2026/2027 di SMKN 12 Garut diberitakan berlangsung lancar dan kondusif. Proses penerimaan mengikuti ketentuan Pemerintah Provinsi Jawa Barat melalui Dinas Pendidikan.",
      "Kepala SMKN 12 Garut, Heryatno, menyampaikan bahwa penentuan kelulusan mengikuti sistem dan ketentuan yang berlaku. Jalur penerimaan mencakup beberapa kategori sesuai mekanisme SPMB.",
      "! Konten ini adalah ringkasan/parafrasa sumber publik Pikiran Rakyat Garut, 17 Juli 2026, dan bukan salinan artikel asli.",
    ],
  });

  await upsertContent({
    schoolId: school.id,
    actorId: actor.id,
    type: "NEWS",
    title: "SMKN 12 Garut Melanjutkan Revitalisasi Sarana Pendidikan",
    slug: "revitalisasi-sarana-pendidikan-2026",
    excerpt:
      "Program revitalisasi 2026 diarahkan pada peningkatan fasilitas pembelajaran dan lingkungan sekolah.",
    category: "Sarana Prasarana",
    seoTitle: "Revitalisasi Sarana SMKN 12 Garut 2026",
    seoDescription:
      "Ringkasan program revitalisasi sarana pendidikan SMKN 12 Garut pada 2026.",
    publishedAt: new Date("2026-07-16T09:00:00+07:00"),
    body: [
      "SMKN 12 Garut diberitakan menjadi penerima program revitalisasi satuan pendidikan pada 2026. Program tersebut diarahkan untuk meningkatkan kualitas sarana dan prasarana melalui pembangunan maupun rehabilitasi fasilitas yang dibutuhkan sekolah.",
      "Publikasi yang tersedia menyebut pembangunan dan renovasi ruang belajar serta fasilitas sanitasi sebagai bagian dari pekerjaan yang berjalan.",
      "! Konten ini adalah ringkasan/parafrasa sumber publik Suara Metro Indonesia, 16 Juli 2026. Rincian teknis proyek akan diperbarui setelah dokumen resmi sekolah tersedia.",
    ],
  });

  await upsertContent({
    schoolId: school.id,
    actorId: actor.id,
    type: "NEWS",
    title: "Penguatan Sarana Pendukung Pembelajaran di SMKN 12 Garut",
    slug: "penguatan-sarana-pendukung-pembelajaran",
    excerpt:
      "Sejumlah fasilitas baru dilaporkan telah disiapkan untuk mendukung kegiatan belajar mengajar.",
    category: "Sarana Prasarana",
    seoTitle: "Penguatan Sarana Pembelajaran SMKN 12 Garut",
    seoDescription:
      "Ringkasan penguatan fasilitas pembelajaran SMKN 12 Garut berdasarkan publikasi Februari 2025.",
    publishedAt: new Date("2025-02-06T21:37:00+07:00"),
    body: [
      "Pada Februari 2025, publikasi mengenai SMKN 12 Garut melaporkan penguatan fasilitas sekolah berupa laboratorium biologi, laboratorium bahasa, ruang kelas baru, serta fasilitas sanitasi.",
      "Pengembangan fasilitas tersebut ditujukan untuk mendukung proses belajar mengajar dan menciptakan lingkungan belajar yang lebih representatif.",
      "! Konten ini adalah ringkasan/parafrasa sumber publik Pikiran Rakyat Garut, 6 Februari 2025.",
    ],
  });

  await ensureNav({
    schoolId: school.id,
    location: "HEADER",
    label: "Profil",
    type: "PAGE",
    contentId: profile.id,
    order: 0,
  });
  await ensureNav({
    schoolId: school.id,
    location: "HEADER",
    label: "Berita",
    type: "ROUTE",
    href: "berita",
    order: 1,
  });
  await ensureNav({
    schoolId: school.id,
    location: "HEADER",
    label: "Agenda",
    type: "ROUTE",
    href: "agenda",
    order: 2,
  });
  await ensureNav({
    schoolId: school.id,
    location: "HEADER",
    label: "Pengumuman",
    type: "ROUTE",
    href: "pengumuman",
    order: 3,
  });

  const audit = await prisma.schoolSiteRevision.findFirst({
    where: {
      schoolId: school.id,
      resourceType: "SITE",
      action: "ACTIVATE_FROM_PUBLIC_SOURCES_20260929",
    },
  });

  if (!audit) {
    await prisma.schoolSiteRevision.create({
      data: {
        schoolId: school.id,
        resourceType: "SITE",
        resourceId: site.id,
        action: "ACTIVATE_FROM_PUBLIC_SOURCES_20260929",
        snapshot: {
          status: "PUBLISHED",
          actor: actor.name,
          sourceUrls: source,
          note:
            "Initial public profile/content seed. No third-party internet image was copied into object storage.",
        },
        createdById: actor.id,
      },
    });
  }

  const counts = await Promise.all([
    prisma.schoolSite.count({ where: { schoolId: school.id } }),
    prisma.schoolSiteContent.count({ where: { schoolId: school.id } }),
    prisma.schoolSiteContent.count({
      where: { schoolId: school.id, status: "PUBLISHED" },
    }),
    prisma.schoolSiteNavItem.count({
      where: { schoolId: school.id, isVisible: true },
    }),
    prisma.schoolSiteMedia.count({ where: { schoolId: school.id } }),
  ]);

  console.log(
    JSON.stringify(
      {
        mode: "apply",
        school: school.name,
        site: counts[0],
        content: counts[1],
        publishedContent: counts[2],
        visibleNav: counts[3],
        media: counts[4],
        publicUrl:
          "https://sekolah.suhendararyadi.com/site/" + school.slug,
      },
      null,
      2,
    ),
  );
}

const confirmArg = process.argv.find((arg) => arg.startsWith("--confirm="));
const confirm = confirmArg ? confirmArg.slice("--confirm=".length) : "";

try {
  if (confirm === CONFIRM) await apply();
  else await preview();
} finally {
  await prisma.$disconnect();
}
