import React, { useEffect, useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { getMyAttendance, recordSelfAttendance, submitAttendancePermitRequest, useQuery } from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import { M3Badge, M3Banner, M3Button, M3Card, M3CircularProgress, M3Dialog, M3Icon, M3Select, M3TextField } from "../../client/components/m3";
import { AttendanceEvidenceUploader } from "../components/AttendanceEvidenceUploader";

const badge: Record<string, any> = { HADIR:"success", TERLAMBAT:"warning", SAKIT:"secondary", IZIN:"primary", ALPA:"error" };

export function MyAttendancePage({ user }: { user: AuthUser }) {
  const query = useQuery(getMyAttendance);
  const data: any = query.data;
  const [coords,setCoords]=useState<{latitude:number;longitude:number;accuracy:number}|null>(null);
  const [geoError,setGeoError]=useState("");
  const [locating,setLocating]=useState(false);
  const [selfie,setSelfie]=useState("");
  const [notes,setNotes]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [permitOpen,setPermitOpen]=useState(false);
  const [permitType,setPermitType]=useState("SICK");
  const [permitReason,setPermitReason]=useState("");
  const [permitDestination,setPermitDestination]=useState("");

  const locate=()=>{
    if(!navigator.geolocation){setGeoError("Perangkat/browser tidak mendukung GPS.");return;}
    setLocating(true);setGeoError("");
    navigator.geolocation.getCurrentPosition(
      pos=>{setCoords({latitude:pos.coords.latitude,longitude:pos.coords.longitude,accuracy:Math.round(pos.coords.accuracy)});setLocating(false);},
      err=>{setGeoError(`GPS belum tersedia: ${err.message}`);setLocating(false);},
      {enableHighAccuracy:true,timeout:15000,maximumAge:0},
    );
  };
  useEffect(()=>{locate();},[]);
  const todayEvents:any[]=data?.events||[];
  const hasIn=todayEvents.some(e=>e.type==="SELF_CHECK_IN");
  const hasOut=todayEvents.some(e=>e.type==="SELF_CHECK_OUT");
  const clock=useMemo(()=>data?.serverNow?new Date(data.serverNow).toLocaleString("id-ID",{timeZone:"Asia/Jakarta",weekday:"long",day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}):"",[data?.serverNow]);

  const record=async(type:"CHECK_IN"|"CHECK_OUT")=>{
    if(!coords){setGeoError("Perbarui GPS terlebih dahulu.");return;}
    setBusy(true);setMessage("");
    try{
      const result:any=await recordSelfAttendance({type,latitude:coords.latitude,longitude:coords.longitude,accuracy:coords.accuracy,evidenceKey:selfie||null,notes:notes||null});
      setMessage(result.alreadyRecorded?"Presensi sebelumnya sudah tercatat; tidak dibuat duplikat.":type==="CHECK_IN"?"Check-in berhasil dicatat.":"Check-out berhasil dicatat.");
      setSelfie("");setNotes("");await query.refetch();
    }catch(e:any){setGeoError(e?.message||"Presensi belum berhasil.");}finally{setBusy(false);}
  };
  const submitPermit=async()=>{
    if(permitReason.trim().length<5)return;
    setBusy(true);
    try{
      const now=new Date();
      await submitAttendancePermitRequest({type:permitType as any,reason:permitReason,destination:permitDestination||null,startAt:now.toISOString(),endAt:null});
      setPermitOpen(false);setPermitReason("");setPermitDestination("");setMessage("Pengajuan dikirim dan menunggu verifikasi.");await query.refetch();
    }catch(e:any){alert(e?.message||"Pengajuan belum berhasil.");}finally{setBusy(false);}
  };

  return <SchoolLayout user={user}><div className="space-y-5">
    <header><p className="text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">Attendance 360</p><h1 className="mt-1 text-2xl font-semibold tracking-[-.02em]">Kehadiran Saya</h1><p className="mt-1 text-sm text-md-on-surface-variant">Check-in/out berbasis waktu server, lokasi sekolah dan bukti selfie.</p></header>
    {query.isLoading?<div className="flex min-h-[260px] items-center justify-center"><M3CircularProgress size={36}/></div>:query.error?<M3Banner variant="error" supportingText={(query.error as any)?.message||"Data belum dapat dimuat."}/>:data&&<>
      {!data.policy?.isActive&&<M3Banner variant="warning" headline="Presensi mandiri belum aktif" supportingText="Admin sekolah belum mengaktifkan kebijakan Attendance 360."/>}
      {!data.day?.isSchoolDay&&<M3Banner variant="warning" headline={data.day?.dayLabel||"Bukan hari sekolah"} supportingText="Check-in dan check-out mandiri dikunci pada hari ini."/>}
      {message&&<M3Banner variant="success" supportingText={message} dismissible onDismiss={()=>setMessage("")}/>} {geoError&&<M3Banner variant="warning" supportingText={geoError} dismissible onDismiss={()=>setGeoError("")}/>} 
      <M3Card variant="outlined" className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><p className="text-xs text-md-on-surface-variant">Waktu server WIB</p><p className="mt-1 text-lg font-semibold">{clock}</p><p className="mt-2 text-xs text-md-on-surface-variant">Jadwal: masuk {data.day.schedule.checkInOpen}–{data.day.schedule.checkInClose} · terlambat setelah {data.day.schedule.lateAfter} · pulang {data.day.schedule.checkOutOpen}–{data.day.schedule.checkOutClose}</p></div><M3Badge variant={data.today?.status?badge[data.today.status]||"outline":"outline"}>{data.today?.status||"Belum tercatat"}</M3Badge></div>
        <div className="mt-4 rounded-[12px] bg-md-surface-container p-3 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><span><strong>GPS:</strong> {coords?`${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)} · akurasi ±${coords.accuracy} m`:"belum tersedia"}</span><M3Button variant="text" size="sm" onClick={locate} isLoading={locating}>Perbarui GPS</M3Button></div></div>
        <div className="mt-4"><AttendanceEvidenceUploader value={selfie} onChange={setSelfie} required={!hasIn&&data.policy?.requireCheckInSelfie}/></div>
        <div className="mt-3"><M3TextField label="Catatan (opsional)" value={notes} onChange={e=>setNotes(e.target.value)}/></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3"><M3Button icon="login" onClick={()=>record("CHECK_IN")} isLoading={busy} disabled={hasIn||!data.day?.isSchoolDay||!data.policy?.isActive}>Check-in</M3Button><M3Button variant="tonal" icon="logout" onClick={()=>record("CHECK_OUT")} isLoading={busy} disabled={!hasIn||hasOut||!data.day?.isSchoolDay||!data.policy?.isActive}>Check-out</M3Button><M3Button variant="outlined" icon="event_busy" onClick={()=>setPermitOpen(true)}>Ajukan Izin / Sakit</M3Button></div>
      </M3Card>
      <div className="grid gap-4 lg:grid-cols-2"><M3Card variant="outlined" className="overflow-hidden"><div className="border-b border-md-outline-variant/35 p-4"><h2 className="font-semibold">Bukti Hari Ini</h2></div>{todayEvents.length? <div className="divide-y divide-md-outline-variant/25">{todayEvents.map((e:any)=><div key={e.id} className="flex items-center gap-3 p-4"><M3Icon name={e.type==="SELF_CHECK_IN"?"login":e.type==="SELF_CHECK_OUT"?"logout":"fact_check"} size={19}/><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{e.type.replaceAll("_"," ")}</p><p className="text-[11px] text-md-on-surface-variant">{new Date(e.occurredAt).toLocaleTimeString("id-ID",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit"})} · {e.source}</p></div><M3Badge variant={badge[e.status]||"outline"} size="sm">{e.status}</M3Badge></div>)}</div>:<p className="p-5 text-sm text-md-on-surface-variant">Belum ada bukti hari ini.</p>}</M3Card>
      <M3Card variant="outlined" className="overflow-hidden"><div className="border-b border-md-outline-variant/35 p-4"><h2 className="font-semibold">Riwayat Terbaru</h2></div><div className="divide-y divide-md-outline-variant/25">{(data.history||[]).slice(0,12).map((r:any)=><div key={r.id} className="flex items-center justify-between gap-3 p-3"><span className="text-sm">{r.dateOnly}</span><M3Badge variant={badge[r.status]||"outline"} size="sm">{r.status}</M3Badge></div>)}{!data.history?.length&&<p className="p-5 text-sm text-md-on-surface-variant">Belum ada riwayat.</p>}</div></M3Card></div>
    </>}
    <M3Dialog isOpen={permitOpen} onClose={()=>setPermitOpen(false)} title="Pengajuan Izin / Sakit" actions={<><M3Button variant="text" onClick={()=>setPermitOpen(false)}>Batal</M3Button><M3Button onClick={submitPermit} isLoading={busy}>Kirim</M3Button></>}><div className="space-y-3"><M3Select label="Jenis" value={permitType} onChange={e=>setPermitType(e.target.value)} options={[{value:"SICK",label:"Sakit"},{value:"EXIT",label:"Izin pulang/keluar"},{value:"DISPENSATION",label:"Dispensasi"},{value:"ACTIVITY",label:"Kegiatan resmi"},{value:"OTHER",label:"Lainnya"}]}/><M3TextField label="Alasan *" value={permitReason} onChange={e=>setPermitReason(e.target.value)}/><M3TextField label="Tujuan (opsional)" value={permitDestination} onChange={e=>setPermitDestination(e.target.value)}/></div></M3Dialog>
  </div></SchoolLayout>;
}
