import React, { useEffect, useMemo, useState } from "react";
import {
  createPklEvidenceUploadUrl,
  getPklEvidenceUploadStatus,
  useQuery,
} from "wasp/client/operations";
import { uploadFileWithProgress } from "../../file-upload/fileUploading";
import { M3Badge, M3Button, M3Icon } from "../../client/components/m3";

type Props = {
  value: string;
  onChange: (key: string) => void;
  capture?: "user" | "environment";
  label?: string;
};

export function PklEvidenceUploader({ value, onChange, capture = "environment", label = "Bukti foto" }: Props) {
  const status = useQuery(getPklEvidenceUploadStatus);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const enabled = status.data?.enabled === true;

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const shortKey = useMemo(() => value ? value.split("/").slice(-1)[0] : "", [value]);

  const upload = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg","image/png","image/webp"].includes(file.type)) {
      setError("Gunakan JPG, PNG, atau WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran foto maksimal 5 MB.");
      return;
    }
    setError("");
    setProgress(1);
    try {
      const signed = await createPklEvidenceUploadUrl({
        fileName: file.name || `pkl-${Date.now()}.jpg`,
        fileType: file.type as "image/jpeg" | "image/png" | "image/webp",
      });
      await uploadFileWithProgress({
        file: file as any,
        s3UploadUrl: signed.s3UploadUrl,
        s3UploadFields: signed.s3UploadFields,
        setUploadProgressPercent: setProgress,
      });
      onChange(signed.s3Key);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
      setProgress(100);
    } catch (err: any) {
      setError(err?.message || "Foto belum berhasil diunggah.");
      setProgress(0);
    }
  };

  return <div className="rounded-[12px] border border-md-outline-variant/60 p-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-md-on-surface">{label}</p>
        <p className="mt-0.5 text-[10.5px] text-md-on-surface-variant">
          {enabled ? "Foto tersimpan di storage dan hanya dapat dibuka oleh pihak yang berwenang." : "Upload file belum aktif pada deployment ini."}
        </p>
      </div>
      {value && <M3Badge variant="success" size="sm">Terunggah</M3Badge>}
    </div>
    {previewUrl && <img src={previewUrl} alt="Pratinjau bukti PKL" className="mt-3 max-h-48 rounded-[10px] object-cover" />}
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <label className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-[9px] px-3 text-xs font-semibold ${enabled ? "bg-md-primary text-md-on-primary" : "cursor-not-allowed bg-md-surface-container text-md-on-surface-variant"}`}>
        <M3Icon name="photo_camera" size={17} />
        {progress > 0 && progress < 100 ? `Upload ${progress}%` : "Ambil / Pilih Foto"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture={capture}
          disabled={!enabled}
          className="hidden"
          onChange={(event) => void upload(event.target.files?.[0])}
        />
      </label>
      {value && <M3Button variant="text" size="sm" onClick={() => { onChange(""); setPreviewUrl(""); }}>Hapus pilihan</M3Button>}
      {shortKey && <span className="max-w-[180px] truncate text-[10px] text-md-on-surface-variant">{shortKey}</span>}
    </div>
    {error && <p className="mt-2 text-[11px] text-md-error">{error}</p>}
  </div>;
}
