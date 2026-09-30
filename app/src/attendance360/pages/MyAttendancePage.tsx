import React, { useEffect, useMemo, useRef, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { getMyAttendance, recordSelfAttendance, submitAttendancePermitRequest, useQuery } from "wasp/client/operations";
import { Bell, Camera, CheckCircle2, ChevronRight, Clock3, History, LogIn, LogOut, MapPin, Navigation, RefreshCw, School, ShieldCheck } from "lucide-react";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import { M3Badge, M3Banner, M3Button, M3Card, M3CircularProgress, M3Dialog, M3Icon, M3Select, M3TextField } from "../../client/components/m3";
import { calculateDistanceMeters } from "../../shared/geofence";
import { AttendanceEvidenceUploader, type AttendanceEvidenceUploaderHandle } from "../components/AttendanceEvidenceUploader";

const badge: Record<string, any> = { HADIR:"success", TERLAMBAT:"warning", SAKIT:"secondary", IZIN:"primary", ALPA:"error" };

function initials(name?: string | null) {
  const parts = (name || "Siswa").trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "S").slice(0, 2);
}

function clockMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function localClockParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value || 0);
  return { hour: get("hour"), minute: get("minute") };
}

function eventTime(event?: { occurredAt?: string | Date | null } | null) {
  if (!event?.occurredAt) return "--:--";
  return new Date(event.occurredAt).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
}

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
  const [clientNow,setClientNow]=useState(()=>Date.now());
  const [selfieUploading,setSelfieUploading]=useState(false);
  const selfieCaptureRef=useRef<AttendanceEvidenceUploaderHandle>(null);

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
  useEffect(()=>{
    const timer=window.setInterval(()=>setClientNow(Date.now()),1000);
    return()=>window.clearInterval(timer);
  },[]);

  const todayEvents:any[]=data?.events||[];
  const hasIn=todayEvents.some(e=>e.type==="SELF_CHECK_IN");
  const hasOut=todayEvents.some(e=>e.type==="SELF_CHECK_OUT");
  const checkInEvent=todayEvents.find(e=>e.type==="SELF_CHECK_IN");
  const checkOutEvent=todayEvents.find(e=>e.type==="SELF_CHECK_OUT");
  const serverOffset=useMemo(()=>data?.serverNow?new Date(data.serverNow).getTime()-Date.now():0,[data?.serverNow]);
  const effectiveNow=useMemo(()=>new Date(clientNow+serverOffset),[clientNow,serverOffset]);
  const clock=useMemo(()=>data?.serverNow?new Date(data.serverNow).toLocaleString("id-ID",{timeZone:"Asia/Jakarta",weekday:"long",day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}):"",[data?.serverNow]);
  const mobileDate=useMemo(()=>effectiveNow.toLocaleDateString("id-ID",{timeZone:"Asia/Jakarta",weekday:"long",day:"numeric",month:"long",year:"numeric"}).toUpperCase(),[effectiveNow]);
  const mobileTime=useMemo(()=>effectiveNow.toLocaleTimeString("id-ID",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit",second:"2-digit"}),[effectiveNow]);

  const geoPreview=useMemo(()=>{
    if(!coords||data?.policy?.latitude==null||data?.policy?.longitude==null)return null;
    const distanceMeters=calculateDistanceMeters(coords.latitude,coords.longitude,data.policy.latitude,data.policy.longitude);
    return {
      distanceMeters,
      inside:distanceMeters<=data.policy.radiusMeters,
      accurate:coords.accuracy<=data.policy.maxGpsAccuracyMeters,
    };
  },[coords,data?.policy?.latitude,data?.policy?.longitude,data?.policy?.radiusMeters,data?.policy?.maxGpsAccuracyMeters]);

  const nextAction:"CHECK_IN"|"CHECK_OUT"|null=!hasIn?"CHECK_IN":!hasOut?"CHECK_OUT":null;
  const actionLabel=nextAction==="CHECK_IN"?"MASUK":nextAction==="CHECK_OUT"?"PULANG":"SELESAI";
  const schedule=data?.day?.schedule;
  const nowParts=localClockParts(effectiveNow);
  const nowMinutes=nowParts.hour*60+nowParts.minute;
  const actionWindow=nextAction&&schedule?{
    open:nextAction==="CHECK_IN"?schedule.checkInOpen:schedule.checkOutOpen,
    close:nextAction==="CHECK_IN"?schedule.checkInClose:schedule.checkOutClose,
  }:null;
  const withinActionWindow=actionWindow?nowMinutes>=clockMinutes(actionWindow.open)&&nowMinutes<=clockMinutes(actionWindow.close):true;
  const selfieRequired=nextAction==="CHECK_IN"?!!data?.policy?.requireCheckInSelfie:nextAction==="CHECK_OUT"?!!data?.policy?.requireCheckOutSelfie:false;
  const locationReady=!!coords&&!!geoPreview?.inside&&!!geoPreview?.accurate;
  const actionAvailable=!!nextAction&&!!data?.policy?.isActive&&!!data?.day?.isSchoolDay&&locationReady&&withinActionWindow&&!selfieUploading;

  const actionSupportingText=(()=>{
    if(!data?.policy?.isActive)return "Presensi mandiri belum aktif";
    if(!data?.day?.isSchoolDay)return data?.day?.dayLabel||"Bukan hari sekolah";
    if(!coords)return locating?"Mencari lokasi…":"Lokasi belum tersedia";
    if(geoPreview&&!geoPreview.accurate)return `Akurasi GPS ±${coords.accuracy} m`;
    if(geoPreview&&!geoPreview.inside)return "Di luar radius presensi";
    if(!nextAction)return "Presensi hari ini sudah lengkap";
    if(!withinActionWindow&&actionWindow)return `Tersedia ${actionWindow.open}–${actionWindow.close}`;
    if(selfieUploading)return "Mengunggah selfie…";
    if(selfieRequired)return "Ketuk untuk selfie & presensi";
    return nextAction==="CHECK_IN"?"Siap mencatat waktu masuk":"Siap mencatat waktu pulang";
  })();

  const record=async(type:"CHECK_IN"|"CHECK_OUT",evidenceOverride?:string)=>{
    if(!coords){setGeoError("Perbarui GPS terlebih dahulu.");return;}
    setBusy(true);setMessage("");
    try{
      const result:any=await recordSelfAttendance({type,latitude:coords.latitude,longitude:coords.longitude,accuracy:coords.accuracy,evidenceKey:evidenceOverride||selfie||null,notes:notes||null});
      setMessage(result.alreadyRecorded?"Presensi sebelumnya sudah tercatat; tidak dibuat duplikat.":type==="CHECK_IN"?"Check-in berhasil dicatat.":"Check-out berhasil dicatat.");
      setSelfie("");setNotes("");await query.refetch();
    }catch(e:any){setGeoError(e?.message||"Presensi belum berhasil.");}finally{setBusy(false);}
  };

  const handlePrimaryAction=()=>{
    if(!nextAction)return;
    setGeoError("");
    if(selfieRequired){
      selfieCaptureRef.current?.openCamera();
      return;
    }
    void record(nextAction);
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

  const mobileStatus=(()=>{
    if(!coords)return {tone:"neutral",icon:<Navigation size={17}/>,title:locating?"Mencari lokasi perangkat…":"Lokasi perangkat belum tersedia",detail:"Izinkan akses lokasi untuk memeriksa radius presensi."};
    if(geoPreview&&!geoPreview.accurate)return {tone:"warning",icon:<Navigation size={17}/>,title:`Akurasi GPS ±${coords.accuracy} m`,detail:`Maksimal ±${data.policy.maxGpsAccuracyMeters} m. Perbarui GPS sebelum presensi.`};
    if(geoPreview&&!geoPreview.inside)return {tone:"error",icon:<MapPin size={17}/>,title:`Anda berada di luar radius (${geoPreview.distanceMeters} m)`,detail:`Radius presensi sekolah ${data.policy.radiusMeters} m.`};
    if(geoPreview?.inside)return {tone:"success",icon:<ShieldCheck size={17}/>,title:`Lokasi terverifikasi · ${geoPreview.distanceMeters} m`,detail:`Anda berada di dalam radius ${data.policy.radiusMeters} m.`};
    return {tone:"neutral",icon:<MapPin size={17}/>,title:"Titik sekolah belum tersedia",detail:"Admin perlu melengkapi lokasi presensi sekolah."};
  })();
  const mobileStatusClass=mobileStatus.tone==="error"?"bg-md-error-container text-md-error":mobileStatus.tone==="warning"?"bg-md-warning-container text-[#8A4B00] dark:text-md-warning":mobileStatus.tone==="success"?"bg-md-success-container text-md-success":"bg-md-surface-container text-md-on-surface-variant";

  return <SchoolLayout user={user}>
    {query.isLoading?<div className="flex min-h-[60vh] items-center justify-center"><M3CircularProgress size={36}/></div>:query.error?<M3Banner variant="error" supportingText={(query.error as any)?.message||"Data belum dapat dimuat."}/>:data&&<>
      <div className="space-y-3 md:hidden">
        <header className="flex items-center gap-3 px-1 pb-1 pt-1">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-md-primary text-[16px] font-semibold text-md-on-primary shadow-[0_1px_2px_rgba(0,0,0,.08)]">{initials(data.student?.displayName)}</div>
          <div className="min-w-0 flex-1"><p className="text-[12px] text-md-on-surface-variant">Selamat datang,</p><h1 className="truncate text-[17px] font-semibold tracking-[-.01em] text-md-on-surface">{data.student?.displayName}</h1><p className="mt-0.5 truncate text-[12px] font-semibold text-md-primary">{data.student?.className||"Rombel belum ditetapkan"}</p></div>
          <M3Button href="/school/notifications" variant="icon" size="icon-md" aria-label="Buka notifikasi" icon={<Bell size={20} strokeWidth={1.8}/>} />
        </header>

        {message&&<M3Banner variant="success" supportingText={message} dismissible onDismiss={()=>setMessage("")}/>}
        {geoError&&<M3Banner variant="warning" supportingText={geoError} dismissible onDismiss={()=>setGeoError("")}/>}
        {!data.policy?.isActive&&<M3Banner variant="warning" headline="Presensi mandiri belum aktif" supportingText="Admin sekolah belum mengaktifkan kebijakan Attendance 360."/>}
        {!data.day?.isSchoolDay&&<M3Banner variant="warning" headline={data.day?.dayLabel||"Bukan hari sekolah"} supportingText="Check-in dan check-out mandiri dikunci pada hari ini."/>}

        <section className="overflow-hidden rounded-[16px] border border-md-outline-variant bg-md-surface shadow-[0_1px_2px_rgba(0,0,0,.05)]" aria-labelledby="mobile-attendance-title">
          <div className="px-4 pb-4 pt-5 text-center">
            <p className="text-[12px] font-semibold tracking-[.035em] text-md-primary">{mobileDate}</p>
            <p className="mt-1 text-[12px] font-medium tabular-nums text-md-on-surface-variant">{mobileTime} WIB</p>

            <div className="mt-5 flex items-center justify-center gap-2 text-md-primary"><MapPin size={17} strokeWidth={1.8}/><span className="text-[12.5px] lg:text-[11px] font-semibold uppercase tracking-[.11em] text-md-on-surface-variant">Lokasi presensi</span></div>
            <h2 id="mobile-attendance-title" className="mt-1.5 text-[21px] font-semibold tracking-[-.02em] text-md-on-surface">{data.school?.name}</h2>
            <p className="mt-1 text-[13px] text-md-on-surface-variant">Area presensi sekolah</p>

            <div className="mx-auto mt-4 flex max-w-[330px] items-center justify-center gap-3 text-[12px]">
              <span className="inline-flex items-center gap-1.5"><Navigation size={15} className="text-md-primary"/><span className="text-md-on-surface-variant">Jarak</span><strong className="text-md-on-surface">{geoPreview?`${geoPreview.distanceMeters} m`:"—"}</strong></span>
              <span className="h-4 w-px bg-md-outline-variant" aria-hidden="true"/>
              <span className="inline-flex items-center gap-1.5"><School size={15} className="text-md-primary"/><span className="text-md-on-surface-variant">Skema</span><strong className="text-md-on-surface">Di sekolah</strong></span>
            </div>

            <div className="mt-5 flex justify-center">
              <button type="button" onClick={handlePrimaryAction} disabled={!actionAvailable||busy||!nextAction} aria-label={`${actionLabel}. ${actionSupportingText}`} className="group flex size-[168px] touch-manipulation flex-col items-center justify-center rounded-full bg-md-primary px-5 text-center text-md-on-primary shadow-[0_2px_10px_rgba(0,113,227,.22)] ring-[10px] ring-md-primary-container transition-[transform,background-color,box-shadow] active:scale-[.985] disabled:cursor-not-allowed disabled:bg-md-surface-highest disabled:text-md-on-surface-variant disabled:shadow-none disabled:ring-md-surface-container">
                {(busy||selfieUploading)?<span className="mb-2 size-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"/>:<Camera size={25} strokeWidth={1.7} className="mb-2 opacity-90"/>}
                <span className="text-[21px] font-semibold tracking-[.05em]">{actionLabel}</span>
                <span className="mt-1 max-w-[125px] text-[12.5px] lg:text-[11px] font-medium leading-4 opacity-85">{actionSupportingText}</span>
              </button>
            </div>
            {nextAction&&<AttendanceEvidenceUploader ref={selfieCaptureRef} value={selfie} onChange={setSelfie} required={selfieRequired} triggerOnly onBusyChange={setSelfieUploading} onError={setGeoError} onUploaded={async(key)=>{ if(nextAction) await record(nextAction,key); }}/>}
          </div>

          <div className={`mx-3 mb-3 flex items-start gap-2.5 rounded-[12px] px-3.5 py-3 ${mobileStatusClass}`} role={mobileStatus.tone==="error"?"alert":undefined}>
            <span className="mt-0.5 shrink-0">{mobileStatus.icon}</span><span className="min-w-0"><strong className="block text-[12.5px] font-semibold">{mobileStatus.title}</strong><span className="mt-0.5 block text-[12.5px] lg:text-[11.5px] leading-4 opacity-80">{mobileStatus.detail}</span></span>
            <button type="button" onClick={locate} disabled={locating} className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-[9px] text-current hover:bg-black/[.04] disabled:opacity-50 dark:hover:bg-white/[.06]" aria-label="Perbarui lokasi"><RefreshCw size={16} className={locating?"animate-spin":""}/></button>
          </div>

          <div className="grid grid-cols-2 border-t border-md-outline-variant">
            <div className="border-r border-md-outline-variant px-3 py-3.5 text-center"><Clock3 size={16} className="mx-auto text-md-primary"/><p className="mt-1.5 text-[17px] font-semibold tabular-nums text-md-on-surface">{schedule?.checkInOpen||"--:--"}</p><p className="mt-0.5 text-[12px] lg:text-[10.5px] font-semibold uppercase tracking-[.055em] text-md-on-surface-variant">Masuk sekolah</p><p className="mt-1 text-[12.5px] lg:text-[11px] text-md-on-surface-variant">Tercatat {eventTime(checkInEvent)}</p></div>
            <div className="px-3 py-3.5 text-center"><Clock3 size={16} className="mx-auto text-md-primary"/><p className="mt-1.5 text-[17px] font-semibold tabular-nums text-md-on-surface">{schedule?.checkOutOpen||"--:--"}</p><p className="mt-0.5 text-[12px] lg:text-[10.5px] font-semibold uppercase tracking-[.055em] text-md-on-surface-variant">Pulang sekolah</p><p className="mt-1 text-[12.5px] lg:text-[11px] text-md-on-surface-variant">Tercatat {eventTime(checkOutEvent)}</p></div>
          </div>
          <div className="grid grid-cols-2 border-t border-md-outline-variant">
            <a href="#history" className="flex min-h-12 items-center justify-center gap-1.5 border-r border-md-outline-variant px-3 text-[12.5px] font-semibold text-md-primary">Riwayat <ChevronRight size={15}/></a>
            <button type="button" onClick={()=>setPermitOpen(true)} className="flex min-h-12 items-center justify-center px-3 text-[12.5px] font-semibold text-md-primary">Izin / sakit</button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[16px] border border-md-outline-variant bg-md-surface shadow-[0_1px_2px_rgba(0,0,0,.05)]">
          <div className="flex items-center gap-2.5 border-b border-md-outline-variant px-4 py-3"><CheckCircle2 size={18} className="text-md-primary"/><div className="min-w-0 flex-1"><h3 className="text-[13px] font-semibold text-md-on-surface">Evidence hari ini</h3><p className="text-[12.5px] lg:text-[11px] text-md-on-surface-variant">{todayEvents.length} event tercatat</p></div>{data.today?.status&&<M3Badge variant={badge[data.today.status]||"outline"} size="sm">{data.today.status}</M3Badge>}</div>
          {todayEvents.length?<div className="divide-y divide-md-outline-variant/70">{todayEvents.map((e:any)=><div key={e.id} className="flex items-center gap-3 px-4 py-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-md-surface-container text-md-on-surface-variant"><M3Icon name={e.type==="SELF_CHECK_IN"?"login":e.type==="SELF_CHECK_OUT"?"logout":"fact_check"} size={17}/></span><div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-medium text-md-on-surface">{e.type.replaceAll("_"," ")}</p><p className="mt-0.5 text-[12px] lg:text-[10.5px] text-md-on-surface-variant">{new Date(e.occurredAt).toLocaleTimeString("id-ID",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit"})} · {e.source}</p></div><M3Badge variant={badge[e.status]||"outline"} size="sm">{e.status}</M3Badge></div>)}</div>:<p className="px-4 py-5 text-center text-[12px] text-md-on-surface-variant">Belum ada evidence hari ini.</p>}
        </section>

        <section id="history" className="scroll-mt-4 overflow-hidden rounded-[16px] border border-md-outline-variant bg-md-surface shadow-[0_1px_2px_rgba(0,0,0,.05)]">
          <div className="flex items-center gap-2.5 border-b border-md-outline-variant px-4 py-3"><History size={18} className="text-md-primary"/><div><h3 className="text-[13px] font-semibold text-md-on-surface">Riwayat presensi</h3><p className="text-[12.5px] lg:text-[11px] text-md-on-surface-variant">Catatan terbaru Anda</p></div></div>
          <div className="divide-y divide-md-outline-variant/70">{(data.history||[]).slice(0,12).map((r:any)=><div key={r.id} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2.5"><span className="text-[12px] font-medium text-md-on-surface">{new Date(`${r.dateOnly}T00:00:00+07:00`).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}</span><M3Badge variant={badge[r.status]||"outline"} size="sm">{r.status}</M3Badge></div>)}{!data.history?.length&&<p className="px-4 py-5 text-center text-[12px] text-md-on-surface-variant">Belum ada riwayat.</p>}</div>
        </section>
      </div>

      <div className="hidden space-y-5 md:block">
        <header><p className="text-[12.5px] lg:text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">Attendance 360</p><h1 className="mt-1 text-2xl font-semibold tracking-[-.02em]">Kehadiran Saya</h1><p className="mt-1 text-sm text-md-on-surface-variant">Check-in/out berbasis waktu server, lokasi sekolah dan bukti selfie.</p></header>
        {!data.policy?.isActive&&<M3Banner variant="warning" headline="Presensi mandiri belum aktif" supportingText="Admin sekolah belum mengaktifkan kebijakan Attendance 360."/>}
        {!data.day?.isSchoolDay&&<M3Banner variant="warning" headline={data.day?.dayLabel||"Bukan hari sekolah"} supportingText="Check-in dan check-out mandiri dikunci pada hari ini."/>}
        {message&&<M3Banner variant="success" supportingText={message} dismissible onDismiss={()=>setMessage("")}/>} {geoError&&<M3Banner variant="warning" supportingText={geoError} dismissible onDismiss={()=>setGeoError("")}/>}
        <M3Card variant="outlined" className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><p className="text-xs text-md-on-surface-variant">Waktu server WIB</p><p className="mt-1 text-lg font-semibold">{clock}</p><p className="mt-2 text-xs text-md-on-surface-variant">Jadwal: masuk {data.day.schedule.checkInOpen}–{data.day.schedule.checkInClose} · terlambat setelah {data.day.schedule.lateAfter} · pulang {data.day.schedule.checkOutOpen}–{data.day.schedule.checkOutClose}</p></div><M3Badge variant={data.today?.status?badge[data.today.status]||"outline":"outline"}>{data.today?.status||"Belum tercatat"}</M3Badge></div>
          <div className="mt-4 rounded-[12px] bg-md-surface-container p-3 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><span><strong>GPS:</strong> {coords?`${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)} · akurasi ±${coords.accuracy} m`:"belum tersedia"}</span><M3Button variant="text" size="sm" onClick={locate} isLoading={locating}>Perbarui GPS</M3Button></div></div>
          <div className="mt-4"><AttendanceEvidenceUploader value={selfie} onChange={setSelfie} required={!hasIn&&data.policy?.requireCheckInSelfie}/></div>
          <div className="mt-3"><M3TextField label="Catatan (opsional)" value={notes} onChange={e=>setNotes(e.target.value)}/></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3"><M3Button icon={<LogIn size={17}/>} onClick={()=>record("CHECK_IN")} isLoading={busy} disabled={hasIn||!data.day?.isSchoolDay||!data.policy?.isActive}>Check-in</M3Button><M3Button variant="tonal" icon={<LogOut size={17}/>} onClick={()=>record("CHECK_OUT")} isLoading={busy} disabled={!hasIn||hasOut||!data.day?.isSchoolDay||!data.policy?.isActive}>Check-out</M3Button><M3Button variant="outlined" icon="event_busy" onClick={()=>setPermitOpen(true)}>Ajukan Izin / Sakit</M3Button></div>
        </M3Card>
        <div className="grid gap-4 lg:grid-cols-2"><M3Card variant="outlined" className="overflow-hidden"><div className="border-b border-md-outline-variant/35 p-4"><h2 className="font-semibold">Bukti Hari Ini</h2></div>{todayEvents.length? <div className="divide-y divide-md-outline-variant/25">{todayEvents.map((e:any)=><div key={e.id} className="flex items-center gap-3 p-4"><M3Icon name={e.type==="SELF_CHECK_IN"?"login":e.type==="SELF_CHECK_OUT"?"logout":"fact_check"} size={19}/><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{e.type.replaceAll("_"," ")}</p><p className="text-[12.5px] lg:text-[11px] text-md-on-surface-variant">{new Date(e.occurredAt).toLocaleTimeString("id-ID",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit"})} · {e.source}</p></div><M3Badge variant={badge[e.status]||"outline"} size="sm">{e.status}</M3Badge></div>)}</div>:<p className="p-5 text-sm text-md-on-surface-variant">Belum ada bukti hari ini.</p>}</M3Card>
        <M3Card variant="outlined" className="overflow-hidden"><div className="border-b border-md-outline-variant/35 p-4"><h2 className="font-semibold">Riwayat Terbaru</h2></div><div className="divide-y divide-md-outline-variant/25">{(data.history||[]).slice(0,12).map((r:any)=><div key={r.id} className="flex items-center justify-between gap-3 p-3"><span className="text-sm">{r.dateOnly}</span><M3Badge variant={badge[r.status]||"outline"} size="sm">{r.status}</M3Badge></div>)}{!data.history?.length&&<p className="p-5 text-sm text-md-on-surface-variant">Belum ada riwayat.</p>}</div></M3Card></div>
      </div>
    </>}
    <M3Dialog isOpen={permitOpen} onClose={()=>setPermitOpen(false)} title="Pengajuan Izin / Sakit" actions={<><M3Button variant="text" onClick={()=>setPermitOpen(false)}>Batal</M3Button><M3Button onClick={submitPermit} isLoading={busy}>Kirim</M3Button></>}><div className="space-y-3"><M3Select label="Jenis" value={permitType} onChange={e=>setPermitType(e.target.value)} options={[{value:"SICK",label:"Sakit"},{value:"EXIT",label:"Izin pulang/keluar"},{value:"DISPENSATION",label:"Dispensasi"},{value:"ACTIVITY",label:"Kegiatan resmi"},{value:"OTHER",label:"Lainnya"}]}/><M3TextField label="Alasan *" value={permitReason} onChange={e=>setPermitReason(e.target.value)}/><M3TextField label="Tujuan (opsional)" value={permitDestination} onChange={e=>setPermitDestination(e.target.value)}/></div></M3Dialog>
  </SchoolLayout>;
}
