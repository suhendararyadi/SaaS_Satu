import React from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import { getPklDashboard, useQuery } from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import { M3Badge, M3Button, M3Card, M3CircularProgress, M3Icon } from "../../client/components/m3";

const statusLabel: Record<string,string> = { PLANNED:"Rencana", ACTIVE:"Aktif", COMPLETED:"Selesai", CANCELED:"Batal" };

export function PklDashboardPage({ user }: { user: AuthUser }) {
  const query = useQuery(getPklDashboard);
  const data: any = query.data;
  return <SchoolLayout user={user}>
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">PKL Generasi Kedua</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-.02em] text-md-on-surface">Ringkasan PKL</h1>
        <p className="mt-1 text-sm text-md-on-surface-variant">Tampilan otomatis mengikuti peran dan penugasan akun aktif.</p>
      </header>
      {query.isLoading ? <div className="flex min-h-[300px] items-center justify-center"><M3CircularProgress size={36}/></div> : !data ? <M3Card variant="outlined" className="p-6">Data PKL belum tersedia.</M3Card> : <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {[
            ["Total",data.summary.total,"work"],
            ["Rencana",data.summary.planned,"pending_actions"],
            ["Aktif",data.summary.active,"play_circle"],
            ["Selesai",data.summary.completed,"verified"],
            ["Jurnal perlu perhatian",data.summary.pendingJournals,"edit_note"],
            ["Presensi hari ini",data.summary.attendanceToday,"fact_check"],
          ].map(([label,value,icon]) => <M3Card key={String(label)} variant="filled" className="p-4">
            <div className="flex items-start justify-between gap-2"><div><p className="text-[10.5px] uppercase text-md-on-surface-variant">{label}</p><p className="mt-1 text-2xl font-semibold">{String(value)}</p></div><M3Icon name={String(icon)} size={20} className="text-md-primary"/></div>
          </M3Card>)}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(user.role === "SCHOOL_ADMIN" || user.isAdmin) && <Link to="/school/pkl/placements"><M3Card variant="outlined" className="h-full p-4 hover:bg-black/[.02] dark:hover:bg-white/[.03]"><M3Icon name="group_work" size={24}/><h3 className="mt-3 font-semibold">Penempatan</h3><p className="mt-1 text-xs text-md-on-surface-variant">Plotting, readiness, transfer, dan aktivasi.</p></M3Card></Link>}
          <Link to="/school/pkl/attendance"><M3Card variant="outlined" className="h-full p-4 hover:bg-black/[.02] dark:hover:bg-white/[.03]"><M3Icon name="location_on" size={24}/><h3 className="mt-3 font-semibold">Presensi</h3><p className="mt-1 text-xs text-md-on-surface-variant">Geofence, jadwal kerja, izin/sakit, dan koreksi.</p></M3Card></Link>
          <Link to="/school/pkl/journals"><M3Card variant="outlined" className="h-full p-4 hover:bg-black/[.02] dark:hover:bg-white/[.03]"><M3Icon name="edit_note" size={24}/><h3 className="mt-3 font-semibold">Jurnal</h3><p className="mt-1 text-xs text-md-on-surface-variant">Draft, submit, revisi, dan review dua pihak.</p></M3Card></Link>
          <Link to="/school/pkl/monitoring"><M3Card variant="outlined" className="h-full p-4 hover:bg-black/[.02] dark:hover:bg-white/[.03]"><M3Icon name="monitor_heart" size={24}/><h3 className="mt-3 font-semibold">Monitoring</h3><p className="mt-1 text-xs text-md-on-surface-variant">EWS readiness, presensi, jurnal, dan review.</p></M3Card></Link>
        </div>
        <M3Card variant="outlined" className="overflow-hidden">
          <div className="border-b border-md-outline-variant/35 p-4"><h2 className="text-[15px] font-semibold">Penempatan dalam scope Anda</h2></div>
          {data.placements.length === 0 ? <div className="p-6 text-sm text-md-on-surface-variant">Belum ada penempatan PKL.</div> :
          <div className="divide-y divide-md-outline-variant/25">{data.placements.map((row:any)=><div key={row.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{row.student?.name}</p><M3Badge variant={row.status==="ACTIVE"?"success":"outline"} size="sm">{statusLabel[row.status]||row.status}</M3Badge></div><p className="mt-1 text-[11.5px] text-md-on-surface-variant">{row.company?.name} · {row.pklPeriod?.name||"Tanpa periode"} · Guru {row.teacherSupervisor?.name||"-"} · DUDI {row.dudiMentor?.name||"-"}</p></div>
            <div className="flex gap-1"><M3Button variant="text" size="sm" href="/school/pkl/attendance">Presensi</M3Button><M3Button variant="text" size="sm" href="/school/pkl/journals">Jurnal</M3Button></div>
          </div>)}</div>}
        </M3Card>
      </>}
    </div>
  </SchoolLayout>;
}
