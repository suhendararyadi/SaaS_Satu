import React, { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import {
  useQuery,
  getAllSchools,
  switchActiveSchool,
  createSchoolByAdmin,
  getSchoolInfo,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  M3Card,
  M3Button,
  M3TextField,
  M3Select,
  M3Switch,
  M3Dialog,
  M3Badge,
  M3CircularProgress,
  M3Banner,
  M3Text,
  M3Icon,
} from "../../client/components/m3";


export function AllSchoolsPage({ user }: { user: AuthUser }) {
  const { data: schools, isLoading, refetch } = useQuery(getAllSchools);
  const { data: currentSchool, refetch: refetchCurrent } = useQuery(getSchoolInfo);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSwitching, setIsSwitching] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [npsn, setNpsn] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("Jawa Barat");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<string>("PRO");
  const [studentQuota, setStudentQuota] = useState("500");
  const [switchImmediately, setSwitchImmediately] = useState(true);

  // Search & Pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const filteredSchools = (schools || []).filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.npsn && s.npsn.toLowerCase().includes(q)) ||
      (s.city && s.city.toLowerCase().includes(q))
    );
  });

  const totalItems = filteredSchools.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedSchools = filteredSchools.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (!user.isAdmin) {
    return (
      <SchoolLayout user={user}>
        <M3Card variant="outlined" className="p-8 text-center space-y-4 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-md-error-container text-md-on-error-container flex items-center justify-center mx-auto shadow-xs">
            <M3Icon name="gpp_bad" size={28} />
          </div>
          <div>
            <h3 className="text-lg font-medium text-md-on-surface">Akses Terbatas</h3>
            <p className="text-xs text-md-on-surface-variant mt-1">
              Hanya Platform Super Administrator yang memiliki hak akses untuk mengelola seluruh organisasi unit sekolah.
            </p>
          </div>
        </M3Card>
      </SchoolLayout>
    );
  }

  const handleSwitchSchool = async (schoolId: string) => {
    setIsSwitching(schoolId);
    try {
      await switchActiveSchool({ schoolId });
      await refetchCurrent();
      await refetch();
      window.location.href = "/school";
    } catch (err: any) {
      alert(err.message || "Gagal beralih ke unit sekolah ini.");
    } finally {
      setIsSwitching(null);
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Nama sekolah wajib diisi.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      await createSchoolByAdmin({
        name: name.trim(),
        npsn: npsn.trim() || undefined,
        city: city.trim() || undefined,
        province: province.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        tier: tier as "FREE_TRIAL" | "STARTER" | "PRO" | "ENTERPRISE",
        studentQuota: Number(studentQuota) || 500,
        switchImmediately,
      });

      setIsModalOpen(false);
      setName("");
      setNpsn("");
      setCity("");
      setAddress("");
      setPhone("");
      setEmail("");

      await refetch();
      if (switchImmediately) {
        await refetchCurrent();
        window.location.href = "/school";
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membuat unit sekolah baru.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const tierOptions = [
    { value: "FREE_TRIAL", label: "Free Trial (100 Siswa)" },
    { value: "STARTER", label: "Starter (300 Siswa)" },
    { value: "PRO", label: "PRO (500 Siswa)" },
    { value: "ENTERPRISE", label: "Enterprise (1000+ Siswa)" },
  ];

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-md-on-surface-variant">
          <Link to="/school" className="hover:text-md-primary">
            Portal Sekolah
          </Link>
          <span>/</span>
          <span className="text-md-on-surface font-medium">
            Manajemen Organisasi (Tenant)
          </span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <M3Badge variant="tertiary" size="sm">
                <M3Icon name="admin_panel_settings" size={14} className="mr-1" />
                Super Admin
              </M3Badge>
            </div>
            <h2 className="text-2xl font-medium text-md-on-surface">
              Organisasi Sekolah
            </h2>
            <p className="text-xs sm:text-sm text-md-on-surface-variant">
              Kelola data sekolah terdaftar, kuota siswa, dan unit sekolah aktif.
            </p>
          </div>

          <M3Button
            variant="filled"
            size="md"
            icon="add"
            onClick={() => setIsModalOpen(true)}
          >
            Tambah Unit Sekolah
          </M3Button>
        </div>

        {/* Search & Filter Toolbar */}
        <M3Card variant="outlined" className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 max-w-md">
              <M3TextField
                placeholder="Cari nama sekolah, NPSN, atau kota..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                leadingIcon={<M3Icon name="search" size={18} />}
                size="sm"
              />
            </div>
            <M3Badge variant="secondary" size="md">
              {totalItems} Unit Terdaftar
            </M3Badge>
          </div>
        </M3Card>

        {/* Current Active School Notice */}
        {currentSchool && (
          <M3Card
            variant="tonal"
            className="p-5 border-l-4 border-l-md-primary bg-md-primary-container/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-[12px] bg-md-primary text-md-on-primary font-bold flex items-center justify-center text-lg shadow-xs">
                {currentSchool.name.charAt(0)}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-md-on-surface-variant">
                  Unit Sekolah Aktif Saat Ini
                </p>
                <h3 className="text-lg font-semibold text-md-on-surface">
                  {currentSchool.name}
                </h3>
              </div>
            </div>

            <M3Badge variant="primary" size="md">
              <M3Icon name="check_circle" size={14} className="mr-1" />
              Sedang Terhubung
            </M3Badge>
          </M3Card>
        )}

        {/* Schools Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <M3CircularProgress size={40} />
          </div>
        ) : filteredSchools.length === 0 ? (
          <M3Card variant="elevated" className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-md-secondary-container text-md-on-secondary-container flex items-center justify-center mx-auto shadow-xs">
              <M3Icon name="corporate_fare" size={28} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-md-on-surface">
                Tidak Ditemukan Sekolah
              </h3>
              <p className="text-xs text-md-on-surface-variant max-w-sm mx-auto mt-1">
                Tidak ada unit sekolah yang sesuai dengan kata kunci pencarian Anda.
              </p>
            </div>
            <M3Button
              variant="tonal"
              size="md"
              onClick={() => setSearchQuery("")}
            >
              Reset Pencarian
            </M3Button>
          </M3Card>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedSchools.map((s: any) => {
                const isCurrent = currentSchool?.id === s.id;

                return (
                  <M3Card
                    key={s.id}
                    variant={isCurrent ? "elevated" : "outlined"}
                    className={`p-5 flex flex-col justify-between gap-4 ${
                      isCurrent ? "ring-2 ring-md-primary" : ""
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <M3Badge
                            variant={
                              s.tier === "ENTERPRISE"
                                ? "tertiary"
                                : s.tier === "PRO"
                                ? "primary"
                                : "secondary"
                            }
                            size="sm"
                          >
                            Paket {s.tier}
                          </M3Badge>
                          <h3 className="text-lg font-semibold text-md-on-surface leading-tight">
                            {s.name}
                          </h3>
                          {s.npsn && (
                            <p className="text-xs font-mono text-md-on-surface-variant">
                              NPSN: {s.npsn}
                            </p>
                          )}
                        </div>

                        {isCurrent && (
                          <M3Badge variant="success" size="sm">
                            Aktif
                          </M3Badge>
                        )}
                      </div>

                      <div className="space-y-1 text-xs text-md-on-surface-variant">
                        {s.city && (
                          <div className="flex items-center gap-1.5">
                            <M3Icon name="location_on" size={14} className="opacity-70" />
                            <span>
                              {s.city}, {s.province || "Indonesia"}
                            </span>
                          </div>
                        )}
                        {s.phone && (
                          <div className="flex items-center gap-1.5">
                            <M3Icon name="call" size={14} className="opacity-70" />
                            <span>{s.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Stats pills */}
                      <div className="grid grid-cols-3 gap-2 py-3 border-y border-md-outline-variant/30 text-center">
                        <div>
                          <p className="font-bold text-sm text-md-on-surface">
                            {s._count?.users || 0}
                          </p>
                          <p className="text-[11px] text-md-on-surface-variant">
                            User
                          </p>
                        </div>
                        <div>
                          <p className="font-bold text-sm text-md-primary">
                            {s._count?.departments || 0}
                          </p>
                          <p className="text-[11px] text-md-on-surface-variant">
                            Jurusan
                          </p>
                        </div>
                        <div>
                          <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            {s._count?.companies || 0}
                          </p>
                          <p className="text-[11px] text-md-on-surface-variant">
                            DUDI
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      {isCurrent ? (
                        <M3Button
                          variant="tonal"
                          size="sm"
                          fullWidth
                          disabled
                        >
                          Sedang Aktif
                        </M3Button>
                      ) : (
                        <M3Button
                          variant="outlined"
                          size="sm"
                          fullWidth
                          icon="swap_horiz"
                          isLoading={isSwitching === s.id}
                          onClick={() => handleSwitchSchool(s.id)}
                        >
                          Kelola / Beralih ke Unit Ini
                        </M3Button>
                      )}
                    </div>
                  </M3Card>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 pt-2">
                <p className="text-xs text-md-on-surface-variant">
                  Menampilkan {(currentPage - 1) * pageSize + 1} -{" "}
                  {Math.min(currentPage * pageSize, totalItems)} dari {totalItems} unit sekolah
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

        {/* Modal Create School */}
        <M3Dialog
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Daftarkan Organisasi Sekolah Baru"
          subtitle="Unit sekolah baru akan otomatis dibuatkan tenant terisolasi."
          icon={<M3Icon name="corporate_fare" size={24} className="text-md-primary" />}
          maxWidth="lg"
          actions={
            <>
              <M3Button
                variant="text"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                Batal
              </M3Button>
              <M3Button
                variant="filled"
                size="sm"
                onClick={handleCreateSchool}
                isLoading={isSubmitting}
              >
                Simpan &amp; Daftarkan Sekolah
              </M3Button>
            </>
          }
        >
          <form onSubmit={handleCreateSchool} className="space-y-4">
            {errorMsg && (
              <M3Banner
                variant="error"
                supportingText={errorMsg}
                dismissible
                onDismiss={() => setErrorMsg("")}
              />
            )}

            <M3TextField
              label="Nama Sekolah (SMK / SMA / MA) *"
              placeholder="Contoh: SMK Negeri 1 Garut"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <M3TextField
                label="NPSN"
                placeholder="Contoh: 20209146"
                value={npsn}
                onChange={(e) => setNpsn(e.target.value)}
              />
              <M3TextField
                label="Kota / Kabupaten"
                placeholder="Contoh: Garut"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <M3Select
                label="Paket Langganan (Tier)"
                options={tierOptions}
                value={tier}
                onChange={(e) => setTier(e.target.value)}
              />
              <M3TextField
                label="Kuota Siswa"
                value={studentQuota}
                onChange={(e) => setStudentQuota(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-md-on-surface-variant">
                Alamat Lengkap
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Contoh: Jl. Cimanuk No. 309A, Garut"
                className="w-full rounded-[8px] border border-md-outline bg-transparent p-2.5 text-sm text-md-on-surface placeholder:text-md-outline focus:outline-none focus:border-md-primary focus:ring-1 focus:ring-md-primary"
              />
            </div>

            <div className="pt-2">
              <M3Switch
                label="Langsung beralih ke unit sekolah baru setelah dibuat"
                checked={switchImmediately}
                onChange={setSwitchImmediately}
              />
            </div>
          </form>
        </M3Dialog>
      </div>
    </SchoolLayout>
  );
}
