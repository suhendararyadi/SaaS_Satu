import React, { useState, useEffect } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import {
  useQuery,
  getAttendanceLogs,
  getPlacements,
  recordAttendance,
} from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  M3Card,
  M3Button,
  M3TextField,
  M3Badge,
  M3Table,
  M3TableHeader,
  M3TableBody,
  M3TableRow,
  M3TableHead,
  M3TableCell,
  M3CircularProgress,
  M3Banner,
  M3Text,
  M3Icon,
} from "../../client/components/m3";

import { calculateDistanceMeters } from "../geofence";

export function AttendancePage({ user }: { user: AuthUser }) {
  const { data: placements } = useQuery(getPlacements);
  const { data: logs, isLoading, refetch } = useQuery(getAttendanceLogs);

  // Active placement for current student (or first active placement if admin viewing)
  const isStudent = user.role === "STUDENT" && !user.isAdmin;
  const activePlacement = isStudent ? placements?.find((p) => p.status === "ACTIVE") : undefined;

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

  // Search & Pagination for Attendance Logs
  const [searchLog, setSearchLog] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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
        setGeoError(
          `Akses GPS gagal: ${err.message}. Pastikan izin lokasi aktif.`
        );
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (isStudent) fetchLocation();
  }, [isStudent]);

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

  const filteredLogs = logs?.filter((log) => {
    if (searchLog.trim()) {
      const q = searchLog.toLowerCase();
      const matchStudent =
        log.placement?.student?.name?.toLowerCase().includes(q);
      const matchType = log.type.toLowerCase().includes(q);
      const matchStatus = log.status.toLowerCase().includes(q);
      return matchStudent || matchType || matchStatus;
    }
    return true;
  });

  const totalItems = filteredLogs?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedLogs = (filteredLogs || []).slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-2xl font-medium text-md-on-surface">
            Presensi Lokasi Siswa PKL
          </h2>
          <p className="text-xs sm:text-sm text-md-on-surface-variant mt-0.5">
            Pencatatan kehadiran siswa sesuai radius lokasi mitra DUDI.
          </p>
        </div>

        {/* PWA Check-In Card */}
        {isStudent && activePlacement ? (
          <M3Card variant="elevated" className="p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-md-outline-variant/30">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-md-on-surface-variant">
                  Lokasi Penempatan PKL
                </p>
                <div className="flex items-center gap-2">
                  <M3Icon name="apartment" size={20} className="text-md-primary" />
                  <h3 className="text-xl font-medium text-md-on-surface">
                    {company?.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-md-on-surface-variant">
                  <M3Icon name="location_on" size={16} className="opacity-70 shrink-0" />
                  <span>{company?.address}</span>
                </div>
              </div>

              {/* GPS Radius Status Badge */}
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-[16px] border flex items-center gap-3 ${
                    isInsideRadius
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                      : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
                  }`}
                >
                  <M3Icon name="near_me" size={20} className="shrink-0" />
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

                <M3Button
                  variant="tonal"
                  size="sm"
                  icon="refresh"
                  disabled={loadingLocation}
                  onClick={fetchLocation}
                >
                  {loadingLocation ? "Mencari..." : "Segarkan GPS"}
                </M3Button>
              </div>
            </div>

            {geoError && (
              <M3Banner
                variant="error"
                title="Akses Lokasi GPS Gagal"
                supportingText={geoError}
                dismissible
                onDismiss={() => setGeoError("")}
              />
            )}

            {successMsg && (
              <M3Banner
                variant="success"
                title="Presensi Berhasil Dicatat"
                supportingText={successMsg}
                dismissible
                onDismiss={() => setSuccessMsg("")}
              />
            )}

            {/* Attendance Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <M3Button
                variant="filled"
                size="lg"
                icon="schedule"
                disabled={submitting}
                onClick={() => handleAttendance("CHECK_IN")}
              >
                {submitting ? "Memproses..." : "PRESENSI MASUK (Check-In)"}
              </M3Button>

              <M3Button
                variant="tonal"
                size="lg"
                icon="schedule"
                disabled={submitting}
                onClick={() => handleAttendance("CHECK_OUT")}
              >
                {submitting ? "Memproses..." : "PRESENSI PULANG (Check-Out)"}
              </M3Button>
            </div>
          </M3Card>
        ) : isStudent ? (
          <M3Banner
            variant="warning"
            headline="Belum Ada Penempatan PKL Aktif"
            supportingText="Untuk melakukan presensi GPS, akun Anda harus sudah di-plotting ke perusahaan mitra DUDI oleh koordinator PKL atau admin sekolah."
          />

        ) : null}

        {/* Attendance History Table */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-md-on-surface">
                Riwayat Log Presensi
              </h3>
              <p className="text-xs text-md-on-surface-variant">
                Catatan riwayat kehadiran terkini siswa di lokasi mitra.
              </p>
            </div>
          </div>

          {/* Search Filter Toolbar */}
          <M3Card variant="outlined" className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 max-w-md">
                <M3TextField
                  placeholder="Cari siswa, tipe presensi, atau status..."
                  value={searchLog}
                  onChange={(e) => {
                    setSearchLog(e.target.value);
                    setCurrentPage(1);
                  }}
                  leadingIcon="search"
                  size="sm"
                />
              </div>
              <M3Badge variant="secondary" size="md">
                {totalItems} Log
              </M3Badge>
            </div>
          </M3Card>

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <M3CircularProgress size={36} />
            </div>
          ) : filteredLogs?.length === 0 ? (
            <M3Card variant="elevated" className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-md-secondary-container text-md-on-secondary-container flex items-center justify-center mx-auto shadow-xs">
                <M3Icon name="schedule" size={28} />
              </div>
              <h4 className="font-medium text-md-on-surface">
                Belum Ada Presensi
              </h4>
              <p className="text-xs text-md-on-surface-variant">
                Belum ada data presensi yang tercatat untuk periode ini.
              </p>
            </M3Card>
          ) : (
            <div className="space-y-4">
              <M3Table>
                <M3TableHeader>
                  <M3TableRow>
                    <M3TableHead>Waktu (WIB)</M3TableHead>
                    <M3TableHead>Siswa</M3TableHead>
                    <M3TableHead>Tipe</M3TableHead>
                    <M3TableHead>Status Lokasi</M3TableHead>
                    <M3TableHead>Jarak</M3TableHead>
                  </M3TableRow>
                </M3TableHeader>
                <M3TableBody>
                  {paginatedLogs.map((log) => {
                    const dateStr = new Date(log.timestamp).toLocaleString(
                      "id-ID",
                      {
                        timeZone: "Asia/Jakarta",
                        dateStyle: "medium",
                        timeStyle: "short",
                      }
                    );

                    return (
                      <M3TableRow key={log.id}>
                        <M3TableCell>
                          <span className="font-mono text-xs text-md-on-surface">
                            {dateStr}
                          </span>
                        </M3TableCell>
                        <M3TableCell>
                          <span className="font-semibold text-md-on-surface">
                            {log.placement?.student?.name}
                          </span>
                        </M3TableCell>
                        <M3TableCell>
                          <M3Badge
                            variant={
                              log.type === "CHECK_IN" ? "primary" : "secondary"
                            }
                            size="sm"
                          >
                            {log.type === "CHECK_IN" ? "Masuk" : "Pulang"}
                          </M3Badge>
                        </M3TableCell>
                        <M3TableCell>
                          <M3Badge
                            variant={
                              log.status === "HADIR" ? "success" : "warning"
                            }
                            size="sm"
                          >
                            {log.status === "HADIR"
                              ? "Hadir Valid"
                              : log.status}
                          </M3Badge>
                        </M3TableCell>
                        <M3TableCell>
                          <span className="text-xs font-mono text-md-on-surface-variant">
                            {log.distanceMeters !== null
                              ? `${log.distanceMeters}m`
                              : "-"}
                          </span>
                        </M3TableCell>
                      </M3TableRow>
                    );
                  })}
                </M3TableBody>
              </M3Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 pt-2">
                  <p className="text-xs text-md-on-surface-variant">
                    Menampilkan {(currentPage - 1) * pageSize + 1} -{" "}
                    {Math.min(currentPage * pageSize, totalItems)} dari {totalItems} log
                  </p>
                  <div className="flex items-center gap-1.5">
                    <M3Button
                      variant="tonal"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      icon="chevron_left"
                    >
                      Sebelumnya
                    </M3Button>
                    <span className="text-xs px-2 text-md-on-surface font-medium">
                      Hal {currentPage} / {totalPages}
                    </span>
                    <M3Button
                      variant="tonal"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      trailingIcon="chevron_right"
                    >
                      Selanjutnya
                    </M3Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SchoolLayout>
  );
}
