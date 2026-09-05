import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  Building2,
  Plus,
  Trash2,
  Edit3,
  MapPin,
  Phone,
  User,
  Users,
  X,
  Navigation,
  Sparkles,
} from "lucide-react";

export function CompaniesPage({ user }: { user: AuthUser }) {
  const { data: companies, isLoading, refetch } = useQuery(getCompanies);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    setErrorMsg("");
    setSubmitting(true);
    try {
      const payload = {
        name,
        industrySector: industrySector || undefined,
        address,
        picName: picName || undefined,
        picPhone: picPhone || undefined,
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

  return (
    <SchoolLayout user={user}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Mitra Dunia Usaha & Industri (DUDI)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Master lokasi tempat PKL siswa beserta batas radius geofence GPS presensi.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Mitra DUDI
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : companies?.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Belum Ada Mitra DUDI
          </h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Tambahkan perusahaan atau kantor tempat pelaksanaan praktik kerja lapangan siswa.
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg"
          >
            Tambah Mitra Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies?.map((c) => {
            const activeCount = c.placements?.length || 0;
            const quotaPercent = Math.min(100, Math.round((activeCount / c.maxQuota) * 100));

            return (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-indigo-400 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {c.industrySector && (
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mb-1.5">
                          {c.industrySector}
                        </span>
                      )}
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {c.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{c.address}</span>
                    </div>

                    {c.picName && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>
                          PIC: <strong className="text-slate-800 dark:text-white">{c.picName}</strong>
                        </span>
                      </div>
                    )}

                    {c.picPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{c.picPhone}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <Navigation className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>
                        Geofence: <strong>{c.radiusMeters}m</strong>{" "}
                        {c.latitude && c.longitude ? (
                          <span className="text-emerald-600 font-mono text-[10px]">
                            ({c.latitude.toFixed(4)}, {c.longitude.toFixed(4)})
                          </span>
                        ) : (
                          <span className="text-amber-500 text-[10px]">(Belum diatur)</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quota bar */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-500">Kapasitas Siswa PKL</span>
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {activeCount} / {c.maxQuota} ({quotaPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${quotaPercent >= 100 ? "bg-red-500" : "bg-indigo-600"}`}
                      style={{ width: `${quotaPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {editingId ? "Edit Mitra DUDI" : "Tambah Mitra DUDI Baru"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Nama Perusahaan / Instansi *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: PT Telkom Indonesia"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Sektor Industri
                </label>
                <input
                  type="text"
                  value={industrySector}
                  onChange={(e) => setIndustrySector(e.target.value)}
                  placeholder="Contoh: Teknologi Informasi / Otomotif / Perbankan"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Lengkap *
                </label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat kantor..."
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Nama PIC
                  </label>
                  <input
                    type="text"
                    value={picName}
                    onChange={(e) => setPicName(e.target.value)}
                    placeholder="Nama kontak PIC"
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    No. HP PIC
                  </label>
                  <input
                    type="text"
                    value={picPhone}
                    onChange={(e) => setPicPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                  />
                </div>
              </div>

              {/* Geofencing Configuration */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                    Geofence Presensi GPS
                  </span>
                  <button
                    type="button"
                    onClick={handleGetCoordinates}
                    disabled={locating}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    {locating ? "Mencari GPS..." : "📍 Ambil Lokasi Saya"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) =>
                        setLatitude(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="-6.9000"
                      className="w-full px-3 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) =>
                        setLongitude(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="107.6000"
                      className="w-full px-3 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                    <span>Radius Toleransi Presensi:</span>
                    <strong className="text-indigo-600">{radiusMeters} Meter</strong>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={1000}
                    step={10}
                    value={radiusMeters}
                    onChange={(e) => setRadiusMeters(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Maksimal Kuota Siswa PKL
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={maxQuota}
                  onChange={(e) => setMaxQuota(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SchoolLayout>
  );
}
