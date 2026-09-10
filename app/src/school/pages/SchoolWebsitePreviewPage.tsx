import React from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery, getSchoolWebsitePreview } from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import { M3Badge, M3Button, M3Card, M3EmptyState } from "../../client/components/m3";
import { SchoolPublicHomeCanvas, schoolSiteThemeVars } from "./PublicSchoolWebsitePages";

export function SchoolWebsitePreviewPage({ user }: { user: AuthUser }) {
  const query = useQuery(getSchoolWebsitePreview);
  if (query.isLoading) return <SchoolLayout user={user}><div className="h-96 animate-pulse rounded-[24px] bg-md-surface-container-low"/></SchoolLayout>;
  if (query.error || !query.data) return <SchoolLayout user={user}><M3Card variant="outlined"><M3EmptyState icon="visibility_off" title="Pratinjau belum tersedia" description="Inisialisasi Website Sekolah terlebih dahulu." actionLabel="Kembali ke Website Sekolah" actionHref="/school/website"/></M3Card></SchoolLayout>;
  const data: any = query.data;
  if (!data.site) return <SchoolLayout user={user}><M3Card variant="outlined"><M3EmptyState icon="language" title="Website belum disiapkan" description="Siapkan Website Sekolah sebelum membuka pratinjau." actionLabel="Siapkan website" actionHref="/school/website"/></M3Card></SchoolLayout>;

  const contents = data.contents.filter((item: any) => item.status !== "ARCHIVED");
  const previewData = {
    school: data.school,
    site: data.site,
    pages: contents.filter((item: any) => item.type === "PAGE"),
    news: contents.filter((item: any) => item.type === "NEWS"),
    events: contents.filter((item: any) => item.type === "EVENT"),
    announcements: contents.filter((item: any) => item.type === "ANNOUNCEMENT"),
    media: data.media || [],
    nav: [],
  };

  return <SchoolLayout user={user}><div className="mx-auto max-w-[1440px] space-y-4 pb-10"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><M3Badge variant="warning">PREVIEW DRAFT</M3Badge><span className="text-[12px] text-md-on-surface-variant">Renderer yang sama dengan landing publik. Link dinonaktifkan di mode preview.</span></div><h1 className="mt-2 text-[22px] font-semibold tracking-[-.025em] text-md-on-surface">Pratinjau Website Sekolah</h1></div><div className="flex gap-2"><M3Button variant="text" href="/school/website">Kembali ke editor</M3Button>{data.site.status === "PUBLISHED" && <M3Button variant="tonal" href={`/site/${data.school.slug}`} target="_blank" rel="noreferrer">Buka versi publik</M3Button>}</div></div><div className="overflow-hidden rounded-[28px] border border-md-outline-variant bg-white shadow-sm"><div className="border-b border-black/[.06] bg-[#F7F7F8] px-4 py-2 text-center text-[11px] font-medium text-[#6E6E73]">Preview konten draft dan terbit · section kosong otomatis tidak dirender</div><div style={schoolSiteThemeVars(data.site.themePreset)} className="pointer-events-none bg-[var(--site-canvas)] text-[var(--site-fg)]"><SchoolPublicHomeCanvas data={previewData}/></div></div></div></SchoolLayout>;
}
