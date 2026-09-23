import { type AuthUser } from "wasp/auth";
import { getAdministrationWorkspace, initializeAdministrationModule, useQuery } from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import { M3Banner, M3Button, M3Card, M3CircularProgress, M3EmptyState, M3Icon, M3StatCard } from "../../client/components/m3";
import { useState } from "react";

export function AdministrationDashboardPage({ user }: { user: AuthUser }) {
  const query = useQuery(getAdministrationWorkspace);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const data:any=query.data;
  const init=async()=>{setBusy(true);setMessage("");try{const result:any=await initializeAdministrationModule({});setMessage(`${result.created} template starter disiapkan.`);await query.refetch();}catch(e:any){setMessage(e?.message||"Kerangka TU belum berhasil disiapkan.");}finally{setBusy(false)}};

  return <SchoolLayout user={user}>
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="v2-eyebrow">TATA USAHA</p><h1 className="mt-1 text-2xl font-semibold tracking-[-.02em] text-md-on-surface">Administrasi & Surat Menyurat</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-md-on-surface-variant">Kerangka administrasi sekolah berbasis template, draft, versioning, register, dan audit.</p></div>
        {data?.initialized&&<M3Button href="/school/administration/outgoing/new" icon="edit_document">Buat Draft Surat</M3Button>}
      </header>
      {query.isLoading?<div className="flex min-h-[45vh] items-center justify-center"><M3CircularProgress size={38}/></div>:query.error?<M3Banner variant="error" headline="Modul TU belum dapat dimuat" supportingText={(query.error as any)?.message||"Terjadi kendala."}/>:!data?.initialized?<M3Card variant="outlined" className="p-5"><M3EmptyState icon="inventory_2" title="Kerangka Tata Usaha belum diinisialisasi" description="Siapkan 10 template surat umum, register starter, dan fondasi draft. Semua masih dapat disesuaikan sebelum dipakai sebagai format resmi sekolah." actionLabel="Siapkan Kerangka TU" onAction={init}/>{message&&<p className="mt-3 text-center text-sm text-md-on-surface-variant">{message}</p>}</M3Card>:<>
        <M3Banner variant="warning" headline="Mode Starter" supportingText={data.starterMode.message}/>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <M3StatCard label="Template aktif" value={String(data.templates.filter((t:any)=>t.status==="ACTIVE").length)} icon="description" />
          <M3StatCard label="Draft" value={String(data.statusCounts.DRAFT||0)} icon="edit_note" />
          <M3StatCard label="Dalam review" value={String(data.statusCounts.IN_REVIEW||0)} icon="rate_review" />
          <M3StatCard label="Disetujui internal" value={String(data.statusCounts.APPROVED||0)} icon="task_alt" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <M3Card variant="outlined" className="lg:col-span-2">
            <div className="flex items-center justify-between border-b border-md-outline-variant px-4 py-3"><div><h2 className="font-semibold">Pekerjaan Terbaru</h2><p className="text-xs text-md-on-surface-variant">Draft dan review surat terakhir.</p></div><M3Button href="/school/administration/outgoing" variant="text" size="sm">Lihat semua</M3Button></div>
            {data.documents.length?<div className="divide-y divide-md-outline-variant/60">{data.documents.slice(0,8).map((doc:any)=><a key={doc.id} href={`/school/administration/documents/${doc.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-md-surface-container/60"><span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-md-primary-container text-md-primary"><M3Icon name="draft" size={18}/></span><span className="min-w-0 flex-1"><strong className="block truncate text-[13px]">{doc.subject||doc.title}</strong><span className="mt-0.5 block truncate text-[11px] text-md-on-surface-variant">{doc.template.name} · {doc.recipientName||"Belum ada penerima"}</span></span><span className="text-[10.5px] font-semibold text-md-on-surface-variant">{doc.status.replaceAll("_"," ")}</span></a>)}</div>:<p className="p-5 text-sm text-md-on-surface-variant">Belum ada draft surat.</p>}
          </M3Card>
          <div className="space-y-4">
            <M3Card variant="outlined" className="p-4"><p className="v2-eyebrow">AKSES CEPAT</p><div className="mt-3 grid gap-2"><M3Button href="/school/administration/templates" variant="outlined" icon="library_books">Template Surat</M3Button><M3Button href="/school/administration/outgoing" variant="outlined" icon="outbox">Surat Keluar</M3Button></div></M3Card>
            <M3Card variant="filled" className="p-4"><p className="text-xs font-semibold text-md-on-surface">Register Nomor</p><p className="mt-1 text-sm text-md-on-surface-variant">{data.registers[0]?.name||"Belum tersedia"}</p><p className="mt-2 text-xs font-medium text-md-warning">{data.registers[0]?.isConfigured?"Sudah dikonfigurasi":"Belum dikonfigurasi untuk penerbitan resmi"}</p></M3Card>
          </div>
        </div>
      </>}
    </div>
  </SchoolLayout>;
}
