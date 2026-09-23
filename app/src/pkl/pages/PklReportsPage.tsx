import React, { useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  getCompanies,
  getDepartments,
  getPklPeriods,
  getPklReportData,
  useQuery,
} from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import { M3Badge, M3Button, M3Card, M3CircularProgress, M3Select } from "../../client/components/m3";

function downloadText(content:string, filename:string, type="text/csv;charset=utf-8"){
  const blob=new Blob(["\uFEFF"+content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function dateText(value:any){return value?new Date(value).toLocaleDateString("id-ID",{timeZone:"Asia/Jakarta"}):"-";}

export function PklReportsPage({ user }: { user: AuthUser }) {
  const periodsQ=useQuery(getPklPeriods);
  const companiesQ=useQuery(getCompanies);
  const departmentsQ=useQuery(getDepartments);
  const [periodId,setPeriodId]=useState("");
  const [companyId,setCompanyId]=useState("");
  const [departmentId,setDepartmentId]=useState("");
  const [status,setStatus]=useState("");
  const reportQ=useQuery(getPklReportData,{
    ...(periodId?{periodId}:{}),
    ...(companyId?{companyId}:{}),
    ...(departmentId?{departmentId}:{}),
    ...(status?{status}:{}),
  });
  const data:any=reportQ.data;
  const stamp=useMemo(()=>new Date().toISOString().slice(0,10),[]);
  return <SchoolLayout user={user}><div className="space-y-6 print:space-y-3">
    <header className="print:hidden"><p className="text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">PKL Gen2</p><h1 className="mt-1 text-2xl font-semibold tracking-[-.02em]">Laporan & Administrasi PKL</h1><p className="mt-1 text-sm text-md-on-surface-variant">Rekap penempatan, presensi, jurnal, serta dokumen siap cetak dan Excel-compatible.</p></header>

    <M3Card variant="outlined" className="p-4 print:hidden"><div className="grid gap-3 lg:grid-cols-4"><M3Select label="Periode" value={periodId} onChange={(e)=>setPeriodId(e.target.value)} options={[{value:"",label:"Semua periode"},...(periodsQ.data||[]).map((p:any)=>({value:p.id,label:p.name}))]}/><M3Select label="Konsentrasi" value={departmentId} onChange={(e)=>setDepartmentId(e.target.value)} options={[{value:"",label:"Semua konsentrasi"},...(departmentsQ.data||[]).map((d:any)=>({value:d.id,label:d.code+" · "+d.name}))]}/><M3Select label="DUDI" value={companyId} onChange={(e)=>setCompanyId(e.target.value)} options={[{value:"",label:"Semua DUDI"},...(companiesQ.data||[]).map((c:any)=>({value:c.id,label:c.name}))]}/><M3Select label="Status" value={status} onChange={(e)=>setStatus(e.target.value)} options={[{value:"",label:"Semua status"},...["PLANNED","ACTIVE","COMPLETED","CANCELED"].map(v=>({value:v,label:v}))]}/></div></M3Card>

    {reportQ.isLoading?<div className="flex min-h-[300px] items-center justify-center"><M3CircularProgress size={38}/></div>:!data?<M3Card variant="outlined" className="p-6">Laporan belum tersedia.</M3Card>:<>
      <section className="hidden print:block"><h1 className="text-center text-xl font-bold">{data.school?.name||"Sekolah"}</h1><p className="text-center text-xs">NPSN {data.school?.npsn||"-"} · {data.school?.address||""} {data.school?.city||""}</p><h2 className="mt-4 text-center text-lg font-semibold">REKAP PELAKSANAAN PKL</h2></section>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 print:grid-cols-6">
        {[["Penempatan",data.summary.placements],["Rencana",data.summary.planned],["Aktif",data.summary.active],["Selesai",data.summary.completed],["Presensi",data.summary.attendanceRecords],["Jurnal",data.summary.journals]].map(([label,value])=><M3Card key={String(label)} variant="filled" className="p-4 print:border print:bg-white"><p className="text-[10.5px] uppercase text-md-on-surface-variant">{label}</p><p className="mt-1 text-2xl font-semibold">{String(value)}</p></M3Card>)}
      </div>
      <div className="flex flex-wrap gap-2 print:hidden"><M3Button icon="print" onClick={()=>window.print()}>Cetak / Simpan PDF</M3Button><M3Button variant="tonal" icon="download" onClick={()=>downloadText(data.exports.placementsCsv,`pkl-penempatan-${stamp}.csv`)}>Excel Penempatan (CSV)</M3Button><M3Button variant="tonal" icon="download" onClick={()=>downloadText(data.exports.attendanceCsv,`pkl-presensi-${stamp}.csv`)}>Excel Presensi (CSV)</M3Button><M3Button variant="tonal" icon="download" onClick={()=>downloadText(data.exports.journalsCsv,`pkl-jurnal-${stamp}.csv`)}>Excel Jurnal (CSV)</M3Button></div>

      <M3Card variant="outlined" className="overflow-hidden print:border-black"><div className="border-b border-md-outline-variant/35 p-4"><h2 className="font-semibold">Rekap Penempatan</h2></div>{data.placements.length===0?<div className="p-6 text-sm text-md-on-surface-variant">Belum ada data.</div>:<div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead><tr className="bg-md-surface-container"><th className="p-3">Siswa</th><th className="p-3">Rombel</th><th className="p-3">Konsentrasi</th><th className="p-3">Periode</th><th className="p-3">DUDI</th><th className="p-3">Guru</th><th className="p-3">Pembimbing DUDI</th><th className="p-3">Status</th><th className="p-3">Tanggal</th></tr></thead><tbody>{data.placements.map((row:any)=><tr key={row.id} className="border-t border-md-outline-variant/25"><td className="p-3 font-semibold">{row.student?.name}</td><td className="p-3">{row.student?.classRoom?.name||"-"}</td><td className="p-3">{row.department?.code||"-"}</td><td className="p-3">{row.pklPeriod?.name||"-"}</td><td className="p-3">{row.company?.name}</td><td className="p-3">{row.teacherSupervisor?.name||"-"}</td><td className="p-3">{row.dudiMentor?.name||"-"}</td><td className="p-3"><M3Badge variant={row.status==="ACTIVE"?"success":"outline"} size="sm">{row.status}</M3Badge></td><td className="p-3">{dateText(row.startDate)} – {dateText(row.endDate)}</td></tr>)}</tbody></table></div>}</M3Card>
      <p className="hidden print:block text-right text-xs">Dicetak: {new Date().toLocaleString("id-ID",{timeZone:"Asia/Jakarta"})}</p>
    </>}
  </div></SchoolLayout>;
}
