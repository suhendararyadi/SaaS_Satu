import React, { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import {
  useQuery,
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  M3Card,
  M3Button,
  M3TextField,
  M3Dialog,
  M3Badge,
  M3LinearProgress,
  M3CircularProgress,
  M3Banner,
  M3Text,
  M3Icon,
} from "../../client/components/m3";


export function CompaniesPage({ user }: { user: AuthUser }) {
  const { data: companies, isLoading, refetch } = useQuery(getCompanies);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("spotlight") ?? "" : "");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const [name, setName] = useState("");
  const [industrySector, setIndustrySector] = useState("");
  const [address, setAddress] = useState("");
  const [picName, setPicName] = useState("");
  const [picPhone, setPicPhone] = useState("");
  const [latitude, setLatitude] = useState<number | "">("");
  const [longitude, setLongitude] = useState<number | "">("");
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [maxQuota, setMaxQuota] = useState(5);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  const openAddModal = () => {
    setEditingId(null);
    setName("");
    setIndustrySector("");
    setAddress("");
    setPicName("");
    setPicPhone("");
    setLatitude("");
    setLongitude("");
    setRadiusMeters(100);
    setMaxQuota(5);
    setErrorMsg("");
    setModalOpen(true);
  };

  const openEditModal = (c: any) => {
    setEditingId(c.id);
    setName(c.name);
    setIndustrySector(c.industrySector || "");
    setAddress(c.address);
    setPicName(c.picName || "");
    setPicPhone(c.picPhone || "");
    setLatitude(c.latitude !== null ? c.latitude : "");
    setLongitude(c.longitude !== null ? c.longitude : "");
    setRadiusMeters(c.radiusMeters || 100);
    setMaxQuota(c.maxQuota || 5);
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleGetCoordinates = () => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung geolokasi.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocating(false);
      },
      (err) => {
        alert(`Gagal mengambil koordinat: ${err.message}`);
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Nama perusahaan wajib diisi.");
      return;
    }
    if (!address.trim()) {
      setErrorMsg("Alamat perusahaan wajib diisi.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        industrySector: industrySector.trim() || undefined,
        address: address.trim(),
        picName: picName.trim() || undefined,
        picPhone: picPhone.trim() || undefined,
        latitude: latitude === "" ? null : Number(latitude),
        longitude: longitude === "" ? null : Number(longitude),
        radiusMeters: Number(radiusMeters),
        maxQuota: Number(maxQuota),
      };

      if (editingId) {
        await updateCompany({ id: editingId, ...payload });
      } else {
        await createCompany(payload);
      }
      setModalOpen(false);
      await refetch();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan perusahaan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, cName: string) => {
    if (!window.confirm(`Hapus data mitra DUDI "${cName}"?`)) return;
    try {
      await deleteCompany({ id });
      await refetch();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus perusahaan.");
    }
  };

  const filteredCompanies = companies?.filter((c) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchSector = c.industrySector?.toLowerCase().includes(q);
      const matchAddress = c.address.toLowerCase().includes(q);
      const matchPic = c.picName?.toLowerCase().includes(q);
      return matchName || matchSector || matchAddress || matchPic;
    }
    return true;
  });

  const totalItems = filteredCompanies?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedCompanies = (filteredCompanies || []).slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">
        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-medium text-md-on-surface">
              Mitra Perusahaan (DUDI)
            </h2>
            <p className="text-xs sm:text-sm text-md-on-surface-variant mt-0.5">
              Data perusahaan mitra dan lokasi penempatan PKL siswa.
            </p>
          </div>
          <M3Button
            variant="filled"
            size="md"
            icon="add"
            onClick={openAddModal}
          >
            Tambah Mitra DUDI
          </M3Button>
        </div>

        {/* Search Toolbar */}
        <M3Card variant="outlined" className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 max-w-md">
              <M3TextField
                placeholder="Cari nama mitra, sektor industri, atau alamat..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                leadingIcon="search"
                size="sm"
              />
            </div>
            <M3Badge variant="secondary" size="md">
              {totalItems} Mitra
            </M3Badge>
          </div>
        </M3Card>

        {/* Content Section */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <M3CircularProgress size={40} />
          </div>
        ) : filteredCompanies?.length === 0 ? (
          <M3Banner
            variant="standard"
            headline="Belum Ada Mitra DUDI"
            supportingText="Tambahkan perusahaan atau kantor tempat pelaksanaan praktik kerja lapangan siswa."
            actionLabel="Tambah Mitra Pertama"
            onAction={openAddModal}
            icon="location_on"
            className="p-6"
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedCompanies.map((c) => {
                const activeCount = c.placements?.length || 0;
                const quotaPercent = Math.min(
                  100,
                  Math.round((activeCount / c.maxQuota) * 100)
                );
                const hasCoordinates =
                  c.latitude !== null && c.longitude !== null;

                return (
                  <M3Card
                    key={c.id}
                    variant="outlined"
                    className="p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          {c.industrySector && (
                            <M3Badge variant="primary" size="sm">
                              {c.industrySector}
                            </M3Badge>
                          )}
                          <h3 className="text-lg font-semibold text-md-on-surface">
                            {c.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1">
                          <M3Button
                            variant="icon"
                            size="icon-sm"
                            onClick={() => openEditModal(c)}
                            title="Edit"
                          >
                            <M3Icon name="edit" size={18} className="text-md-on-surface-variant hover:text-md-primary" />
                          </M3Button>
                          <M3Button
                            variant="icon"
                            size="icon-sm"
                            onClick={() => handleDelete(c.id, c.name)}
                            title="Hapus"
                          >
                            <M3Icon name="delete" size={18} className="text-md-on-surface-variant hover:text-md-error" />
                          </M3Button>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-md-on-surface-variant">
                        <div className="flex items-start gap-1.5">
                          <M3Icon name="location_on" size={16} className="opacity-70 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{c.address}</span>
                        </div>

                        {c.picName && (
                          <div className="flex items-center gap-1.5">
                            <M3Icon name="person" size={16} className="opacity-70 shrink-0" />
                            <span>
                              PIC: <strong className="text-md-on-surface">{c.picName}</strong>
                            </span>
                          </div>
                        )}

                        {c.picPhone && (
                          <div className="flex items-center gap-1.5">
                            <M3Icon name="call" size={16} className="opacity-70 shrink-0" />
                            <span>{c.picPhone}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <M3Icon name="near_me" size={16} className="text-md-primary shrink-0" />
                          <span>
                            Radius: <strong>{c.radiusMeters}m</strong>
                          </span>
                          {hasCoordinates ? (
                            <M3Badge variant="success" size="sm">GPS Aktif</M3Badge>
                          ) : (
                            <M3Badge variant="outline" size="sm">Belum Ada GPS</M3Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quota Progress */}
                    <div className="pt-3 border-t border-md-outline-variant/30 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-md-on-surface-variant">Kapasitas Siswa PKL</span>
                        <span className="font-semibold text-md-primary">
                          {activeCount} / {c.maxQuota} ({quotaPercent}%)
                        </span>
                      </div>
                      <M3LinearProgress value={quotaPercent} />
                    </div>
                  </M3Card>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 pt-2">
                <p className="text-xs text-md-on-surface-variant">
                  Menampilkan {(currentPage - 1) * pageSize + 1} -{" "}
                  {Math.min(currentPage * pageSize, totalItems)} dari {totalItems} mitra
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
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    trailingIcon="chevron_right"
                  >
                    Selanjutnya
                  </M3Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dialog Add / Edit */}
        <M3Dialog
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingId ? "Edit Mitra DUDI" : "Tambah Mitra DUDI Baru"}
          subtitle="Atur informasi perusahaan, PIC kontak, dan radius presensi GPS."
          icon={<M3Icon name="apartment" size={24} className="text-md-primary" />}
          maxWidth="lg"
          actions={
            <>
              <M3Button
                variant="text"
                size="sm"
                onClick={() => setModalOpen(false)}
              >
                Batal
              </M3Button>
              <M3Button
                variant="filled"
                size="sm"
                onClick={handleSubmit}
                isLoading={submitting}
              >
                Simpan Mitra DUDI
              </M3Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <M3Banner
                variant="error"
                supportingText={errorMsg}
                dismissible
                onDismiss={() => setErrorMsg("")}
              />
            )}

            <M3TextField
              label="Nama Perusahaan / Instansi *"
              placeholder="Contoh: PT Telkom Indonesia"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <M3TextField
              label="Sektor Industri"
              placeholder="Contoh: Teknologi Informasi / Otomotif"
              value={industrySector}
              onChange={(e) => setIndustrySector(e.target.value)}
            />

            <div className="space-y-1">
              <label className="text-xs font-medium text-md-on-surface-variant">
                Alamat Lengkap *
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Alamat kantor..."
                required
                className="w-full rounded-[8px] border border-md-outline bg-transparent p-2.5 text-sm text-md-on-surface placeholder:text-md-outline focus:outline-none focus:border-md-primary focus:ring-1 focus:ring-md-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <M3TextField
                label="Nama PIC"
                placeholder="Nama kontak PIC"
                value={picName}
                onChange={(e) => setPicName(e.target.value)}
              />
              <M3TextField
                label="No. HP PIC"
                placeholder="08123456789"
                value={picPhone}
                onChange={(e) => setPicPhone(e.target.value)}
              />
            </div>

            {/* Geofence GPS Config Box */}
            <div className="p-4 rounded-[16px] bg-md-surface-container border border-md-outline-variant/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <M3Icon name="near_me" size={16} className="text-md-primary" />
                  <span className="text-xs font-bold text-md-on-surface">
                    Geofence Presensi GPS
                  </span>
                </div>
                <M3Button
                  variant="tonal"
                  size="sm"
                  icon="my_location"
                  disabled={locating}
                  onClick={handleGetCoordinates}
                >
                  {locating ? "Mencari GPS..." : "Ambil Lokasi Saya"}
                </M3Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <M3TextField
                  label="Latitude"
                  placeholder="-6.9000"
                  value={latitude === "" ? "" : String(latitude)}
                  onChange={(e) =>
                    setLatitude(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  size="sm"
                />
                <M3TextField
                  label="Longitude"
                  placeholder="107.6000"
                  value={longitude === "" ? "" : String(longitude)}
                  onChange={(e) =>
                    setLongitude(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  size="sm"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-md-on-surface-variant">
                  <span>Radius Toleransi Presensi:</span>
                  <span className="font-semibold text-md-on-surface">
                    {radiusMeters} Meter
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="1000"
                  step="10"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full accent-md-primary"
                />
              </div>
            </div>

            <M3TextField
              label="Maksimal Kuota Siswa PKL *"
              placeholder="5"
              value={String(maxQuota)}
              onChange={(e) => setMaxQuota(Number(e.target.value) || 1)}
              required
            />
          </form>
        </M3Dialog>
      </div>
    </SchoolLayout>
  );
}
