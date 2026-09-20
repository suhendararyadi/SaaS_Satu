import React, { useEffect, useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  activatePlacement,
  createPlacementsBulk,
  finalizePlacement,
  getPlacementHistory,
  getPlacementReadiness,
  getPlacementWorkspace,
  transferPlacement,
  updatePlacementGen2,
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

function isoDate(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  return Number.isNaN(date.valueOf()) ? String(value).slice(0, 10) : date.toISOString().slice(0, 10);
}

const statusMeta: Record<string, { label: string; variant: any }> = {
  PLANNED: { label: "Rencana", variant: "secondary" },
  ACTIVE: { label: "Aktif", variant: "success" },
  COMPLETED: { label: "Selesai", variant: "primary" },
  CANCELED: { label: "Batal", variant: "error" },
};

export function PlacementsPage({ user }: { user: AuthUser }) {
  const [periodId, setPeriodId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const workspace = useQuery(getPlacementWorkspace, {
    ...(periodId ? { periodId } : {}),
    ...(departmentId ? { departmentId } : {}),
  });
  const data: any = workspace.data || {};
  const periods = data.periods || [];
  const departments = data.departments || [];
  const companies = data.companies || [];
  const students = data.students || [];
  const teachers = data.teachers || [];
  const mentors = data.mentors || [];
  const placements = data.placements || [];

  useEffect(() => {
    if (!periodId && periods.length) setPeriodId(periods.find((p: any) => p.isActive)?.id || periods[0].id);
  }, [periods, periodId]);
  useEffect(() => {
    if (!departmentId && departments.length) setDepartmentId(departments[0].id);
  }, [departments, departmentId]);

  const selectedPeriod = periods.find((p: any) => p.id === periodId);
  const [companyId, setCompanyId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [mentorId, setMentorId] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [busy, setBusy] = useState(false);

  const eligibleCompanies = useMemo(() => companies.filter((company: any) => {
    const accepts = company.departmentLinks?.some((link: any) => link.departmentId === departmentId);
    const capacity = company.pklCapacities?.find((row: any) => row.periodId === periodId && row.departmentId === departmentId);
    return accepts && capacity;
  }), [companies, departmentId, periodId]);

  useEffect(() => {
    if (!eligibleCompanies.some((company: any) => company.id === companyId)) {
      setCompanyId(eligibleCompanies[0]?.id || "");
      setMentorId("");
    }
  }, [eligibleCompanies, companyId]);

  const selectedCompany = eligibleCompanies.find((company: any) => company.id === companyId);
  const selectedCapacity = selectedCompany?.pklCapacities?.find((row: any) => row.periodId === periodId && row.departmentId === departmentId);
  const eligibleMentors = mentors.filter((mentor: any) => mentor.companyId === companyId && mentor.isActive);
  const unplacedStudents = students.filter((student: any) => (student.studentPlacements || []).length === 0);
  const remaining = selectedCapacity?.remaining ?? 0;

  const toggleStudent = (id: string) => {
    setSelectedStudents((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };
  const toggleAll = () => {
    const canSelect = unplacedStudents.slice(0, Math.max(0, remaining)).map((student: any) => student.id);
    setSelectedStudents(selectedStudents.length === canSelect.length ? [] : canSelect);
  };

  const createBulk = async () => {
    if (!periodId || !departmentId || !companyId || !selectedStudents.length) {
      setBulkError("Pilih periode, konsentrasi, DUDI, dan minimal satu siswa.");
      return;
    }
    if (selectedStudents.length > remaining) {
      setBulkError(`Siswa terpilih ${selectedStudents.length}, sedangkan sisa kuota ${remaining}.`);
      return;
    }
    setBusy(true);
    setBulkError("");
    try {
      await createPlacementsBulk({
        studentIds: selectedStudents,
        periodId,
        companyId,
        teacherSupervisorId: teacherId || null,
        dudiMentorId: mentorId || null,
        startDate: selectedPeriod ? isoDate(selectedPeriod.startDate) : null,
        endDate: selectedPeriod ? isoDate(selectedPeriod.endDate) : null,
        notes: notes || null,
      });
      setSelectedStudents([]);
      setNotes("");
      await workspace.refetch();
    } catch (error: any) {
      setBulkError(error?.message || "Penempatan belum berhasil dibuat.");
    } finally {
      setBusy(false);
    }
  };

  const [readiness, setReadiness] = useState<any>(null);
  const [readinessOpen, setReadinessOpen] = useState(false);
  const [rowBusy, setRowBusy] = useState("");
  const checkReadiness = async (id: string) => {
    setRowBusy(id);
    try {
      const result = await getPlacementReadiness({ id });
      setReadiness(result);
      setReadinessOpen(true);
    } catch (error: any) {
      alert(error?.message || "Readiness belum dapat diperiksa.");
    } finally {
      setRowBusy("");
    }
  };
  const activate = async (id: string) => {
    setRowBusy(id);
    try {
      await activatePlacement({ id });
      await workspace.refetch();
      const result = await getPlacementReadiness({ id });
      setReadiness(result);
      setReadinessOpen(true);
    } catch (error: any) {
      alert(error?.message || "Penempatan belum dapat diaktifkan.");
    } finally {
      setRowBusy("");
    }
  };

  const [editRow, setEditRow] = useState<any>(null);
  const [editTeacher, setEditTeacher] = useState("");
  const [editMentor, setEditMentor] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const openEdit = (row: any) => {
    setEditRow(row);
    setEditTeacher(row.teacherSupervisorId || "");
    setEditMentor(row.dudiMentorId || "");
    setEditStart(isoDate(row.startDate));
    setEditEnd(isoDate(row.endDate));
    setEditNotes(row.notes || "");
  };
  const saveEdit = async () => {
    if (!editRow) return;
    setBusy(true);
    try {
      await updatePlacementGen2({
        id: editRow.id,
        teacherSupervisorId: editTeacher || null,
        dudiMentorId: editMentor || null,
        startDate: editStart,
        endDate: editEnd,
        notes: editNotes || null,
      });
      setEditRow(null);
      await workspace.refetch();
    } catch (error: any) {
      alert(error?.message || "Penempatan belum dapat diperbarui.");
    } finally {
      setBusy(false);
    }
  };

  const [transferRow, setTransferRow] = useState<any>(null);
  const [targetCompanyId, setTargetCompanyId] = useState("");
  const [targetMentorId, setTargetMentorId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const transferCompanies = useMemo(() => companies.filter((company: any) => {
    const accepts = company.departmentLinks?.some((link: any) => link.departmentId === transferRow?.departmentId);
    const cap = company.pklCapacities?.find((row: any) => row.periodId === transferRow?.pklPeriodId && row.departmentId === transferRow?.departmentId);
    return accepts && cap && cap.remaining > 0;
  }), [companies, transferRow]);
  const transferMentors = mentors.filter((mentor: any) => mentor.companyId === targetCompanyId && mentor.isActive);
  const openTransfer = (row: any) => {
    setTransferRow(row);
    const first = transferCompanies.find((company: any) => company.id !== row.companyId) || transferCompanies[0];
    setTargetCompanyId(first?.id || "");
    setTargetMentorId("");
    setTransferReason("");
  };
  const submitTransfer = async () => {
    if (!transferRow || !targetCompanyId || transferReason.trim().length < 5) return;
    setBusy(true);
    try {
      await transferPlacement({
        id: transferRow.id,
        targetCompanyId,
        targetMentorId: targetMentorId || null,
        reason: transferReason,
      });
      setTransferRow(null);
      await workspace.refetch();
    } catch (error: any) {
      alert(error?.message || "Perpindahan DUDI belum berhasil.");
    } finally {
      setBusy(false);
    }
  };

  const [history, setHistory] = useState<any[]>([]);
  const [historyRow, setHistoryRow] = useState<any>(null);
  const openHistory = async (row: any) => {
    setRowBusy(row.id);
    try {
      setHistory(await getPlacementHistory({ id: row.id }));
      setHistoryRow(row);
    } finally {
      setRowBusy("");
    }
  };

  const finalize = async (row: any, status: "COMPLETED" | "CANCELED") => {
    const reason = window.prompt(status === "CANCELED" ? "Alasan pembatalan:" : "Catatan penyelesaian (opsional):") || "";
    if (status === "CANCELED" && reason.trim().length < 3) return;
    setRowBusy(row.id);
    try {
      await finalizePlacement({ id: row.id, status, reason: reason || null });
      await workspace.refetch();
    } catch (error: any) {
      alert(error?.message || "Status belum dapat diperbarui.");
    } finally {
      setRowBusy("");
    }
  };

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">PKL Gen2</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-.02em] text-md-on-surface">Workspace Penempatan PKL</h1>
          <p className="mt-1 text-sm text-md-on-surface-variant">Plotting berbasis periode, konsentrasi, kuota DUDI, Guru Pembimbing, dan Pembimbing DUDI.</p>
        </header>

        <M3Card variant="outlined" className="p-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <M3Select label="Periode PKL" value={periodId} onChange={(e) => { setPeriodId(e.target.value); setSelectedStudents([]); }} options={[{ value: "", label: "Pilih periode" }, ...periods.map((p: any) => ({ value: p.id, label: p.name }))]} />
            <M3Select label="Konsentrasi" value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setSelectedStudents([]); }} options={[{ value: "", label: "Pilih konsentrasi" }, ...departments.map((d: any) => ({ value: d.id, label: d.code + " · " + d.name }))]} />
            <M3Select label="Mitra DUDI" value={companyId} onChange={(e) => { setCompanyId(e.target.value); setMentorId(""); }} options={[{ value: "", label: "Pilih DUDI" }, ...eligibleCompanies.map((c: any) => {
              const cap = c.pklCapacities.find((row: any) => row.periodId === periodId && row.departmentId === departmentId);
              return { value: c.id, label: `${c.name} · sisa ${cap?.remaining ?? 0}/${cap?.quota ?? 0}` };
            })]} />
            <div className="rounded-[12px] bg-md-surface-container px-3 py-2">
              <p className="text-[10.5px] uppercase text-md-on-surface-variant">Sisa kuota terpilih</p>
              <p className="mt-1 text-xl font-semibold">{remaining}</p>
            </div>
          </div>
        </M3Card>

        {bulkError && <M3Banner variant="error" supportingText={bulkError} dismissible onDismiss={() => setBulkError("")} />}

        <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
          <M3Card variant="outlined" className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-md-outline-variant/35 p-4">
              <div>
                <h2 className="text-[15px] font-semibold">Siswa belum ditempatkan</h2>
                <p className="text-[11.5px] text-md-on-surface-variant">{unplacedStudents.length} siswa · pilih maksimal sesuai sisa kuota.</p>
              </div>
              <M3Button variant="text" size="sm" onClick={toggleAll} disabled={!unplacedStudents.length || remaining < 1}>{selectedStudents.length ? "Bersihkan" : "Pilih sesuai kuota"}</M3Button>
            </div>
            <div className="max-h-[430px] divide-y divide-md-outline-variant/25 overflow-y-auto">
              {unplacedStudents.length === 0 ? (
                <div className="p-5 text-sm text-md-on-surface-variant">Tidak ada siswa tersedia pada filter ini.</div>
              ) : unplacedStudents.map((student: any) => (
                <label key={student.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-black/[.025] dark:hover:bg-white/[.04]">
                  <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => toggleStudent(student.id)} disabled={!selectedStudents.includes(student.id) && selectedStudents.length >= remaining} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{student.name}</p>
                    <p className="text-[11px] text-md-on-surface-variant">{student.classRoom?.name || "Tanpa rombel"} · NIS {student.studentProfile?.nis || "-"}</p>
                  </div>
                  <M3Badge variant="outline" size="sm">{student.classRoom?.department?.code || "-"}</M3Badge>
                </label>
              ))}
            </div>
          </M3Card>

          <M3Card variant="outlined" className="p-4">
            <h2 className="text-[15px] font-semibold">Konfigurasi plotting</h2>
            <div className="mt-4 space-y-3">
              <M3Select label="Guru Pembimbing" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} options={[{ value: "", label: "Tetapkan nanti" }, ...teachers.map((t: any) => ({ value: t.id, label: t.name || "Guru" }))]} />
              <M3Select label="Pembimbing DUDI" value={mentorId} onChange={(e) => setMentorId(e.target.value)} options={[{ value: "", label: "Tetapkan nanti" }, ...eligibleMentors.map((m: any) => ({ value: m.userId, label: m.user.name || "Pembimbing DUDI" }))]} />
              <M3TextField label="Mulai" type="date" value={selectedPeriod ? isoDate(selectedPeriod.startDate) : ""} disabled />
              <M3TextField label="Selesai" type="date" value={selectedPeriod ? isoDate(selectedPeriod.endDate) : ""} disabled />
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan plotting (opsional)" className="w-full rounded-[10px] border border-md-outline-variant bg-transparent px-3 py-2 text-sm" />
              <M3Button fullWidth variant="filled" icon="group_add" onClick={createBulk} isLoading={busy} disabled={!selectedStudents.length || !companyId}>
                Buat {selectedStudents.length || 0} Penempatan PLANNED
              </M3Button>
              <p className="text-[10.5px] leading-5 text-md-on-surface-variant">Penempatan baru berstatus <strong>PLANNED</strong>. Aktivasi baru dapat dilakukan setelah semua blocker readiness selesai.</p>
            </div>
          </M3Card>
        </div>

        <M3Card variant="outlined" className="overflow-hidden">
          <div className="border-b border-md-outline-variant/35 p-4">
            <h2 className="text-[15px] font-semibold">Penempatan pada filter</h2>
            <p className="text-[11.5px] text-md-on-surface-variant">{placements.length} record</p>
          </div>
          {workspace.isLoading ? <div className="flex min-h-[220px] items-center justify-center"><M3CircularProgress size={34} /></div> : placements.length === 0 ? (
            <div className="p-6 text-sm text-md-on-surface-variant">Belum ada penempatan PKL pada periode/konsentrasi ini.</div>
          ) : (
            <div className="divide-y divide-md-outline-variant/25">
              {placements.map((row: any) => {
                const meta = statusMeta[row.status] || { label: row.status, variant: "outline" };
                return (
                  <div key={row.id} className="p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{row.student?.name}</p>
                          <M3Badge variant={meta.variant} size="sm">{meta.label}</M3Badge>
                          <M3Badge variant="outline" size="sm">{row.department?.code || row.student?.classRoom?.department?.code || "-"}</M3Badge>
                        </div>
                        <p className="mt-1 text-[11.5px] text-md-on-surface-variant">{row.company?.name} · {row.pklPeriod?.name || "Tanpa periode"} · {row.student?.classRoom?.name || "-"}</p>
                        <p className="mt-1 text-[11px] text-md-on-surface-variant">Guru: {row.teacherSupervisor?.name || "belum"} · DUDI: {row.dudiMentor?.name || "belum"} · {isoDate(row.startDate)}–{isoDate(row.endDate)}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <M3Button variant="tonal" size="sm" icon="fact_check" loading={rowBusy === row.id} onClick={() => checkReadiness(row.id)}>Readiness</M3Button>
                        {row.status === "PLANNED" && <M3Button variant="filled" size="sm" icon="play_arrow" loading={rowBusy === row.id} onClick={() => activate(row.id)}>Aktifkan</M3Button>}
                        {["PLANNED","ACTIVE"].includes(row.status) && <M3Button variant="text" size="sm" icon="edit" onClick={() => openEdit(row)}>Edit</M3Button>}
                        {["PLANNED","ACTIVE"].includes(row.status) && <M3Button variant="text" size="sm" icon="swap_horiz" onClick={() => openTransfer(row)}>Pindah</M3Button>}
                        <M3Button variant="icon" size="icon-sm" icon="history" aria-label="Histori" onClick={() => openHistory(row)} />
                        {row.status === "ACTIVE" && <M3Button variant="text" size="sm" onClick={() => finalize(row, "COMPLETED")}>Selesai</M3Button>}
                        {["PLANNED","ACTIVE"].includes(row.status) && <M3Button variant="text" size="sm" onClick={() => finalize(row, "CANCELED")}>Batal</M3Button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </M3Card>

        <M3Dialog isOpen={readinessOpen} onClose={() => setReadinessOpen(false)} title="PKL Readiness Check" subtitle={readiness?.placement?.student?.name || ""} maxWidth="lg">
          {readiness && <div className="space-y-3">
            <M3Banner variant={readiness.ready ? "success" : "warning"} headline={readiness.ready ? "Siap diaktifkan" : "Belum siap diaktifkan"} supportingText={readiness.ready ? "Semua blocker readiness terpenuhi." : `${readiness.blockers.length} blocker harus diselesaikan.`} />
            <div className="divide-y divide-md-outline-variant/30 rounded-[12px] border border-md-outline-variant/50">
              {readiness.items.map((item: any) => <div key={item.code} className="flex items-start gap-3 p-3">
                <M3Icon name={item.ok ? "check_circle" : item.severity === "BLOCKER" ? "error" : "warning"} size={19} className={item.ok ? "text-green-600" : item.severity === "BLOCKER" ? "text-md-error" : "text-amber-600"} />
                <div><p className="text-sm font-semibold">{item.label}</p><p className="text-[11.5px] text-md-on-surface-variant">{item.detail}</p></div>
              </div>)}
            </div>
          </div>}
        </M3Dialog>

        <M3Dialog isOpen={!!editRow} onClose={() => setEditRow(null)} title="Edit Penempatan" actions={<><M3Button variant="text" size="sm" onClick={() => setEditRow(null)}>Batal</M3Button><M3Button variant="filled" size="sm" onClick={saveEdit} isLoading={busy}>Simpan</M3Button></>}>
          <div className="space-y-3">
            <M3Select label="Guru Pembimbing" value={editTeacher} onChange={(e) => setEditTeacher(e.target.value)} options={[{ value: "", label: "Belum ditetapkan" }, ...teachers.map((t: any) => ({ value: t.id, label: t.name || "Guru" }))]} />
            <M3Select label="Pembimbing DUDI" value={editMentor} onChange={(e) => setEditMentor(e.target.value)} options={[{ value: "", label: "Belum ditetapkan" }, ...mentors.filter((m: any) => m.companyId === editRow?.companyId).map((m: any) => ({ value: m.userId, label: m.user.name || "Pembimbing" }))]} />
            <div className="grid gap-3 sm:grid-cols-2"><M3TextField label="Mulai" type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} /><M3TextField label="Selesai" type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} /></div>
            <textarea rows={3} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Catatan" className="w-full rounded-[10px] border border-md-outline-variant bg-transparent px-3 py-2 text-sm" />
          </div>
        </M3Dialog>

        <M3Dialog isOpen={!!transferRow} onClose={() => setTransferRow(null)} title="Pindah Mitra DUDI" subtitle="Riwayat perpindahan disimpan permanen." actions={<><M3Button variant="text" size="sm" onClick={() => setTransferRow(null)}>Batal</M3Button><M3Button variant="filled" size="sm" onClick={submitTransfer} isLoading={busy}>Pindahkan</M3Button></>}>
          <div className="space-y-3">
            <M3Select label="DUDI Tujuan" value={targetCompanyId} onChange={(e) => { setTargetCompanyId(e.target.value); setTargetMentorId(""); }} options={[{ value: "", label: "Pilih DUDI" }, ...transferCompanies.map((c: any) => ({ value: c.id, label: c.name }))]} />
            <M3Select label="Pembimbing DUDI Baru" value={targetMentorId} onChange={(e) => setTargetMentorId(e.target.value)} options={[{ value: "", label: "Tetapkan nanti" }, ...transferMentors.map((m: any) => ({ value: m.userId, label: m.user.name || "Pembimbing" }))]} />
            <textarea rows={3} value={transferReason} onChange={(e) => setTransferReason(e.target.value)} placeholder="Alasan perpindahan wajib diisi..." className="w-full rounded-[10px] border border-md-outline-variant bg-transparent px-3 py-2 text-sm" />
          </div>
        </M3Dialog>

        <M3Dialog isOpen={!!historyRow} onClose={() => setHistoryRow(null)} title="Histori Penempatan" subtitle={historyRow?.student?.name || ""} maxWidth="lg">
          <div className="space-y-2">
            {history.length === 0 ? <p className="text-sm text-md-on-surface-variant">Belum ada event histori.</p> : history.map((event: any) => <div key={event.id} className="rounded-[10px] border border-md-outline-variant/50 p-3">
              <div className="flex justify-between gap-3"><strong className="text-sm">{event.eventType}</strong><span className="text-[10.5px] text-md-on-surface-variant">{new Date(event.createdAt).toLocaleString("id-ID")}</span></div>
              {event.reason && <p className="mt-1 text-[11.5px] text-md-on-surface-variant">{event.reason}</p>}
            </div>)}
          </div>
        </M3Dialog>
      </div>
    </SchoolLayout>
  );
}
