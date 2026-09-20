import React, { useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  createCompany,
  deleteCompany,
  getCompanies,
  getDepartments,
  setCompanyDepartments,
  updateCompany,
  useQuery,
} from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  M3Badge,
  M3Banner,
  M3Button,
  M3Card,
  M3CircularProgress,
  M3Dialog,
  M3Icon,
  M3LinearProgress,
  M3Select,
  M3TextField,
} from "../../client/components/m3";

type CompanyForm = {
  code: string;
  name: string;
  legalName: string;
  industrySector: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  picName: string;
  picPhone: string;
  latitude: string;
  longitude: string;
  radiusMeters: number;
  maxQuota: number;
  partnershipStatus: "ACTIVE" | "DRAFT" | "EXPIRED" | "INACTIVE";
  partnershipStartDate: string;
  partnershipEndDate: string;
  mouNumber: string;
  notes: string;
  isActive: boolean;
  departmentIds: string[];
};

const emptyForm = (): CompanyForm => ({
  code: "",
  name: "",
  legalName: "",
  industrySector: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  picName: "",
  picPhone: "",
  latitude: "",
  longitude: "",
  radiusMeters: 100,
  maxQuota: 5,
  partnershipStatus: "ACTIVE",
  partnershipStartDate: "",
  partnershipEndDate: "",
  mouNumber: "",
  notes: "",
  isActive: true,
  departmentIds: [],
});

const statusLabel: Record<string, string> = {
  ACTIVE: "Aktif",
  DRAFT: "Draft",
  EXPIRED: "Berakhir",
  INACTIVE: "Nonaktif",
};

export function CompaniesPage({ user }: { user: AuthUser }) {
  const companiesQuery = useQuery(getCompanies);
  const departmentsQuery = useQuery(getDepartments);
  const companies = companiesQuery.data || [];
  const departments = departmentsQuery.data || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyForm>(() => emptyForm());
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return companies.filter((company: any) => {
      if (statusFilter !== "ALL" && company.partnershipStatus !== statusFilter) return false;
      if (!q) return true;
      return [
        company.code,
        company.name,
        company.legalName,
        company.industrySector,
        company.address,
        company.picName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [companies, searchQuery, statusFilter]);

  const patch = <K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setErrorMsg("");
    setModalOpen(true);
  };

  const openEdit = (company: any) => {
    setEditingId(company.id);
    setForm({
      code: company.code || "",
      name: company.name || "",
      legalName: company.legalName || "",
      industrySector: company.industrySector || "",
      address: company.address || "",
      phone: company.phone || "",
      email: company.email || "",
      website: company.website || "",
      picName: company.picName || "",
      picPhone: company.picPhone || "",
      latitude: company.latitude == null ? "" : String(company.latitude),
      longitude: company.longitude == null ? "" : String(company.longitude),
      radiusMeters: company.radiusMeters || 100,
      maxQuota: company.maxQuota || 5,
      partnershipStatus: company.partnershipStatus || "ACTIVE",
      partnershipStartDate: company.partnershipStartDate?.slice?.(0, 10) || "",
      partnershipEndDate: company.partnershipEndDate?.slice?.(0, 10) || "",
      mouNumber: company.mouNumber || "",
      notes: company.notes || "",
      isActive: company.isActive !== false,
      departmentIds: (company.departmentLinks || []).map((link: any) => link.departmentId),
    });
    setErrorMsg("");
    setModalOpen(true);
  };

  const getCoordinates = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Browser tidak mendukung geolocation.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        patch("latitude", String(position.coords.latitude));
        patch("longitude", String(position.coords.longitude));
        setLocating(false);
      },
      (error) => {
        setErrorMsg("Lokasi tidak dapat diambil: " + error.message);
        setLocating(false);
      },
      { enableHighAccuracy: true },
    );
  };

  const toggleDepartment = (id: string) => {
    patch(
      "departmentIds",
      form.departmentIds.includes(id)
        ? form.departmentIds.filter((value) => value !== id)
        : [...form.departmentIds, id],
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.address.trim()) {
      setErrorMsg("Nama dan alamat DUDI wajib diisi.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      const payload = {
        code: form.code || null,
        name: form.name.trim(),
        legalName: form.legalName || null,
        industrySector: form.industrySector || null,
        address: form.address.trim(),
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        picName: form.picName || null,
        picPhone: form.picPhone || null,
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
        radiusMeters: Number(form.radiusMeters),
        maxQuota: Number(form.maxQuota),
        partnershipStatus: form.partnershipStatus,
        partnershipStartDate: form.partnershipStartDate || null,
        partnershipEndDate: form.partnershipEndDate || null,
        mouNumber: form.mouNumber || null,
        notes: form.notes || null,
        isActive: form.isActive,
      };
      const company: any = editingId
        ? await updateCompany({ id: editingId, ...payload })
        : await createCompany(payload);
      await setCompanyDepartments({
        companyId: editingId || company.id,
        departmentIds: form.departmentIds,
      });
      setModalOpen(false);
      await companiesQuery.refetch();
    } catch (error: any) {
      setErrorMsg(error?.message || "Data mitra DUDI belum dapat disimpan.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (company: any) => {
    if (!window.confirm(`Hapus mitra DUDI "${company.name}"?`)) return;
    try {
      await deleteCompany({ id: company.id });
      await companiesQuery.refetch();
    } catch (error: any) {
      window.alert(error?.message || "Mitra DUDI belum dapat dihapus.");
    }
  };

  return (
    <SchoolLayout user={user}>
      <div className="space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">
              PKL Foundation Gen2
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-.02em] text-md-on-surface">
              Mitra DUDI
            </h1>
            <p className="mt-1 text-sm text-md-on-surface-variant">
              Profil kemitraan, GPS, konsentrasi yang diterima, PIC, dan kapasitas default.
            </p>
          </div>
          <M3Button variant="filled" size="md" icon="add" onClick={openAdd}>
            Tambah Mitra
          </M3Button>
        </div>

        <M3Card variant="outlined" className="p-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto]">
            <M3TextField
              placeholder="Cari nama, kode, sektor, alamat, atau PIC..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              leadingIcon="search"
              size="sm"
            />
            <M3Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              options={[
                { value: "ALL", label: "Semua status kemitraan" },
                { value: "ACTIVE", label: "Aktif" },
                { value: "DRAFT", label: "Draft" },
                { value: "EXPIRED", label: "Berakhir" },
                { value: "INACTIVE", label: "Nonaktif" },
              ]}
              size="sm"
            />
            <M3Badge variant="secondary" size="md">{filtered.length} Mitra</M3Badge>
          </div>
        </M3Card>

        {companiesQuery.isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center"><M3CircularProgress size={40} /></div>
        ) : filtered.length === 0 ? (
          <M3Banner
            variant="standard"
            headline="Belum ada Mitra DUDI"
            supportingText="Tambahkan mitra industri terlebih dahulu. Data production SMKN 12 Garut tidak diisi dengan data sintetis."
            actionLabel="Tambah Mitra"
            onAction={openAdd}
            icon="apartment"
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {filtered.map((company: any) => {
              const activeCount = company.placements?.length || 0;
              const quotaPercent = Math.min(100, Math.round((activeCount / Math.max(company.maxQuota, 1)) * 100));
              return (
                <M3Card key={company.id} variant="outlined" className="overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {company.code && <M3Badge variant="outline" size="sm">{company.code}</M3Badge>}
                          <M3Badge variant={company.partnershipStatus === "ACTIVE" ? "success" : "secondary"} size="sm">
                            {statusLabel[company.partnershipStatus] || company.partnershipStatus}
                          </M3Badge>
                          {!company.isActive && <M3Badge variant="error" size="sm">Arsip</M3Badge>}
                        </div>
                        <h2 className="mt-2 text-[16px] font-semibold text-md-on-surface">{company.name}</h2>
                        <p className="text-[11.5px] text-md-on-surface-variant">
                          {company.industrySector || "Sektor belum diisi"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <M3Button variant="icon" size="icon-sm" icon="edit" aria-label={"Edit " + company.name} onClick={() => openEdit(company)} />
                        <M3Button variant="icon" size="icon-sm" icon="delete" aria-label={"Hapus " + company.name} onClick={() => remove(company)} />
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-[12px] text-md-on-surface-variant">
                      <p className="flex gap-2"><M3Icon name="location_on" size={15} /><span>{company.address}</span></p>
                      {company.picName && <p className="flex gap-2"><M3Icon name="person" size={15} /><span>PIC: {company.picName}{company.picPhone ? " · " + company.picPhone : ""}</span></p>}
                      <p className="flex gap-2"><M3Icon name="near_me" size={15} /><span>Radius presensi {company.radiusMeters} m · {company.latitude != null && company.longitude != null ? "GPS siap" : "GPS belum diisi"}</span></p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(company.departmentLinks || []).length ? (
                        company.departmentLinks.map((link: any) => (
                          <M3Badge key={link.id} variant="primary" size="sm">{link.department.code}</M3Badge>
                        ))
                      ) : (
                        <span className="text-[11px] italic text-md-on-surface-variant">Konsentrasi belum dipetakan</span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-md-outline-variant/30 px-4 py-3">
                    <div className="mb-1.5 flex justify-between text-[11px]">
                      <span className="text-md-on-surface-variant">Kuota default legacy</span>
                      <span className="font-semibold text-md-on-surface">{activeCount}/{company.maxQuota}</span>
                    </div>
                    <M3LinearProgress value={quotaPercent} />
                    <div className="mt-2 flex justify-between text-[10.5px] text-md-on-surface-variant">
                      <span>{company._count?.mentors || 0} pembimbing DUDI</span>
                      <span>{company._count?.pklCapacities || 0} konfigurasi kapasitas Gen2</span>
                    </div>
                  </div>
                </M3Card>
              );
            })}
          </div>
        )}

        <M3Dialog
          isOpen={modalOpen}
          onClose={() => !submitting && setModalOpen(false)}
          title={editingId ? "Edit Mitra DUDI" : "Tambah Mitra DUDI"}
          subtitle="Profil kemitraan dan kesiapan DUDI untuk PKL."
          maxWidth="xl"
          actions={
            <>
              <M3Button variant="text" size="sm" onClick={() => setModalOpen(false)} disabled={submitting}>Batal</M3Button>
              <M3Button variant="filled" size="sm" icon="save" onClick={submit as any} isLoading={submitting}>Simpan Mitra</M3Button>
            </>
          }
        >
          <form onSubmit={submit} className="space-y-5">
            {errorMsg && <M3Banner variant="error" supportingText={errorMsg} dismissible onDismiss={() => setErrorMsg("")} />}

            <div className="grid gap-3 sm:grid-cols-2">
              <M3TextField label="Kode DUDI" value={form.code} onChange={(e) => patch("code", e.target.value)} placeholder="Contoh: DUDI-001" />
              <M3TextField label="Nama Mitra *" value={form.name} onChange={(e) => patch("name", e.target.value)} required />
              <M3TextField label="Nama Legal" value={form.legalName} onChange={(e) => patch("legalName", e.target.value)} />
              <M3TextField label="Sektor Industri" value={form.industrySector} onChange={(e) => patch("industrySector", e.target.value)} />
              <M3TextField label="Telepon Kantor" value={form.phone} onChange={(e) => patch("phone", e.target.value)} />
              <M3TextField label="Email Mitra" type="email" value={form.email} onChange={(e) => patch("email", e.target.value)} />
              <M3TextField label="Website" value={form.website} onChange={(e) => patch("website", e.target.value)} placeholder="https://..." />
              <M3TextField label="Nomor MoU / PKS" value={form.mouNumber} onChange={(e) => patch("mouNumber", e.target.value)} />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-md-on-surface">Alamat Lengkap *</label>
              <textarea rows={2} value={form.address} onChange={(e) => patch("address", e.target.value)} className="w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3 py-2 text-sm text-md-on-surface outline-none focus:border-md-primary" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <M3TextField label="Nama PIC" value={form.picName} onChange={(e) => patch("picName", e.target.value)} />
              <M3TextField label="No. HP PIC" value={form.picPhone} onChange={(e) => patch("picPhone", e.target.value)} />
              <M3Select
                label="Status Kemitraan"
                value={form.partnershipStatus}
                onChange={(e) => patch("partnershipStatus", e.target.value as CompanyForm["partnershipStatus"])}
                options={[
                  { value: "ACTIVE", label: "Aktif" },
                  { value: "DRAFT", label: "Draft" },
                  { value: "EXPIRED", label: "Berakhir" },
                  { value: "INACTIVE", label: "Nonaktif" },
                ]}
              />
              <label className="flex items-center gap-2 rounded-[10px] border border-md-outline-variant px-3 py-2 text-sm text-md-on-surface">
                <input type="checkbox" checked={form.isActive} onChange={(e) => patch("isActive", e.target.checked)} />
                Mitra aktif di School OS
              </label>
              <M3TextField label="Mulai Kerja Sama" type="date" value={form.partnershipStartDate} onChange={(e) => patch("partnershipStartDate", e.target.value)} />
              <M3TextField label="Akhir Kerja Sama" type="date" value={form.partnershipEndDate} onChange={(e) => patch("partnershipEndDate", e.target.value)} />
            </div>

            <div className="rounded-[12px] border border-md-outline-variant/50 bg-md-surface-container p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-md-on-surface">Geofence Presensi</p>
                  <p className="text-[11px] text-md-on-surface-variant">Koordinat dan radius tetap kompatibel dengan presensi PKL lama.</p>
                </div>
                <M3Button type="button" variant="tonal" size="sm" icon="my_location" onClick={getCoordinates} disabled={locating}>
                  {locating ? "Mengambil..." : "Ambil Lokasi"}
                </M3Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <M3TextField label="Latitude" value={form.latitude} onChange={(e) => patch("latitude", e.target.value)} />
                <M3TextField label="Longitude" value={form.longitude} onChange={(e) => patch("longitude", e.target.value)} />
                <M3TextField label="Radius (meter)" type="number" value={String(form.radiusMeters)} onChange={(e) => patch("radiusMeters", Number(e.target.value) || 100)} />
                <M3TextField label="Kuota Default Legacy" type="number" value={String(form.maxQuota)} onChange={(e) => patch("maxQuota", Number(e.target.value) || 1)} supportingText="Dipertahankan untuk kompatibilitas Placement Gen1." />
              </div>
            </div>

            <div>
              <p className="text-[13px] font-semibold text-md-on-surface">Konsentrasi Keahlian yang Diterima</p>
              <p className="mb-2 text-[11px] text-md-on-surface-variant">Relasi ini independen dari kuota per periode.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {departments.map((department: any) => (
                  <label key={department.id} className="flex items-start gap-2 rounded-[10px] border border-md-outline-variant/60 px-3 py-2.5 text-sm">
                    <input type="checkbox" className="mt-0.5" checked={form.departmentIds.includes(department.id)} onChange={() => toggleDepartment(department.id)} />
                    <span><strong>{department.code}</strong> · {department.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-md-on-surface">Catatan Kemitraan</label>
              <textarea rows={3} value={form.notes} onChange={(e) => patch("notes", e.target.value)} className="w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3 py-2 text-sm text-md-on-surface outline-none focus:border-md-primary" />
            </div>
          </form>
        </M3Dialog>
      </div>
    </SchoolLayout>
  );
}
