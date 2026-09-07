import React, { useState, useEffect } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import { useQuery, getSchoolInfo, updateSchoolInfo } from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  M3Card,
  M3Button,
  M3TextField,
  M3Select,
  M3Badge,
  M3Banner,
  M3LinearProgress,
  M3CircularProgress,
  M3Icon,
} from "../../client/components/m3";

export function SchoolSettingsPage({ user }: { user: AuthUser }) {
  const { data: school, isLoading, refetch } = useQuery(getSchoolInfo);

  // Form State
  const [name, setName] = useState("");
  const [level, setLevel] = useState<"SD_MI" | "SMP_MTS" | "SMA_SMK">("SMA_SMK");
  const [npsn, setNpsn] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Sync state when school data loads
  useEffect(() => {
    if (school) {
      setName(school.name || "");
      setLevel(school.level || "SMA_SMK");
      setNpsn(school.npsn || "");
      setAddress(school.address || "");
      setCity(school.city || "");
      setProvince(school.province || "");
      setPhone(school.phone || "");
      setEmail(school.email || "");
      setLogoUrl(school.logoUrl || "");
    }
  }, [school]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Nama satuan pendidikan tidak boleh kosong.");
      return;
    }

    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      await updateSchoolInfo({
        name: name.trim(),
        level,
        npsn: npsn.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        province: province.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
      });

      setSuccessMsg("Pengaturan dan profil sekolah berhasil diperbarui!");
      await refetch();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memperbarui profil sekolah.");
    } finally {
      setSaving(false);
    }
  };

  const studentQuota = school?.studentQuota || 100;
  const studentCount = school?.studentCount || 0;
  const studentPercentage = Math.min(Math.round((studentCount / studentQuota) * 100), 100);
  const teacherCount = school?.teacherCount || 0;

  const levelLabels: Record<string, string> = {
    SD_MI: "SD / MI",
    SMP_MTS: "SMP / MTs",
    SMA_SMK: "SMA / SMK Sederajat",
  };

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6 pb-12 max-w-5xl mx-auto">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-md-on-surface-variant">
          <Link to="/school" className="hover:text-md-primary transition-colors">
            Portal Sekolah
          </Link>
          <span>/</span>
          <span className="text-md-on-surface font-medium">Pengaturan Sekolah</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-md-primary text-md-on-primary flex items-center justify-center shadow-xs">
                <M3Icon name="settings" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-md-on-surface">
                  Pengaturan Sekolah
                </h1>
                <p className="text-xs sm:text-sm text-md-on-surface-variant mt-0.5">
                  Identitas sekolah, logo kop surat, kontak, dan jenjang pendidikan.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <M3Badge variant="secondary" size="md">
              Jenjang: {levelLabels[school?.level || "SMA_SMK"]}
            </M3Badge>
            <M3Badge variant="tertiary" size="md">
              Tier: {school?.tier || "TRIAL"}
            </M3Badge>
          </div>
        </div>

        {/* Success & Error Banners */}
        {successMsg && (
          <M3Banner
            variant="info"
            headline="Perubahan Tersimpan"
            supportingText={successMsg}
            icon="check_circle"
            dismissible
            onDismiss={() => setSuccessMsg("")}
          />
        )}

        {errorMsg && (
          <M3Banner
            variant="error"
            headline="Gagal Menyimpan"
            supportingText={errorMsg}
            icon="error"
            dismissible
            onDismiss={() => setErrorMsg("")}
          />
        )}

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <M3CircularProgress size={40} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Card 1: Identitas Sekolah & Logo */}
            <M3Card variant="outlined" className="p-6 space-y-6">
              <div className="border-b border-md-outline-variant/30 pb-4">
                <h3 className="text-lg font-semibold text-md-on-surface flex items-center gap-2">
                  <M3Icon name="apartment" size={22} className="text-md-primary" />
                  Identitas Sekolah
                </h3>
                <p className="text-xs text-md-on-surface-variant mt-1">
                  Informasi sekolah untuk kop surat dan dokumen resmi.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <M3TextField
                    label="Nama Satuan Pendidikan *"
                    placeholder="Contoh: SMP Negeri 1 Bandung"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />

                  <M3Select
                    label="Jenjang Satuan Pendidikan *"
                    value={level}
                    onChange={(e) => setLevel(e.target.value as "SD_MI" | "SMP_MTS" | "SMA_SMK")}
                    options={[
                      { label: "SD / MI (Sekolah Dasar / Madrasah Ibtidaiyah)", value: "SD_MI" },
                      { label: "SMP / MTs (Sekolah Menengah Pertama / MTs)", value: "SMP_MTS" },
                      { label: "SMA / SMK Sederajat (Menengah Atas / Kejuruan / MA)", value: "SMA_SMK" },
                    ]}
                    required
                  />

                  <M3TextField
                    label="NPSN (Nomor Pokok Sekolah Nasional)"
                    placeholder="Contoh: 20209123"
                    value={npsn}
                    onChange={(e) => setNpsn(e.target.value)}
                  />

                  <div>
                    <span className="text-xs font-medium text-md-on-surface-variant block mb-1">
                      URL Slug Multi-Tenant
                    </span>
                    <div className="px-3.5 py-2.5 rounded-[12px] bg-md-surface-container-low text-xs text-md-on-surface border border-md-outline-variant/30 flex items-center justify-between">
                      <span className="font-mono text-md-primary font-semibold">
                        {school?.slug || "-"}
                      </span>
                      <span className="text-[11px] text-md-on-surface-variant italic">
                        Dibuat otomatis oleh sistem
                      </span>
                    </div>
                  </div>
                </div>

                {/* Logo Section & Preview */}
                <div className="space-y-4 flex flex-col justify-between">
                  <M3TextField
                    label="URL Logo Sekolah (Kop Surat)"
                    placeholder="Contoh: https://domain.sch.id/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    leadingIcon={<M3Icon name="image" size={18} />}
                  />

                  {/* Logo Preview Box */}
                  <div className="p-5 rounded-[16px] bg-md-surface-container-low border border-dashed border-md-outline-variant/60 flex flex-col items-center justify-center text-center gap-3">
                    {logoUrl ? (
                      <div className="w-24 h-24 rounded-[16px] bg-md-surface flex items-center justify-center p-2 shadow-xs border border-md-outline-variant/40 overflow-hidden">
                        <img
                          src={logoUrl}
                          alt="Preview Logo Sekolah"
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-[16px] bg-md-secondary-container text-md-on-secondary-container flex items-center justify-center">
                        <M3Icon name="apartment" size={40} className="opacity-70" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-md-on-surface">
                        {logoUrl ? "Pratinjau Logo Aktif" : "Belum Ada Logo Khusus"}
                      </p>
                      <p className="text-[11px] text-md-on-surface-variant mt-0.5">
                        Logo ini akan otomatis disematkan pada kop cetak laporan rapor dan buku presensi.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </M3Card>

            {/* Card 2: Kontak & Alamat Resmi */}
            <M3Card variant="outlined" className="p-6 space-y-6">
              <div className="border-b border-md-outline-variant/30 pb-4">
                <h3 className="text-lg font-semibold text-md-on-surface flex items-center gap-2">
                  <M3Icon name="location_on" size={22} className="text-md-secondary" />
                  Alamat &amp; Kontak Resmi Satuan Pendidikan
                </h3>
                <p className="text-xs text-md-on-surface-variant mt-1">
                  Kontak resmi sekolah untuk keperluan administrasi dan sinkronisasi laporan dinas.
                </p>
              </div>

              <div className="space-y-4">
                <M3TextField
                  label="Alamat Lengkap Satuan Pendidikan"
                  placeholder="Contoh: Jl. Merdeka No. 45, RT 02 / RW 05"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <M3TextField
                    label="Kota / Kabupaten"
                    placeholder="Contoh: Kota Bandung"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />

                  <M3TextField
                    label="Provinsi"
                    placeholder="Contoh: Jawa Barat"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <M3TextField
                    label="Nomor Telepon Resmi"
                    placeholder="Contoh: (022) 7201234 / 08123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    leadingIcon={<M3Icon name="call" size={18} />}
                  />

                  <M3TextField
                    label="Email Resmi Sekolah"
                    placeholder="Contoh: info@smpn1bandung.sch.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leadingIcon={<M3Icon name="mail" size={18} />}
                    type="email"
                  />
                </div>
              </div>
            </M3Card>

            {/* Card 3: Kuota & Paket SaaS */}
            <M3Card variant="outlined" className="p-6 space-y-6">
              <div className="border-b border-md-outline-variant/30 pb-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-md-on-surface flex items-center gap-2">
                    <M3Icon name="verified_user" size={22} className="text-emerald-600 dark:text-emerald-400" />
                    Status Layanan &amp; Kapasitas Kuota
                  </h3>
                  <p className="text-xs text-md-on-surface-variant mt-1">
                    Informasi kapasitas pengguna aktif dan paket langganan SaaS Smart School Anda.
                  </p>
                </div>
                <M3Badge variant="primary" size="md">
                  Status: {school?.subscriptionStatus === "active" ? "AKTIF" : "MASA PERCOBAAN"}
                </M3Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Kuota Siswa */}
                <div className="p-4 rounded-[16px] bg-md-surface-container-low border border-md-outline-variant/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-[10px] bg-md-primary-container text-md-on-primary-container flex items-center justify-center">
                        <M3Icon name="groups" size={18} />
                      </div>
                      <span className="text-xs font-semibold text-md-on-surface">
                        Kapasitas Kuota Siswa
                      </span>
                    </div>
                    <M3Badge variant={studentPercentage > 90 ? "error" : "secondary"} size="sm">
                      {studentPercentage}%
                    </M3Badge>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-md-on-surface-variant mb-1">
                      <span>Terdaftar: {studentCount} Siswa</span>
                      <span>Maksimum: {studentQuota} Siswa</span>
                    </div>
                    <M3LinearProgress value={studentPercentage} />
                  </div>
                </div>

                {/* Guru & Tendik Terdaftar */}
                <div className="p-4 rounded-[16px] bg-md-surface-container-low border border-md-outline-variant/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-[10px] bg-md-secondary-container text-md-on-secondary-container flex items-center justify-center">
                        <M3Icon name="school" size={18} />
                      </div>
                      <span className="text-xs font-semibold text-md-on-surface">
                        Guru &amp; Tenaga Pendidik
                      </span>
                    </div>
                    <M3Badge variant="tertiary" size="sm">
                      {teacherCount} Pendidik
                    </M3Badge>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-md-on-surface-variant mb-1">
                      <span>Total Guru Aktif: {teacherCount}</span>
                      <span>Kapasitas: Bebas Kuota</span>
                    </div>
                    <M3LinearProgress value={100} />
                  </div>
                </div>
              </div>
            </M3Card>

            {/* Bottom Actions Toolbar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <M3Button
                type="submit"
                variant="filled"
                size="md"
                isLoading={saving}
                icon="save"
              >
                Simpan Perubahan
              </M3Button>
            </div>
          </form>
        )}
      </div>
    </SchoolLayout>
  );
}
