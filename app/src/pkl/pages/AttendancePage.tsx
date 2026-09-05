import { useState, useEffect } from "react";
import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getAttendanceLogs,
  getPlacements,
  recordAttendance,
} from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  Clock,
  MapPin,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  Sparkles,
  Calendar,
} from "lucide-react";
import { calculateDistanceMeters } from "../geofence";

export function AttendancePage({ user }: { user: AuthUser }) {
  const { data: placements } = useQuery(getPlacements);
  const { data: logs, isLoading, refetch } = useQuery(getAttendanceLogs);

  // Active placement for current student (or first active placement if admin viewing)
  const activePlacement = placements?.find((p) => p.status === "ACTIVE");

  // Geolocation state
  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [geoError, setGeoError] = useState("");
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Browser ini tidak mendukung deteksi lokasi GPS.");
      return;
    }
    setLoadingLocation(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
        setLoadingLocation(false);
      },
      (err) => {
        setGeoError(`Akses GPS gagal: ${err.message}. Pastikan izin lokasi aktif.`);
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  // Distance calculation if company has coords and user coords are ready
  let distanceMeters: number | null = null;
  let isInsideRadius = false;
  const company = activePlacement?.company;

  if (
    currentCoords &&
    company &&
    company.latitude !== null &&
    company.longitude !== null
  ) {
    distanceMeters = calculateDistanceMeters(
      currentCoords.latitude,
      currentCoords.longitude,
      company.latitude,
      company.longitude
    );
    isInsideRadius = distanceMeters <= company.radiusMeters;
  }

  const handleAttendance = async (type: "CHECK_IN" | "CHECK_OUT") => {
    if (!activePlacement) {
      alert("Anda belum memiliki penempatan PKL aktif.");
      return;
    }
    setSubmitting(true);
    setSuccessMsg("");
    try {
      await recordAttendance({
        placementId: activePlacement.id,
        type,
        latitude: currentCoords?.latitude || null,
        longitude: currentCoords?.longitude || null,
        notes: notes.trim() || null,
      });
      setSuccessMsg(
        `Presensi ${type === "CHECK_IN" ? "Masuk" : "Pulang"} berhasil dicatat!`
      );
      setNotes("");
      await refetch();
    } catch (err: any) {
      alert(err.message || "Gagal mencatat presensi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SchoolLayout user={user}>
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Presensi GPS Siswa PKL (PWA)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Pencatatan kehadiran berbasis radius geofencing lokasi kantor mitra DUDI.
        </p>
      </div>

      {/* PWA Check-In Card */}
      {activePlacement ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Lokasi Penempatan PKL
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {company?.name}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {company?.address}
              </p>
            </div>

            {/* GPS Radius Status Badge */}
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl border flex items-center gap-3 ${
                  isInsideRadius
                    ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                }`}
              >
                <Navigation className="w-5 h-5 shrink-0" />
                <div>
                  <p className="text-xs font-bold">
                    {distanceMeters !== null
                      ? `Jarak: ${distanceMeters} meter`
                      : "Mencari GPS..."}
                  </p>
                  <p className="text-[11px] opacity-80">
                    {isInsideRadius
                      ? `Di dalam radius (${company?.radiusMeters}m)`
                      : `Di luar radius (${company?.radiusMeters}m)`}
                  </p>
                </div>
              </div>

              <button
                onClick={fetchLocation}
                disabled={loadingLocation}
                className="px-3 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                {loadingLocation ? "Mencari..." : "Segarkan GPS"}
              </button>
            </div>
          </div>

          {geoError && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{geoError}</span>
            </div>
          )}

          {successMsg && (
            <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => handleAttendance("CHECK_IN")}
              disabled={submitting}
              className="flex-1 py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-base"
            >
              <Clock className="w-5 h-5" />
              {submitting ? "Memproses..." : "PRESENSI MASUK (Check-In)"}
            </button>

            <button
              onClick={() => handleAttendance("CHECK_OUT")}
              disabled={submitting}
              className="flex-1 py-4 px-6 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-base"
            >
              <Clock className="w-5 h-5" />
              {submitting ? "Memproses..." : "PRESENSI PULANG (Check-Out)"}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 text-amber-800 dark:text-amber-300 text-sm">
          <p className="font-bold">Belum Ada Penempatan Aktif</p>
          <p className="text-xs mt-1">
            Untuk melakukan presensi GPS, akun Anda harus sudah di-plotting ke perusahaan mitra DUDI oleh admin sekolah.
          </p>
        </div>
      )}

      {/* Attendance History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden mt-8">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            Riwayat Log Presensi
          </h3>
          <span className="text-xs text-slate-500">100 Log Terakhir</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : logs?.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Belum ada data presensi yang tercatat.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs uppercase font-semibold text-slate-500">
                <th className="px-6 py-3">Waktu (WIB)</th>
                <th className="px-6 py-3">Siswa</th>
                <th className="px-6 py-3">Tipe</th>
                <th className="px-6 py-3">Status Lokasi</th>
                <th className="px-6 py-3">Jarak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {logs?.map((log) => {
                const dateStr = new Date(log.timestamp).toLocaleString("id-ID", {
                  timeZone: "Asia/Jakarta",
                  dateStyle: "medium",
                  timeStyle: "short",
                });

                return (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-3 font-mono text-xs text-slate-900 dark:text-white">
                      {dateStr}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">
                      {log.placement?.student?.name}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          log.type === "CHECK_IN"
                            ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {log.type === "CHECK_IN" ? "Masuk" : "Pulang"}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                          log.status === "HADIR"
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs font-mono text-slate-500">
                      {log.distanceMeters !== null ? `${log.distanceMeters}m` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </SchoolLayout>
  );
}
