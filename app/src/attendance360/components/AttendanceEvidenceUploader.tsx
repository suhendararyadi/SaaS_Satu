import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { api } from "wasp/client/api";
import { M3Badge, M3Icon } from "../../client/components/m3";

export type AttendanceEvidenceUploaderHandle = { openCamera: () => void };

type Props = {
  value: string;
  onChange: (key: string) => void;
  required?: boolean;
  label?: string;
  triggerOnly?: boolean;
  onUploaded?: (key: string) => void | Promise<void>;
  onBusyChange?: (busy: boolean) => void;
  onError?: (message: string) => void;
  uploadUrl?: string;
};

export const AttendanceEvidenceUploader = forwardRef<AttendanceEvidenceUploaderHandle, Props>(function AttendanceEvidenceUploader(
  { value, onChange, required = false, label = "Selfie langsung", triggerOnly = false, onUploaded, onBusyChange, onError, uploadUrl = "/operations/attendance-evidence-upload" },
  ref,
) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    openCamera: () => inputRef.current?.click(),
  }), []);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const setUploadBusy = (next: boolean) => {
    setBusy(next);
    onBusyChange?.(next);
  };
  const reportError = (message: string) => {
    setError(message);
    onError?.(message);
  };

  const upload = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return reportError("Gunakan JPG, PNG, atau WebP.");
    if (file.size > 5 * 1024 * 1024) return reportError("Ukuran selfie maksimal 5 MB.");
    setUploadBusy(true); setError("");
    try {
      const payload = await api.post(uploadUrl, {
        headers: { "Content-Type": file.type, "X-File-Name": file.name || `attendance-${Date.now()}.jpg` },
        body: file,
      }).json<{ key: string }>();
      if (!payload?.key) throw new Error("Upload selfie gagal.");
      onChange(payload.key);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
      await onUploaded?.(payload.key);
    } catch (e: any) {
      reportError(e?.message || "Selfie belum berhasil diunggah.");
    } finally {
      setUploadBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const input = <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="user" disabled={busy} className={triggerOnly ? "sr-only" : "hidden"} onChange={(event)=>void upload(event.target.files?.[0])}/>;

  if (triggerOnly) {
    return <div className="sr-only" aria-live="polite">{input}{busy ? "Mengunggah selfie presensi." : error || "Kamera selfie siap."}</div>;
  }

  return <div className="rounded-[12px] border border-md-outline-variant/55 p-3">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold">{label}{required ? " *" : ""}</p><p className="mt-0.5 text-[10.5px] text-md-on-surface-variant">Gunakan kamera depan. Foto disimpan privat dan hanya dapat dibuka pihak yang berwenang.</p></div>{value && <M3Badge variant="success" size="sm">Siap</M3Badge>}</div>
    {previewUrl && <img src={previewUrl} alt="Pratinjau selfie presensi" className="mt-3 max-h-52 rounded-[10px] object-cover" />}
    <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[9px] bg-md-primary px-3 text-xs font-semibold text-md-on-primary">
      <M3Icon name="photo_camera" size={18}/>{busy ? "Mengunggah…" : value ? "Ambil Ulang Selfie" : "Ambil Selfie"}
      {input}
    </label>
    {error && <p className="mt-2 text-[11px] text-md-error">{error}</p>}
  </div>;
});
