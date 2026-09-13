import { useEffect, useMemo, useRef, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  addFollowUpComment,
  createManualFollowUpCase,
  getFollowUpWorkflowData,
  syncFollowUpFindings,
  updateFollowUpCase,
  useQuery,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  FOLLOW_UP_SEVERITIES,
  FOLLOW_UP_SEVERITY_META,
  FOLLOW_UP_STATUS_META,
  nextFollowUpStatuses,
  type FollowUpSeverityCode,
  type FollowUpStatusCode,
} from "../followUp";
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
  M3TextField,
  M3Tabs,
} from "../../client/components/m3";

const SOURCE_META: Record<string, { label: string; icon: string }> = {
  ATTENDANCE: { label: "Presensi", icon: "fact_check" },
  PKL_EWS: { label: "EWS PKL", icon: "warning" },
  DUTY_TEACHER: { label: "Guru Piket", icon: "schedule" },
  HOMEROOM: { label: "Wali Kelas", icon: "supervisor_account" },
  WAKASEK: { label: "Wakasek", icon: "verified_user" },
  SYSTEM: { label: "Sistem", icon: "settings_suggest" },
  MANUAL: { label: "Manual", icon: "edit_note" },
};

function personName(person: any) {
  return person?.name || person?.username || person?.email || "Belum ditetapkan";
}

function statusBadgeVariant(status: FollowUpStatusCode) {
  if (status === "RESOLVED") return "success" as const;
  if (status === "CANCELED") return "outline" as const;
  if (status === "IN_PROGRESS") return "primary" as const;
  if (status === "ASSIGNED") return "secondary" as const;
  return "warning" as const;
}

function severityBadgeVariant(severity: FollowUpSeverityCode) {
  if (severity === "CRITICAL") return "error" as const;
  if (severity === "HIGH") return "warning" as const;
  if (severity === "MEDIUM") return "secondary" as const;
  return "outline" as const;
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toDateTimeLocal(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function isOverdue(item: any) {
  if (!item.dueAt || item.status === "RESOLVED" || item.status === "CANCELED") return false;
  return new Date(item.dueAt).getTime() < Date.now();
}

export function FollowUpWorkflowPage({ user }: { user: AuthUser }) {
  const [view, setView] = useState<"ACTIVE" | "MINE" | "HISTORY">("ACTIVE");
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const hasAutoSynced = useRef(false);

  const query = useQuery(getFollowUpWorkflowData, {
    view,
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
    search: search || undefined,
  });
  const data = query.data as any;
  const selected = useMemo(
    () => data?.cases?.find((item: any) => item.id === selectedId) || null,
    [data?.cases, selectedId],
  );

  const requestedCaseId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("case");
  }, []);

  const [manualForm, setManualForm] = useState({
    title: "",
    description: "",
    severity: "MEDIUM" as FollowUpSeverityCode,
    subjectStudentId: "",
    assignedToId: "",
    dueAt: "",
    sourceType: "MANUAL" as "MANUAL" | "HOMEROOM" | "WAKASEK",
  });

  const runSync = async (silent = false) => {
    setSyncing(true);
    if (!silent) setFeedback(null);
    try {
      const result = await syncFollowUpFindings({});
      await query.refetch();
      if (!silent) {
        setFeedback({
          type: "success",
          text: `Sinkronisasi selesai: ${result.scanned} temuan diperiksa, ${result.created} kasus baru, ${result.updated} kasus diperbarui.`,
        });
      }
    } catch (error: any) {
      if (!silent) setFeedback({ type: "error", text: error?.message || "Sinkronisasi temuan gagal." });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (data?.access?.canSeeAll && !hasAutoSynced.current) {
      hasAutoSynced.current = true;
      void runSync(true);
    }
    // run once after access is known
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.access?.canSeeAll]);

  useEffect(() => {
    if (!selectedId && requestedCaseId && data?.cases?.some((item: any) => item.id === requestedCaseId)) {
      setSelectedId(requestedCaseId);
      return;
    }
    if (selectedId && data?.cases && !data.cases.some((item: any) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [data?.cases, requestedCaseId, selectedId]);

  const openManual = (sourceType: "MANUAL" | "HOMEROOM" | "WAKASEK" = "MANUAL") => {
    setManualForm({
      title: "",
      description: "",
      severity: "MEDIUM",
      subjectStudentId: "",
      assignedToId: "",
      dueAt: "",
      sourceType,
    });
    setManualOpen(true);
  };

  const createManual = async () => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const created = await createManualFollowUpCase({
        title: manualForm.title,
        description: manualForm.description,
        severity: manualForm.severity,
        subjectStudentId: manualForm.subjectStudentId || null,
        assignedToId: manualForm.assignedToId || null,
        dueAt: manualForm.dueAt || null,
        sourceType: manualForm.sourceType,
      });
      setManualOpen(false);
      setView("ACTIVE");
      await query.refetch();
      setSelectedId(created.id);
      setFeedback({ type: "success", text: "Tindak lanjut baru berhasil dibuat." });
    } catch (error: any) {
      setFeedback({ type: "error", text: error?.message || "Gagal membuat tindak lanjut." });
    } finally {
      setSubmitting(false);
    }
  };

  const saveCase = async (payload: Record<string, unknown>) => {
    if (!selected) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await updateFollowUpCase({ id: selected.id, ...payload });
      await query.refetch();
      setFeedback({ type: "success", text: "Tindak lanjut berhasil diperbarui." });
    } catch (error: any) {
      setFeedback({ type: "error", text: error?.message || "Gagal memperbarui tindak lanjut." });
    } finally {
      setSubmitting(false);
    }
  };

  const addComment = async () => {
    if (!selected || !comment.trim()) return;
    setSubmitting(true);
    try {
      await addFollowUpComment({ id: selected.id, note: comment.trim() });
      setComment("");
      await query.refetch();
    } catch (error: any) {
      setFeedback({ type: "error", text: error?.message || "Gagal menambahkan catatan." });
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { id: "ACTIVE", label: "Kasus Aktif", icon: "inbox", badge: data?.stats?.active || undefined },
    { id: "MINE", label: "Kasus Saya", icon: "person", badge: data?.stats?.mine || undefined },
    { id: "HISTORY", label: "Riwayat", icon: "history" },
  ];

  const statusOptions = [
    { value: "", label: "Semua status" },
    { value: "FINDING", label: "Temuan" },
    { value: "ASSIGNED", label: "Ditugaskan" },
    { value: "IN_PROGRESS", label: "Diproses" },
    ...(view === "HISTORY"
      ? [
          { value: "RESOLVED", label: "Selesai" },
          { value: "CANCELED", label: "Dibatalkan" },
        ]
      : []),
  ];

  const severityOptions = [
    { value: "", label: "Semua prioritas" },
    ...FOLLOW_UP_SEVERITIES.map((severity) => ({
      value: severity,
      label: FOLLOW_UP_SEVERITY_META[severity].label,
    })),
  ];

  return (
    <SchoolLayout user={user}>
      <div className="space-y-5">
        <header className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="v2-eyebrow">OPERASIONAL SEKOLAH</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.025em] text-md-on-surface">Tindak Lanjut Terpadu</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-md-on-surface-variant">
              Temuan lintas Presensi, EWS PKL, Guru Piket, Wali Kelas, Wakasek, dan sistem dikelola dalam satu alur kerja sampai selesai.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data?.access?.canSeeAll && (
              <M3Button variant="outlined" size="sm" icon="sync" loading={syncing} onClick={() => runSync(false)}>
                Sinkronkan Temuan
              </M3Button>
            )}
            <M3Button variant="filled" size="sm" icon="add" onClick={() => openManual("MANUAL")}>
              Tindak Lanjut Baru
            </M3Button>
          </div>
        </header>

        {feedback && (
          <M3Banner
            variant={feedback.type === "success" ? "success" : "error"}
            headline={feedback.type === "success" ? "Berhasil" : "Perlu diperiksa"}
            supportingText={feedback.text}
            dismissible
            onDismiss={() => setFeedback(null)}
          />
        )}

        {data?.access?.canSeeAll && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <M3StatCard label="Temuan belum ditugaskan" value={data.stats.FINDING} tone={data.stats.FINDING ? "orange" : "green"} />
            <M3StatCard label="Sudah ditugaskan" value={data.stats.ASSIGNED} tone="blue" />
            <M3StatCard label="Sedang diproses" value={data.stats.IN_PROGRESS} tone="teal" />
            <M3StatCard label="Lewat tenggat" value={data.stats.overdue} tone={data.stats.overdue ? "orange" : "green"} />
          </div>
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <M3Tabs
            tabs={tabs}
            activeTab={view}
            onChange={(next) => {
              setView(next as "ACTIVE" | "MINE" | "HISTORY");
              setStatusFilter("");
              setSelectedId(null);
            }}
          />
          <div className="grid w-full gap-2 sm:grid-cols-[1fr_180px_170px] lg:max-w-2xl">
            <M3TextField
              size="sm"
              placeholder="Cari kasus, siswa, atau penanggung jawab"
              leadingIcon="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <M3Select
              size="sm"
              options={statusOptions}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            />
            <M3Select
              size="sm"
              options={severityOptions}
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value)}
            />
          </div>
        </div>

        {query.isLoading && !data ? (
          <div className="flex min-h-[360px] items-center justify-center"><M3CircularProgress size={40} /></div>
        ) : query.error ? (
          <M3Banner
            variant="error"
            headline="Workflow belum dapat dimuat"
            supportingText={(query.error as any)?.message || "Coba muat ulang data tindak lanjut."}
            actionLabel="Coba Lagi"
            onAction={() => query.refetch()}
          />
        ) : !data?.cases?.length ? (
          <M3EmptyState
            icon={view === "HISTORY" ? "history" : "task_alt"}
            title={view === "HISTORY" ? "Belum ada riwayat penyelesaian" : "Tidak ada kasus pada filter ini"}
            description={
              view === "HISTORY"
                ? "Kasus yang selesai atau dibatalkan akan tersimpan di sini."
                : "Temuan baru dari modul operasional akan muncul setelah disinkronkan atau dibuat secara manual."
            }
            actionLabel={view !== "HISTORY" ? "Buat Tindak Lanjut" : undefined}
            onAction={view !== "HISTORY" ? () => openManual("MANUAL") : undefined}
          />
        ) : (
          <div className="grid gap-3">
            {data.cases.map((item: any) => {
              const source = SOURCE_META[item.sourceType] || SOURCE_META.MANUAL;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className="hig-grouped-surface w-full p-4 text-left transition-transform hover:-translate-y-[1px] hover:shadow-sm sm:p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-black/[.045] text-md-on-surface dark:bg-white/[.08]">
                      <M3Icon name={source.icon} size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <M3Badge variant={severityBadgeVariant(item.severity)} size="sm">
                          {FOLLOW_UP_SEVERITY_META[item.severity as FollowUpSeverityCode].label}
                        </M3Badge>
                        <M3Badge variant={statusBadgeVariant(item.status)} size="sm">
                          {FOLLOW_UP_STATUS_META[item.status as FollowUpStatusCode].label}
                        </M3Badge>
                        <M3Badge variant="outline" size="sm">{source.label}</M3Badge>
                        {isOverdue(item) && <M3Badge variant="error" size="sm">Lewat tenggat</M3Badge>}
                      </div>
                      <h2 className="mt-2 text-[14px] font-bold text-md-on-surface">{item.title}</h2>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-md-on-surface-variant">{item.description}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-md-on-surface-variant">
                        {item.subjectStudent && <span>Siswa: <strong>{personName(item.subjectStudent)}</strong>{item.subjectStudent.classRoom?.name ? ` · ${item.subjectStudent.classRoom.name}` : ""}</span>}
                        <span>PIC: <strong>{personName(item.assignedTo)}</strong></span>
                        <span>Tenggat: <strong>{formatDateTime(item.dueAt)}</strong></span>
                      </div>
                    </div>
                    <span className="text-[22px] font-light text-md-on-surface-variant/40">›</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <M3Dialog
          isOpen={!!selected}
          onClose={() => setSelectedId(null)}
          title={selected?.title || "Detail Tindak Lanjut"}
          subtitle={selected ? `${SOURCE_META[selected.sourceType]?.label || "Temuan"} · Dibuat ${formatDateTime(selected.createdAt)}` : undefined}
          icon={selected ? SOURCE_META[selected.sourceType]?.icon || "assignment" : "assignment"}
          maxWidth="xl"
          actions={<M3Button variant="text" onClick={() => setSelectedId(null)}>Tutup</M3Button>}
        >
          {selected && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-1.5">
                <M3Badge variant={severityBadgeVariant(selected.severity)}>
                  {FOLLOW_UP_SEVERITY_META[selected.severity as FollowUpSeverityCode].label}
                </M3Badge>
                <M3Badge variant={statusBadgeVariant(selected.status)}>
                  {FOLLOW_UP_STATUS_META[selected.status as FollowUpStatusCode].label}
                </M3Badge>
                {isOverdue(selected) && <M3Badge variant="error">Lewat tenggat</M3Badge>}
              </div>

              <M3Card variant="outlined" className="p-4">
                <p className="text-[12.5px] leading-6 text-md-on-surface">{selected.description}</p>
                <div className="mt-3 grid gap-2 text-[11.5px] text-md-on-surface-variant sm:grid-cols-2">
                  <p>Siswa: <strong className="text-md-on-surface">{selected.subjectStudent ? personName(selected.subjectStudent) : "-"}</strong></p>
                  <p>Rombel: <strong className="text-md-on-surface">{selected.subjectStudent?.classRoom?.name || "-"}</strong></p>
                  <p>PIC: <strong className="text-md-on-surface">{personName(selected.assignedTo)}</strong></p>
                  <p>Tenggat: <strong className="text-md-on-surface">{formatDateTime(selected.dueAt)}</strong></p>
                </div>
                {selected.sourceUrl && (
                  <div className="mt-3 border-t border-md-outline-variant/40 pt-3">
                    <M3Button href={selected.sourceUrl} variant="text" size="sm" icon="open_in_new">Buka Sumber Temuan</M3Button>
                  </div>
                )}
              </M3Card>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-[12px] font-bold uppercase tracking-[.05em] text-md-on-surface-variant">Pengelolaan Kasus</h3>

                  {data.access.canAssign && (
                    <M3Select
                      label="Penanggung Jawab"
                      value={selected.assignedTo?.id || ""}
                      options={[
                        { value: "", label: "Belum ditetapkan" },
                        ...data.assignees.map((person: any) => ({ value: person.id, label: personName(person) })),
                      ]}
                      onChange={(event) => saveCase({ assignedToId: event.target.value || null })}
                    />
                  )}

                  <M3Select
                    label="Prioritas"
                    value={selected.severity}
                    options={FOLLOW_UP_SEVERITIES.map((severity) => ({
                      value: severity,
                      label: FOLLOW_UP_SEVERITY_META[severity].label,
                    }))}
                    onChange={(event) => saveCase({ severity: event.target.value })}
                  />

                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold text-md-on-surface">Tenggat</label>
                    <input
                      type="datetime-local"
                      className="h-11 w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3 text-[13px] text-md-on-surface outline-none focus:border-md-primary focus:ring-2 focus:ring-md-primary/15"
                      defaultValue={toDateTimeLocal(selected.dueAt)}
                      onBlur={(event) => {
                        if (event.target.value !== toDateTimeLocal(selected.dueAt)) {
                          void saveCase({ dueAt: event.target.value || null });
                        }
                      }}
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-[13px] font-semibold text-md-on-surface">Ubah Status</p>
                    <div className="flex flex-wrap gap-2">
                      {nextFollowUpStatuses(selected.status as FollowUpStatusCode).map((status) => (
                        <M3Button
                          key={status}
                          variant={status === "RESOLVED" ? "filled" : "tonal"}
                          size="sm"
                          loading={submitting}
                          onClick={() => {
                            if (status === "RESOLVED") {
                              const note = window.prompt("Catatan penyelesaian (disarankan):", selected.resolutionNote || "");
                              if (note === null) return;
                              void saveCase({ status, resolutionNote: note || null });
                            } else {
                              void saveCase({ status });
                            }
                          }}
                        >
                          {FOLLOW_UP_STATUS_META[status].label}
                        </M3Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[12px] font-bold uppercase tracking-[.05em] text-md-on-surface-variant">Catatan & Riwayat</h3>
                  <div className="flex gap-2">
                    <M3TextField
                      placeholder="Tambahkan catatan tindak lanjut..."
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                    />
                    <M3Button variant="tonal" icon="send" loading={submitting} disabled={!comment.trim()} onClick={addComment}>
                      Kirim
                    </M3Button>
                  </div>
                  <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                    {selected.events.map((event: any) => (
                      <div key={event.id} className="rounded-[11px] border border-md-outline-variant/45 bg-md-surface-container-low/45 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[11.5px] font-semibold text-md-on-surface">{personName(event.actor)}</p>
                          <span className="text-[10.5px] text-md-on-surface-variant">{formatDateTime(event.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-[11.5px] leading-5 text-md-on-surface-variant">
                          {event.note || (
                            event.type === "STATUS_CHANGED"
                              ? `Status: ${event.fromStatus ? FOLLOW_UP_STATUS_META[event.fromStatus as FollowUpStatusCode]?.label : "-"} → ${event.toStatus ? FOLLOW_UP_STATUS_META[event.toStatus as FollowUpStatusCode]?.label : "-"}`
                              : event.type
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </M3Dialog>

        <M3Dialog
          isOpen={manualOpen}
          onClose={() => !submitting && setManualOpen(false)}
          title="Tindak Lanjut Baru"
          subtitle="Catat temuan manual dari Wali Kelas, Wakasek, rapat, observasi, atau sumber operasional lain."
          icon="add_task"
          maxWidth="lg"
          actions={
            <>
              <M3Button variant="text" onClick={() => setManualOpen(false)} disabled={submitting}>Batal</M3Button>
              <M3Button variant="filled" onClick={createManual} loading={submitting}>Buat Tindak Lanjut</M3Button>
            </>
          }
        >
          <div className="space-y-4">
            <M3Select
              label="Sumber"
              value={manualForm.sourceType}
              options={[
                { value: "MANUAL", label: "Temuan manual" },
                { value: "HOMEROOM", label: "Wali Kelas" },
                { value: "WAKASEK", label: "Wakasek" },
              ]}
              onChange={(event) => setManualForm((current) => ({ ...current, sourceType: event.target.value as any }))}
            />
            <M3TextField
              label="Judul Temuan"
              placeholder="Contoh: Siswa membutuhkan pemanggilan orang tua"
              value={manualForm.title}
              onChange={(event) => setManualForm((current) => ({ ...current, title: event.target.value }))}
            />
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-md-on-surface">Deskripsi</label>
              <textarea
                className="min-h-28 w-full resize-y rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-3 text-[13px] text-md-on-surface outline-none focus:border-md-primary focus:ring-2 focus:ring-md-primary/15"
                placeholder="Jelaskan temuan, bukti awal, dan tindakan yang diharapkan."
                value={manualForm.description}
                onChange={(event) => setManualForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <M3Select
                label="Prioritas"
                value={manualForm.severity}
                options={FOLLOW_UP_SEVERITIES.map((severity) => ({ value: severity, label: FOLLOW_UP_SEVERITY_META[severity].label }))}
                onChange={(event) => setManualForm((current) => ({ ...current, severity: event.target.value as FollowUpSeverityCode }))}
              />
              <M3Select
                label="Siswa Terkait"
                value={manualForm.subjectStudentId}
                options={[
                  { value: "", label: "Tidak terkait siswa tertentu" },
                  ...(data?.studentOptions || []).map((student: any) => ({
                    value: student.id,
                    label: `${personName(student)}${student.classRoom?.name ? ` · ${student.classRoom.name}` : ""}`,
                  })),
                ]}
                onChange={(event) => setManualForm((current) => ({ ...current, subjectStudentId: event.target.value }))}
              />
            </div>
            {data?.access?.canAssign && (
              <M3Select
                label="Penanggung Jawab"
                value={manualForm.assignedToId}
                options={[
                  { value: "", label: "Belum ditetapkan" },
                  ...(data?.assignees || []).map((person: any) => ({ value: person.id, label: personName(person) })),
                ]}
                onChange={(event) => setManualForm((current) => ({ ...current, assignedToId: event.target.value }))}
              />
            )}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-md-on-surface">Tenggat opsional</label>
              <input
                type="datetime-local"
                className="h-11 w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3 text-[13px] text-md-on-surface outline-none focus:border-md-primary focus:ring-2 focus:ring-md-primary/15"
                value={manualForm.dueAt}
                onChange={(event) => setManualForm((current) => ({ ...current, dueAt: event.target.value }))}
              />
              <p className="mt-1 text-[11px] text-md-on-surface-variant">Jika dikosongkan, sistem menentukan tenggat berdasarkan prioritas.</p>
            </div>
          </div>
        </M3Dialog>
      </div>
    </SchoolLayout>
  );
}
