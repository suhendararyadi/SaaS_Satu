import React, { useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  getDailyJournals,
  getPklEvidenceSignedUrl,
  getPlacements,
  reviewDailyJournalGen2,
  saveDailyJournalGen2,
  useQuery,
} from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  M3Badge,
  M3Button,
  M3Card,
  M3CircularProgress,
  M3Dialog,
  M3Select,
  M3TextField,
} from "../../client/components/m3";
import { PklEvidenceUploader } from "../components/PklEvidenceUploader";

function todayJakarta(){
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
const statusVariant:Record<string,any>={DRAFT:"secondary",SUBMITTED:"primary",APPROVED:"success",REVISION:"warning"};

export function JournalsPage({ user }: { user: AuthUser }) {
  const placementsQ=useQuery(getPlacements);
  const journalsQ=useQuery(getDailyJournals);
  const placements:any[]=placementsQ.data||[];
  const journals:any[]=journalsQ.data||[];
  const isStudent=user.role==="STUDENT"&&!user.isAdmin;
  const canReview=user.role==="TEACHER"||user.role==="DUDI_MENTOR"||user.role==="SCHOOL_ADMIN"||user.isAdmin;
  const activePlacement=placements.find((p:any)=>p.status==="ACTIVE");

  const [dateOnly,setDateOnly]=useState(todayJakarta());
  const [activity,setActivity]=useState("");
  const [obstacle,setObstacle]=useState("");
  const [competencies,setCompetencies]=useState("");
  const [reflection,setReflection]=useState("");
  const [evidence,setEvidence]=useState("");
  const [busy,setBusy]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);

  const existingForDate=useMemo(()=>journals.find((j:any)=>j.placementId===activePlacement?.id&&(j.dateOnly||String(j.date).slice(0,10))===dateOnly),[journals,activePlacement,dateOnly]);

  const loadJournal=(row:any)=>{
    setEditingId(row.id); setDateOnly(row.dateOnly||String(row.date).slice(0,10)); setActivity(row.activityDescription||""); setObstacle(row.obstacleDescription||""); setCompetencies(row.competencies||""); setReflection(row.reflection||""); setEvidence(row.evidenceUrl||row.photoUrl||"");
  };
  const clearForm=()=>{setEditingId(null);setDateOnly(todayJakarta());setActivity("");setObstacle("");setCompetencies("");setReflection("");setEvidence("");};

  const save=async(submit:boolean)=>{
    if(!activePlacement||activity.trim().length<5)return;
    setBusy(true);
    try{
      await saveDailyJournalGen2({
        placementId:activePlacement.id,
        dateOnly,
        activityDescription:activity,
        obstacleDescription:obstacle||null,
        competencies:competencies||null,
        reflection:reflection||null,
        evidenceUrl:evidence||null,
        submit,
      });
      clearForm(); await journalsQ.refetch();
    }catch(e:any){alert(e?.message||"Jurnal belum tersimpan.");}
    finally{setBusy(false);}
  };

  const [reviewRow,setReviewRow]=useState<any>(null);
  const [decision,setDecision]=useState<"APPROVED"|"REVISION">("APPROVED");
  const [feedback,setFeedback]=useState("");
  const [score,setScore]=useState("90");
  const saveReview=async()=>{
    if(!reviewRow)return;
    setBusy(true);
    try{
      await reviewDailyJournalGen2({id:reviewRow.id,decision,feedback:feedback||null,score:score===""?null:Number(score)});
      setReviewRow(null);setFeedback("");await journalsQ.refetch();
    }catch(e:any){alert(e?.message||"Review belum tersimpan.");}
    finally{setBusy(false);}
  };
  const openEvidence=async(row:any)=>{
    try{const url=await getPklEvidenceSignedUrl({kind:"JOURNAL",id:row.id});window.open(url,"_blank","noopener,noreferrer");}catch(e:any){alert(e?.message||"Bukti tidak tersedia.");}
  };

  const [filter,setFilter]=useState("ALL");
  const filtered=journals.filter((j:any)=>filter==="ALL"||j.status===filter);

  return <SchoolLayout user={user}><div className="space-y-6">
    <header><p className="text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">PKL Gen2</p><h1 className="mt-1 text-2xl font-semibold tracking-[-.02em]">Jurnal Kegiatan PKL</h1><p className="mt-1 text-sm text-md-on-surface-variant">Draft, submit, revisi, kompetensi, dokumentasi, dan review terpisah Guru/DUDI.</p></header>

    {isStudent&&<>{!activePlacement?<M3Card variant="outlined" className="p-5 text-sm text-md-on-surface-variant">Belum ada penempatan PKL aktif.</M3Card>:<M3Card variant="outlined" className="p-5 space-y-4">
      <div><h2 className="font-semibold">Jurnal Saya</h2><p className="text-[11.5px] text-md-on-surface-variant">{activePlacement.company?.name} · {activePlacement.pklPeriod?.name||"Tanpa periode"}</p></div>
      {existingForDate&&!editingId&&<div className="rounded-[10px] bg-md-surface-container p-3 text-xs">Tanggal ini sudah memiliki jurnal <strong>{existingForDate.status}</strong>. {["DRAFT","REVISION"].includes(existingForDate.status)&&<M3Button variant="text" size="sm" onClick={()=>loadJournal(existingForDate)}>Buka untuk diedit</M3Button>}</div>}
      <M3TextField label="Tanggal" type="date" value={dateOnly} onChange={(e)=>{setDateOnly(e.target.value);setEditingId(null);}}/>
      <div><label className="mb-1 block text-xs font-semibold">Aktivitas / pekerjaan *</label><textarea rows={4} value={activity} onChange={(e)=>setActivity(e.target.value)} className="w-full rounded-[10px] border border-md-outline-variant bg-transparent px-3 py-2 text-sm"/></div>
      <div><label className="mb-1 block text-xs font-semibold">Kompetensi / keterampilan</label><textarea rows={2} value={competencies} onChange={(e)=>setCompetencies(e.target.value)} className="w-full rounded-[10px] border border-md-outline-variant bg-transparent px-3 py-2 text-sm"/></div>
      <div><label className="mb-1 block text-xs font-semibold">Kendala & solusi</label><textarea rows={2} value={obstacle} onChange={(e)=>setObstacle(e.target.value)} className="w-full rounded-[10px] border border-md-outline-variant bg-transparent px-3 py-2 text-sm"/></div>
      <div><label className="mb-1 block text-xs font-semibold">Refleksi</label><textarea rows={2} value={reflection} onChange={(e)=>setReflection(e.target.value)} className="w-full rounded-[10px] border border-md-outline-variant bg-transparent px-3 py-2 text-sm"/></div>
      <PklEvidenceUploader label="Dokumentasi kegiatan (opsional)" value={evidence} onChange={setEvidence}/>
      <div className="flex flex-wrap justify-end gap-2"><M3Button variant="tonal" onClick={()=>save(false)} isLoading={busy}>Simpan Draft</M3Button><M3Button onClick={()=>save(true)} isLoading={busy}>Kirim Jurnal</M3Button></div>
    </M3Card>}</>}

    <M3Card variant="outlined" className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-md-outline-variant/35 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">{isStudent?"Riwayat Jurnal":"Jurnal dalam scope bimbingan"}</h2><p className="text-[11.5px] text-md-on-surface-variant">{journals.length} record</p></div><M3Select size="sm" value={filter} onChange={(e)=>setFilter(e.target.value)} options={[{value:"ALL",label:"Semua status"},...["DRAFT","SUBMITTED","APPROVED","REVISION"].map(v=>({value:v,label:v}))]}/></div>
      {journalsQ.isLoading?<div className="flex min-h-[220px] items-center justify-center"><M3CircularProgress size={34}/></div>:filtered.length===0?<div className="p-6 text-sm text-md-on-surface-variant">Belum ada jurnal.</div>:<div className="divide-y divide-md-outline-variant/25">{filtered.map((row:any)=><div key={row.id} className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{row.placement?.student?.name}</p><M3Badge variant={statusVariant[row.status]||"outline"} size="sm">{row.status}</M3Badge><M3Badge variant="outline" size="sm">{row.dateOnly||String(row.date).slice(0,10)}</M3Badge></div><p className="mt-1 text-[11px] text-md-on-surface-variant">{row.placement?.company?.name} · Guru {row.teacherReviewStatus||"-"} · DUDI {row.mentorReviewStatus||"-"} · nilai {row.score??"-"}</p><p className="mt-2 text-sm">{row.activityDescription}</p>{row.competencies&&<p className="mt-1 text-[11.5px] text-md-on-surface-variant"><strong>Kompetensi:</strong> {row.competencies}</p>}{row.teacherFeedback&&<p className="mt-1 text-[11px] text-md-on-surface-variant">Guru: {row.teacherFeedback}</p>}{row.mentorFeedback&&<p className="mt-1 text-[11px] text-md-on-surface-variant">DUDI: {row.mentorFeedback}</p>}</div>
        <div className="flex flex-wrap gap-1.5">{(row.evidenceUrl||row.photoUrl)&&<M3Button variant="text" size="sm" onClick={()=>openEvidence(row)}>Bukti</M3Button>}{isStudent&&["DRAFT","REVISION"].includes(row.status)&&<M3Button variant="tonal" size="sm" onClick={()=>loadJournal(row)}>Edit</M3Button>}{canReview&&row.status!=="DRAFT"&&<M3Button variant="tonal" size="sm" onClick={()=>{setReviewRow(row);setDecision("APPROVED");setFeedback("");setScore(String(row.score??90));}}>Review</M3Button>}</div></div>
      </div>)}</div>}
    </M3Card>

    <M3Dialog isOpen={!!reviewRow} onClose={()=>setReviewRow(null)} title="Review Jurnal PKL" subtitle={reviewRow?.placement?.student?.name||""} actions={<><M3Button variant="text" onClick={()=>setReviewRow(null)}>Batal</M3Button><M3Button onClick={saveReview} isLoading={busy}>Simpan Review</M3Button></>}><div className="space-y-3"><M3Select label="Keputusan" value={decision} onChange={(e)=>setDecision(e.target.value as any)} options={[{value:"APPROVED",label:"Setujui"},{value:"REVISION",label:"Minta Revisi"}]}/><M3TextField label="Nilai 0–100" type="number" value={score} onChange={(e)=>setScore(e.target.value)}/><div><label className="mb-1 block text-xs font-semibold">Feedback</label><textarea rows={4} value={feedback} onChange={(e)=>setFeedback(e.target.value)} className="w-full rounded-[10px] border border-md-outline-variant bg-transparent px-3 py-2 text-sm"/></div></div></M3Dialog>
  </div></SchoolLayout>;
}
