import React, { useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { commitPklImport, previewPklImport } from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import { M3Badge, M3Banner, M3Button, M3Card, M3Select } from "../../client/components/m3";
import { downloadPklXlsxTemplate, pklXlsxToCsv } from "../pklXlsx";

const templates:Record<string,{headers:string[];filename:string;note:string}>={
  DUDI:{headers:["kode_dudi","nama","alamat","sektor","telepon","email","website","pic","hp_pic","konsentrasi"],filename:"template-pkl-dudi.xlsx",note:"Kolom konsentrasi dapat berisi kode A;B;C."},
  MENTOR:{headers:["nama","kode_dudi","jabatan","telepon","email"],filename:"template-pkl-pembimbing-dudi.xlsx",note:"Kode DUDI harus sudah tersedia."},
  CAPACITY:{headers:["periode","kode_dudi","konsentrasi","kuota"],filename:"template-pkl-kapasitas.xlsx",note:"Nama periode dan kode konsentrasi harus sama dengan master School OS."},
  PLACEMENT:{headers:["nisn","periode","kode_dudi","nip_guru","pembimbing_dudi"],filename:"template-pkl-penempatan.xlsx",note:"Placement hasil import selalu dibuat PLANNED dan tetap tunduk pada readiness."},
};

async function readCsvFile(file:File){
  if(typeof (file as any).text==="function") return (file as any).text();
  return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||""));reader.onerror=()=>reject(reader.error);reader.readAsText(file);});
}

export function PklImportPage({ user }: { user: AuthUser }) {
  const [kind,setKind]=useState<"DUDI"|"MENTOR"|"CAPACITY"|"PLACEMENT">("DUDI");
  const [csvContent,setCsvContent]=useState("");
  const [fileName,setFileName]=useState("");
  const [preview,setPreview]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const meta=templates[kind];
  const canCommit=preview&&preview.invalidRows===0&&preview.validRows>0;

  const handleFile=async(file?:File)=>{
    if(!file)return;setError("");setPreview(null);setFileName(file.name);
    try{
      const csv=file.name.toLowerCase().endsWith(".xlsx")?await pklXlsxToCsv(file):await readCsvFile(file);
      setCsvContent(csv);
    }catch(e:any){setError(e?.message||"File belum dapat dibaca.");setCsvContent("");}
  };
  const runPreview=async()=>{
    if(!csvContent.trim())return;setBusy(true);setError("");
    try{setPreview(await previewPklImport({kind,csvContent}));}
    catch(e:any){setError(e?.message||"Preview gagal.");}
    finally{setBusy(false);}
  };
  const commit=async()=>{
    if(!canCommit)return;setBusy(true);setError("");
    try{
      const result:any=await commitPklImport({kind,csvContent,previewHash:preview.previewHash});
      alert(`Import selesai: ${JSON.stringify(result)}`);
      setPreview(null);setCsvContent("");setFileName("");
    }catch(e:any){setError(e?.message||"Commit import gagal.");}
    finally{setBusy(false);}
  };
  const rows=useMemo(()=>preview?.rows||[],[preview]);

  return <SchoolLayout user={user}><div className="space-y-6">
    <header><p className="text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">PKL Gen2</p><h1 className="mt-1 text-2xl font-semibold tracking-[-.02em]">Import Data PKL</h1><p className="mt-1 text-sm text-md-on-surface-variant">Alur aman: template → upload → preview → validasi → commit.</p></header>
    <M3Card variant="outlined" className="p-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-[240px_1fr]"><M3Select label="Jenis Import" value={kind} onChange={(e)=>{setKind(e.target.value as any);setPreview(null);setCsvContent("");setFileName("");}} options={[{value:"DUDI",label:"Mitra DUDI"},{value:"MENTOR",label:"Pembimbing DUDI"},{value:"CAPACITY",label:"Kapasitas PKL"},{value:"PLACEMENT",label:"Penempatan PKL"}]}/><div className="rounded-[12px] bg-md-surface-container p-3 text-xs text-md-on-surface-variant">{meta.note}</div></div>
      <div className="flex flex-wrap gap-2"><M3Button variant="tonal" icon="download" onClick={()=>downloadPklXlsxTemplate(meta.headers,meta.filename,kind)}>Unduh Template XLSX</M3Button><label className="inline-flex min-h-10 cursor-pointer items-center rounded-[10px] bg-md-primary px-4 text-sm font-semibold text-md-on-primary">Pilih XLSX / CSV<input type="file" accept=".xlsx,.csv,text/csv" className="hidden" onChange={(e)=>void handleFile(e.target.files?.[0])}/></label>{fileName&&<M3Badge variant="outline">{fileName}</M3Badge>}</div>
      {csvContent&&<M3Button onClick={runPreview} isLoading={busy} icon="fact_check">Preview & Validasi</M3Button>}
      {error&&<M3Banner variant="error" supportingText={error} dismissible onDismiss={()=>setError("")}/>}
    </M3Card>

    {preview&&<M3Card variant="outlined" className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-md-outline-variant/35 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Hasil Preview</h2><p className="text-[11.5px] text-md-on-surface-variant">{preview.validRows} valid · {preview.invalidRows} tidak valid · total {rows.length}</p></div><div className="flex gap-2"><M3Badge variant={preview.invalidRows?"error":"success"}>{preview.invalidRows?"Perlu diperbaiki":"Siap commit"}</M3Badge><M3Button onClick={commit} isLoading={busy} disabled={!canCommit}>Commit Import</M3Button></div></div>
      <div className="max-h-[520px] overflow-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="sticky top-0 bg-md-surface-container"><tr><th className="p-3">Baris</th><th className="p-3">Status</th><th className="p-3">Data teridentifikasi</th><th className="p-3">Validasi</th></tr></thead><tbody>{rows.map((row:any)=><tr key={row.rowNumber} className="border-t border-md-outline-variant/25 align-top"><td className="p-3">{row.rowNumber}</td><td className="p-3"><M3Badge variant={row.errors.length?"error":"success"} size="sm">{row.errors.length?"INVALID":"VALID"}</M3Badge></td><td className="p-3"><pre className="whitespace-pre-wrap font-sans text-[11px]">{JSON.stringify(Object.fromEntries(Object.entries(row).filter(([k])=>!["errors","rowNumber"].includes(k))),null,1)}</pre></td><td className="p-3">{row.errors.length?<ul className="list-disc pl-4 text-md-error">{row.errors.map((e:string)=><li key={e}>{e}</li>)}</ul>:<span className="text-green-700">Siap</span>}</td></tr>)}</tbody></table></div>
    </M3Card>}
  </div></SchoolLayout>;
}
