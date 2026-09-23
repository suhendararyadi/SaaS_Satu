import React, { useEffect, useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  correctAttendance,
  deletePklWorkSchedule,
  getAttendanceLogs,
  getCompanies,
  getPklPeriods,
  getPklWorkSchedules,
  getPlacements,
  recordAttendanceException,
  recordAttendanceGen2,
  savePklWorkSchedule,
  useQuery,
} from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  M3Badge,
  M3Banner,
  M3Button,
  M3Card,
  M3CircularProgress,
  M3Dialog,
  M3Select,
  M3TextField,
} from "../../client/components/m3";
import { PklEvidenceUploader } from "../components/PklEvidenceUploader";

const statusVariant: Record<string, any> = {
  HADIR: "success", TERLAMBAT: "warning", IZIN: "primary", SAKIT: "secondary", ALPA: "error", LIBUR: "outline",
};

export function AttendancePage({ user }: { user: AuthUser }) {
  const placementsQ = useQuery(getPlacements);
  const logsQ = useQuery(getAttendanceLogs);
  const schedulesQ = useQuery(getPklWorkSchedules);
  const periodsQ = useQuery(getPklPeriods);
  const companiesQ = useQuery(getCompanies);
  const placements: any[] = placementsQ.data || [];
  const logs: any[] = logsQ.data || [];
  const schedules: any[] = schedulesQ.data || [];
  const periods: any[] = periodsQ.data || [];
  const companies: any[] = companiesQ.data || [];
  const isStudent = user.role === "STUDENT" && !user.isAdmin;
  const isAdmin = user.role === "SCHOOL_ADMIN" || user.isAdmin;
  const activePlacement = placements.find((p: any) => p.status === "ACTIVE");

  const [coords, setCoords] = useState<{latitude:number;longitude:number;accuracy:number}|null>(null);
  const [geoError, setGeoError] = useState("");
  const [locating, setLocating] = useState(false);
  const [notes, setNotes] = useState("");
  const [photoKey, setPhotoKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [exceptionStatus, setExceptionStatus] = useState<"IZIN"|"SAKIT">("IZIN");
  const [exceptionNotes, setExceptionNotes] = useState("");
  const [exceptionEvidence, setExceptionEvidence] = useState("");

  const fetchLocation = () => {
    if (!navigator.geolocation) { setGeoError("Browser tidak mendukung GPS."); return; }
    setLocating(true); setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) }); setLocating(false); },
      (err) => { setGeoError("GPS gagal: " + err.message); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };
  useEffect(() => { if (isStudent) fetchLocation(); }, [isStudent]);

  const record = async (type: "CHECK_IN"|"CHECK_OUT") => {
    if (!activePlacement) return;
    setBusy(true); setSuccess("");
    try {
      await recordAttendanceGen2({
        placementId: activePlacement.id,
        type,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        photoUrl: photoKey || null,
        notes: notes || null,
      });
      setSuccess(type === "CHECK_IN" ? "Check-in berhasil dicatat." : "Check-out berhasil dicatat.");
      setNotes(""); setPhotoKey("");
      await logsQ.refetch();
    } catch (e:any) { alert(e?.message || "Presensi belum berhasil."); }
    finally { setBusy(false); }
  };

  const submitException = async () => {
    if (!activePlacement || exceptionNotes.trim().length < 5) return;
    setBusy(true);
    try {
      await recordAttendanceException({
        placementId: activePlacement.id,
        status: exceptionStatus,
        notes: exceptionNotes,
        evidenceUrl: exceptionEvidence || null,
      });
      setExceptionOpen(false); setExceptionNotes(""); setExceptionEvidence("");
      await logsQ.refetch();
    } catch (e:any) { alert(e?.message || "Pengajuan belum berhasil."); }
    finally { setBusy(false); }
  };

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((row:any) => !q || [row.placement?.student?.name,row.placement?.company?.name,row.status,row.type,row.dateOnly].filter(Boolean).some((v:any)=>String(v).toLowerCase().includes(q)));
  }, [logs,search]);

  const [correctRow, setCorrectRow] = useState<any>(null);
  const [correctStatus, setCorrectStatus] = useState("HADIR");
  const [correctNotes, setCorrectNotes] = useState("");
  const [correctReason, setCorrectReason] = useState("");
  const saveCorrection = async () => {
    if (!correctRow || correctReason.trim().length < 3) return;
    setBusy(true);
    try {
      await correctAttendance({ id: correctRow.id, status: correctStatus as any, notes: correctNotes || null, reason: correctReason });
      setCorrectRow(null); await logsQ.refetch();
    } catch(e:any){ alert(e?.message || "Koreksi belum tersimpan."); }
    finally{ setBusy(false); }
  };

  const [scheduleOpen,setScheduleOpen]=useState(false);
  const [schedulePeriod,setSchedulePeriod]=useState("");
  const [scheduleCompany,setScheduleCompany]=useState("");
  const [workingDays,setWorkingDays]=useState("1,2,3,4,5");
  const [checkInStart,setCheckInStart]=useState("07:00");
  const [lateAfter,setLateAfter]=useState("07:15");
  const [checkOutStart,setCheckOutStart]=useState("15:00");
  const [checkOutEnd,setCheckOutEnd]=useState("17:00");
  const openSchedule=(row?:any)=>{
    setSchedulePeriod(row?.periodId || periods.find((p:any)=>p.isActive)?.id || periods[0]?.id || "");
    setScheduleCompany(row?.companyId || companies[0]?.id || "");
    setWorkingDays(row?.workingDays || "1,2,3,4,5");
    setCheckInStart(row?.checkInStart || "07:00");
    setLateAfter(row?.lateAfter || "07:15");
    setCheckOutStart(row?.checkOutStart || "15:00");
    setCheckOutEnd(row?.checkOutEnd || "17:00");
    setScheduleOpen(true);
  };
  const saveSchedule=async()=>{
    setBusy(true);
    try{
      await savePklWorkSchedule({periodId:schedulePeriod,companyId:scheduleCompany,workingDays,checkInStart,lateAfter,checkOutStart,checkOutEnd,isActive:true,notes:null});
      setScheduleOpen(false); await schedulesQ.refetch();
    }catch(e:any){alert(e?.message||"Jadwal belum tersimpan.");} finally{setBusy(false);}
  };

  return <SchoolLayout user={user}><div className="space-y-6">
    <header><p className="text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">PKL Gen2</p><h1 className="mt-1 text-2xl font-semibold tracking-[-.02em]">Presensi PKL</h1><p className="mt-1 text-sm text-md-on-surface-variant">Geofence, jadwal kerja, keterlambatan, izin/sakit, bukti foto, dan koreksi.</p></header>

    {isStudent && <>{!activePlacement ? <M3Banner variant="warning" headline="Belum ada penempatan aktif" supportingText="Presensi hanya tersedia ketika placement sudah ACTIVE dan berada dalam rentang tanggal PKL."/> :
      <M3Card variant="outlined" className="p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-semibold">{activePlacement.company?.name}</h2><p className="text-xs text-md-on-surface-variant">{activePlacement.pklPeriod?.name || "Periode belum tersedia"} · {activePlacement.student?.name}</p></div><M3Badge variant="success">ACTIVE</M3Badge></div>
        {success && <M3Banner variant="success" supportingText={success} dismissible onDismiss={()=>setSuccess("")}/>}
        {geoError && <M3Banner variant="warning" supportingText={geoError} dismissible onDismiss={()=>setGeoError("")}/>}
        <div className="rounded-[12px] bg-md-surface-container p-3 text-xs"><strong>GPS:</strong> {coords ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)} · akurasi ±${coords.accuracy} m` : "belum tersedia"} <M3Button variant="text" size="sm" onClick={fetchLocation} isLoading={locating}>Perbarui lokasi</M3Button></div>
        <PklEvidenceUploader label="Selfie / bukti presensi" capture="user" value={photoKey} onChange={setPhotoKey}/>
        <M3TextField label="Catatan (opsional)" value={notes} onChange={(e)=>setNotes(e.target.value)}/>
        <div className="grid gap-2 sm:grid-cols-3"><M3Button variant="filled" icon="login" isLoading={busy} onClick={()=>record("CHECK_IN")}>Check-in</M3Button><M3Button variant="tonal" icon="logout" isLoading={busy} onClick={()=>record("CHECK_OUT")}>Check-out</M3Button><M3Button variant="outlined" icon="event_busy" onClick={()=>setExceptionOpen(true)}>Izin / Sakit</M3Button></div>
      </M3Card>}
    </>}

    {isAdmin && <M3Card variant="outlined" className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-md-outline-variant/35 p-4"><div><h2 className="font-semibold">Jadwal Kerja DUDI</h2><p className="text-[11.5px] text-md-on-surface-variant">Dipakai server untuk validasi hari kerja dan status terlambat.</p></div><M3Button size="sm" icon="add" onClick={()=>openSchedule()} disabled={!periods.length||!companies.length}>Atur Jadwal</M3Button></div>
      {schedules.length===0?<div className="p-5 text-sm text-md-on-surface-variant">Belum ada jadwal kerja.</div>:<div className="divide-y divide-md-outline-variant/25">{schedules.map((row:any)=><div key={row.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center"><div className="flex-1"><p className="font-semibold">{row.company?.name}</p><p className="text-[11px] text-md-on-surface-variant">{row.period?.name} · Hari {row.workingDays} · masuk {row.checkInStart||"-"} · terlambat setelah {row.lateAfter||"-"} · pulang {row.checkOutStart||"-"}–{row.checkOutEnd||"-"}</p></div><div className="flex gap-1"><M3Button variant="text" size="sm" onClick={()=>openSchedule(row)}>Edit</M3Button><M3Button variant="text" size="sm" onClick={async()=>{if(confirm("Hapus jadwal ini?")){await deletePklWorkSchedule({id:row.id});await schedulesQ.refetch();}}}>Hapus</M3Button></div></div>)}</div>}
    </M3Card>}

    <M3Card variant="outlined" className="overflow-hidden">
      <div className="p-4 border-b border-md-outline-variant/35"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Riwayat Presensi</h2><p className="text-[11.5px] text-md-on-surface-variant">Data otomatis dibatasi sesuai role/penugasan.</p></div><M3TextField size="sm" leadingIcon="search" placeholder="Cari siswa/status/tanggal..." value={search} onChange={(e)=>setSearch(e.target.value)}/></div></div>
      {logsQ.isLoading?<div className="flex min-h-[220px] items-center justify-center"><M3CircularProgress size={34}/></div>:filtered.length===0?<div className="p-6 text-sm text-md-on-surface-variant">Belum ada presensi.</div>:<div className="divide-y divide-md-outline-variant/25">{filtered.slice(0,100).map((row:any)=><div key={row.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{row.placement?.student?.name}</p><M3Badge variant={statusVariant[row.status]||"outline"} size="sm">{row.status}</M3Badge>{row.geofenceStatus&&<M3Badge variant={row.geofenceStatus==="OUTSIDE"?"warning":"outline"} size="sm">{row.geofenceStatus}</M3Badge>}{row.scheduleStatus==="LATE"&&<M3Badge variant="warning" size="sm">LATE</M3Badge>}</div><p className="mt-1 text-[11px] text-md-on-surface-variant">{row.dateOnly} · {row.type} · {row.placement?.company?.name} · {row.distanceMeters!=null?Math.round(row.distanceMeters)+" m":""}</p>{row.notes&&<p className="mt-1 text-[11px] text-md-on-surface-variant">{row.notes}</p>}</div>{isAdmin&&<M3Button variant="text" size="sm" onClick={()=>{setCorrectRow(row);setCorrectStatus(row.status);setCorrectNotes(row.notes||"");setCorrectReason("");}}>Koreksi</M3Button>}</div>)}</div>}
    </M3Card>

    <M3Dialog isOpen={exceptionOpen} onClose={()=>setExceptionOpen(false)} title="Izin / Sakit" actions={<><M3Button variant="text" onClick={()=>setExceptionOpen(false)}>Batal</M3Button><M3Button onClick={submitException} isLoading={busy}>Kirim</M3Button></>}><div className="space-y-3"><M3Select label="Status" value={exceptionStatus} onChange={(e)=>setExceptionStatus(e.target.value as any)} options={[{value:"IZIN",label:"Izin"},{value:"SAKIT",label:"Sakit"}]}/><M3TextField label="Alasan *" value={exceptionNotes} onChange={(e)=>setExceptionNotes(e.target.value)}/><PklEvidenceUploader label="Bukti pendukung (opsional)" value={exceptionEvidence} onChange={setExceptionEvidence}/></div></M3Dialog>

    <M3Dialog isOpen={!!correctRow} onClose={()=>setCorrectRow(null)} title="Koreksi Presensi" actions={<><M3Button variant="text" onClick={()=>setCorrectRow(null)}>Batal</M3Button><M3Button onClick={saveCorrection} isLoading={busy}>Simpan Koreksi</M3Button></>}><div className="space-y-3"><M3Select label="Status" value={correctStatus} onChange={(e)=>setCorrectStatus(e.target.value)} options={["HADIR","TERLAMBAT","IZIN","SAKIT","ALPA","LIBUR"].map(v=>({value:v,label:v}))}/><M3TextField label="Catatan" value={correctNotes} onChange={(e)=>setCorrectNotes(e.target.value)}/><M3TextField label="Alasan koreksi *" value={correctReason} onChange={(e)=>setCorrectReason(e.target.value)}/></div></M3Dialog>

    <M3Dialog isOpen={scheduleOpen} onClose={()=>setScheduleOpen(false)} title="Jadwal Kerja PKL" actions={<><M3Button variant="text" onClick={()=>setScheduleOpen(false)}>Batal</M3Button><M3Button onClick={saveSchedule} isLoading={busy}>Simpan Jadwal</M3Button></>}><div className="space-y-3"><M3Select label="Periode" value={schedulePeriod} onChange={(e)=>setSchedulePeriod(e.target.value)} options={periods.map((p:any)=>({value:p.id,label:p.name}))}/><M3Select label="DUDI" value={scheduleCompany} onChange={(e)=>setScheduleCompany(e.target.value)} options={companies.map((c:any)=>({value:c.id,label:c.name}))}/><M3TextField label="Hari kerja (0=Minggu … 6=Sabtu)" value={workingDays} onChange={(e)=>setWorkingDays(e.target.value)} supportingText="Contoh Senin–Jumat: 1,2,3,4,5"/><div className="grid gap-3 sm:grid-cols-2"><M3TextField label="Mulai check-in" value={checkInStart} onChange={(e)=>setCheckInStart(e.target.value)}/><M3TextField label="Terlambat setelah" value={lateAfter} onChange={(e)=>setLateAfter(e.target.value)}/><M3TextField label="Mulai check-out" value={checkOutStart} onChange={(e)=>setCheckOutStart(e.target.value)}/><M3TextField label="Akhir check-out" value={checkOutEnd} onChange={(e)=>setCheckOutEnd(e.target.value)}/></div></div></M3Dialog>
  </div></SchoolLayout>;
}
