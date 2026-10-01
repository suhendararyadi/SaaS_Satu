import { useEffect, useState } from "react";
import { api } from "wasp/client/api";
import { M3Button, M3CircularProgress, M3Dialog } from "../../client/components/m3";

export type TeachingEvidenceTarget = {
  sessionId: string;
  kind: "CHECK_IN" | "CHECK_OUT";
  title: string;
  subtitle?: string;
};

function messageForStatus(status: number | undefined) {
  if (status === 404) return "Foto belum tersedia atau sudah tidak ada.";
  if (status === 401 || status === 403) return "Anda tidak berwenang membuka foto ini.";
  return "Foto tidak dapat dibuka. Coba lagi.";
}

/**
 * Menampilkan foto bukti check-in/out di dalam aplikasi. Foto diambil dengan token sesi
 * (bukan tautan mentah, yang ditolak 401) dan hanya hidup selama dialog terbuka.
 */
export function TeachingEvidenceDialog({ target, onClose }: { target: TeachingEvidenceTarget | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    let active = true;
    let objectUrl: string | null = null;
    setUrl(null);
    setError(null);
    setLoading(true);
    api
      .get(`/operations/lms-teaching-evidence/${target.sessionId}/${target.kind}`)
      .blob()
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((err: { response?: { status?: number } }) => {
        if (active) setError(messageForStatus(err?.response?.status));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [target?.sessionId, target?.kind]);

  return (
    <M3Dialog
      isOpen={!!target}
      onClose={onClose}
      title={target?.title ?? "Foto bukti"}
      subtitle={target?.subtitle}
      actions={<M3Button variant="text" onClick={onClose}>Tutup</M3Button>}
    >
      <div className="flex min-h-[200px] items-center justify-center">
        {loading ? (
          <M3CircularProgress size={36} />
        ) : url ? (
          <img src={url} alt={target?.title ?? "Foto bukti"} className="max-h-[70vh] w-full object-contain" />
        ) : (
          <p role="alert" className="p-6 text-center text-sm text-md-on-surface-variant">{error ?? "Foto tidak tersedia."}</p>
        )}
      </div>
    </M3Dialog>
  );
}
