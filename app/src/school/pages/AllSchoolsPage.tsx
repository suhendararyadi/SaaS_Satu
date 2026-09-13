import React, { useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getAllSchools,
  switchActiveSchool,
  createSchoolByAdmin,
  getSchoolInfo,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  M3Button,
  M3TextField,
  M3Select,
  M3Switch,
  M3Dialog,
  M3CircularProgress,
  M3Banner,
  M3Icon,
  M3EmptyState,
} from "../../client/components/m3";
import { getSchoolCapabilities } from "../schoolCapabilities";

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
  const [schoolLevel, setSchoolLevel] = useState<"SD_MI" | "SMP_MTS" | "SMA_SMK">("SMA_SMK");
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
        <section className="hig-grouped-surface px-4 sm:px-5">
          <M3EmptyState icon="lock" title="Akses terbatas" description="Hanya Platform Super Administrator yang dapat mengelola seluruh organisasi unit sekolah." />
        </section>
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
        level: schoolLevel,
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
      setSchoolLevel("SMA_SMK");

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

  const schoolLevelOptions = [
    { value: "SD_MI", label: "SD / MI" },
    { value: "SMP_MTS", label: "SMP / MTs" },
    { value: "SMA_SMK", label: "SMA / SMK / MA" },
  ];

  const tierOptions = [
    { value: "FREE_TRIAL", label: "Free Trial (100 Siswa)" },
    { value: "STARTER", label: "Starter (300 Siswa)" },
    { value: "PRO", label: "PRO (500 Siswa)" },
    { value: "ENTERPRISE", label: "Enterprise (1000+ Siswa)" },
  ];

  return (
    <SchoolLayout user={user}>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-md-on-surface">Organisasi Sekolah</h2>
            <p className="mt-0.5 text-[12.5px] leading-5 text-md-on-surface-variant">Kelola unit sekolah dan tentukan tenant yang sedang aktif.</p>
          </div>
          <M3Button variant="filled" size="sm" icon="add" onClick={() => setIsModalOpen(true)}>Tambah Unit Sekolah</M3Button>
        </div>

        <section className="hig-grouped-surface p-2.5 sm:p-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-md">
              <M3TextField
                placeholder="Cari nama sekolah, NPSN, atau kota"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                leadingIcon={<M3Icon name="search" size={17} />}
                size="sm"
              />
            </div>
            <span className="px-1 text-[11.5px] font-medium text-md-on-surface-variant">{totalItems} unit</span>
          </div>
        </section>

        {currentSchool && (
          <section className="hig-grouped-surface overflow-hidden" aria-labelledby="active-unit-title">
            <div className="border-b border-md-outline-variant px-4 py-2.5">
              <h3 id="active-unit-title" className="text-[10.5px] font-semibold uppercase tracking-[0.055em] text-md-on-surface-variant/70">Unit aktif</h3>
            </div>
            <div className="flex min-h-16 items-center gap-3 px-4 py-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-md-primary/9 text-[12px] font-semibold text-md-primary" aria-hidden="true">{currentSchool.name.charAt(0).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-md-on-surface">{currentSchool.name}</p>
                <p className="mt-0.5 truncate text-[11.5px] text-md-on-surface-variant">{[currentSchool.npsn ? `NPSN ${currentSchool.npsn}` : null, currentSchool.city || null].filter(Boolean).join(" · ") || "Unit sekolah aktif"}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 text-[11.5px] font-medium text-md-secondary"><M3Icon name="check_circle" size={15} /> Aktif</span>
            </div>
          </section>
        )}

        <section className="hig-grouped-surface overflow-hidden" aria-labelledby="all-units-title">
          <div className="flex items-center justify-between border-b border-md-outline-variant px-4 py-2.5">
            <h3 id="all-units-title" className="text-[10.5px] font-semibold uppercase tracking-[0.055em] text-md-on-surface-variant/70">Semua unit sekolah</h3>
            {totalPages > 1 && <span className="text-[10.5px] text-md-on-surface-variant">Hal {currentPage} dari {totalPages}</span>}
          </div>

          {isLoading ? (
            <div className="flex min-h-40 items-center justify-center"><M3CircularProgress size={28} /></div>
          ) : filteredSchools.length === 0 ? (
            <div className="px-4 sm:px-5">
              <M3EmptyState icon="search_off" title="Unit sekolah tidak ditemukan" description="Tidak ada unit sekolah yang sesuai dengan pencarian saat ini." actionLabel="Reset Pencarian" onAction={() => setSearchQuery("")} />
            </div>
          ) : (
            <div className="divide-y divide-md-outline-variant">
              {paginatedSchools.map((schoolItem: any) => {
                const isCurrent = currentSchool?.id === schoolItem.id;
                const capabilities = getSchoolCapabilities(schoolItem.level);
                const stats = [
                  `${schoolItem._count?.users || 0} pengguna`,
                  ...(capabilities.usesDepartments ? [`${schoolItem._count?.departments || 0} jurusan`] : []),
                  ...(capabilities.usesPkl ? [`${schoolItem._count?.companies || 0} DUDI`] : []),
                ].join(" · ");
                return (
                  <div key={schoolItem.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-[8px] text-[12px] font-semibold ${isCurrent ? "bg-md-primary/10 text-md-primary" : "bg-md-surface-container-high text-md-on-surface-variant"}`} aria-hidden="true">{schoolItem.name.charAt(0).toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate text-[13px] font-semibold text-md-on-surface">{schoolItem.name}</p>
                        <span className="text-[10.5px] font-medium text-md-on-surface-variant">{schoolItem.tier.replaceAll("_", " ")}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[11.5px] text-md-on-surface-variant">{[schoolItem.npsn ? `NPSN ${schoolItem.npsn}` : null, schoolItem.city || null, stats].filter(Boolean).join(" · ")}</p>
                    </div>
                    <div className="flex shrink-0 items-center justify-end pl-11 sm:pl-0">
                      {isCurrent ? (
                        <span className="flex items-center gap-1.5 px-2 text-[11.5px] font-medium text-md-secondary"><M3Icon name="check" size={15} /> Sedang aktif</span>
                      ) : (
                        <M3Button variant="text" size="sm" icon="swap_horiz" isLoading={isSwitching === schoolItem.id} onClick={() => handleSwitchSchool(schoolItem.id)}>Beralih</M3Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {totalPages > 1 && (
          <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11.5px] text-md-on-surface-variant">Menampilkan {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)} dari {totalItems} unit</p>
            <div className="flex items-center gap-1">
              <M3Button variant="text" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} icon="chevron_left">Sebelumnya</M3Button>
              <M3Button variant="text" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} trailingIcon="chevron_right">Selanjutnya</M3Button>
            </div>
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
              label="Nama Sekolah *"
              placeholder="Contoh: SMP Negeri 1 Rongga"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <M3Select
              label="Jenjang Sekolah *"
              options={schoolLevelOptions}
              value={schoolLevel}
              onChange={(e) => setSchoolLevel(e.target.value as typeof schoolLevel)}
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
