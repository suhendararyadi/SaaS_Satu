import React, { useEffect, useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  archiveSchoolStaffAssignment,
  getSchoolOrganizationData,
  saveSchoolStaffAssignment,
  setHomeroomTeacherAssignment,
  setWakasekOrganizationAssignment,
  useQuery,
} from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  DUTY_DAY_CODES,
  DUTY_DAY_LABELS,
  STAFF_ASSIGNMENT_META,
  type DutyDayCode,
  type StaffAssignmentRoleCode,
} from "../../school/staffAssignments";
import {
  WAKASEK_ROLES,
  WAKASEK_ROLE_META,
  type WakasekRoleCode,
} from "../../school/wakasek";
import {
  M3Badge,
  M3Banner,
  M3Button,
  M3Card,
  M3CircularProgress,
  M3Dialog,
  M3EmptyState,
  M3Icon,
  M3Select,
  M3StatCard,
  M3Table,
  M3TableBody,
  M3TableCell,
  M3TableHead,
  M3TableHeader,
  M3TableRow,
  M3Tabs,
  M3TextField,
} from "../../client/components/m3";

type AssignmentForm = {
  id?: string;
  role: StaffAssignmentRoleCode;
  teacherId: string;
  academicYearId: string;
  departmentId: string;
  unitName: string;
  customTitle: string;
  dutyDays: DutyDayCode[];
  notes: string;
};

const blankAssignment = (role: StaffAssignmentRoleCode, activeAcademicYearId = ""): AssignmentForm => ({
  role,
  teacherId: "",
  academicYearId: role === "PRINCIPAL" ? "" : activeAcademicYearId,
  departmentId: "",
  unitName: "",
  customTitle: "",
  dutyDays: [],
  notes: "",
});

function teacherLabel(teacher: any) {
  const title = teacher.teacherProfile?.title ? `, ${teacher.teacherProfile.title}` : "";
  return `${teacher.name || teacher.email || "Guru"}${title}`;
}

function assignmentRoleLabel(role: StaffAssignmentRoleCode) {
  return STAFF_ASSIGNMENT_META[role].label;
}

function StaffAvatar({ name, icon }: { name?: string | null; icon: string }) {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-black/[.045] text-md-on-surface dark:bg-white/[.08]">
      {name ? <span className="text-[13px] font-bold">{name.trim().slice(0, 2).toUpperCase()}</span> : <M3Icon name={icon} size={20} />}
    </div>
  );
}

export function OrganizationAssignmentCenterPage({ user }: { user: AuthUser }) {
  const query = useQuery(getSchoolOrganizationData);
  const data = query.data as any;
  const canManage = !!data?.canManage;
  const [tab, setTab] = useState("structure");
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(() => blankAssignment("PRINCIPAL"));
  const [wakasekDialogOpen, setWakasekDialogOpen] = useState(false);
  const [wakasekRole, setWakasekRole] = useState<WakasekRoleCode>("KURIKULUM");
  const [wakasekTeacherId, setWakasekTeacherId] = useState("");
  const [homeroomDraft, setHomeroomDraft] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!data?.homeroomClasses) return;
    setHomeroomDraft(
      Object.fromEntries(
        data.homeroomClasses.map((room: any) => [room.id, room.homeroomTeacher?.id || ""]),
      ),
    );
  }, [data?.homeroomClasses]);

  const teacherOptions = useMemo(
    () => [
      { value: "", label: "Pilih guru / tendik" },
      ...(data?.teachers || []).map((teacher: any) => ({
        value: teacher.id,
        label: teacherLabel(teacher),
      })),
    ],
    [data?.teachers],
  );

  const academicYearOptions = useMemo(
    () => [
      { value: "", label: "Tidak terikat tahun ajaran" },
      ...(data?.activeAcademicYear
        ? [{
            value: data.activeAcademicYear.id,
            label: `${data.activeAcademicYear.yearName} · ${data.activeAcademicYear.semester} · Aktif`,
          }]
        : []),
    ],
    [data?.activeAcademicYear],
  );

  const departmentOptions = useMemo(
    () => [
      { value: "", label: "Pilih program / konsentrasi" },
      ...(data?.departments || []).map((department: any) => ({
        value: department.id,
        label: `${department.code} · ${department.name}`,
      })),
    ],
    [data?.departments],
  );

  const openNewAssignment = (role: StaffAssignmentRoleCode) => {
    setAssignmentForm(blankAssignment(role, data?.activeAcademicYear?.id || ""));
    setMessage(null);
    setAssignmentDialogOpen(true);
  };

  const openEditAssignment = (assignment: any) => {
    setAssignmentForm({
      id: assignment.id,
      role: assignment.role,
      teacherId: assignment.teacher.id,
      academicYearId: assignment.academicYear?.id || "",
      departmentId: assignment.department?.id || "",
      unitName: assignment.unitName || "",
      customTitle: assignment.customTitle || "",
      dutyDays: assignment.dutyDays || [],
      notes: assignment.notes || "",
    });
    setMessage(null);
    setAssignmentDialogOpen(true);
  };

  const saveAssignment = async () => {
    if (!assignmentForm.teacherId) {
      setMessage({ type: "error", text: "Pilih guru atau tenaga kependidikan terlebih dahulu." });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await saveSchoolStaffAssignment({
        id: assignmentForm.id,
        teacherId: assignmentForm.teacherId,
        role: assignmentForm.role,
        academicYearId: assignmentForm.academicYearId || null,
        departmentId: assignmentForm.departmentId || null,
        unitName: assignmentForm.unitName || null,
        customTitle: assignmentForm.customTitle || null,
        dutyDays: assignmentForm.dutyDays,
        notes: assignmentForm.notes || null,
      });
      setAssignmentDialogOpen(false);
      await query.refetch();
      setMessage({ type: "success", text: "Penugasan berhasil disimpan dan langsung berlaku pada School OS." });
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Gagal menyimpan penugasan." });
    } finally {
      setSubmitting(false);
    }
  };

  const archiveAssignment = async (assignment: any) => {
    if (!window.confirm(`Akhiri penugasan “${assignment.displayTitle}” untuk ${teacherLabel(assignment.teacher)}?`)) return;
    setBusyId(assignment.id);
    try {
      await archiveSchoolStaffAssignment({ id: assignment.id });
      await query.refetch();
      setMessage({ type: "success", text: "Penugasan diakhiri dan dipindahkan ke riwayat." });
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Gagal mengakhiri penugasan." });
    } finally {
      setBusyId(null);
    }
  };

  const addWakasek = async () => {
    if (!wakasekTeacherId) {
      setMessage({ type: "error", text: "Pilih guru yang akan ditugaskan sebagai Wakasek." });
      return;
    }
    setSubmitting(true);
    try {
      await setWakasekOrganizationAssignment({
        teacherId: wakasekTeacherId,
        role: wakasekRole,
        enabled: true,
      });
      setWakasekDialogOpen(false);
      setWakasekTeacherId("");
      await query.refetch();
      setMessage({ type: "success", text: `${WAKASEK_ROLE_META[wakasekRole].label} berhasil ditetapkan.` });
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Gagal menetapkan Wakasek." });
    } finally {
      setSubmitting(false);
    }
  };

  const removeWakasek = async (assignment: any) => {
    if (!window.confirm(`Akhiri penugasan ${WAKASEK_ROLE_META[assignment.role as WakasekRoleCode].label} untuk ${teacherLabel(assignment.teacher)}?`)) return;
    setBusyId(assignment.id);
    try {
      await setWakasekOrganizationAssignment({
        teacherId: assignment.teacher.id,
        role: assignment.role,
        enabled: false,
      });
      await query.refetch();
      setMessage({ type: "success", text: "Penugasan Wakasek diakhiri." });
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Gagal mengubah penugasan Wakasek." });
    } finally {
      setBusyId(null);
    }
  };

  const saveHomeroom = async (room: any) => {
    setBusyId(room.id);
    try {
      await setHomeroomTeacherAssignment({
        classRoomId: room.id,
        teacherId: homeroomDraft[room.id] || null,
      });
      await query.refetch();
      setMessage({ type: "success", text: `Wali kelas ${room.name} berhasil diperbarui.` });
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Gagal memperbarui wali kelas." });
    } finally {
      setBusyId(null);
    }
  };

  if (query.isLoading && !data) {
    return (
      <SchoolLayout user={user}>
        <div className="flex min-h-[420px] items-center justify-center"><M3CircularProgress size={42} /></div>
      </SchoolLayout>
    );
  }

  if (query.error || !data) {
    return (
      <SchoolLayout user={user}>
        <M3Banner
          variant="error"
          headline="Pusat penugasan tidak dapat dibuka"
          supportingText={(query.error as any)?.message || "Data struktur organisasi belum dapat dimuat."}
          actionLabel="Coba Lagi"
          onAction={() => query.refetch()}
        />
      </SchoolLayout>
    );
  }

  const principal = data.assignments.principal;
  const wakasekByRole = Object.fromEntries(
    WAKASEK_ROLES.map((role) => [
      role,
      data.wakasekAssignments.filter((assignment: any) => assignment.role === role),
    ]),
  );

  const tabs = [
    { id: "structure", label: "Struktur Utama", icon: "account_tree" },
    { id: "homeroom", label: "Wali Kelas", icon: "supervisor_account", badge: data.stats.unassignedHomeroomCount || undefined },
    { id: "duty", label: "Guru Piket", icon: "schedule", badge: data.stats.dutyTeacherCount || undefined },
    { id: "additional", label: "Tugas Tambahan", icon: "assignment_ind" },
    { id: "history", label: "Riwayat", icon: "history" },
  ];

  return (
    <SchoolLayout user={user}>
      <div className="space-y-5">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="v2-eyebrow">TATA KELOLA SEKOLAH</p>
              {canManage ? <M3Badge variant="primary">Mode Pengelola</M3Badge> : <M3Badge variant="outline">Mode Lihat</M3Badge>}
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.025em] text-md-on-surface">
              Struktur & Penugasan
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-md-on-surface-variant">
              Satu pusat data untuk struktur organisasi dan tugas tambahan. Wali Kelas dan Wakasek tetap memakai sumber data resminya sehingga tidak ada duplikasi penugasan.
            </p>
          </div>
          <M3Tabs tabs={tabs} activeTab={tab} onChange={setTab} />
        </header>

        {message && (
          <M3Banner
            variant={message.type === "success" ? "success" : "error"}
            headline={message.type === "success" ? "Perubahan tersimpan" : "Perubahan gagal"}
            supportingText={message.text}
            dismissible
            onDismiss={() => setMessage(null)}
          />
        )}

        {!data.activeAcademicYear && (
          <M3Banner
            variant="warning"
            headline="Belum ada tahun ajaran aktif"
            supportingText="Penugasan Kepala Sekolah tetap dapat dikelola, tetapi Wali Kelas dan penugasan semester membutuhkan tahun ajaran aktif."
            icon="calendar_month"
          />
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <M3StatCard
            label="Guru dengan tanggung jawab"
            value={data.stats.assignedTeacherCount}
            helper={`dari ${data.stats.totalTeacherCount} guru/tendik`}
            tone="blue"
          />
          <M3StatCard
            label="Wali kelas belum terisi"
            value={data.stats.unassignedHomeroomCount}
            helper={data.activeAcademicYear ? `${data.activeAcademicYear.yearName} · ${data.activeAcademicYear.semester}` : "Tahun ajaran belum aktif"}
            tone={data.stats.unassignedHomeroomCount ? "orange" : "green"}
          />
          <M3StatCard
            label="Bidang Wakasek kosong"
            value={data.stats.unfilledWakasekCount}
            helper="dari 4 bidang modular"
            tone={data.stats.unfilledWakasekCount ? "orange" : "green"}
          />
          <M3StatCard
            label="Guru Piket aktif"
            value={data.stats.dutyTeacherCount}
            helper={data.stats.hasPrincipal ? "Kepala Sekolah sudah ditetapkan" : "Kepala Sekolah belum ditetapkan"}
            tone={data.stats.dutyTeacherCount ? "teal" : "orange"}
          />
        </div>

        {tab === "structure" && (
          <div className="space-y-4">
            <M3Card variant="elevated" className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <StaffAvatar name={principal?.teacher?.name} icon="account_balance" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-md-on-surface-variant">Pimpinan Unit</p>
                    <h2 className="mt-0.5 text-base font-bold text-md-on-surface">
                      {principal ? teacherLabel(principal.teacher) : "Kepala Sekolah belum ditetapkan"}
                    </h2>
                    <p className="mt-0.5 text-xs text-md-on-surface-variant">
                      {principal?.teacher?.teacherProfile?.nip ? `NIP ${principal.teacher.teacherProfile.nip}` : "Penanggung jawab utama satuan pendidikan"}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    {principal && <M3Button variant="outlined" size="sm" icon="edit" onClick={() => openEditAssignment(principal)}>Ubah</M3Button>}
                    <M3Button variant="tonal" size="sm" icon={principal ? "swap_horiz" : "add"} onClick={() => openNewAssignment("PRINCIPAL")}>
                      {principal ? "Ganti Kepala Sekolah" : "Tetapkan Kepala Sekolah"}
                    </M3Button>
                  </div>
                )}
              </div>
            </M3Card>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {WAKASEK_ROLES.map((role) => {
                const meta = WAKASEK_ROLE_META[role];
                const assigned = wakasekByRole[role] || [];
                return (
                  <M3Card key={role} variant="outlined" className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex size-9 items-center justify-center rounded-[12px] bg-md-primary-container text-md-on-primary-container">
                        <M3Icon name={meta.icon} size={19} />
                      </span>
                      <M3Badge variant={assigned.length ? "success" : "outline"} size="sm">{assigned.length ? `${assigned.length} aktif` : "Kosong"}</M3Badge>
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-md-on-surface">{meta.label}</h3>
                    <p className="mt-1 min-h-10 text-[11.5px] leading-5 text-md-on-surface-variant">{meta.description}</p>
                    <div className="mt-3 space-y-2">
                      {assigned.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-2 rounded-[10px] bg-black/[.03] p-2 dark:bg-white/[.05]">
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-md-on-surface">{teacherLabel(item.teacher)}</span>
                          {canManage && (
                            <button
                              type="button"
                              className="rounded-md p-1 text-md-on-surface-variant hover:bg-md-error-container hover:text-md-error"
                              onClick={() => removeWakasek(item)}
                              disabled={busyId === item.id}
                              title="Akhiri penugasan"
                            >
                              <M3Icon name="close" size={15} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {canManage && (
                      <M3Button
                        variant="text"
                        size="sm"
                        icon="add"
                        className="mt-2"
                        onClick={() => {
                          setWakasekRole(role);
                          setWakasekTeacherId("");
                          setWakasekDialogOpen(true);
                        }}
                      >
                        Tambah
                      </M3Button>
                    )}
                  </M3Card>
                );
              })}
            </div>

            {data.capabilities.usesDepartments && (
              <M3Card variant="outlined" className="overflow-hidden p-0">
                <div className="flex items-center justify-between gap-3 border-b border-md-outline-variant/40 p-4">
                  <div>
                    <h2 className="text-sm font-bold text-md-on-surface">Kaprog / Kakomli</h2>
                    <p className="mt-0.5 text-xs text-md-on-surface-variant">Penanggung jawab program dan konsentrasi keahlian.</p>
                  </div>
                  {canManage && <M3Button variant="tonal" size="sm" icon="add" onClick={() => openNewAssignment("DEPARTMENT_HEAD")}>Tambah Kaprog</M3Button>}
                </div>
                {!data.assignments.departmentHeads.length ? (
                  <div className="p-5"><M3EmptyState compact icon="account_tree" title="Belum ada Kaprog/Kakomli" description="Tetapkan kepala program atau konsentrasi dari pusat penugasan ini." /></div>
                ) : (
                  <M3Table>
                    <M3TableHeader><M3TableRow><M3TableHead>Program/Konsentrasi</M3TableHead><M3TableHead>Penanggung Jawab</M3TableHead><M3TableHead>Periode</M3TableHead>{canManage && <M3TableHead className="text-right">Aksi</M3TableHead>}</M3TableRow></M3TableHeader>
                    <M3TableBody>
                      {data.assignments.departmentHeads.map((item: any) => (
                        <M3TableRow key={item.id}>
                          <M3TableCell><span className="font-semibold">{item.department?.code || "-"}</span><span className="ml-2 text-xs text-md-on-surface-variant">{item.department?.name}</span></M3TableCell>
                          <M3TableCell>{teacherLabel(item.teacher)}</M3TableCell>
                          <M3TableCell>{item.academicYear ? `${item.academicYear.yearName} · ${item.academicYear.semester}` : "Berlaku umum"}</M3TableCell>
                          {canManage && <M3TableCell className="text-right"><M3Button variant="text" size="sm" onClick={() => openEditAssignment(item)}>Ubah</M3Button></M3TableCell>}
                        </M3TableRow>
                      ))}
                    </M3TableBody>
                  </M3Table>
                )}
              </M3Card>
            )}
          </div>
        )}

        {tab === "homeroom" && (
          <M3Card variant="outlined" className="overflow-hidden p-0">
            <div className="border-b border-md-outline-variant/40 p-4">
              <h2 className="text-sm font-bold text-md-on-surface">Penugasan Wali Kelas</h2>
              <p className="mt-0.5 text-xs text-md-on-surface-variant">
                Mengubah data di sini langsung memperbarui rombel, akses presensi, dan panel Wali Kelas.
              </p>
            </div>
            {!data.homeroomClasses.length ? (
              <div className="p-5"><M3EmptyState compact icon="meeting_room" title="Belum ada rombel aktif" description="Aktifkan tahun ajaran dan buat rombel terlebih dahulu." /></div>
            ) : (
              <M3Table>
                <M3TableHeader><M3TableRow><M3TableHead>Rombel</M3TableHead>{data.capabilities.usesDepartments && <M3TableHead>Program</M3TableHead>}<M3TableHead>Siswa</M3TableHead><M3TableHead>Wali Kelas</M3TableHead>{canManage && <M3TableHead className="text-right">Simpan</M3TableHead>}</M3TableRow></M3TableHeader>
                <M3TableBody>
                  {data.homeroomClasses.map((room: any) => (
                    <M3TableRow key={room.id}>
                      <M3TableCell><span className="font-semibold text-md-on-surface">{room.name}</span></M3TableCell>
                      {data.capabilities.usesDepartments && <M3TableCell>{room.department?.code || "-"}</M3TableCell>}
                      <M3TableCell>{room._count.students}</M3TableCell>
                      <M3TableCell className="min-w-[260px]">
                        {canManage ? (
                          <M3Select
                            size="sm"
                            value={homeroomDraft[room.id] || ""}
                            onChange={(event) => setHomeroomDraft((current) => ({ ...current, [room.id]: event.target.value }))}
                            options={[{ value: "", label: "Belum ditetapkan" }, ...teacherOptions.filter((item) => item.value)]}
                          />
                        ) : (
                          room.homeroomTeacher ? teacherLabel(room.homeroomTeacher) : <M3Badge variant="warning">Belum ditetapkan</M3Badge>
                        )}
                      </M3TableCell>
                      {canManage && <M3TableCell className="text-right"><M3Button variant="tonal" size="sm" loading={busyId === room.id} onClick={() => saveHomeroom(room)}>Simpan</M3Button></M3TableCell>}
                    </M3TableRow>
                  ))}
                </M3TableBody>
              </M3Table>
            )}
          </M3Card>
        )}

        {tab === "duty" && (
          <div className="space-y-4">
            <M3Banner
              variant="standard"
              headline="Jadwal Guru Piket terhubung ke hak input"
              supportingText="Ketika jadwal piket sudah dikonfigurasi, hanya Admin atau guru yang terjadwal pada hari tersebut yang dapat mengirim laporan piket. Penugasan tanpa hari dianggap fleksibel/setiap hari."
              icon="schedule"
            />
            <div className="flex justify-end">
              {canManage && <M3Button variant="filled" size="sm" icon="add" onClick={() => openNewAssignment("DUTY_TEACHER")}>Tambah Guru Piket</M3Button>}
            </div>
            {!data.assignments.dutyTeachers.length ? (
              <M3EmptyState icon="schedule" title="Jadwal Guru Piket belum disusun" description="Selama belum ada penugasan resmi, alur lama tetap kompatibel. Setelah jadwal dibuat, hak input akan mengikuti jadwal ini." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {data.assignments.dutyTeachers.map((item: any) => (
                  <M3Card key={item.id} variant="outlined" className="p-4">
                    <div className="flex items-start gap-3">
                      <StaffAvatar name={item.teacher?.name} icon="schedule" />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-md-on-surface">{teacherLabel(item.teacher)}</h3>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.dutyDays.length
                            ? item.dutyDays.map((day: DutyDayCode) => <M3Badge key={day} variant="secondary" size="sm">{DUTY_DAY_LABELS[day]}</M3Badge>)
                            : <M3Badge variant="outline" size="sm">Fleksibel / setiap hari</M3Badge>}
                        </div>
                        {item.notes && <p className="mt-2 text-[11.5px] leading-5 text-md-on-surface-variant">{item.notes}</p>}
                      </div>
                    </div>
                    {canManage && (
                      <div className="mt-3 flex justify-end gap-2">
                        <M3Button variant="text" size="sm" onClick={() => openEditAssignment(item)}>Ubah</M3Button>
                        <M3Button variant="text" size="sm" loading={busyId === item.id} onClick={() => archiveAssignment(item)}>Akhiri</M3Button>
                      </div>
                    )}
                  </M3Card>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "additional" && (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-end gap-2">
              {canManage && <M3Button variant="tonal" size="sm" icon="sports" onClick={() => openNewAssignment("EXTRACURRICULAR_ADVISOR")}>Pembina Ekskul</M3Button>}
              {canManage && <M3Button variant="filled" size="sm" icon="add" onClick={() => openNewAssignment("OTHER")}>Tugas Tambahan</M3Button>}
            </div>
            {[...data.assignments.extracurricularAdvisors, ...data.assignments.otherAssignments].length === 0 ? (
              <M3EmptyState icon="assignment_ind" title="Belum ada tugas tambahan lain" description="Pembina ekstrakurikuler, koordinator literasi, ketua tim, dan tugas khusus sekolah dapat dicatat di sini." />
            ) : (
              <M3Card variant="outlined" className="overflow-hidden p-0">
                <M3Table>
                  <M3TableHeader><M3TableRow><M3TableHead>Penugasan</M3TableHead><M3TableHead>Guru/Tendik</M3TableHead><M3TableHead>Periode</M3TableHead><M3TableHead>Catatan</M3TableHead>{canManage && <M3TableHead className="text-right">Aksi</M3TableHead>}</M3TableRow></M3TableHeader>
                  <M3TableBody>
                    {[...data.assignments.extracurricularAdvisors, ...data.assignments.otherAssignments].map((item: any) => (
                      <M3TableRow key={item.id}>
                        <M3TableCell><M3Badge variant="tertiary" size="sm">{item.displayTitle}</M3Badge></M3TableCell>
                        <M3TableCell className="font-semibold">{teacherLabel(item.teacher)}</M3TableCell>
                        <M3TableCell>{item.academicYear ? `${item.academicYear.yearName} · ${item.academicYear.semester}` : "Berlaku umum"}</M3TableCell>
                        <M3TableCell>{item.notes || "-"}</M3TableCell>
                        {canManage && <M3TableCell className="text-right"><div className="flex justify-end gap-1"><M3Button variant="text" size="sm" onClick={() => openEditAssignment(item)}>Ubah</M3Button><M3Button variant="text" size="sm" loading={busyId === item.id} onClick={() => archiveAssignment(item)}>Akhiri</M3Button></div></M3TableCell>}
                      </M3TableRow>
                    ))}
                  </M3TableBody>
                </M3Table>
              </M3Card>
            )}
          </div>
        )}

        {tab === "history" && (
          <M3Card variant="outlined" className="overflow-hidden p-0">
            <div className="border-b border-md-outline-variant/40 p-4">
              <h2 className="text-sm font-bold text-md-on-surface">Riwayat Penugasan</h2>
              <p className="mt-0.5 text-xs text-md-on-surface-variant">Penugasan yang diakhiri tetap disimpan untuk jejak administrasi.</p>
            </div>
            {!data.assignments.history.length ? (
              <div className="p-5"><M3EmptyState compact icon="history" title="Belum ada riwayat" description="Riwayat muncul setelah penugasan generik diakhiri." /></div>
            ) : (
              <M3Table>
                <M3TableHeader><M3TableRow><M3TableHead>Penugasan</M3TableHead><M3TableHead>Guru/Tendik</M3TableHead><M3TableHead>Periode</M3TableHead><M3TableHead>Status</M3TableHead></M3TableRow></M3TableHeader>
                <M3TableBody>
                  {data.assignments.history.map((item: any) => (
                    <M3TableRow key={item.id}>
                      <M3TableCell>{item.displayTitle}</M3TableCell>
                      <M3TableCell>{teacherLabel(item.teacher)}</M3TableCell>
                      <M3TableCell>{item.academicYear ? `${item.academicYear.yearName} · ${item.academicYear.semester}` : "Berlaku umum"}</M3TableCell>
                      <M3TableCell><M3Badge variant="outline" size="sm">Selesai</M3Badge></M3TableCell>
                    </M3TableRow>
                  ))}
                </M3TableBody>
              </M3Table>
            )}
          </M3Card>
        )}

        <M3Dialog
          isOpen={assignmentDialogOpen}
          onClose={() => !submitting && setAssignmentDialogOpen(false)}
          title={assignmentForm.id ? "Ubah Penugasan" : `Tambah ${assignmentRoleLabel(assignmentForm.role)}`}
          subtitle="Penugasan aktif akan langsung memengaruhi tampilan tanggung jawab dan hak akses yang relevan."
          icon={STAFF_ASSIGNMENT_META[assignmentForm.role].icon}
          maxWidth="lg"
          actions={
            <>
              <M3Button variant="text" onClick={() => setAssignmentDialogOpen(false)} disabled={submitting}>Batal</M3Button>
              <M3Button variant="filled" onClick={saveAssignment} loading={submitting}>Simpan Penugasan</M3Button>
            </>
          }
        >
          <div className="space-y-4">
            <M3Select
              label="Guru / Tendik"
              value={assignmentForm.teacherId}
              onChange={(event) => setAssignmentForm((current) => ({ ...current, teacherId: event.target.value }))}
              options={teacherOptions}
            />

            {assignmentForm.role !== "PRINCIPAL" && (
              <M3Select
                label="Periode"
                supportingText="Kosong berarti penugasan berlaku umum; default mengikuti tahun ajaran aktif."
                value={assignmentForm.academicYearId}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, academicYearId: event.target.value }))}
                options={academicYearOptions}
              />
            )}

            {assignmentForm.role === "DEPARTMENT_HEAD" && (
              <M3Select
                label="Program / Konsentrasi Keahlian"
                value={assignmentForm.departmentId}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, departmentId: event.target.value }))}
                options={departmentOptions}
              />
            )}

            {assignmentForm.role === "EXTRACURRICULAR_ADVISOR" && (
              <M3TextField
                label="Nama Ekstrakurikuler"
                placeholder="Contoh: Pramuka, Paskibra, Futsal"
                value={assignmentForm.unitName}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, unitName: event.target.value }))}
              />
            )}

            {assignmentForm.role === "OTHER" && (
              <M3TextField
                label="Nama Tugas Tambahan"
                placeholder="Contoh: Koordinator Literasi"
                value={assignmentForm.customTitle}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, customTitle: event.target.value }))}
              />
            )}

            {assignmentForm.role === "DUTY_TEACHER" && (
              <div>
                <p className="text-[13px] font-semibold text-md-on-surface">Hari Piket</p>
                <p className="mt-0.5 text-[11.5px] leading-5 text-md-on-surface-variant">Tidak memilih hari berarti penugasan fleksibel/setiap hari sekolah.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DUTY_DAY_CODES.map((day) => {
                    const checked = assignmentForm.dutyDays.includes(day);
                    return (
                      <label
                        key={day}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-[9px] border px-3 py-2 text-xs font-medium transition-colors ${checked ? "border-md-primary bg-md-primary-container text-md-on-primary-container" : "border-md-outline-variant bg-md-surface text-md-on-surface"}`}
                      >
                        <input
                          type="checkbox"
                          className="size-4 accent-[var(--md-sys-color-primary)]"
                          checked={checked}
                          onChange={() =>
                            setAssignmentForm((current) => ({
                              ...current,
                              dutyDays: checked
                                ? current.dutyDays.filter((item) => item !== day)
                                : [...current.dutyDays, day],
                            }))
                          }
                        />
                        {DUTY_DAY_LABELS[day]}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-md-on-surface">Catatan administrasi</label>
              <textarea
                className="min-h-24 w-full resize-y rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-3 text-[13px] text-md-on-surface outline-none transition focus:border-md-primary focus:ring-2 focus:ring-md-primary/15"
                placeholder="Opsional: dasar penugasan, nomor SK, ruang lingkup, atau catatan lainnya."
                value={assignmentForm.notes}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>

            {assignmentForm.id && canManage && (
              <div className="border-t border-md-outline-variant/40 pt-3">
                <M3Button
                  variant="text"
                  size="sm"
                  onClick={() => {
                    const current = data.assignments.active.find((item: any) => item.id === assignmentForm.id);
                    if (current) {
                      setAssignmentDialogOpen(false);
                      archiveAssignment(current);
                    }
                  }}
                >
                  Akhiri Penugasan
                </M3Button>
              </div>
            )}
          </div>
        </M3Dialog>

        <M3Dialog
          isOpen={wakasekDialogOpen}
          onClose={() => !submitting && setWakasekDialogOpen(false)}
          title={`Tambah ${WAKASEK_ROLE_META[wakasekRole].label}`}
          subtitle="Satu guru dapat memegang lebih dari satu bidang Wakasek."
          icon={WAKASEK_ROLE_META[wakasekRole].icon}
          actions={
            <>
              <M3Button variant="text" onClick={() => setWakasekDialogOpen(false)} disabled={submitting}>Batal</M3Button>
              <M3Button variant="filled" onClick={addWakasek} loading={submitting}>Tetapkan</M3Button>
            </>
          }
        >
          <M3Select
            label="Guru / Tendik"
            value={wakasekTeacherId}
            onChange={(event) => setWakasekTeacherId(event.target.value)}
            options={teacherOptions}
          />
        </M3Dialog>
      </div>
    </SchoolLayout>
  );
}
