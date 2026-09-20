import React, { useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  createDudiMentor,
  createPklPeriod,
  deleteDudiMentor,
  deletePklCompanyCapacity,
  deletePklPeriod,
  getAcademicYears,
  getCompanies,
  getDepartments,
  getDudiMentors,
  getPklCompanyCapacities,
  getPklPeriods,
  savePklCompanyCapacity,
  updateDudiMentor,
  updatePklPeriod,
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
  M3Select,
  M3TextField,
} from "../../client/components/m3";

function isoDate(value: any) {
  return value ? String(value).slice(0, 10) : "";
}

export function PklFoundationPage({ user }: { user: AuthUser }) {
  const periodsQ = useQuery(getPklPeriods);
  const companiesQ = useQuery(getCompanies);
  const departmentsQ = useQuery(getDepartments);
  const yearsQ = useQuery(getAcademicYears);
  const mentorsQ = useQuery(getDudiMentors);
  const capacitiesQ = useQuery(getPklCompanyCapacities, {});

  const periods = periodsQ.data || [];
  const companies = companiesQ.data || [];
  const departments = departmentsQ.data || [];
  const years = yearsQ.data || [];
  const mentors = mentorsQ.data || [];
  const capacities = capacitiesQ.data || [];

  const [periodOpen, setPeriodOpen] = useState(false);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [periodName, setPeriodName] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [periodActive, setPeriodActive] = useState(true);
  const [periodNotes, setPeriodNotes] = useState("");

  const [mentorOpen, setMentorOpen] = useState(false);
  const [mentorId, setMentorId] = useState<string | null>(null);
  const [mentorName, setMentorName] = useState("");
  const [mentorCompanyId, setMentorCompanyId] = useState("");
  const [mentorPosition, setMentorPosition] = useState("");
  const [mentorPhone, setMentorPhone] = useState("");
  const [mentorEmail, setMentorEmail] = useState("");
  const [mentorNotes, setMentorNotes] = useState("");
  const [mentorActive, setMentorActive] = useState(true);

  const [capacityOpen, setCapacityOpen] = useState(false);
  const [capacityPeriodId, setCapacityPeriodId] = useState("");
  const [capacityCompanyId, setCapacityCompanyId] = useState("");
  const [capacityDepartmentId, setCapacityDepartmentId] = useState("");
  const [capacityQuota, setCapacityQuota] = useState(1);
  const [capacityNotes, setCapacityNotes] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const totalCapacity = useMemo(
    () => capacities.reduce((sum: number, row: any) => sum + row.quota, 0),
    [capacities],
  );

  const refresh = async () => {
    await Promise.all([
      periodsQ.refetch(),
      companiesQ.refetch(),
      mentorsQ.refetch(),
      capacitiesQ.refetch(),
    ]);
  };

  const openAddPeriod = () => {
    const activeYear = years.find((year: any) => year.isActive);
    setPeriodId(null);
    setPeriodName("");
    setAcademicYearId(activeYear?.id || years[0]?.id || "");
    setPeriodStart("");
    setPeriodEnd("");
    setPeriodActive(true);
    setPeriodNotes("");
    setErrorMsg("");
    setPeriodOpen(true);
  };

  const openEditPeriod = (row: any) => {
    setPeriodId(row.id);
    setPeriodName(row.name);
    setAcademicYearId(row.academicYearId || "");
    setPeriodStart(isoDate(row.startDate));
    setPeriodEnd(isoDate(row.endDate));
    setPeriodActive(row.isActive);
    setPeriodNotes(row.notes || "");
    setErrorMsg("");
    setPeriodOpen(true);
  };

  const savePeriod = async () => {
    setSubmitting(true);
    setErrorMsg("");
    try {
      const payload = {
        name: periodName,
        academicYearId: academicYearId || null,
        startDate: periodStart,
        endDate: periodEnd,
        isActive: periodActive,
        notes: periodNotes || null,
      };
      if (periodId) await updatePklPeriod({ id: periodId, ...payload });
      else await createPklPeriod(payload);
      setPeriodOpen(false);
      await refresh();
    } catch (error: any) {
      setErrorMsg(error?.message || "Periode PKL belum dapat disimpan.");
    } finally {
      setSubmitting(false);
    }
  };

  const removePeriod = async (row: any) => {
    if (!window.confirm(`Hapus periode "${row.name}"?`)) return;
    try {
      await deletePklPeriod({ id: row.id });
      await refresh();
    } catch (error: any) {
      window.alert(error?.message || "Periode belum dapat dihapus.");
    }
  };

  const openAddMentor = () => {
    setMentorId(null);
    setMentorName("");
    setMentorCompanyId(companies[0]?.id || "");
    setMentorPosition("");
    setMentorPhone("");
    setMentorEmail("");
    setMentorNotes("");
    setMentorActive(true);
    setErrorMsg("");
    setMentorOpen(true);
  };

  const openEditMentor = (row: any) => {
    setMentorId(row.id);
    setMentorName(row.user?.name || "");
    setMentorCompanyId(row.companyId || "");
    setMentorPosition(row.position || "");
    setMentorPhone(row.phone || "");
    setMentorEmail(row.email || "");
    setMentorNotes(row.notes || "");
    setMentorActive(row.isActive);
    setErrorMsg("");
    setMentorOpen(true);
  };

  const saveMentor = async () => {
    setSubmitting(true);
    setErrorMsg("");
    try {
      const payload = {
        name: mentorName,
        companyId: mentorCompanyId,
        position: mentorPosition || null,
        phone: mentorPhone || null,
        email: mentorEmail || null,
        notes: mentorNotes || null,
        isActive: mentorActive,
      };
      if (mentorId) await updateDudiMentor({ id: mentorId, ...payload });
      else await createDudiMentor(payload);
      setMentorOpen(false);
      await refresh();
    } catch (error: any) {
      setErrorMsg(error?.message || "Pembimbing DUDI belum dapat disimpan.");
    } finally {
      setSubmitting(false);
    }
  };

  const removeMentor = async (row: any) => {
    if (!window.confirm(`Nonaktifkan pembimbing "${row.user?.name}"?`)) return;
    try {
      await deleteDudiMentor({ id: row.id });
      await refresh();
    } catch (error: any) {
      window.alert(error?.message || "Pembimbing DUDI belum dapat dinonaktifkan.");
    }
  };

  const openCapacity = () => {
    setCapacityPeriodId(periods.find((row: any) => row.isActive)?.id || periods[0]?.id || "");
    setCapacityCompanyId(companies.find((row: any) => row.isActive)?.id || companies[0]?.id || "");
    setCapacityDepartmentId(departments[0]?.id || "");
    setCapacityQuota(1);
    setCapacityNotes("");
    setErrorMsg("");
    setCapacityOpen(true);
  };

  const saveCapacity = async () => {
    setSubmitting(true);
    setErrorMsg("");
    try {
      await savePklCompanyCapacity({
        periodId: capacityPeriodId,
        companyId: capacityCompanyId,
        departmentId: capacityDepartmentId,
        quota: capacityQuota,
        notes: capacityNotes || null,
      });
      setCapacityOpen(false);
      await refresh();
    } catch (error: any) {
      setErrorMsg(error?.message || "Kapasitas PKL belum dapat disimpan.");
    } finally {
      setSubmitting(false);
    }
  };

  const removeCapacity = async (row: any) => {
    if (!window.confirm("Hapus konfigurasi kapasitas ini?")) return;
    await deletePklCompanyCapacity({ id: row.id });
    await refresh();
  };

  const loading =
    periodsQ.isLoading ||
    companiesQ.isLoading ||
    mentorsQ.isLoading ||
    capacitiesQ.isLoading;

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">
            PKL Foundation Gen2
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-.02em] text-md-on-surface">
            Fondasi & Perencanaan PKL
          </h1>
          <p className="mt-1 text-sm text-md-on-surface-variant">
            Periode PKL, Pembimbing DUDI, konsentrasi keahlian, dan kuota per periode.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <M3Card variant="filled" className="p-4">
            <p className="text-[11px] uppercase tracking-[.06em] text-md-on-surface-variant">Periode</p>
            <p className="mt-1 text-2xl font-semibold">{periods.length}</p>
          </M3Card>
          <M3Card variant="filled" className="p-4">
            <p className="text-[11px] uppercase tracking-[.06em] text-md-on-surface-variant">Mitra DUDI</p>
            <p className="mt-1 text-2xl font-semibold">{companies.length}</p>
          </M3Card>
          <M3Card variant="filled" className="p-4">
            <p className="text-[11px] uppercase tracking-[.06em] text-md-on-surface-variant">Pembimbing DUDI</p>
            <p className="mt-1 text-2xl font-semibold">{mentors.length}</p>
          </M3Card>
          <M3Card variant="filled" className="p-4">
            <p className="text-[11px] uppercase tracking-[.06em] text-md-on-surface-variant">Total Kuota Gen2</p>
            <p className="mt-1 text-2xl font-semibold">{totalCapacity}</p>
          </M3Card>
        </div>

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center"><M3CircularProgress size={40} /></div>
        ) : (
          <>
            <M3Card variant="outlined" className="overflow-hidden">
              <div className="flex items-start justify-between gap-3 border-b border-md-outline-variant/35 p-4">
                <div>
                  <h2 className="text-[15px] font-semibold">Periode / Program PKL</h2>
                  <p className="mt-0.5 text-[11.5px] text-md-on-surface-variant">Master pelaksanaan PKL terhubung Tahun Ajaran.</p>
                </div>
                <M3Button variant="filled" size="sm" icon="add" onClick={openAddPeriod}>Tambah Periode</M3Button>
              </div>
              {periods.length === 0 ? (
                <div className="p-5 text-sm text-md-on-surface-variant">Belum ada periode PKL.</div>
              ) : (
                <div className="divide-y divide-md-outline-variant/25">
                  {periods.map((row: any) => (
                    <div key={row.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-1.5">
                          <strong>{row.name}</strong>
                          <M3Badge variant={row.isActive ? "success" : "secondary"} size="sm">{row.isActive ? "Aktif" : "Nonaktif"}</M3Badge>
                        </div>
                        <p className="mt-1 text-[11.5px] text-md-on-surface-variant">
                          {isoDate(row.startDate)} s.d. {isoDate(row.endDate)} · {row.academicYear ? row.academicYear.yearName + " " + row.academicYear.semester : "Tanpa tahun ajaran"} · {row._count?.capacities || 0} kapasitas
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <M3Button variant="tonal" size="sm" icon="edit" onClick={() => openEditPeriod(row)}>Edit</M3Button>
                        <M3Button variant="icon" size="icon-sm" icon="delete" onClick={() => removePeriod(row)} aria-label={"Hapus " + row.name} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </M3Card>

            <M3Card variant="outlined" className="overflow-hidden">
              <div className="flex items-start justify-between gap-3 border-b border-md-outline-variant/35 p-4">
                <div>
                  <h2 className="text-[15px] font-semibold">Pembimbing DUDI</h2>
                  <p className="mt-0.5 text-[11.5px] text-md-on-surface-variant">Master pembimbing industri tanpa membuat kredensial login otomatis.</p>
                </div>
                <M3Button variant="filled" size="sm" icon="person_add" onClick={openAddMentor} disabled={!companies.length}>Tambah Pembimbing</M3Button>
              </div>
              {mentors.length === 0 ? (
                <div className="p-5 text-sm text-md-on-surface-variant">Belum ada Pembimbing DUDI.</div>
              ) : (
                <div className="grid gap-3 p-4 md:grid-cols-2">
                  {mentors.map((row: any) => (
                    <div key={row.id} className="rounded-[12px] border border-md-outline-variant/50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{row.user?.name}</p>
                          <p className="text-[11.5px] text-md-on-surface-variant">{row.position || "Jabatan belum diisi"} · {row.company?.name}</p>
                        </div>
                        <M3Badge variant={row.isActive ? "success" : "secondary"} size="sm">{row.isActive ? "Aktif" : "Nonaktif"}</M3Badge>
                      </div>
                      <p className="mt-2 text-[11px] text-md-on-surface-variant">{row.phone || "Tanpa telepon"}{row.email ? " · " + row.email : ""}</p>
                      <p className="mt-1 text-[11px] text-md-on-surface-variant">{row.user?._count?.mentorPlacements || 0} riwayat penempatan</p>
                      <div className="mt-3 flex gap-1">
                        <M3Button variant="tonal" size="sm" icon="edit" onClick={() => openEditMentor(row)}>Edit</M3Button>
                        <M3Button variant="icon" size="icon-sm" icon="delete" onClick={() => removeMentor(row)} aria-label={"Nonaktifkan " + row.user?.name} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </M3Card>

            <M3Card variant="outlined" className="overflow-hidden">
              <div className="flex items-start justify-between gap-3 border-b border-md-outline-variant/35 p-4">
                <div>
                  <h2 className="text-[15px] font-semibold">Kapasitas DUDI per Periode & Konsentrasi</h2>
                  <p className="mt-0.5 text-[11.5px] text-md-on-surface-variant">Fondasi kuota Gen2. Placement Gen1 masih memakai maxQuota default sampai tahap Penempatan Gen2.</p>
                </div>
                <M3Button variant="filled" size="sm" icon="add" onClick={openCapacity} disabled={!periods.length || !companies.length || !departments.length}>Atur Kapasitas</M3Button>
              </div>
              {capacities.length === 0 ? (
                <div className="p-5 text-sm text-md-on-surface-variant">Belum ada konfigurasi kapasitas per periode.</div>
              ) : (
                <div className="divide-y divide-md-outline-variant/25">
                  {capacities.map((row: any) => (
                    <div key={row.id} className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{row.company.name}</p>
                        <p className="text-[11.5px] text-md-on-surface-variant">{row.period.name} · {row.department.code} — {row.department.name}</p>
                      </div>
                      <M3Badge variant="primary" size="md">{row.quota} siswa</M3Badge>
                      <M3Button variant="icon" size="icon-sm" icon="delete" onClick={() => removeCapacity(row)} aria-label="Hapus kapasitas" />
                    </div>
                  ))}
                </div>
              )}
            </M3Card>
          </>
        )}

        <M3Dialog
          isOpen={periodOpen}
          onClose={() => setPeriodOpen(false)}
          title={periodId ? "Edit Periode PKL" : "Tambah Periode PKL"}
          actions={<><M3Button variant="text" size="sm" onClick={() => setPeriodOpen(false)}>Batal</M3Button><M3Button variant="filled" size="sm" onClick={savePeriod} isLoading={submitting}>Simpan</M3Button></>}
        >
          <div className="space-y-3">
            {errorMsg && <M3Banner variant="error" supportingText={errorMsg} />}
            <M3TextField label="Nama Periode *" value={periodName} onChange={(e) => setPeriodName(e.target.value)} placeholder="Contoh: PKL Gelombang 1 2026/2027" />
            <M3Select label="Tahun Ajaran" value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} options={[{ value: "", label: "Tanpa tahun ajaran" }, ...years.map((row: any) => ({ value: row.id, label: row.yearName + " · " + row.semester }))]} />
            <div className="grid gap-3 sm:grid-cols-2">
              <M3TextField label="Tanggal Mulai *" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              <M3TextField label="Tanggal Selesai *" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={periodActive} onChange={(e) => setPeriodActive(e.target.checked)} /> Periode aktif</label>
            <textarea rows={3} value={periodNotes} onChange={(e) => setPeriodNotes(e.target.value)} placeholder="Catatan periode..." className="w-full rounded-[10px] border border-md-outline-variant px-3 py-2 text-sm" />
          </div>
        </M3Dialog>

        <M3Dialog
          isOpen={mentorOpen}
          onClose={() => setMentorOpen(false)}
          title={mentorId ? "Edit Pembimbing DUDI" : "Tambah Pembimbing DUDI"}
          subtitle="Master ini tidak membuat password atau kredensial login."
          actions={<><M3Button variant="text" size="sm" onClick={() => setMentorOpen(false)}>Batal</M3Button><M3Button variant="filled" size="sm" onClick={saveMentor} isLoading={submitting}>Simpan</M3Button></>}
        >
          <div className="space-y-3">
            {errorMsg && <M3Banner variant="error" supportingText={errorMsg} />}
            <M3TextField label="Nama Pembimbing *" value={mentorName} onChange={(e) => setMentorName(e.target.value)} />
            <M3Select label="Mitra DUDI *" value={mentorCompanyId} onChange={(e) => setMentorCompanyId(e.target.value)} options={[{ value: "", label: "Pilih DUDI" }, ...companies.map((row: any) => ({ value: row.id, label: row.name }))]} />
            <M3TextField label="Jabatan" value={mentorPosition} onChange={(e) => setMentorPosition(e.target.value)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <M3TextField label="Telepon" value={mentorPhone} onChange={(e) => setMentorPhone(e.target.value)} />
              <M3TextField label="Email Kontak" type="email" value={mentorEmail} onChange={(e) => setMentorEmail(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mentorActive} onChange={(e) => setMentorActive(e.target.checked)} /> Pembimbing aktif</label>
            <textarea rows={3} value={mentorNotes} onChange={(e) => setMentorNotes(e.target.value)} placeholder="Catatan..." className="w-full rounded-[10px] border border-md-outline-variant px-3 py-2 text-sm" />
          </div>
        </M3Dialog>

        <M3Dialog
          isOpen={capacityOpen}
          onClose={() => setCapacityOpen(false)}
          title="Atur Kapasitas PKL"
          subtitle="Kuota per Periode × DUDI × Konsentrasi."
          actions={<><M3Button variant="text" size="sm" onClick={() => setCapacityOpen(false)}>Batal</M3Button><M3Button variant="filled" size="sm" onClick={saveCapacity} isLoading={submitting}>Simpan</M3Button></>}
        >
          <div className="space-y-3">
            {errorMsg && <M3Banner variant="error" supportingText={errorMsg} />}
            <M3Select label="Periode *" value={capacityPeriodId} onChange={(e) => setCapacityPeriodId(e.target.value)} options={[{ value: "", label: "Pilih periode" }, ...periods.map((row: any) => ({ value: row.id, label: row.name }))]} />
            <M3Select label="Mitra DUDI *" value={capacityCompanyId} onChange={(e) => setCapacityCompanyId(e.target.value)} options={[{ value: "", label: "Pilih DUDI" }, ...companies.map((row: any) => ({ value: row.id, label: row.name }))]} />
            <M3Select label="Konsentrasi Keahlian *" value={capacityDepartmentId} onChange={(e) => setCapacityDepartmentId(e.target.value)} options={[{ value: "", label: "Pilih konsentrasi" }, ...departments.map((row: any) => ({ value: row.id, label: row.code + " · " + row.name }))]} />
            <M3TextField label="Kuota Siswa *" type="number" value={String(capacityQuota)} onChange={(e) => setCapacityQuota(Number(e.target.value) || 1)} />
            <textarea rows={3} value={capacityNotes} onChange={(e) => setCapacityNotes(e.target.value)} placeholder="Catatan kapasitas..." className="w-full rounded-[10px] border border-md-outline-variant px-3 py-2 text-sm" />
          </div>
        </M3Dialog>
      </div>
    </SchoolLayout>
  );
}
