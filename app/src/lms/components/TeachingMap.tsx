import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import type { MapPoint } from "../teachingLocation";

export type MapSchool = { latitude: number; longitude: number; radiusMeters: number } | null;

type Props = {
  school: MapSchool;
  points: MapPoint[];
  selectedId: string | null;
  onSelect: (pointId: string) => void;
  className?: string;
};

const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
// Indonesia secara umum, dipakai hanya bila belum ada titik sekolah maupun titik sesi.
const FALLBACK_CENTER: [number, number] = [-2.5, 118];

const BASE = "display:flex;align-items:center;justify-content:center;color:#fff;font:700 12px/1 system-ui,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.45);border:2px solid #fff;";

/** Penanda memakai huruf dan bentuk, bukan hanya warna: M (masuk) bulat, P (pulang) kotak, S (sekolah) belah ketupat. */
function iconHtml(kind: MapPoint["kind"] | "SCHOOL", selected: boolean) {
  const ring = selected ? "outline:3px solid #FF9F0A;outline-offset:2px;" : "";
  if (kind === "CHECK_IN") return `<div style="${BASE}width:28px;height:28px;border-radius:50%;background:#0071E3;${ring}">M</div>`;
  if (kind === "CHECK_OUT") return `<div style="${BASE}width:26px;height:26px;border-radius:6px;background:#1B7F3B;${ring}">P</div>`;
  return `<div style="${BASE}width:24px;height:24px;border-radius:4px;transform:rotate(45deg);background:#3A3A3C;"><span style="transform:rotate(-45deg)">S</span></div>`;
}

/**
 * Peta OpenStreetMap berisi titik sekolah (dengan lingkaran radius), serta titik check-in dan check-out guru
 * (dengan lingkaran akurasi GPS). Leaflet dimuat hanya di peramban. Marker digambar di sisi klien, jadi
 * koordinat guru tidak dikirim ke server ubin peta; hanya area tampilan yang diminta.
 */
export function TeachingMap({ school, points, selectedId, onSelect, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ L: typeof Leaflet; map: Leaflet.Map; layer: Leaflet.LayerGroup } | null>(null);
  const [ready, setReady] = useState(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;
      const map = L.map(containerRef.current, { zoomControl: true });
      L.tileLayer(OSM_TILES, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(map);
      map.setView(FALLBACK_CENTER, 5);
      mapRef.current = { L, map, layer: L.layerGroup().addTo(map) };
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // Menggambar ulang marker bila data atau pilihan berubah.
  useEffect(() => {
    const ctx = mapRef.current;
    if (!ready || !ctx) return;
    const { L, layer } = ctx;
    layer.clearLayers();
    if (school) {
      L.circle([school.latitude, school.longitude], { radius: school.radiusMeters, color: "#3A3A3C", weight: 1.5, dashArray: "6 6", fillOpacity: 0.04, interactive: false }).addTo(layer);
      L.marker([school.latitude, school.longitude], {
        icon: L.divIcon({ html: iconHtml("SCHOOL", false), className: "", iconSize: [24, 24], iconAnchor: [12, 12] }),
        title: "Titik sekolah", alt: "Titik sekolah", keyboard: false, interactive: false,
      }).addTo(layer);
    }
    for (const point of points) {
      const selected = point.id === selectedId;
      if (point.accuracyM && point.accuracyM > 0) {
        L.circle([point.latitude, point.longitude], {
          radius: point.accuracyM, weight: 1, interactive: false, fillOpacity: selected ? 0.18 : 0.08,
          color: point.kind === "CHECK_IN" ? "#0071E3" : "#1B7F3B",
        }).addTo(layer);
      }
      const size = point.kind === "CHECK_IN" ? 28 : 26;
      const marker = L.marker([point.latitude, point.longitude], {
        icon: L.divIcon({ html: iconHtml(point.kind, selected), className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
        title: point.label, alt: point.label, keyboard: true, zIndexOffset: selected ? 1000 : 0,
      }).on("click", () => onSelectRef.current(point.id)).addTo(layer);
      // Nama aksesibel bawaan hanya "M"/"P" (dari isi ikon); beri label lengkap untuk pembaca layar.
      marker.getElement?.()?.setAttribute("aria-label", point.label);
    }
  }, [ready, school, points, selectedId]);

  // Menyesuaikan tampilan hanya saat kumpulan titik berubah, bukan setiap kali pilihan berganti.
  const pointsKey = points.map((p) => p.id).join("|");
  useEffect(() => {
    const ctx = mapRef.current;
    if (!ready || !ctx) return;
    const { L, map } = ctx;
    const coords: Array<[number, number]> = points.map((p) => [p.latitude, p.longitude]);
    if (school) coords.push([school.latitude, school.longitude]);
    if (coords.length === 0) return;
    if (coords.length === 1) map.setView(coords[0], 17);
    else map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 18 });
  }, [ready, pointsKey, school?.latitude, school?.longitude]);

  // Memusatkan peta ke titik yang dipilih dari daftar.
  useEffect(() => {
    const ctx = mapRef.current;
    if (!ready || !ctx || !selectedId) return;
    const point = points.find((p) => p.id === selectedId);
    if (point) ctx.map.panTo([point.latitude, point.longitude]);
  }, [ready, selectedId]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Peta lokasi check-in dan check-out guru. Daftar sesi di samping peta memuat data yang sama dalam bentuk teks."
      className={className}
    />
  );
}
