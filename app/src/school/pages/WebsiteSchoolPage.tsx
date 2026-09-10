import React, { useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getSchoolWebsiteAdmin,
  initializeSchoolWebsite,
  updateSchoolWebsiteSettings,
  publishSchoolWebsite,
  unpublishSchoolWebsite,
  saveSchoolWebsiteContent,
  setSchoolWebsiteContentStatus,
  deleteSchoolWebsiteContent,
  saveSchoolWebsiteNavItem,
  deleteSchoolWebsiteNavItem,
  saveSchoolWebsiteMedia,
  deleteSchoolWebsiteMedia,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  M3Badge,
  M3Button,
  M3Card,
  M3Dialog,
  M3EmptyState,
  M3Icon,
  M3Select,
  M3TextField,
} from "../../client/components/m3";

type Tab = "overview" | "pages" | "news" | "events" | "media" | "navigation" | "identity";
type ContentType = "PAGE" | "NEWS" | "EVENT" | "ANNOUNCEMENT";
type ContentStatus = "DRAFT" | "IN_REVIEW" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";

const tabs: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "overview", label: "Ringkasan", icon: "dashboard" },
  { id: "pages", label: "Halaman", icon: "article" },
  { id: "news", label: "Berita", icon: "newspaper" },
  { id: "events", label: "Agenda & Pengumuman", icon: "event" },
  { id: "media", label: "Galeri & Media", icon: "photo_library" },
  { id: "navigation", label: "Navigasi", icon: "menu" },
  { id: "identity", label: "Identitas & SEO", icon: "tune" },
];

const statusLabels: Record<ContentStatus, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "Review",
  SCHEDULED: "Terjadwal",
  PUBLISHED: "Terbit",
  ARCHIVED: "Arsip",
};

const statusBadge = (status: ContentStatus) => {
  if (status === "PUBLISHED") return "success" as const;
  if (status === "SCHEDULED") return "tertiary" as const;
  if (status === "IN_REVIEW") return "warning" as const;
  if (status === "ARCHIVED") return "outline" as const;
  return "secondary" as const;
};

function dateInput(value?: Date | string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDate(value?: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function SectionHeading({ title, note, action }: { title: string; note?: string; action?: React.ReactNode }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-[18px] font-semibold tracking-[-.015em] text-md-on-surface">{title}</h2>{note && <p className="mt-1 max-w-2xl text-[12.5px] leading-5 text-md-on-surface-variant">{note}</p>}</div>{action}</div>;
}

function TinyStat({ label, value, tone = "blue" }: { label: string; value: React.ReactNode; tone?: "blue" | "orange" | "green" | "purple" }) {
  const toneClass = { blue: "bg-[#007AFF]", orange: "bg-[#FF9500]", green: "bg-[#34C759]", purple: "bg-[#AF52DE]" }[tone];
  return <div className="rounded-[14px] border border-md-outline-variant bg-md-surface p-3.5"><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${toneClass}`} /><span className="text-[11.5px] font-medium text-md-on-surface-variant">{label}</span></div><div className="mt-2 text-[25px] font-semibold tracking-[-.03em] text-md-on-surface">{value}</div></div>;
}

const emptyContent = (type: ContentType) => ({
  id: undefined as string | undefined,
  type,
  title: "",
  slug: "",
  excerpt: "",
  bodyText: "",
  coverImageUrl: "",
  category: "",
  startsAt: "",
  endsAt: "",
  location: "",
  priority: 0,
  showInNavigation: false,
  navigationLabel: "",
  navigationOrder: 0,
  seoTitle: "",
  seoDescription: "",
});

export function WebsiteSchoolPage({ user }: { user: AuthUser }) {
  const query = useQuery(getSchoolWebsiteAdmin);
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [contentEditor, setContentEditor] = useState<any | null>(null);
  const [scheduleEditor, setScheduleEditor] = useState<{ id: string; title: string; scheduledAt: string } | null>(null);
  const [mediaEditor, setMediaEditor] = useState<any | null>(null);
  const [navEditor, setNavEditor] = useState<any | null>(null);

  const data = query.data as any;
  const run = async (fn: () => Promise<any>, success: string) => {
    setBusy(true); setError(""); setNotice("");
    try { await fn(); setNotice(success); await query.refetch(); }
    catch (err: any) { setError(err?.message || "Operasi belum berhasil."); }
    finally { setBusy(false); }
  };

  const contents = data?.contents || [];
  const pages = contents.filter((item: any) => item.type === "PAGE");
  const news = contents.filter((item: any) => item.type === "NEWS");
  const events = contents.filter((item: any) => item.type === "EVENT");
  const announcements = contents.filter((item: any) => item.type === "ANNOUNCEMENT");

  const counts = useMemo(() => ({
    draft: contents.filter((i: any) => i.status === "DRAFT" || i.status === "IN_REVIEW").length,
    scheduled: contents.filter((i: any) => i.status === "SCHEDULED").length,
    published: contents.filter((i: any) => i.status === "PUBLISHED").length,
  }), [contents]);

  const editContent = (item: any) => setContentEditor({ ...item, startsAt: dateInput(item.startsAt), endsAt: dateInput(item.endsAt) });

  const saveContent = async () => {
    if (!contentEditor) return;
    await run(async () => {
      await saveSchoolWebsiteContent({
        ...contentEditor,
        startsAt: contentEditor.startsAt ? new Date(contentEditor.startsAt).toISOString() : undefined,
        endsAt: contentEditor.endsAt ? new Date(contentEditor.endsAt).toISOString() : undefined,
        navigationOrder: Number(contentEditor.navigationOrder || 0),
        priority: Number(contentEditor.priority || 0),
      });
      setContentEditor(null);
    }, "Konten tersimpan sebagai draft/perubahan editor.");
  };

  const changeStatus = (item: any, status: ContentStatus) => run(
    () => setSchoolWebsiteContentStatus({ id: item.id, status }),
    status === "PUBLISHED" ? "Konten dipublikasikan." : status === "ARCHIVED" ? "Konten diarsipkan." : "Status konten diperbarui.",
  );

  if (query.isLoading) return <SchoolLayout user={user}><div className="space-y-4"><div className="h-9 w-72 animate-pulse rounded-xl bg-md-surface-container"/><div className="h-72 animate-pulse rounded-[20px] bg-md-surface-container-low"/></div></SchoolLayout>;
  if (query.error || !data) return <SchoolLayout user={user}><M3Card variant="outlined"><M3EmptyState icon="cloud_off" title="Website Sekolah belum dapat dimuat" description="Coba muat ulang. Tidak ada data yang diubah." actionLabel="Coba lagi" onAction={() => query.refetch()} /></M3Card></SchoolLayout>;

  if (!data.site) return <SchoolLayout user={user}><div className="mx-auto max-w-3xl space-y-5"><SectionHeading title="Website Sekolah" note="Buat ruang publikasi resmi untuk halaman, berita, agenda, pengumuman, media, navigasi, dan SEO sekolah."/><div className="hig-grouped-surface p-6 sm:p-8"><div className="flex size-12 items-center justify-center rounded-[14px] bg-[#007AFF] text-white"><M3Icon name="language" size={25}/></div><h2 className="mt-5 text-[22px] font-semibold tracking-[-.02em] text-md-on-surface">Siapkan website resmi {data.school.name}</h2><p className="mt-2 max-w-xl text-[13px] leading-6 text-md-on-surface-variant">Website dibuat dalam status Draft. Tidak ada konten yang tampil publik sampai Anda menekan Publikasikan Website.</p><div className="mt-5 flex flex-wrap gap-2"><M3Button onClick={() => run(() => initializeSchoolWebsite({}), "Website Sekolah berhasil diinisialisasi.")} isLoading={busy} icon="add_circle">Siapkan Website</M3Button><M3Button variant="text" href="/school">Kembali</M3Button></div></div></div></SchoolLayout>;

  const site = data.site;

  const renderContentList = (list: any[], type: ContentType, title: string, note: string) => <div className="space-y-4"><SectionHeading title={title} note={note} action={<M3Button size="sm" icon="add" onClick={() => setContentEditor(emptyContent(type))}>Buat baru</M3Button>}/><div className="hig-grouped-surface overflow-hidden">{list.length ? list.map((item: any) => <div key={item.id} className="flex min-h-[64px] items-center gap-3 border-b border-md-outline-variant px-4 py-3 last:border-b-0"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-[13.5px] font-semibold text-md-on-surface">{item.title}</p><M3Badge variant={statusBadge(item.status)} size="sm">{statusLabels[item.status as ContentStatus]}</M3Badge></div><p className="mt-1 truncate text-[11.5px] text-md-on-surface-variant">/{item.slug}{item.scheduledAt ? ` · jadwal ${formatDate(item.scheduledAt)}` : item.publishedAt ? ` · terbit ${formatDate(item.publishedAt)}` : ` · diperbarui ${formatDate(item.updatedAt)}`}</p></div><div className="flex shrink-0 items-center gap-1"><M3Button variant="text" size="sm" onClick={() => editContent(item)}>Edit</M3Button>{item.status !== "PUBLISHED" && item.status !== "ARCHIVED" && <M3Button variant="text" size="sm" onClick={() => changeStatus(item, "PUBLISHED")}>Terbitkan</M3Button>}{item.status !== "ARCHIVED" && <M3Button variant="icon" size="icon-sm" icon="schedule" aria-label="Jadwalkan" title="Jadwalkan" onClick={() => setScheduleEditor({ id: item.id, title: item.title, scheduledAt: "" })}/>}<M3Button variant="icon" size="icon-sm" icon="archive" aria-label="Arsipkan" title="Arsipkan" onClick={() => changeStatus(item, "ARCHIVED")}/>{!item.publishedAt && item.status !== "PUBLISHED" && item.status !== "SCHEDULED" && <M3Button variant="icon" size="icon-sm" icon="delete" aria-label="Hapus draft" title="Hapus draft" onClick={() => run(() => deleteSchoolWebsiteContent({ id: item.id }), "Draft dihapus.")}/>}</div></div>) : <M3EmptyState compact icon="article" title="Belum ada konten" description="Buat konten pertama untuk mulai menyusun website sekolah."/>}</div></div>;

  return <SchoolLayout user={user}>
    <div className="mx-auto max-w-[1280px] space-y-5 pb-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-[10px] bg-[#007AFF] text-white"><M3Icon name="language" size={20}/></span><div><h1 className="text-[22px] font-semibold tracking-[-.025em] text-md-on-surface">Website Sekolah</h1><p className="mt-0.5 text-[12px] text-md-on-surface-variant">Kelola situs publik {data.school.name}</p></div></div></div><div className="flex flex-wrap gap-2"><M3Button variant="text" size="sm" href="/school/website/preview" icon="visibility">Pratinjau</M3Button>{site.status === "PUBLISHED" ? <><M3Button variant="text" size="sm" href={data.publicUrl} target="_blank" rel="noreferrer" icon="open_in_new">Buka website</M3Button><M3Button variant="tonal" size="sm" onClick={() => run(() => unpublishSchoolWebsite({}), "Website dikembalikan ke status Draft.")} isLoading={busy}>Jadikan Draft</M3Button></> : <M3Button size="sm" icon="publish" onClick={() => run(() => publishSchoolWebsite({}), "Website sekolah dipublikasikan.")} isLoading={busy}>Publikasikan Website</M3Button>}</div></div>

      {(notice || error) && <div className={`rounded-[12px] px-4 py-3 text-[12.5px] font-medium ${error ? "bg-md-error-container text-md-on-error-container" : "bg-[#E8F7ED] text-[#176A32] dark:bg-[#163B22] dark:text-[#8FE3A8]"}`} role="status">{error || notice}</div>}

      <div className="flex gap-1 overflow-x-auto rounded-[13px] bg-md-surface-container-low p-1" aria-label="Navigasi Website Sekolah">{tabs.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`flex shrink-0 items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-medium transition ${tab === item.id ? "bg-md-surface text-md-on-surface shadow-sm" : "text-md-on-surface-variant hover:text-md-on-surface"}`}><M3Icon name={item.icon} size={16}/>{item.label}</button>)}</div>

      {tab === "overview" && <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><TinyStat label="Status website" value={site.status === "PUBLISHED" ? "Online" : "Draft"} tone={site.status === "PUBLISHED" ? "green" : "orange"}/><TinyStat label="Konten terbit" value={counts.published} tone="blue"/><TinyStat label="Draft / review" value={counts.draft} tone="purple"/><TinyStat label="Terjadwal" value={counts.scheduled} tone="orange"/></div><div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><section className="hig-grouped-surface p-5"><h3 className="hig-section-title">URL publik</h3><p className="mt-2 break-all text-[14px] font-medium text-md-primary">{data.publicUrl}</p><p className="mt-2 text-[12px] leading-5 text-md-on-surface-variant">Hanya konten berstatus Terbit atau Terjadwal yang waktunya sudah tiba yang dapat dibaca publik. Draft dan Review tidak pernah dikembalikan oleh query publik.</p><div className="mt-4 flex flex-wrap gap-2"><M3Button size="sm" onClick={() => setContentEditor(emptyContent("NEWS"))}>Buat berita</M3Button><M3Button variant="tonal" size="sm" onClick={() => setContentEditor(emptyContent("PAGE"))}>Buat halaman</M3Button><M3Button variant="text" size="sm" href="/school/website/preview">Pratinjau draft</M3Button></div></section><section className="hig-grouped-surface p-5"><h3 className="hig-section-title">Kesiapan publikasi</h3><div className="mt-4 space-y-3 text-[12.5px]"><div className="flex justify-between gap-3"><span className="text-md-on-surface-variant">Identitas situs</span><strong className="text-md-on-surface">{site.siteTitle ? "Siap" : "Belum"}</strong></div><div className="flex justify-between gap-3"><span className="text-md-on-surface-variant">SEO description</span><strong className="text-md-on-surface">{site.defaultSeoDescription ? "Siap" : "Opsional"}</strong></div><div className="flex justify-between gap-3"><span className="text-md-on-surface-variant">Index mesin pencari</span><strong className="text-md-on-surface">{site.robotsIndex ? "Diizinkan" : "Diblokir"}</strong></div><div className="flex justify-between gap-3"><span className="text-md-on-surface-variant">Navigasi aktif</span><strong className="text-md-on-surface">{data.navItems.filter((i: any) => i.isVisible).length}</strong></div></div></section></div></div>}

      {tab === "pages" && renderContentList(pages, "PAGE", "Halaman", "Profil, visi misi, program keahlian, fasilitas, kontak, dan halaman statis lain.")}
      {tab === "news" && renderContentList(news, "NEWS", "Berita", "Publikasi editorial sekolah dengan kategori, cover, ringkasan, dan metadata SEO.")}
      {tab === "events" && <div className="space-y-7">{renderContentList(events, "EVENT", "Agenda", "Kegiatan publik sekolah dengan waktu, lokasi, dan informasi kegiatan.")}{renderContentList(announcements, "ANNOUNCEMENT", "Pengumuman", "Informasi penting dengan prioritas dan masa tayang yang terkontrol.")}</div>}

      {tab === "media" && <div className="space-y-4"><SectionHeading title="Galeri & Media" note="Tambahkan gambar publik menggunakan URL HTTPS. Alt text wajib untuk aksesibilitas." action={<M3Button size="sm" icon="add_photo_alternate" onClick={() => setMediaEditor({ url: "", altText: "", caption: "" })}>Tambah media</M3Button>}/>{data.media.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.media.map((item: any) => <div key={item.id} className="overflow-hidden rounded-[16px] border border-md-outline-variant bg-md-surface"><div className="aspect-[16/9] bg-md-surface-container-low"><img src={item.url} alt={item.altText} loading="lazy" className="h-full w-full object-cover"/></div><div className="p-3"><p className="truncate text-[13px] font-semibold text-md-on-surface">{item.altText}</p><p className="mt-1 line-clamp-2 text-[11.5px] text-md-on-surface-variant">{item.caption || item.url}</p><div className="mt-3 flex gap-1"><M3Button variant="text" size="sm" onClick={() => setMediaEditor(item)}>Edit</M3Button><M3Button variant="text" size="sm" onClick={() => run(() => deleteSchoolWebsiteMedia({ id: item.id }), "Media dihapus dari library.")}>Hapus</M3Button></div></div></div>)}</div> : <div className="hig-grouped-surface"><M3EmptyState compact icon="photo_library" title="Library media masih kosong" description="Tambahkan gambar publik yang sudah tersedia melalui HTTPS. Upload object storage dapat digunakan melalui pipeline file resmi saat dihubungkan."/></div>}</div>}

      {tab === "navigation" && <div className="space-y-4"><SectionHeading title="Navigasi" note="Susun menu header dan footer. Navigasi hanya dapat menuju halaman tenant ini, route publik resmi, atau URL HTTPS." action={<M3Button size="sm" icon="add" onClick={() => setNavEditor({ location: "HEADER", label: "", type: "PAGE", contentId: pages[0]?.id || "", href: "", order: data.navItems.length, isVisible: true })}>Tambah menu</M3Button>}/><div className="hig-grouped-surface overflow-hidden">{data.navItems.length ? data.navItems.map((item: any) => <div key={item.id} className="flex min-h-[58px] items-center gap-3 border-b border-md-outline-variant px-4 py-3 last:border-0"><span className="flex size-8 items-center justify-center rounded-[8px] bg-[#5E5CE6] text-white"><M3Icon name={item.location === "HEADER" ? "web_asset" : "vertical_align_bottom"} size={17}/></span><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-md-on-surface">{item.label}</p><p className="mt-0.5 text-[11px] text-md-on-surface-variant">{item.location} · {item.type} · urutan {item.order}{!item.isVisible ? " · tersembunyi" : ""}</p></div><M3Button variant="text" size="sm" onClick={() => setNavEditor(item)}>Edit</M3Button><M3Button variant="icon" size="icon-sm" icon="delete" aria-label="Hapus navigasi" onClick={() => run(() => deleteSchoolWebsiteNavItem({ id: item.id }), "Item navigasi dihapus.")}/></div>) : <M3EmptyState compact icon="menu" title="Navigasi belum disusun" description="Tanpa navigasi custom, website tetap menampilkan Beranda, Berita, Agenda, dan Pengumuman sebagai fallback."/>}</div></div>}

      {tab === "identity" && <IdentityEditor site={site} school={data.school} busy={busy} onSave={(payload: any) => run(() => updateSchoolWebsiteSettings(payload), "Identitas dan SEO tersimpan.")}/>} 
    </div>

    <M3Dialog isOpen={!!contentEditor} onClose={() => setContentEditor(null)} title={contentEditor?.id ? "Edit konten" : "Buat konten"} subtitle="Simpan tidak otomatis menerbitkan. Gunakan aksi Terbitkan setelah konten siap." icon="edit_note" maxWidth="xl" actions={<><M3Button variant="text" onClick={() => setContentEditor(null)}>Batal</M3Button><M3Button onClick={saveContent} isLoading={busy}>Simpan</M3Button></>}>
      {contentEditor && <div className="grid gap-4 md:grid-cols-2"><M3TextField label="Judul" value={contentEditor.title} onChange={(e) => setContentEditor({ ...contentEditor, title: e.target.value })}/><M3TextField label="Slug (opsional)" placeholder="dibuat-otomatis-dari-judul" value={contentEditor.slug || ""} onChange={(e) => setContentEditor({ ...contentEditor, slug: e.target.value })}/><div className="md:col-span-2"><M3TextField label="Ringkasan" value={contentEditor.excerpt || ""} onChange={(e) => setContentEditor({ ...contentEditor, excerpt: e.target.value })}/></div><div className="md:col-span-2"><label className="mb-1.5 block text-[13px] font-semibold text-md-on-surface">Isi konten</label><textarea rows={10} value={contentEditor.bodyText || ""} onChange={(e) => setContentEditor({ ...contentEditor, bodyText: e.target.value })} className="w-full resize-y rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-3 text-[13px] leading-6 text-md-on-surface outline-none focus:border-md-primary focus:ring-2 focus:ring-md-primary/15" placeholder={'Pisahkan paragraf dengan baris kosong.\n\n## Awali dengan ## untuk subjudul.\n\n> Awali dengan > untuk kutipan.\n\n! Awali dengan ! untuk callout.'}/></div><M3TextField label="URL gambar cover (HTTPS)" value={contentEditor.coverImageUrl || ""} onChange={(e) => setContentEditor({ ...contentEditor, coverImageUrl: e.target.value })}/><M3TextField label="Kategori" value={contentEditor.category || ""} onChange={(e) => setContentEditor({ ...contentEditor, category: e.target.value })}/>{contentEditor.type === "EVENT" && <><M3TextField type="datetime-local" label="Mulai" value={contentEditor.startsAt || ""} onChange={(e) => setContentEditor({ ...contentEditor, startsAt: e.target.value })}/><M3TextField type="datetime-local" label="Selesai" value={contentEditor.endsAt || ""} onChange={(e) => setContentEditor({ ...contentEditor, endsAt: e.target.value })}/><M3TextField label="Lokasi" value={contentEditor.location || ""} onChange={(e) => setContentEditor({ ...contentEditor, location: e.target.value })}/></>}{contentEditor.type === "ANNOUNCEMENT" && <><M3TextField type="datetime-local" label="Mulai tayang" value={contentEditor.startsAt || ""} onChange={(e) => setContentEditor({ ...contentEditor, startsAt: e.target.value })}/><M3TextField type="datetime-local" label="Berakhir" value={contentEditor.endsAt || ""} onChange={(e) => setContentEditor({ ...contentEditor, endsAt: e.target.value })}/><M3TextField type="number" min={0} max={10} label="Prioritas 0–10" value={contentEditor.priority} onChange={(e) => setContentEditor({ ...contentEditor, priority: Number(e.target.value) })}/></>}{contentEditor.type === "PAGE" && <><label className="flex items-center gap-2 text-[12.5px] text-md-on-surface"><input type="checkbox" checked={!!contentEditor.showInNavigation} onChange={(e) => setContentEditor({ ...contentEditor, showInNavigation: e.target.checked })}/>Tandai sebagai kandidat navigasi</label><M3TextField label="Label navigasi" value={contentEditor.navigationLabel || ""} onChange={(e) => setContentEditor({ ...contentEditor, navigationLabel: e.target.value })}/></>}<M3TextField label="SEO title" value={contentEditor.seoTitle || ""} onChange={(e) => setContentEditor({ ...contentEditor, seoTitle: e.target.value })}/><M3TextField label="SEO description" value={contentEditor.seoDescription || ""} onChange={(e) => setContentEditor({ ...contentEditor, seoDescription: e.target.value })}/></div>}
    </M3Dialog>

    <M3Dialog isOpen={!!scheduleEditor} onClose={() => setScheduleEditor(null)} title="Jadwalkan publikasi" subtitle={scheduleEditor?.title} icon="schedule" maxWidth="sm" actions={<><M3Button variant="text" onClick={() => setScheduleEditor(null)}>Batal</M3Button><M3Button isLoading={busy} onClick={() => scheduleEditor && run(async () => { await setSchoolWebsiteContentStatus({ id: scheduleEditor.id, status: "SCHEDULED", scheduledAt: new Date(scheduleEditor.scheduledAt).toISOString() }); setScheduleEditor(null); }, "Konten dijadwalkan.")}>Jadwalkan</M3Button></>}>
      {scheduleEditor && <M3TextField type="datetime-local" label="Tanggal dan waktu" value={scheduleEditor.scheduledAt} onChange={(e) => setScheduleEditor({ ...scheduleEditor, scheduledAt: e.target.value })}/>} 
    </M3Dialog>

    <M3Dialog isOpen={!!mediaEditor} onClose={() => setMediaEditor(null)} title={mediaEditor?.id ? "Edit media" : "Tambah media"} subtitle="Gunakan URL HTTPS dan alt text yang menjelaskan isi gambar." icon="image" maxWidth="md" actions={<><M3Button variant="text" onClick={() => setMediaEditor(null)}>Batal</M3Button><M3Button isLoading={busy} onClick={() => mediaEditor && run(async () => { await saveSchoolWebsiteMedia({ id: mediaEditor.id, url: mediaEditor.url, altText: mediaEditor.altText, caption: mediaEditor.caption || undefined }); setMediaEditor(null); }, "Media tersimpan.")}>Simpan</M3Button></>}>
      {mediaEditor && <div className="space-y-4"><M3TextField label="URL gambar (HTTPS)" value={mediaEditor.url || ""} onChange={(e) => setMediaEditor({ ...mediaEditor, url: e.target.value })}/><M3TextField label="Alt text" value={mediaEditor.altText || ""} onChange={(e) => setMediaEditor({ ...mediaEditor, altText: e.target.value })}/><M3TextField label="Caption (opsional)" value={mediaEditor.caption || ""} onChange={(e) => setMediaEditor({ ...mediaEditor, caption: e.target.value })}/></div>}
    </M3Dialog>

    <M3Dialog isOpen={!!navEditor} onClose={() => setNavEditor(null)} title={navEditor?.id ? "Edit navigasi" : "Tambah navigasi"} icon="menu" maxWidth="md" actions={<><M3Button variant="text" onClick={() => setNavEditor(null)}>Batal</M3Button><M3Button isLoading={busy} onClick={() => navEditor && run(async () => { await saveSchoolWebsiteNavItem({ ...navEditor, order: Number(navEditor.order || 0), contentId: navEditor.type === "PAGE" ? navEditor.contentId : undefined, href: navEditor.type !== "PAGE" ? navEditor.href : undefined }); setNavEditor(null); }, "Navigasi tersimpan.")}>Simpan</M3Button></>}>
      {navEditor && <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><M3Select label="Lokasi" value={navEditor.location} onChange={(e) => setNavEditor({ ...navEditor, location: e.target.value })} options={[{ label: "Header", value: "HEADER" }, { label: "Footer", value: "FOOTER" }]}/><M3Select label="Jenis" value={navEditor.type} onChange={(e) => setNavEditor({ ...navEditor, type: e.target.value })} options={[{ label: "Halaman", value: "PAGE" }, { label: "Route publik", value: "ROUTE" }, { label: "Tautan eksternal", value: "EXTERNAL" }]}/></div><M3TextField label="Label" value={navEditor.label || ""} onChange={(e) => setNavEditor({ ...navEditor, label: e.target.value })}/>{navEditor.type === "PAGE" ? <M3Select label="Halaman tujuan" value={navEditor.contentId || ""} onChange={(e) => setNavEditor({ ...navEditor, contentId: e.target.value })} options={pages.map((p: any) => ({ label: p.title, value: p.id }))}/> : navEditor.type === "ROUTE" ? <M3Select label="Route" value={navEditor.href || "berita"} onChange={(e) => setNavEditor({ ...navEditor, href: e.target.value })} options={[{ label: "Berita", value: "berita" }, { label: "Agenda", value: "agenda" }, { label: "Pengumuman", value: "pengumuman" }]}/> : <M3TextField label="URL eksternal HTTPS" value={navEditor.href || ""} onChange={(e) => setNavEditor({ ...navEditor, href: e.target.value })}/>}<M3TextField type="number" min={0} max={999} label="Urutan" value={navEditor.order} onChange={(e) => setNavEditor({ ...navEditor, order: Number(e.target.value) })}/><label className="flex items-center gap-2 text-[12.5px] text-md-on-surface"><input type="checkbox" checked={!!navEditor.isVisible} onChange={(e) => setNavEditor({ ...navEditor, isVisible: e.target.checked })}/>Tampilkan pada website</label></div>}
    </M3Dialog>
  </SchoolLayout>;
}

function IdentityEditor({ site, school, busy, onSave }: { site: any; school: any; busy: boolean; onSave: (payload: any) => void }) {
  const [form, setForm] = useState(() => ({
    siteTitle: site.siteTitle || school.name || "",
    tagline: site.tagline || "",
    heroTitle: site.heroTitle || "",
    heroSubtitle: site.heroSubtitle || "",
    heroImageUrl: site.heroImageUrl || "",
    defaultSeoTitle: site.defaultSeoTitle || "",
    defaultSeoDescription: site.defaultSeoDescription || "",
    publicEmail: site.publicEmail || "",
    publicPhone: site.publicPhone || "",
    themePreset: site.themePreset || "CLEAN_SCHOOL",
    robotsIndex: !!site.robotsIndex,
  }));
  return <div className="space-y-4"><SectionHeading title="Identitas & SEO" note="Atur identitas publik, hero landing page, metadata dasar, dan kebijakan indexing."/><form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="hig-grouped-surface p-5 sm:p-6"><div className="grid gap-4 md:grid-cols-2"><M3TextField label="Judul website" value={form.siteTitle} onChange={(e) => setForm({ ...form, siteTitle: e.target.value })}/><M3TextField label="Tagline" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })}/><M3TextField label="Hero title" value={form.heroTitle} onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}/><M3TextField label="Hero subtitle" value={form.heroSubtitle} onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })}/><div className="md:col-span-2"><M3TextField label="Hero image URL (HTTPS, opsional)" value={form.heroImageUrl} onChange={(e) => setForm({ ...form, heroImageUrl: e.target.value })}/></div><M3TextField label="Email publik" type="email" value={form.publicEmail} onChange={(e) => setForm({ ...form, publicEmail: e.target.value })}/><M3TextField label="Telepon publik" value={form.publicPhone} onChange={(e) => setForm({ ...form, publicPhone: e.target.value })}/><M3TextField label="Default SEO title" value={form.defaultSeoTitle} onChange={(e) => setForm({ ...form, defaultSeoTitle: e.target.value })}/><M3TextField label="Default SEO description" value={form.defaultSeoDescription} onChange={(e) => setForm({ ...form, defaultSeoDescription: e.target.value })}/><M3Select label="Preset tampilan" value={form.themePreset} onChange={(e) => setForm({ ...form, themePreset: e.target.value })} options={[{ label: "Clean School", value: "CLEAN_SCHOOL" }, { label: "Editorial", value: "EDITORIAL" }, { label: "Campus", value: "CAMPUS" }]}/><label className="flex items-center gap-2 self-end pb-2 text-[12.5px] text-md-on-surface"><input type="checkbox" checked={form.robotsIndex} onChange={(e) => setForm({ ...form, robotsIndex: e.target.checked })}/>Izinkan indexing mesin pencari</label></div><div className="mt-5 flex justify-end"><M3Button type="submit" isLoading={busy}>Simpan identitas</M3Button></div></form></div>;
}
