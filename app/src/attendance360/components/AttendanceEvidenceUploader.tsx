import React, { useEffect, useState } from "react";
import { api } from "wasp/client/api";
import { M3Badge, M3Icon } from "../../client/components/m3";

type Props = { value: string; onChange: (key: string) => void; required?: boolean; label?: string };

export function AttendanceEvidenceUploader({ value, onChange, required = false, label = "Selfie langsung" }: Props) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const upload = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError("Gunakan JPG, PNG, atau WebP.");
    if (file.size > 5 * 1024 * 1024) return setError("Ukuran selfie maksimal 5 MB.");
    setBusy(true); setError("");
    try {
      const payload = await api.post("/operations/attendance-evidence-upload", {
        headers: { "Content-Type": file.type, "X-File-Name": file.name || `attendance-${Date.now()}.jpg` },
        body: file,
      }).json<{ key: string }>();
      if (!payload?.key) throw new Error("Upload selfie gagal.");
      onChange(payload.key);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    } catch (e: any) { setError(e?.message || "Selfie belum berhasil diunggah."); }
    finally { setBusy(false); }
  };

  return <div className="rounded-[12px] border border-md-outline-variant/55 p-3">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold">{label}{required ? " *" : ""}</p><p className="mt-0.5 text-[10.5px] text-md-on-surface-variant">Gunakan kamera depan. Foto disimpan privat dan hanya dapat dibuka pihak yang berwenang.</p></div>{value && <M3Badge variant="success" size="sm">Siap</M3Badge>}</div>
    {previewUrl && <img src={previewUrl} alt="Pratinjau selfie presensi" className="mt-3 max-h-52 rounded-[10px] object-cover" />}
    <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[9px] bg-md-primary px-3 text-xs font-semibold text-md-on-primary">
      <M3Icon name="photo_camera" size={18}/>{busy ? "Mengunggah…" : value ? "Ambil Ulang Selfie" : "Ambil Selfie"}
      <input type="file" accept="image/jpeg,image/png,image/webp" capture="user" disabled={busy} className="hidden" onChange={(event)=>void upload(event.target.files?.[0])}/>
    </label>
    {error && <p className="mt-2 text-[11px] text-md-error">{error}</p>}
  </div>;
}
