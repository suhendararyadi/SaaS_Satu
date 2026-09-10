import React from "react";
import { useParams } from "react-router";
import { useQuery, getPublicSchoolContent, getPublicSchoolSite } from "wasp/client/operations";

function formatDate(value?: Date | string | null, withTime = false) {
  if (!value) return "";
  return new Intl.DateTimeFormat("id-ID", withTime ? { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" } : { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function PublicNotFound({ message = "Konten belum tersedia." }: { message?: string }) {
  return <main className="min-h-screen bg-[#F5F5F7] px-5 py-20 text-[#1D1D1F]"><div className="mx-auto max-w-xl rounded-[24px] border border-black/[.07] bg-white p-8 text-center shadow-sm"><div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#E8F1FF] text-[#007AFF]">404</div><h1 className="mt-5 text-2xl font-semibold tracking-[-.03em]">Halaman tidak ditemukan</h1><p className="mt-2 text-sm leading-6 text-[#6E6E73]">{message}</p><a href="/" className="mt-6 inline-flex rounded-full bg-[#007AFF] px-5 py-2.5 text-sm font-semibold text-white">Kembali</a></div></main>;
}

function LoadingSite() {
  return <div className="min-h-screen bg-[#F5F5F7] p-6"><div className="mx-auto max-w-6xl animate-pulse space-y-4"><div className="h-16 rounded-2xl bg-black/[.06]"/><div className="h-[440px] rounded-[28px] bg-black/[.05]"/></div></div>;
}

function ContentBlocks({ blocks }: { blocks: any[] }) {
  if (!Array.isArray(blocks)) return null;
  return <div className="space-y-5">{blocks.map((block, index) => {
    if (!block || typeof block.text !== "string") return null;
    if (block.type === "heading") return <h2 key={index} className="pt-3 text-2xl font-semibold tracking-[-.025em] text-[var(--site-fg)]">{block.text}</h2>;
    if (block.type === "quote") return <blockquote key={index} className="border-l-4 border-[var(--site-accent)] pl-5 text-lg leading-8 text-[var(--site-muted)]">{block.text}</blockquote>;
    if (block.type === "callout") return <div key={index} className="rounded-2xl bg-[var(--site-soft)] p-5 text-[15px] leading-7 text-[var(--site-fg)]">{block.text}</div>;
    return <p key={index} className="text-[16px] leading-8 text-[var(--site-body)]">{block.text}</p>;
  })}</div>;
}

function themeVars(themePreset?: string) {
  if (themePreset === "EDITORIAL") return { "--site-accent": "#B45309", "--site-soft": "#FFF7ED", "--site-fg": "#1C1917", "--site-body": "#44403C", "--site-muted": "#78716C" } as React.CSSProperties;
  if (themePreset === "CAMPUS") return { "--site-accent": "#166534", "--site-soft": "#ECFDF3", "--site-fg": "#14261A", "--site-body": "#334D3B", "--site-muted": "#5A6E60" } as React.CSSProperties;
  return { "--site-accent": "#0066CC", "--site-soft": "#EEF6FF", "--site-fg": "#1D1D1F", "--site-body": "#424245", "--site-muted": "#6E6E73" } as React.CSSProperties;
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
  return <header className="sticky top-0 z-20 border-b border-black/[.06] bg-white/85 backdrop-blur-xl"><div className="mx-auto flex min-h-16 max-w-6xl items-center gap-4 px-5"><a href={`/site/${data.school.slug}`} className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--site-soft)] text-sm font-bold text-[var(--site-accent)]">{data.school.logoUrl ? <img src={data.school.logoUrl} alt="" className="h-full w-full object-cover"/> : data.school.name.charAt(0)}</span><span className="truncate text-[15px] font-semibold tracking-[-.015em] text-[var(--site-fg)]">{data.site.siteTitle || data.school.name}</span></a><nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Navigasi utama">{links.map((item: any) => <a key={`${item.label}-${item.resolvedHref}`} href={item.resolvedHref} className="rounded-full px-3 py-2 text-[13px] font-medium text-[var(--site-muted)] transition hover:bg-black/[.04] hover:text-[var(--site-fg)]" target={item.type === "EXTERNAL" ? "_blank" : undefined} rel={item.type === "EXTERNAL" ? "noreferrer" : undefined}>{item.label}</a>)}</nav><details className="relative ml-auto md:hidden"><summary className="cursor-pointer list-none rounded-full border border-black/[.09] px-3 py-2 text-sm">Menu</summary><nav className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-black/[.08] bg-white p-2 shadow-xl">{links.map((item: any) => <a key={`${item.label}-${item.resolvedHref}`} href={item.resolvedHref} className="block rounded-xl px-3 py-2.5 text-sm text-[var(--site-body)] hover:bg-black/[.04]">{item.label}</a>)}</nav></details></div></header>;
}

function SiteFooter({ data }: { data: any }) {
  const footerNav = (data.nav || []).filter((item: any) => item.location === "FOOTER");
  return <footer className="mt-20 border-t border-black/[.07] bg-white"><div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:grid-cols-[1.4fr_.8fr_.8fr]"><div><h2 className="text-lg font-semibold text-[var(--site-fg)]">{data.site.siteTitle || data.school.name}</h2><p className="mt-2 max-w-md text-sm leading-6 text-[var(--site-muted)]">{data.site.tagline || "Website resmi sekolah"}</p><p className="mt-4 text-sm leading-6 text-[var(--site-muted)]">{[data.school.address, data.school.city, data.school.province].filter(Boolean).join(", ")}</p></div><div><h3 className="text-sm font-semibold text-[var(--site-fg)]">Kontak</h3><div className="mt-3 space-y-2 text-sm text-[var(--site-muted)]">{data.site.publicEmail && <a className="block hover:text-[var(--site-accent)]" href={`mailto:${data.site.publicEmail}`}>{data.site.publicEmail}</a>}{data.site.publicPhone && <span className="block">{data.site.publicPhone}</span>}</div></div><div><h3 className="text-sm font-semibold text-[var(--site-fg)]">Tautan</h3><div className="mt-3 space-y-2">{footerNav.map((item: any) => <a key={item.id} href={item.resolvedHref} className="block text-sm text-[var(--site-muted)] hover:text-[var(--site-accent)]">{item.label}</a>)}{!footerNav.length && <><a href={`/site/${data.school.slug}/berita`} className="block text-sm text-[var(--site-muted)]">Berita</a><a href={`/site/${data.school.slug}/agenda`} className="block text-sm text-[var(--site-muted)]">Agenda</a></>}</div></div></div><div className="border-t border-black/[.06] px-5 py-5 text-center text-xs text-[#86868B]">© {new Date().getFullYear()} {data.school.name}. Dikelola melalui School OS.</div></footer>;
}

function PublicShell({ data, children }: { data: any; children: React.ReactNode }) {
  const title = data.site.defaultSeoTitle || data.site.siteTitle || data.school.name;
  const description = data.site.defaultSeoDescription || data.site.tagline || `Website resmi ${data.school.name}`;
  return <div style={themeVars(data.site.themePreset)} className="min-h-screen bg-[#F7F7F8] text-[var(--site-fg)]"><title>{title}</title><meta name="description" content={description}/><meta name="robots" content={data.site.robotsIndex ? "index,follow" : "noindex,nofollow"}/><SiteHeader data={data}/>{children}<SiteFooter data={data}/></div>;
}

function SectionTitle({ eyebrow, title, href }: { eyebrow?: string; title: string; href?: string }) {
  return <div className="mb-5 flex items-end justify-between gap-4"><div>{eyebrow && <p className="text-xs font-semibold uppercase tracking-[.08em] text-[var(--site-accent)]">{eyebrow}</p>}<h2 className="mt-1 text-2xl font-semibold tracking-[-.03em] text-[var(--site-fg)]">{title}</h2></div>{href && <a href={href} className="text-sm font-semibold text-[var(--site-accent)]">Lihat semua</a>}</div>;
}

function NewsCard({ item, schoolSlug }: { item: any; schoolSlug: string }) {
  return <article className="overflow-hidden rounded-[22px] border border-black/[.07] bg-white shadow-[0_1px_2px_rgba(0,0,0,.02)]">{item.coverImageUrl && <a href={`/site/${schoolSlug}/berita/${item.slug}`}><img src={item.coverImageUrl} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover"/></a>}<div className="p-5"><div className="flex gap-2 text-xs text-[var(--site-muted)]">{item.category && <span>{item.category}</span>}<span>{formatDate(item.publishedAt || item.scheduledAt)}</span></div><h3 className="mt-2 text-lg font-semibold leading-6 tracking-[-.02em]"><a href={`/site/${schoolSlug}/berita/${item.slug}`} className="hover:text-[var(--site-accent)]">{item.title}</a></h3>{item.excerpt && <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--site-muted)]">{item.excerpt}</p>}</div></article>;
}

export function PublicSchoolHomePage() {
  const { schoolSlug = "" } = useParams();
  const query = useQuery(getPublicSchoolSite, { schoolSlug });
  if (query.isLoading) return <LoadingSite/>;
  if (query.error || !query.data) return <PublicNotFound message="Website sekolah belum dipublikasikan atau alamat sekolah tidak ditemukan."/>;
  const data: any = query.data;
  const profile = data.pages.find((p: any) => ["profil", "tentang", "profil-sekolah"].includes(p.slug)) || data.pages[0];
  return <PublicShell data={data}><main><section className="relative isolate overflow-hidden bg-[#EAF3FF]"><div className="absolute inset-0 -z-10">{data.site.heroImageUrl ? <img src={data.site.heroImageUrl} alt="" className="h-full w-full object-cover"/> : <div className="h-full w-full bg-[radial-gradient(circle_at_20%_10%,rgba(77,163,255,.38),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(52,199,89,.20),transparent_32%),linear-gradient(140deg,#EAF4FF,#F8FBFF_55%,#EEF8F1)]"/>}<div className="absolute inset-0 bg-gradient-to-r from-white/92 via-white/76 to-white/28"/></div><div className="mx-auto flex min-h-[520px] max-w-6xl items-center px-5 py-20"><div className="max-w-3xl"><p className="text-sm font-semibold text-[var(--site-accent)]">Website Resmi</p><h1 className="mt-3 text-[clamp(2.6rem,7vw,5.4rem)] font-semibold leading-[.94] tracking-[-.055em] text-[var(--site-fg)]">{data.site.heroTitle || data.school.name}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--site-body)]">{data.site.heroSubtitle || data.site.tagline || "Informasi, berita, agenda, dan layanan publik sekolah."}</p><div className="mt-8 flex flex-wrap gap-3"><a href={`/site/${schoolSlug}/berita`} className="rounded-full bg-[var(--site-accent)] px-5 py-3 text-sm font-semibold text-white">Berita terbaru</a>{profile && <a href={`/site/${schoolSlug}/${profile.slug}`} className="rounded-full border border-black/[.12] bg-white/80 px-5 py-3 text-sm font-semibold text-[var(--site-fg)] backdrop-blur">Profil sekolah</a>}</div></div></div></section>
  {data.announcements.length > 0 && <section className="mx-auto max-w-6xl px-5 pt-10"><div className="overflow-hidden rounded-[20px] border border-[var(--site-accent)]/15 bg-[var(--site-soft)]"><div className="grid gap-0 md:grid-cols-[180px_1fr]"><div className="flex items-center px-5 py-4 text-sm font-semibold text-[var(--site-accent)]">Pengumuman penting</div><div>{data.announcements.slice(0,3).map((item: any) => <a key={item.id} href={`/site/${schoolSlug}/pengumuman`} className="flex min-h-12 items-center justify-between gap-3 border-t border-black/[.06] px-5 py-3 text-sm font-medium text-[var(--site-fg)] first:border-t-0 md:border-l md:first:border-t-0"><span className="truncate">{item.title}</span><span aria-hidden>›</span></a>)}</div></div></div></section>}
  {profile && <section className="mx-auto max-w-6xl px-5 py-16"><div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr]"><div><p className="text-xs font-semibold uppercase tracking-[.08em] text-[var(--site-accent)]">Tentang sekolah</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.035em]">{profile.title}</h2>{profile.excerpt && <p className="mt-4 text-base leading-7 text-[var(--site-muted)]">{profile.excerpt}</p>}<a href={`/site/${schoolSlug}/${profile.slug}`} className="mt-5 inline-flex text-sm font-semibold text-[var(--site-accent)]">Selengkapnya →</a></div><div className="rounded-[24px] bg-white p-6 shadow-sm"><ContentBlocks blocks={(profile.contentBlocks || []).slice(0,3)}/></div></div></section>}
  {data.school.departments?.length > 0 && <section className="bg-white py-16"><div className="mx-auto max-w-6xl px-5"><SectionTitle eyebrow="Program" title="Program keahlian & jurusan"/><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.school.departments.map((item: any) => <div key={item.id} className="rounded-[18px] border border-black/[.07] bg-[#FAFAFA] p-5"><span className="text-xs font-semibold text-[var(--site-accent)]">{item.code}</span><h3 className="mt-2 text-lg font-semibold tracking-[-.02em]">{item.name}</h3></div>)}</div></div></section>}
  {data.news.length > 0 && <section className="mx-auto max-w-6xl px-5 py-16"><SectionTitle eyebrow="Informasi" title="Berita terbaru" href={`/site/${schoolSlug}/berita`}/><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{data.news.slice(0,6).map((item: any) => <NewsCard key={item.id} item={item} schoolSlug={schoolSlug}/>)}</div></section>}
  {data.events.length > 0 && <section className="bg-white py-16"><div className="mx-auto max-w-6xl px-5"><SectionTitle eyebrow="Kalender" title="Agenda terdekat" href={`/site/${schoolSlug}/agenda`}/><div className="grid gap-3 md:grid-cols-2">{data.events.slice(0,4).map((item: any) => <div key={item.id} className="flex gap-4 rounded-[20px] border border-black/[.07] p-5"><div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-[var(--site-soft)] text-[var(--site-accent)]"><strong className="text-lg leading-none">{new Date(item.startsAt).getDate()}</strong><span className="mt-1 text-[10px] font-semibold uppercase">{new Intl.DateTimeFormat("id-ID", {month:"short"}).format(new Date(item.startsAt))}</span></div><div><h3 className="text-base font-semibold">{item.title}</h3><p className="mt-1 text-sm text-[var(--site-muted)]">{formatDate(item.startsAt, true)}{item.location ? ` · ${item.location}` : ""}</p></div></div>)}</div></div></section>}
  {data.media.length > 0 && <section className="mx-auto max-w-6xl px-5 py-16"><SectionTitle eyebrow="Galeri" title="Kegiatan sekolah"/><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{data.media.slice(0,8).map((item: any) => <figure key={item.id} className="overflow-hidden rounded-[18px] bg-black/[.04]"><img src={item.url} alt={item.altText} loading="lazy" className="aspect-square h-full w-full object-cover"/></figure>)}</div></section>}
  </main></PublicShell>;
}

function IndexLayout({ data, title, note, children }: { data: any; title: string; note: string; children: React.ReactNode }) {
  return <PublicShell data={data}><main className="mx-auto min-h-[60vh] max-w-6xl px-5 py-14"><p className="text-xs font-semibold uppercase tracking-[.08em] text-[var(--site-accent)]">{data.school.name}</p><h1 className="mt-2 text-4xl font-semibold tracking-[-.04em]">{title}</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[var(--site-muted)]">{note}</p><div className="mt-10">{children}</div></main></PublicShell>;
}

export function PublicSchoolNewsIndexPage() {
  const { schoolSlug = "" } = useParams(); const query = useQuery(getPublicSchoolSite, { schoolSlug });
  if (query.isLoading) return <LoadingSite/>; if (query.error || !query.data) return <PublicNotFound/>; const data: any = query.data;
  return <IndexLayout data={data} title="Berita sekolah" note="Kabar, kegiatan, prestasi, dan informasi terbaru dari sekolah.">{data.news.length ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{data.news.map((item: any) => <NewsCard key={item.id} item={item} schoolSlug={schoolSlug}/>)}</div> : <p className="rounded-2xl bg-white p-6 text-sm text-[var(--site-muted)]">Belum ada berita yang dipublikasikan.</p>}</IndexLayout>;
}

export function PublicSchoolEventIndexPage() {
  const { schoolSlug = "" } = useParams(); const query = useQuery(getPublicSchoolSite, { schoolSlug });
  if (query.isLoading) return <LoadingSite/>; if (query.error || !query.data) return <PublicNotFound/>; const data: any = query.data;
  return <IndexLayout data={data} title="Agenda sekolah" note="Jadwal kegiatan publik dan agenda mendatang.">{data.events.length ? <div className="space-y-3">{data.events.map((item: any) => <article key={item.id} className="rounded-[20px] border border-black/[.07] bg-white p-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">{item.title}</h2><p className="mt-1 text-sm text-[var(--site-muted)]">{formatDate(item.startsAt, true)}{item.location ? ` · ${item.location}` : ""}</p></div>{item.excerpt && <p className="max-w-xl text-sm leading-6 text-[var(--site-muted)]">{item.excerpt}</p>}</div></article>)}</div> : <p className="rounded-2xl bg-white p-6 text-sm text-[var(--site-muted)]">Belum ada agenda publik.</p>}</IndexLayout>;
}

export function PublicSchoolAnnouncementIndexPage() {
  const { schoolSlug = "" } = useParams(); const query = useQuery(getPublicSchoolSite, { schoolSlug });
  if (query.isLoading) return <LoadingSite/>; if (query.error || !query.data) return <PublicNotFound/>; const data: any = query.data;
  return <IndexLayout data={data} title="Pengumuman" note="Informasi resmi yang sedang berlaku.">{data.announcements.length ? <div className="space-y-3">{data.announcements.map((item: any) => <article key={item.id} className="rounded-[20px] border border-black/[.07] bg-white p-5"><div className="flex gap-3"><span className="mt-1 size-2 shrink-0 rounded-full bg-[var(--site-accent)]"/><div><h2 className="text-lg font-semibold">{item.title}</h2>{item.excerpt && <p className="mt-2 text-sm leading-6 text-[var(--site-muted)]">{item.excerpt}</p>}<div className="mt-4"><ContentBlocks blocks={item.contentBlocks}/></div></div></div></article>)}</div> : <p className="rounded-2xl bg-white p-6 text-sm text-[var(--site-muted)]">Tidak ada pengumuman aktif saat ini.</p>}</IndexLayout>;
}

function DetailPage({ type }: { type: "PAGE" | "NEWS" }) {
  const { schoolSlug = "", slug = "" } = useParams(); const query = useQuery(getPublicSchoolContent, { schoolSlug, type, slug });
  if (query.isLoading) return <LoadingSite/>; if (query.error || !query.data) return <PublicNotFound/>; const result: any = query.data;
  const data = { school: result.school, site: result.site, nav: [] };
  const item = result.content;
  return <PublicShell data={data}><title>{item.seoTitle || item.title}</title>{item.seoDescription && <meta name="description" content={item.seoDescription}/>}<main className="mx-auto max-w-4xl px-5 py-14"><a href={type === "NEWS" ? `/site/${schoolSlug}/berita` : `/site/${schoolSlug}`} className="text-sm font-semibold text-[var(--site-accent)]">← {type === "NEWS" ? "Berita" : "Beranda"}</a><article className="mt-6"><div className="text-sm text-[var(--site-muted)]">{type === "NEWS" && formatDate(item.publishedAt || item.scheduledAt)}{item.category ? ` · ${item.category}` : ""}</div><h1 className="mt-2 text-[clamp(2.2rem,6vw,4.5rem)] font-semibold leading-[1.02] tracking-[-.05em]">{item.title}</h1>{item.excerpt && <p className="mt-5 text-xl leading-8 text-[var(--site-muted)]">{item.excerpt}</p>}{item.coverImageUrl && <img src={item.coverImageUrl} alt="" className="mt-8 aspect-[16/8] w-full rounded-[24px] object-cover"/>}<div className="mt-10"><ContentBlocks blocks={item.contentBlocks}/></div></article></main></PublicShell>;
}

export function PublicSchoolNewsDetailPage() { return <DetailPage type="NEWS"/>; }
export function PublicSchoolContentPage() { return <DetailPage type="PAGE"/>; }
