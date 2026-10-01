import { M3Button } from "../../client/components/m3";
import { formatCoordinate, type SessionPoint } from "../teachingLocation";

export function clock(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
}

const GEOFENCE_LABEL: Record<string, string> = {
  INSIDE: "Dalam radius sekolah",
  OUTSIDE: "Di luar radius sekolah",
  UNCONFIGURED: "Geofence belum diatur",
};

/** Rincian satu titik check-in/out: koordinat, akurasi, jarak ke titik sekolah, status geofence, dan foto. */
export function PointDetails({ label, point, onOpenPhoto }: { label: string; point: SessionPoint | null; onOpenPhoto: () => void }) {
  return (
    <div className="rounded-[10px] bg-md-surface-container-low p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-md-on-surface-variant">{label}{point?.at ? ` · ${clock(point.at)}` : ""}</p>
      {point ? (
        <div className="mt-1 space-y-0.5 text-xs">
          <p className="font-mono">{formatCoordinate(point.latitude)}, {formatCoordinate(point.longitude)}</p>
          <p className="text-md-on-surface-variant">
            {point.accuracyM != null ? `±${Math.round(point.accuracyM)} m` : "akurasi tidak tercatat"}
            {point.distanceFromSchoolM != null
              ? ` · ${point.distanceFromSchoolM} m dari titik sekolah${point.distanceIsRecomputed ? " (dihitung sekarang)" : ""}`
              : ""}
          </p>
          <p className="text-md-on-surface-variant">{point.geofence ? GEOFENCE_LABEL[point.geofence] ?? point.geofence : "Status geofence tidak tercatat"}</p>
          {point.hasEvidence && (
            <M3Button variant="text" size="sm" icon="photo_camera" onClick={onOpenPhoto}>
              {point.kind === "CHECK_IN" ? "Foto masuk" : "Foto pulang"}
            </M3Button>
          )}
        </div>
      ) : (
        <p className="mt-1 text-xs text-md-on-surface-variant">Tidak ada titik lokasi tercatat.</p>
      )}
    </div>
  );
}
