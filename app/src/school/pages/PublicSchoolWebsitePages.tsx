import React from "react";
import { useParams } from "react-router";
import { useQuery, getPublicSchoolContent, getPublicSchoolSite } from "wasp/client/operations";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  GraduationCap,
  Mail,
  MapPin,
  Megaphone,
  Menu,
  Newspaper,
  Phone,
  School,
} from "lucide-react";
import { normalizeLandingSections } from "../websitePolicyCore";

const PUBLIC_ORIGIN = "https://sekolah.suhendararyadi.com";

function formatDate(value?: Date | string | null, withTime = false) {
  if (!value) return "";
  return new Intl.DateTimeFormat("id-ID", withTime ? { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" } : { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function PublicNotFound({ message = "Konten belum tersedia." }: { message?: string }) {
  return <main className="min-h-screen bg-[#F3F4F6] px-5 py-20 text-[#111827]"><div className="mx-auto max-w-xl rounded-[30px] border border-black/[.06] bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,.08)]"><div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#EAF2FF] text-sm font-bold text-[#0B63CE]">404</div><h1 className="mt-5 text-2xl font-semibold tracking-[-.035em]">Halaman tidak ditemukan</h1><p className="mt-2 text-sm leading-6 text-[#667085]">{message}</p><a href="/" className="mt-6 inline-flex rounded-full bg-[#0B63CE] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#084FAD]">Kembali</a></div></main>;
}

function LoadingSite() {
  return <div className="min-h-screen bg-[#F6F7F9] p-6"><div className="mx-auto max-w-7xl animate-pulse space-y-4"><div className="h-16 rounded-2xl bg-black/[.06]"/><div className="h-[560px] rounded-[34px] bg-black/[.05]"/><div className="grid gap-4 md:grid-cols-3"><div className="h-44 rounded-3xl bg-black/[.04]"/><div className="h-44 rounded-3xl bg-black/[.04]"/><div className="h-44 rounded-3xl bg-black/[.04]"/></div></div></div>;
}

function ContentBlocks({ blocks, compact = false }: { blocks: any[]; compact?: boolean }) {
  if (!Array.isArray(blocks)) return null;
  const source = compact ? blocks.slice(0, 3) : blocks;
  return <div className={compact ? "space-y-4" : "space-y-6"}>{source.map((block, index) => {
    if (!block || typeof block.text !== "string") return null;
    if (block.type === "heading") return <h2 key={index} className="pt-3 text-[clamp(1.55rem,3vw,2.15rem)] font-semibold tracking-[-.035em] text-[var(--site-fg)]">{block.text}</h2>;
    if (block.type === "quote") return <blockquote key={index} className="border-l-2 border-[var(--site-accent)] pl-5 text-lg leading-8 text-[var(--site-muted)]">{block.text}</blockquote>;
    if (block.type === "callout") return <div key={index} className="rounded-[22px] border border-[var(--site-accent)]/10 bg-[var(--site-soft)] p-5 text-[15px] leading-7 text-[var(--site-fg)]">{block.text}</div>;
    return <p key={index} className={`${compact ? "text-[15px] leading-7" : "text-[17px] leading-8"} text-[var(--site-body)]`}>{block.text}</p>;
  })}</div>;
}

export function schoolSiteThemeVars(themePreset?: string) {
  if (themePreset === "EDITORIAL") return {
    "--site-accent": "#9A4B16", "--site-accent-strong": "#72360F", "--site-soft": "#FFF4E8", "--site-fg": "#1D1714", "--site-body": "#4B403A", "--site-muted": "#76675F", "--site-canvas": "#F8F5F1", "--site-dark": "#201A17",
  } as React.CSSProperties;
  if (themePreset === "CAMPUS") return {
    "--site-accent": "#176B45", "--site-accent-strong": "#0E5334", "--site-soft": "#EAF7EF", "--site-fg": "#10251A", "--site-body": "#365246", "--site-muted": "#64766E", "--site-canvas": "#F3F7F4", "--site-dark": "#102219",
  } as React.CSSProperties;
  return {
    "--site-accent": "#0B63CE", "--site-accent-strong": "#084FAD", "--site-soft": "#EAF2FF", "--site-fg": "#111827", "--site-body": "#344054", "--site-muted": "#667085", "--site-canvas": "#F5F7FA", "--site-dark": "#0C1729",
  } as React.CSSProperties;
}

function safeStructuredData(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function socialEntries(site: any) {
  const source = site?.socialLinks && typeof site.socialLinks === "object" ? site.socialLinks : {};
  const labels: Record<string, string> = { instagram: "Instagram", youtube: "YouTube", facebook: "Facebook", tiktok: "TikTok" };
  return Object.entries(source).filter(([, href]) => typeof href === "string" && href).map(([key, href]) => ({ key, label: labels[key] || key, href: href as string }));
}

function SiteHeader({ data }: { data: any }) {
  const headerNav = (data.nav || []).filter((item: any) => item.location === "HEADER");
  const fallback = [
    { label: "Beranda", resolvedHref: `/site/${data.school.slug}` },
    { label: "Berita", resolvedHref: `/site/${data.school.slug}/berita` },
    { label: "Agenda", resolvedHref: `/site/${data.school.slug}/agenda` },
    { label: "Pengumuman", resolvedHref: `/site/${data.school.slug}/pengumuman` },
  ];
  const links = headerNav.length ? headerNav : fallback;
  return <header className="sticky top-0 z-40 border-b border-black/[.055] bg-white/88 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/78"><div className="mx-auto flex min-h-[72px] max-w-7xl items-center gap-4 px-5 sm:px-6 lg:px-8"><a href={`/site/${data.school.slug}`} className="group flex min-w-0 items-center gap-3.5"><span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[13px] border border-black/[.05] bg-[var(--site-soft)] text-sm font-bold text-[var(--site-accent)] shadow-sm">{data.school.logoUrl ? <img src={data.school.logoUrl} alt="" className="h-full w-full object-cover"/> : <School size={20} strokeWidth={1.8}/>}</span><span className="min-w-0"><span className="block truncate text-[15px] font-semibold tracking-[-.025em] text-[var(--site-fg)]">{data.site.siteTitle || data.school.name}</span><span className="mt-0.5 hidden truncate text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--site-muted)] sm:block">Website Resmi</span></span></a><nav className="ml-auto hidden items-center gap-0.5 lg:flex" aria-label="Navigasi utama">{links.map((item: any) => <a key={`${item.label}-${item.resolvedHref}`} href={item.resolvedHref} className="rounded-full px-3.5 py-2 text-[13px] font-medium text-[var(--site-muted)] transition hover:bg-black/[.045] hover:text-[var(--site-fg)]" target={item.type === "EXTERNAL" ? "_blank" : undefined} rel={item.type === "EXTERNAL" ? "noreferrer" : undefined}>{item.label}</a>)}</nav><a href="/login" className="ml-auto hidden items-center gap-1.5 rounded-full border border-black/[.09] bg-white px-4 py-2.5 text-[12.5px] font-semibold text-[var(--site-fg)] shadow-sm transition hover:border-black/[.15] lg:inline-flex">Portal School OS <ArrowUpRight size={14}/></a><details className="relative ml-auto lg:hidden"><summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full border border-black/[.09] bg-white text-[var(--site-fg)] shadow-sm" aria-label="Buka menu"><Menu size={20}/></summary><nav className="absolute right-0 mt-3 w-64 overflow-hidden rounded-[22px] border border-black/[.07] bg-white p-2.5 shadow-[0_24px_60px_rgba(15,23,42,.16)]">{links.map((item: any) => <a key={`${item.label}-${item.resolvedHref}`} href={item.resolvedHref} className="flex items-center justify-between rounded-[14px] px-3.5 py-3 text-sm font-medium text-[var(--site-body)] hover:bg-black/[.04]"><span>{item.label}</span><ChevronRight size={15}/></a>)}<div className="my-2 border-t border-black/[.06]"/><a href="/login" className="flex items-center justify-between rounded-[14px] px-3.5 py-3 text-sm font-semibold text-[var(--site-accent)]">Portal School OS <ArrowUpRight size={15}/></a></nav></details></div></header>;
}

function SiteFooter({ data }: { data: any }) {
  const footerNav = (data.nav || []).filter((item: any) => item.location === "FOOTER");
  const socials = socialEntries(data.site);
  return <footer className="bg-[var(--site-dark)] text-white"><div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8"><div className="grid gap-10 lg:grid-cols-[1.45fr_.8fr_.8fr_.9fr]"><div><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center overflow-hidden rounded-[14px] bg-white/10">{data.school.logoUrl ? <img src={data.school.logoUrl} alt="" className="h-full w-full object-cover"/> : <School size={21}/>}</span><div><h2 className="text-lg font-semibold tracking-[-.02em]">{data.site.siteTitle || data.school.name}</h2><p className="mt-0.5 text-xs text-white/55">Website resmi sekolah</p></div></div><p className="mt-5 max-w-md text-sm leading-7 text-white/62">{data.site.tagline || "Informasi resmi, berita, agenda, dan layanan publik sekolah."}</p>{[data.school.address, data.school.city, data.school.province].filter(Boolean).length > 0 && <p className="mt-5 flex max-w-md items-start gap-2 text-sm leading-6 text-white/58"><MapPin size={16} className="mt-1 shrink-0"/>{[data.school.address, data.school.city, data.school.province].filter(Boolean).join(", ")}</p>}</div><div><h3 className="text-xs font-semibold uppercase tracking-[.12em] text-white/42">Jelajahi</h3><div className="mt-4 space-y-3">{footerNav.length ? footerNav.map((item: any) => <a key={item.id} href={item.resolvedHref} className="block text-sm text-white/70 transition hover:text-white">{item.label}</a>) : <><a href={`/site/${data.school.slug}/berita`} className="block text-sm text-white/70 hover:text-white">Berita</a><a href={`/site/${data.school.slug}/agenda`} className="block text-sm text-white/70 hover:text-white">Agenda</a><a href={`/site/${data.school.slug}/pengumuman`} className="block text-sm text-white/70 hover:text-white">Pengumuman</a></>}</div></div><div><h3 className="text-xs font-semibold uppercase tracking-[.12em] text-white/42">Kontak</h3><div className="mt-4 space-y-3">{data.site.publicEmail && <a className="flex items-start gap-2 text-sm text-white/70 hover:text-white" href={`mailto:${data.site.publicEmail}`}><Mail size={15} className="mt-0.5 shrink-0"/><span className="break-all">{data.site.publicEmail}</span></a>}{data.site.publicPhone && <span className="flex items-center gap-2 text-sm text-white/70"><Phone size={15}/>{data.site.publicPhone}</span>}{!data.site.publicEmail && !data.site.publicPhone && <p className="text-sm leading-6 text-white/45">Kontak publik belum dicantumkan.</p>}</div></div><div><h3 className="text-xs font-semibold uppercase tracking-[.12em] text-white/42">Terhubung</h3><div className="mt-4 flex flex-wrap gap-2">{socials.length ? socials.map((item) => <a key={item.key} href={item.href} target="_blank" rel="noreferrer" className="rounded-full border border-white/12 px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/8 hover:text-white">{item.label}</a>) : <span className="text-sm text-white/45">Tautan sosial belum ditambahkan.</span>}</div></div></div></div><div className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-white/42 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><span>© {new Date().getFullYear()} {data.school.name}</span><span>Dikelola melalui School OS</span></div></div></footer>;
}

function PublicShell({ data, children, pageTitle, description, canonicalPath, image, pageType = "website", structuredData }: { data: any; children: React.ReactNode; pageTitle?: string; description?: string; canonicalPath?: string; image?: string | null; pageType?: "website" | "article"; structuredData?: unknown }) {
  const title = pageTitle || data.site.defaultSeoTitle || data.site.siteTitle || data.school.name;
  const desc = description || data.site.defaultSeoDescription || data.site.tagline || `Website resmi ${data.school.name}`;
  const canonicalUrl = canonicalPath ? `${PUBLIC_ORIGIN}${canonicalPath}` : `${PUBLIC_ORIGIN}/site/${data.school.slug}`;
  const ogImage = image || data.site.heroImageUrl || data.school.logoUrl || null;
  return <div style={schoolSiteThemeVars(data.site.themePreset)} className="min-h-screen bg-[var(--site-canvas)] text-[var(--site-fg)] antialiased"><title>{title}</title><meta name="description" content={desc}/><meta name="robots" content={data.site.robotsIndex ? "index,follow" : "noindex,nofollow"}/><meta name="theme-color" content="#ffffff"/><link rel="canonical" href={canonicalUrl}/><meta property="og:type" content={pageType}/><meta property="og:title" content={title}/><meta property="og:site_name" content={data.site.siteTitle || data.school.name}/><meta property="og:description" content={desc}/><meta property="og:url" content={canonicalUrl}/>{ogImage && <meta property="og:image" content={ogImage}/>}<meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"}/><meta name="twitter:title" content={title}/><meta name="twitter:description" content={desc}/>{ogImage && <meta name="twitter:image" content={ogImage}/>}<link rel="sitemap" type="application/xml" href={`${PUBLIC_ORIGIN}/site/${data.school.slug}/sitemap.xml`}/>{structuredData && <script type="application/ld+json">{safeStructuredData(structuredData)}</script>}<SiteHeader data={data}/>{children}<SiteFooter data={data}/></div>;
}

function SectionHeading({ eyebrow, title, note, href, hrefLabel = "Lihat semua" }: { eyebrow?: string; title: string; note?: string; href?: string; hrefLabel?: string }) {
  return <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div className="max-w-2xl">{eyebrow && <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[var(--site-accent)]">{eyebrow}</p>}<h2 className="mt-2 text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.02] tracking-[-.045em] text-[var(--site-fg)]">{title}</h2>{note && <p className="mt-3 text-[15px] leading-7 text-[var(--site-muted)]">{note}</p>}</div>{href && <a href={href} className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[var(--site-accent)] transition hover:gap-3">{hrefLabel}<ArrowRight size={16}/></a>}</div>;
}

function NewsCard({ item, schoolSlug, featured = false }: { item: any; schoolSlug: string; featured?: boolean }) {
  const href = `/site/${schoolSlug}/berita/${item.slug}`;
  return <article className={`group overflow-hidden rounded-[26px] border border-black/[.06] bg-white shadow-[0_10px_36px_rgba(15,23,42,.045)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(15,23,42,.08)] ${featured ? "grid min-h-[420px] lg:grid-cols-[1.12fr_.88fr]" : ""}`}>{item.coverImageUrl ? <a href={href} className={`block overflow-hidden bg-[#E9EDF3] ${featured ? "min-h-[260px] lg:min-h-full" : ""}`}><img src={item.coverImageUrl} alt="" loading={featured ? "eager" : "lazy"} className={`${featured ? "h-full min-h-[260px]" : "aspect-[16/10]"} w-full object-cover transition duration-500 group-hover:scale-[1.015]`}/></a> : <a href={href} className={`relative block overflow-hidden bg-[linear-gradient(145deg,var(--site-soft),#ffffff)] ${featured ? "min-h-[260px] lg:min-h-full" : "aspect-[16/10]"}`} aria-label={item.title}><div className="absolute -right-12 -top-10 size-48 rounded-full bg-[var(--site-accent)]/10"/><div className="absolute bottom-8 left-8 flex size-14 items-center justify-center rounded-[18px] bg-white/85 text-[var(--site-accent)] shadow-sm backdrop-blur"><Newspaper size={25} strokeWidth={1.6}/></div></a>}<div className={`${featured ? "flex flex-col justify-center p-7 sm:p-9" : "p-5 sm:p-6"}`}><div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[.08em] text-[var(--site-muted)]">{item.category && <span className="text-[var(--site-accent)]">{item.category}</span>}<span>{formatDate(item.publishedAt || item.scheduledAt)}</span></div><h3 className={`${featured ? "mt-4 text-[clamp(1.75rem,3vw,2.65rem)] leading-[1.04] tracking-[-.04em]" : "mt-3 text-xl leading-7 tracking-[-.025em]"} font-semibold`}><a href={href} className="transition group-hover:text-[var(--site-accent)]">{item.title}</a></h3>{item.excerpt && <p className={`${featured ? "mt-5 text-[15px] leading-7" : "mt-3 line-clamp-3 text-sm leading-6"} text-[var(--site-muted)]`}>{item.excerpt}</p>}<a href={href} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--site-accent)]">Baca selengkapnya <ArrowRight size={15}/></a></div></article>;
}

function HomeHero({ data, profile }: { data: any; profile?: any }) {
  const programCount = data.school.departments?.length || 0;
  const location = [data.school.city, data.school.province].filter(Boolean).join(", ");
  return <section className="relative isolate overflow-hidden bg-[var(--site-dark)] text-white"><div className="absolute inset-0 -z-20">{data.site.heroImageUrl ? <img src={data.site.heroImageUrl} alt="" className="h-full w-full object-cover"/> : <div className="h-full w-full bg-[radial-gradient(circle_at_78%_28%,rgba(68,141,255,.38),transparent_28%),radial-gradient(circle_at_64%_76%,rgba(31,182,119,.20),transparent_28%),linear-gradient(135deg,#081425_0%,#102B4E_48%,#0F3151_100%)]"/>}</div><div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(6,13,24,.9)_0%,rgba(6,13,24,.74)_46%,rgba(6,13,24,.24)_100%)]"/><div className="absolute -right-28 top-24 -z-10 hidden size-[420px] rounded-full border border-white/10 lg:block"/><div className="absolute -right-4 top-52 -z-10 hidden size-[300px] rounded-full border border-white/8 lg:block"/><div className="mx-auto grid min-h-[650px] max-w-7xl items-end gap-10 px-5 pb-14 pt-20 sm:px-6 md:min-h-[700px] md:pb-20 lg:grid-cols-[1.25fr_.75fr] lg:px-8"><div className="max-w-4xl"><div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/8 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[.12em] text-white/74 backdrop-blur-xl"><School size={14}/><span>Website resmi</span></div><h1 className="mt-7 text-[clamp(3.15rem,8vw,7.1rem)] font-semibold leading-[.88] tracking-[-.065em] text-white">{data.site.heroTitle || data.school.name}</h1><p className="mt-7 max-w-2xl text-[clamp(1.05rem,2vw,1.32rem)] leading-8 text-white/72">{data.site.heroSubtitle || data.site.tagline || "Informasi resmi, berita, agenda, dan layanan publik sekolah."}</p><div className="mt-9 flex flex-wrap gap-3">{profile && <a href={`/site/${data.school.slug}/${profile.slug}`} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#111827] transition hover:bg-white/90">Jelajahi sekolah <ArrowRight size={16}/></a>}<a href={`/site/${data.school.slug}/berita`} className="inline-flex items-center gap-2 rounded-full border border-white/22 bg-white/8 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/14">Berita & kegiatan <ArrowUpRight size={16}/></a></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><div className="rounded-[26px] border border-white/13 bg-white/9 p-5 backdrop-blur-xl"><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-white/45">Sekolah</p><p className="mt-2 text-lg font-semibold tracking-[-.02em]">{data.school.name}</p>{location && <p className="mt-2 flex items-center gap-2 text-sm text-white/62"><MapPin size={15}/>{location}</p>}</div>{programCount > 0 && <div className="rounded-[26px] border border-white/13 bg-white/9 p-5 backdrop-blur-xl"><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-white/45">Program</p><div className="mt-2 flex items-end justify-between gap-4"><p className="text-lg font-semibold tracking-[-.02em]">Program keahlian</p><span className="text-3xl font-semibold tracking-[-.04em]">{programCount}</span></div></div>}</div></div></section>;
}

function QuickLinksSection({ data, profile }: { data: any; profile?: any }) {
  const links = [
    profile ? { label: "Profil Sekolah", note: "Kenali identitas dan cerita sekolah", href: `/site/${data.school.slug}/${profile.slug}`, icon: School } : null,
    data.school.departments?.length ? { label: "Program Keahlian", note: "Lihat program yang tersedia", href: "#program-keahlian", icon: GraduationCap } : null,
    { label: "Berita", note: "Kabar dan kegiatan terbaru", href: `/site/${data.school.slug}/berita`, icon: Newspaper },
    { label: "Agenda", note: "Jadwal kegiatan publik", href: `/site/${data.school.slug}/agenda`, icon: CalendarDays },
  ].filter(Boolean) as any[];
  return <section className="relative z-10 -mt-1 border-b border-black/[.055] bg-white"><div className="mx-auto max-w-7xl px-5 py-6 sm:px-6 lg:px-8"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{links.map((item) => { const Icon = item.icon; return <a key={item.label} href={item.href} className="group flex min-h-[104px] items-center gap-4 rounded-[20px] px-4 py-4 transition hover:bg-[var(--site-soft)]"><span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--site-soft)] text-[var(--site-accent)] transition group-hover:bg-white"><Icon size={20} strokeWidth={1.7}/></span><span className="min-w-0 flex-1"><strong className="block text-sm tracking-[-.01em] text-[var(--site-fg)]">{item.label}</strong><span className="mt-1 block text-xs leading-5 text-[var(--site-muted)]">{item.note}</span></span><ChevronRight size={17} className="shrink-0 text-black/20 transition group-hover:translate-x-0.5 group-hover:text-[var(--site-accent)]"/></a>; })}</div></div></section>;
}

function AnnouncementsSection({ data }: { data: any }) {
  if (!data.announcements?.length) return null;
  return <section className="mx-auto max-w-7xl px-5 pt-10 sm:px-6 lg:px-8"><div className="overflow-hidden rounded-[24px] border border-[var(--site-accent)]/12 bg-[var(--site-soft)]"><div className="grid lg:grid-cols-[230px_1fr]"><div className="flex items-center gap-3 px-5 py-5 text-sm font-semibold text-[var(--site-accent)]"><span className="flex size-9 items-center justify-center rounded-full bg-white/75"><Megaphone size={18}/></span>Pengumuman penting</div><div className="bg-white/55">{data.announcements.slice(0, 3).map((item: any) => <a key={item.id} href={`/site/${data.school.slug}/pengumuman`} className="group flex min-h-[58px] items-center justify-between gap-4 border-t border-black/[.055] px-5 py-3 first:border-t-0 lg:border-l lg:first:border-t-0"><span className="min-w-0 truncate text-sm font-medium text-[var(--site-fg)]">{item.title}</span><ArrowRight size={15} className="shrink-0 text-[var(--site-accent)] transition group-hover:translate-x-1"/></a>)}</div></div></div></section>;
}

function AboutSection({ data, profile }: { data: any; profile?: any }) {
  if (!profile) return null;
  return <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 md:py-28 lg:px-8"><div className="grid gap-12 lg:grid-cols-[.82fr_1.18fr] lg:gap-20"><div className="lg:sticky lg:top-28 lg:self-start"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[var(--site-accent)]">Tentang sekolah</p><h2 className="mt-3 text-[clamp(2.4rem,5vw,4.5rem)] font-semibold leading-[.98] tracking-[-.055em] text-[var(--site-fg)]">{profile.title}</h2>{profile.excerpt && <p className="mt-5 text-base leading-8 text-[var(--site-muted)]">{profile.excerpt}</p>}<a href={`/site/${data.school.slug}/${profile.slug}`} className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[var(--site-accent)]">Baca profil lengkap <ArrowRight size={15}/></a></div><div className="relative overflow-hidden rounded-[30px] border border-black/[.055] bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,.055)] sm:p-9"><div className="absolute right-0 top-0 h-32 w-32 rounded-bl-[90px] bg-[var(--site-soft)]"/><div className="relative"><ContentBlocks blocks={profile.contentBlocks || []} compact/></div></div></div></section>;
}

function ProgramsSection({ data }: { data: any }) {
  if (!data.school.departments?.length) return null;
  return <section id="program-keahlian" className="scroll-mt-24 bg-white py-20 md:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8"><SectionHeading eyebrow="Program" title="Program keahlian" note="Jelajahi program yang tersedia di sekolah dan temukan bidang belajar yang sesuai dengan minat serta rencana masa depan."/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.school.departments.map((item: any, index: number) => <article key={item.id} className="group relative min-h-[250px] overflow-hidden rounded-[28px] border border-black/[.06] bg-[linear-gradient(145deg,#F8FAFC,#EEF4FA)] p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,.08)]"><div className="absolute -right-16 -top-20 size-52 rounded-full bg-[var(--site-accent)]/8 transition duration-500 group-hover:scale-110"/><div className="relative flex h-full flex-col"><div className="flex items-start justify-between gap-4"><span className="flex size-11 items-center justify-center rounded-[14px] bg-white text-[var(--site-accent)] shadow-sm"><GraduationCap size={21} strokeWidth={1.7}/></span><span className="text-xs font-semibold tracking-[.08em] text-[var(--site-muted)]">{String(index + 1).padStart(2, "0")}</span></div><div className="mt-auto pt-12"><p className="text-xs font-bold uppercase tracking-[.12em] text-[var(--site-accent)]">{item.code}</p><h3 className="mt-2 text-[clamp(1.45rem,2.5vw,2rem)] font-semibold leading-tight tracking-[-.035em] text-[var(--site-fg)]">{item.name}</h3></div></div></article>)}</div></div></section>;
}

function NewsSection({ data }: { data: any }) {
  if (!data.news?.length) return null;
  const [featured, ...rest] = data.news;
  return <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 md:py-28 lg:px-8"><SectionHeading eyebrow="Kabar sekolah" title="Berita terbaru" note="Cerita, kegiatan, dan informasi terbaru dari lingkungan sekolah." href={`/site/${data.school.slug}/berita`}/><div className={rest.length ? "grid gap-5 xl:grid-cols-[1.35fr_.65fr]" : ""}><NewsCard item={featured} schoolSlug={data.school.slug} featured/><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">{rest.slice(0, 2).map((item: any) => <NewsCard key={item.id} item={item} schoolSlug={data.school.slug}/>)}</div></div>{rest.length > 2 && <div className="mt-5 grid gap-5 md:grid-cols-3">{rest.slice(2, 5).map((item: any) => <NewsCard key={item.id} item={item} schoolSlug={data.school.slug}/>)}</div>}</section>;
}

function EventsSection({ data }: { data: any }) {
  if (!data.events?.length) return null;
  return <section className="bg-white py-20 md:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8"><SectionHeading eyebrow="Kalender" title="Agenda terdekat" note="Agenda publik sekolah yang akan datang." href={`/site/${data.school.slug}/agenda`}/><div className="grid gap-4 lg:grid-cols-2">{data.events.slice(0, 4).map((item: any) => <article key={item.id} className="group flex gap-5 rounded-[26px] border border-black/[.06] bg-[#FBFCFD] p-5 transition hover:bg-[var(--site-soft)] sm:p-6"><div className="flex size-[68px] shrink-0 flex-col items-center justify-center rounded-[19px] bg-white text-[var(--site-accent)] shadow-sm"><strong className="text-2xl leading-none tracking-[-.04em]">{new Date(item.startsAt).getDate()}</strong><span className="mt-1 text-[10px] font-bold uppercase tracking-[.08em]">{new Intl.DateTimeFormat("id-ID", { month: "short" }).format(new Date(item.startsAt))}</span></div><div className="min-w-0 flex-1"><h3 className="text-lg font-semibold tracking-[-.025em] text-[var(--site-fg)]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--site-muted)]">{formatDate(item.startsAt, true)}</p>{item.location && <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--site-muted)]"><MapPin size={13}/>{item.location}</p>}</div><ChevronRight size={18} className="mt-1 shrink-0 text-black/20 transition group-hover:translate-x-1 group-hover:text-[var(--site-accent)]"/></article>)}</div></div></section>;
}

function GallerySection({ data }: { data: any }) {
  if (!data.media?.length) return null;
  return <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 md:py-28 lg:px-8"><SectionHeading eyebrow="Kehidupan sekolah" title="Galeri kegiatan" note="Potret kegiatan dan ruang belajar yang dibagikan secara publik oleh sekolah."/><div className="grid auto-rows-[180px] grid-cols-2 gap-3 md:auto-rows-[230px] md:grid-cols-4">{data.media.slice(0, 7).map((item: any, index: number) => <figure key={item.id} className={`group relative overflow-hidden rounded-[24px] bg-black/[.04] ${index === 0 ? "col-span-2 row-span-2" : index === 3 ? "col-span-2" : ""}`}><img src={item.url} alt={item.altText} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"/>{item.caption && <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-4 pb-4 pt-10 text-xs leading-5 text-white/90 opacity-0 transition group-hover:opacity-100">{item.caption}</figcaption>}</figure>)}</div></section>;
}

function ContactSection({ data }: { data: any }) {
  const location = [data.school.address, data.school.city, data.school.province].filter(Boolean).join(", ");
  if (!location && !data.site.publicEmail && !data.site.publicPhone) return null;
  return <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-6 md:pb-28 lg:px-8"><div className="relative overflow-hidden rounded-[34px] bg-[var(--site-dark)] px-6 py-10 text-white sm:px-10 sm:py-14 lg:px-14"><div className="absolute -right-24 -top-24 size-80 rounded-full border border-white/10"/><div className="absolute -right-8 top-20 size-52 rounded-full border border-white/8"/><div className="relative grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-white/48">Terhubung dengan sekolah</p><h2 className="mt-3 max-w-3xl text-[clamp(2.2rem,5vw,4.5rem)] font-semibold leading-[.98] tracking-[-.055em]">Temukan informasi resmi di satu tempat.</h2><p className="mt-5 max-w-xl text-[15px] leading-7 text-white/62">Gunakan kanal publik sekolah untuk pertanyaan, informasi kegiatan, dan komunikasi resmi.</p></div><div className="space-y-3">{data.site.publicEmail && <a href={`mailto:${data.site.publicEmail}`} className="flex items-center justify-between gap-4 rounded-[18px] border border-white/12 bg-white/8 px-4 py-4 text-sm font-medium backdrop-blur transition hover:bg-white/12"><span className="flex items-center gap-3"><Mail size={18}/>{data.site.publicEmail}</span><ArrowUpRight size={16}/></a>}{data.site.publicPhone && <div className="flex items-center gap-3 rounded-[18px] border border-white/12 bg-white/8 px-4 py-4 text-sm font-medium"><Phone size={18}/>{data.site.publicPhone}</div>}{location && <div className="flex items-start gap-3 rounded-[18px] border border-white/12 bg-white/8 px-4 py-4 text-sm leading-6 text-white/74"><MapPin size={18} className="mt-0.5 shrink-0"/>{location}</div>}</div></div></div></section>;
}

function homeStructuredData(data: any) {
  const address = [data.school.address, data.school.city, data.school.province].filter(Boolean).join(", ");
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: data.site.siteTitle || data.school.name,
    url: `${PUBLIC_ORIGIN}/site/${data.school.slug}`,
    ...(data.school.logoUrl ? { logo: data.school.logoUrl } : {}),
    ...(address ? { address } : {}),
    ...(data.site.publicEmail ? { email: data.site.publicEmail } : {}),
    ...(data.site.publicPhone ? { telephone: data.site.publicPhone } : {}),
    ...(socialEntries(data.site).length ? { sameAs: socialEntries(data.site).map((item) => item.href) } : {}),
  };
}

export function SchoolPublicHomeCanvas({ data }: { data: any }) {
  const profile = data.pages.find((p: any) => ["profil", "tentang", "profil-sekolah"].includes(p.slug)) || data.pages[0];
  const sections = normalizeLandingSections(data.site.landingSections).filter((section) => section.enabled);
  const renderSection = (type: string) => {
    if (type === "HERO") return <HomeHero key={type} data={data} profile={profile}/>;
    if (type === "QUICK_LINKS") return <QuickLinksSection key={type} data={data} profile={profile}/>;
    if (type === "ANNOUNCEMENTS") return <AnnouncementsSection key={type} data={data}/>;
    if (type === "ABOUT") return <AboutSection key={type} data={data} profile={profile}/>;
    if (type === "PROGRAMS") return <ProgramsSection key={type} data={data}/>;
    if (type === "NEWS") return <NewsSection key={type} data={data}/>;
    if (type === "EVENTS") return <EventsSection key={type} data={data}/>;
    if (type === "GALLERY") return <GallerySection key={type} data={data}/>;
    if (type === "CONTACT") return <ContactSection key={type} data={data}/>;
    return null;
  };
  return <main>{sections.map((section) => renderSection(section.type))}</main>;
}

export function PublicSchoolHomePage() {
  const { schoolSlug = "" } = useParams();
  const query = useQuery(getPublicSchoolSite, { schoolSlug });
  if (query.isLoading) return <LoadingSite/>;
  if (query.error || !query.data) return <PublicNotFound message="Website sekolah belum dipublikasikan atau alamat sekolah tidak ditemukan."/>;
  const data: any = query.data;
  return <PublicShell data={data} canonicalPath={`/site/${schoolSlug}`} structuredData={homeStructuredData(data)}><SchoolPublicHomeCanvas data={data}/></PublicShell>;
}

function IndexLayout({ data, title, eyebrow, note, children, canonicalPath }: { data: any; title: string; eyebrow: string; note: string; children: React.ReactNode; canonicalPath: string }) {
  return <PublicShell data={data} pageTitle={`${title} | ${data.site.siteTitle || data.school.name}`} description={note} canonicalPath={canonicalPath}><main><section className="border-b border-black/[.055] bg-white"><div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 md:py-20 lg:px-8"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[var(--site-accent)]">{eyebrow}</p><h1 className="mt-3 max-w-4xl text-[clamp(2.7rem,6vw,5.6rem)] font-semibold leading-[.94] tracking-[-.06em] text-[var(--site-fg)]">{title}</h1><p className="mt-5 max-w-2xl text-base leading-8 text-[var(--site-muted)]">{note}</p></div></section><section className="mx-auto min-h-[45vh] max-w-7xl px-5 py-12 sm:px-6 md:py-16 lg:px-8">{children}</section></main></PublicShell>;
}

export function PublicSchoolNewsIndexPage() {
  const { schoolSlug = "" } = useParams(); const query = useQuery(getPublicSchoolSite, { schoolSlug });
  if (query.isLoading) return <LoadingSite/>; if (query.error || !query.data) return <PublicNotFound/>; const data: any = query.data;
  return <IndexLayout data={data} eyebrow={data.school.name} title="Berita sekolah" note="Kabar, kegiatan, prestasi, dan informasi terbaru yang dipublikasikan sekolah." canonicalPath={`/site/${schoolSlug}/berita`}>{data.news.length ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{data.news.map((item: any, index: number) => <NewsCard key={item.id} item={item} schoolSlug={schoolSlug} featured={index === 0 && data.news.length === 1}/>)}</div> : <div className="rounded-[24px] border border-black/[.06] bg-white p-7 text-sm text-[var(--site-muted)]">Belum ada berita yang dipublikasikan.</div>}</IndexLayout>;
}

export function PublicSchoolEventIndexPage() {
  const { schoolSlug = "" } = useParams(); const query = useQuery(getPublicSchoolSite, { schoolSlug });
  if (query.isLoading) return <LoadingSite/>; if (query.error || !query.data) return <PublicNotFound/>; const data: any = query.data;
  return <IndexLayout data={data} eyebrow={data.school.name} title="Agenda sekolah" note="Jadwal kegiatan publik dan agenda mendatang." canonicalPath={`/site/${schoolSlug}/agenda`}>{data.events.length ? <div className="grid gap-4 lg:grid-cols-2">{data.events.map((item: any) => <article key={item.id} className="flex gap-5 rounded-[26px] border border-black/[.06] bg-white p-5 shadow-[0_10px_34px_rgba(15,23,42,.035)] sm:p-6"><div className="flex size-[68px] shrink-0 flex-col items-center justify-center rounded-[19px] bg-[var(--site-soft)] text-[var(--site-accent)]"><strong className="text-2xl leading-none">{new Date(item.startsAt).getDate()}</strong><span className="mt-1 text-[10px] font-bold uppercase">{new Intl.DateTimeFormat("id-ID", { month: "short" }).format(new Date(item.startsAt))}</span></div><div><h2 className="text-lg font-semibold tracking-[-.02em]">{item.title}</h2><p className="mt-2 text-sm leading-6 text-[var(--site-muted)]">{formatDate(item.startsAt, true)}{item.location ? ` · ${item.location}` : ""}</p>{item.excerpt && <p className="mt-3 text-sm leading-6 text-[var(--site-muted)]">{item.excerpt}</p>}</div></article>)}</div> : <div className="rounded-[24px] border border-black/[.06] bg-white p-7 text-sm text-[var(--site-muted)]">Belum ada agenda publik.</div>}</IndexLayout>;
}

export function PublicSchoolAnnouncementIndexPage() {
  const { schoolSlug = "" } = useParams(); const query = useQuery(getPublicSchoolSite, { schoolSlug });
  if (query.isLoading) return <LoadingSite/>; if (query.error || !query.data) return <PublicNotFound/>; const data: any = query.data;
  return <IndexLayout data={data} eyebrow={data.school.name} title="Pengumuman" note="Informasi resmi sekolah yang sedang berlaku." canonicalPath={`/site/${schoolSlug}/pengumuman`}>{data.announcements.length ? <div className="space-y-4">{data.announcements.map((item: any) => <article key={item.id} className="rounded-[26px] border border-black/[.06] bg-white p-6 shadow-[0_10px_34px_rgba(15,23,42,.035)] sm:p-7"><div className="flex items-start gap-4"><span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-[var(--site-soft)] text-[var(--site-accent)]"><Megaphone size={18}/></span><div><h2 className="text-xl font-semibold tracking-[-.025em]">{item.title}</h2>{item.excerpt && <p className="mt-2 text-sm leading-6 text-[var(--site-muted)]">{item.excerpt}</p>}<div className="mt-5"><ContentBlocks blocks={item.contentBlocks}/></div></div></div></article>)}</div> : <div className="rounded-[24px] border border-black/[.06] bg-white p-7 text-sm text-[var(--site-muted)]">Tidak ada pengumuman aktif saat ini.</div>}</IndexLayout>;
}

function DetailPage({ type }: { type: "PAGE" | "NEWS" }) {
  const { schoolSlug = "", slug = "" } = useParams(); const query = useQuery(getPublicSchoolContent, { schoolSlug, type, slug });
  if (query.isLoading) return <LoadingSite/>; if (query.error || !query.data) return <PublicNotFound/>; const result: any = query.data;
  const data = { school: result.school, site: result.site, nav: [] };
  const item = result.content;
  const canonicalPath = type === "NEWS" ? `/site/${schoolSlug}/berita/${slug}` : `/site/${schoolSlug}/${slug}`;
  const structuredData = type === "NEWS" ? {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: item.title,
    datePublished: new Date(item.publishedAt || item.scheduledAt || item.createdAt).toISOString(),
    dateModified: new Date(item.updatedAt || item.publishedAt || item.createdAt).toISOString(),
    ...(item.coverImageUrl ? { image: [item.coverImageUrl] } : {}),
    publisher: { "@type": "EducationalOrganization", name: data.site.siteTitle || data.school.name, url: `${PUBLIC_ORIGIN}/site/${schoolSlug}` },
    mainEntityOfPage: `${PUBLIC_ORIGIN}${canonicalPath}`,
  } : undefined;
  return <PublicShell data={data} pageTitle={item.seoTitle || `${item.title} | ${data.site.siteTitle || data.school.name}`} description={item.seoDescription || item.excerpt || data.site.defaultSeoDescription} canonicalPath={canonicalPath} image={item.coverImageUrl} pageType={type === "NEWS" ? "article" : "website"} structuredData={structuredData}><main><section className="border-b border-black/[.055] bg-white"><div className="mx-auto max-w-5xl px-5 pb-12 pt-10 sm:px-6 md:pb-16 md:pt-14"><a href={type === "NEWS" ? `/site/${schoolSlug}/berita` : `/site/${schoolSlug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--site-accent)]">← {type === "NEWS" ? "Kembali ke berita" : "Kembali ke beranda"}</a><div className="mt-8 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[.1em] text-[var(--site-muted)]">{type === "NEWS" && <span>{formatDate(item.publishedAt || item.scheduledAt)}</span>}{item.category && <span className="text-[var(--site-accent)]">{item.category}</span>}</div><h1 className="mt-3 text-[clamp(2.7rem,7vw,6rem)] font-semibold leading-[.94] tracking-[-.062em] text-[var(--site-fg)]">{item.title}</h1>{item.excerpt && <p className="mt-6 max-w-3xl text-[clamp(1.05rem,2vw,1.3rem)] leading-8 text-[var(--site-muted)]">{item.excerpt}</p>}</div></section>{item.coverImageUrl && <div className="mx-auto max-w-7xl px-5 pt-10 sm:px-6 md:pt-14 lg:px-8"><img src={item.coverImageUrl} alt="" className="aspect-[16/8] w-full rounded-[30px] object-cover shadow-[0_20px_65px_rgba(15,23,42,.08)]"/></div>}<article className="mx-auto max-w-3xl px-5 py-12 sm:px-6 md:py-16"><ContentBlocks blocks={item.contentBlocks}/></article></main></PublicShell>;
}

export function PublicSchoolNewsDetailPage() { return <DetailPage type="NEWS"/>; }
export function PublicSchoolContentPage() { return <DetailPage type="PAGE"/>; }
