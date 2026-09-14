import { useEffect, useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useNavigate } from "react-router";
import {
  ensureUnifiedRiskFollowUp,
  getUnifiedStudentRiskData,
  useQuery,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  STUDENT_RISK_LEVEL_META,
  STUDENT_RISK_SOURCE_META,
  STUDENT_RISK_SOURCES,
  type StudentRiskLevel,
  type StudentRiskSource,
} from "../studentRisk";
import {
  M3Badge,
  M3Banner,
  M3Button,
  M3CircularProgress,
  M3Dialog,
  M3EmptyState,
  M3Icon,
  M3Select,
  M3StatCard,
  M3TextField,
} from "../../client/components/m3";

function riskBadge(level: StudentRiskLevel) {
  if (level === "CRITICAL") return "error" as const;
  if (level === "HIGH") return "warning" as const;
  if (level === "MEDIUM") return "secondary" as const;
  if (level === "WATCH") return "primary" as const;
  return "success" as const;
}

function trendBadge(code: string) {
  if (code === "WORSENING") return "error" as const;
  if (code === "IMPROVING") return "success" as const;
  return "outline" as const;
}

function scoreBarClass(level: StudentRiskLevel) {
  if (level === "CRITICAL") return "bg-md-error";
  if (level === "HIGH") return "bg-[#FF9500] dark:bg-[#FF9F0A]";
  if (level === "MEDIUM") return "bg-[#FFCC00] dark:bg-[#FFD60A]";
  if (level === "WATCH") return "bg-md-primary";
  return "bg-md-secondary";
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

function sourceRows(profile: any) {
  return (profile.sourceOrder as StudentRiskSource[])
    .filter((source) => profile.allowedSources.includes(source))
    .map((source) => ({
      source,
      meta: STUDENT_RISK_SOURCE_META[source],
      score: profile.sourceScores[source] || 0,
    }));
}

export function EarlyWarningSystemPage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const query = useQuery(getUnifiedStudentRiskData);
  const [search, setSearch] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [classRoomId, setClassRoomId] = useState("");
  const [source, setSource] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creatingFollowUp, setCreatingFollowUp] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const data = query.data as any;
  const requestedStudent = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("student");
  }, []);

  useEffect(() => {
    if (!selectedId && requestedStudent && data?.profiles?.some((item: any) => item.student.id === requestedStudent)) {
      setSelectedId(requestedStudent);
    }
  }, [data?.profiles, requestedStudent, selectedId]);

  const profiles = useMemo(() => {
    if (!data?.profiles) return [];
    const term = search.trim().toLowerCase();
    return data.profiles.filter((profile: any) => {
      if (riskLevel && profile.level !== riskLevel) return false;
      if (classRoomId && profile.student.classRoom?.id !== classRoomId) return false;
      if (source && (profile.sourceScores[source] || 0) <= 0) return false;
      if (!term) return true;
      return [
        profile.student.displayName,
        profile.student.nis,
        profile.student.nisn,
        profile.student.classRoom?.name,
        profile.student.classRoom?.department?.code,
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
    });
  }, [data?.profiles, search, riskLevel, classRoomId, source]);

  const selected = useMemo(
    () => data?.profiles?.find((profile: any) => profile.student.id === selectedId) || null,
    [data?.profiles, selectedId],
  );

  const createFollowUp = async () => {
    if (!selected) return;
    setCreatingFollowUp(true);
    setFeedback(null);
    try {
      const result = await ensureUnifiedRiskFollowUp({ studentId: selected.student.id });
      setSelectedId(null);
      navigate("/school/follow-up?case=" + result.id);
    } catch (error: any) {
      setFeedback(error?.message || "Tindak lanjut EWS belum berhasil dibuat.");
    } finally {
      setCreatingFollowUp(false);
    }
  };

  if (query.isLoading && !data) {
    return (
      <SchoolLayout user={user}>
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-3" aria-live="polite" aria-busy="true">
          <M3CircularProgress size={34} />
          <p className="text-[12.5px] text-md-on-surface-variant">Menyusun profil risiko lintas modul...</p>
        </div>
      </SchoolLayout>
    );
  }

  if (query.error || !data) {
    const message = String((query.error as any)?.message || "");
    const forbidden = (query.error as any)?.statusCode === 403 || message.includes("tidak tersedia");
    return (
      <SchoolLayout user={user}>
        <section className="hig-grouped-surface px-4 sm:px-5">
          <M3EmptyState
            icon={forbidden ? "lock" : "cloud_off"}
            title={forbidden ? "EWS terpadu tidak tersedia untuk akun ini" : "EWS terpadu belum dapat dimuat"}
            description={forbidden
              ? "Akses mengikuti tanggung jawab resmi: pimpinan sekolah, Wakasek terkait, Wali Kelas, Kaprog/Kakomli, pembimbing PKL, atau pembimbing DUDI."
              : "Data sumber tidak diubah. Coba muat ulang profil risiko."}
            actionLabel={forbidden ? undefined : "Coba lagi"}
            onAction={forbidden ? undefined : () => query.refetch()}
          />
        </section>
      </SchoolLayout>
    );
  }

  const highOrCritical = data.summary.highOrCritical || 0;

  return (
    <SchoolLayout user={user}>
      <div className="space-y-5">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="v2-eyebrow">EARLY WARNING SYSTEM · GEN 2</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.025em] text-md-on-surface">Risiko Siswa Terpadu</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-md-on-surface-variant">
              Presensi, Kesiswaan, LMS/tugas, PKL, dan Tindak Lanjut digabung menjadi satu profil risiko yang dapat ditelusuri kembali ke bukti sumber.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <M3Badge variant={data.access.canViewAll ? "primary" : "outline"}>{data.access.scopeLabel}</M3Badge>
            <M3Button variant="outlined" size="sm" icon="refresh" onClick={() => query.refetch()}>Segarkan</M3Button>
          </div>
        </header>

        {feedback && (
          <M3Banner
            variant="error"
            headline="Tindak lanjut belum dibuat"
            supportingText={feedback}
            dismissible
            onDismiss={() => setFeedback(null)}
          />
        )}

        <section className="hig-grouped-surface overflow-hidden">
          <div className="flex min-h-[82px] items-center gap-3 px-4 py-4 sm:px-5">
            <span className={"flex size-11 shrink-0 items-center justify-center rounded-[12px] text-white shadow-[0_1px_2px_rgba(0,0,0,.14)] " + (
              data.summary.levelCounts.CRITICAL > 0
                ? "bg-md-error"
                : highOrCritical > 0
                  ? "bg-[#FF9500] dark:bg-[#FF9F0A]"
                  : data.summary.atRisk > 0
                    ? "bg-[#FFCC00] dark:bg-[#FFD60A]"
                    : "bg-[#34C759] dark:bg-[#30D158]"
            )}>
              <M3Icon name="health_and_safety" size={23} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[14px] font-semibold text-md-on-surface">
                {data.summary.levelCounts.CRITICAL > 0
                  ? data.summary.levelCounts.CRITICAL + " siswa berada pada risiko kritis"
                  : highOrCritical > 0
                    ? highOrCritical + " siswa berada pada risiko tinggi/kritis"
                    : data.summary.atRisk > 0
                      ? data.summary.atRisk + " siswa perlu perhatian sedang atau lebih"
                      : "Tidak ada profil dengan risiko sedang atau lebih"}
              </h2>
              <p className="mt-0.5 text-[11.5px] leading-5 text-md-on-surface-variant">
                Skor adalah alat prioritisasi, bukan diagnosis. Bukti sumber tetap perlu diverifikasi sekolah sebelum intervensi.
              </p>
            </div>
            <M3Badge variant={highOrCritical > 0 ? "warning" : data.summary.atRisk > 0 ? "secondary" : "success"}>
              {highOrCritical > 0 ? "Prioritas" : data.summary.atRisk > 0 ? "Pantau" : "Normal"}
            </M3Badge>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <M3StatCard label="Siswa terpantau" value={data.summary.totalStudents} tone="blue" />
          <M3StatCard label="Risiko kritis" value={data.summary.levelCounts.CRITICAL} tone={data.summary.levelCounts.CRITICAL ? "orange" : "green"} />
          <M3StatCard label="Risiko tinggi" value={data.summary.levelCounts.HIGH} tone={data.summary.levelCounts.HIGH ? "orange" : "green"} />
          <M3StatCard label="Perhatian sedang" value={data.summary.levelCounts.MEDIUM} tone={data.summary.levelCounts.MEDIUM ? "amber" : "green"} />
          <M3StatCard label="Tren memburuk" value={data.summary.worsening} tone={data.summary.worsening ? "orange" : "green"} />
        </div>

        <section className="hig-grouped-surface overflow-hidden">
          <div className="border-b border-md-outline-variant px-4 py-3 sm:px-5">
            <h2 className="hig-section-title">Sumber sinyal</h2>
            <p className="hig-section-note mt-0.5">Kontribusi dibatasi per sumber agar satu jenis data tidak mendominasi seluruh skor.</p>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-5">
            {STUDENT_RISK_SOURCES.map((code, index) => {
              const meta = STUDENT_RISK_SOURCE_META[code];
              const total = data.summary.sourceTotals[code];
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSource(source === code ? "" : code)}
                  className={"flex min-h-[76px] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[.025] dark:hover:bg-white/[.04] " +
                    (index ? "border-t border-md-outline-variant sm:border-l sm:border-t-0 " : "") +
                    (source === code ? "bg-md-primary-container/25" : "")}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-md-surface-container-high text-md-on-surface-variant">
                    <M3Icon name={meta.icon} size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold text-md-on-surface">{meta.label}</span>
                    <span className="block text-[10.5px] text-md-on-surface-variant">{total.students} siswa · skor agregat {total.score}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="hig-grouped-surface p-3 sm:p-4">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_190px_220px_190px]">
            <M3TextField
              size="sm"
              leadingIcon="search"
              placeholder="Cari siswa, NIS/NISN, atau rombel..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <M3Select
              size="sm"
              value={riskLevel}
              onChange={(event) => setRiskLevel(event.target.value)}
              options={[
                { value: "", label: "Semua risiko" },
                ...(["CRITICAL", "HIGH", "MEDIUM", "WATCH", "NORMAL"] as StudentRiskLevel[]).map((level) => ({
                  value: level,
                  label: STUDENT_RISK_LEVEL_META[level].label,
                })),
              ]}
            />
            <M3Select
              size="sm"
              value={classRoomId}
              onChange={(event) => setClassRoomId(event.target.value)}
              options={[
                { value: "", label: "Semua rombel" },
                ...(data.classOptions || []).map((item: any) => ({ value: item.id, label: item.name })),
              ]}
            />
            <M3Select
              size="sm"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              options={[
                { value: "", label: "Semua sumber" },
                ...STUDENT_RISK_SOURCES.map((code) => ({ value: code, label: STUDENT_RISK_SOURCE_META[code].label })),
              ]}
            />
          </div>
        </section>

        {!profiles.length ? (
          <section className="hig-grouped-surface px-4 sm:px-5">
            <M3EmptyState icon="search_off" title="Tidak ada profil sesuai filter" description="Ubah kata kunci, tingkat risiko, rombel, atau sumber sinyal." />
          </section>
        ) : (
          <section className="hig-grouped-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-md-outline-variant px-4 py-3 sm:px-5">
              <div>
                <h2 className="hig-section-title">Prioritas siswa</h2>
                <p className="hig-section-note mt-0.5">Diurutkan dari skor risiko tertinggi dan tren yang memburuk.</p>
              </div>
              <M3Badge variant="outline">{profiles.length}</M3Badge>
            </div>
            <div className="divide-y divide-md-outline-variant">
              {profiles.slice(0, 250).map((profile: any) => (
                <button
                  key={profile.student.id}
                  type="button"
                  onClick={() => setSelectedId(profile.student.id)}
                  className="grid w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[.025] dark:hover:bg-white/[.04] sm:px-5 lg:grid-cols-[minmax(220px,1.25fr)_minmax(180px,.9fr)_minmax(260px,1.25fr)_88px]"
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-[13px] font-semibold text-md-on-surface">{profile.student.displayName}</span>
                      {profile.accessMode === "PKL_ONLY" && <M3Badge variant="outline" size="sm">Lingkup PKL</M3Badge>}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-md-on-surface-variant">
                      {profile.student.classRoom?.name || "Tanpa rombel"}{profile.student.nis ? " · NIS " + profile.student.nis : ""}
                    </span>
                  </span>

                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <strong className="text-[21px] font-semibold tabular-nums text-md-on-surface">{profile.score}</strong>
                      <M3Badge variant={riskBadge(profile.level)} size="sm">{STUDENT_RISK_LEVEL_META[profile.level as StudentRiskLevel].shortLabel}</M3Badge>
                    </span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-md-surface-container-high">
                      <span className={"block h-full rounded-full " + scoreBarClass(profile.level)} style={{ width: profile.score + "%" }} />
                    </span>
                  </span>

                  <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {sourceRows(profile).filter((row) => row.score > 0).slice(0, 3).map((row) => (
                      <M3Badge key={row.source} variant="outline" size="sm">{row.meta.label} {row.score}</M3Badge>
                    ))}
                    {!profile.sourceCount && <span className="text-[11px] text-md-on-surface-variant">Tidak ada sinyal aktif</span>}
                  </span>

                  <span className="flex items-center justify-between gap-2 lg:justify-end">
                    <M3Badge variant={trendBadge(profile.trend.code)} size="sm">{profile.trend.label}</M3Badge>
                    <span className="text-[20px] font-light text-md-on-surface-variant/40" aria-hidden="true">›</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="hig-grouped-surface p-4 sm:p-5">
          <h2 className="hig-section-title">Cara membaca EWS Gen-2</h2>
          <div className="mt-3 grid gap-3 text-[11.5px] leading-5 text-md-on-surface-variant md:grid-cols-3">
            <p><strong className="font-semibold text-md-on-surface">Skor 0–100.</strong> Batas sumber: Presensi 30, Kesiswaan 25, Pembelajaran 20, PKL 15, Tindak Lanjut 20.</p>
            <p><strong className="font-semibold text-md-on-surface">Tren 30 hari.</strong> Bukti Presensi, insiden Kesiswaan, dan LMS dibandingkan dengan 30 hari sebelumnya.</p>
            <p><strong className="font-semibold text-md-on-surface">Manusia tetap memutuskan.</strong> Verifikasi bukti dan konteks siswa sebelum intervensi.</p>
          </div>
        </section>
      </div>

      <M3Dialog
        isOpen={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? selected.student.displayName : "Profil Risiko"}
        subtitle={selected ? (selected.student.classRoom?.name || "Tanpa rombel") + " · Skor risiko " + selected.score + "/100" : undefined}
        icon="health_and_safety"
        maxWidth="xl"
        actions={
          <>
            <M3Button variant="text" onClick={() => setSelectedId(null)}>Tutup</M3Button>
            {selected?.accessMode === "FULL" && selected.score >= 40 && (
              <M3Button variant="tonal" icon="assignment_turned_in" onClick={createFollowUp} isLoading={creatingFollowUp}>
                Buat / Segarkan Tindak Lanjut
              </M3Button>
            )}
          </>
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[14px] border border-md-outline-variant p-3.5">
                <p className="text-[10.5px] font-medium uppercase tracking-[.06em] text-md-on-surface-variant">Skor</p>
                <div className="mt-2 flex items-center gap-2">
                  <strong className="text-[30px] font-semibold tabular-nums text-md-on-surface">{selected.score}</strong>
                  <M3Badge variant={riskBadge(selected.level)}>{STUDENT_RISK_LEVEL_META[selected.level as StudentRiskLevel].label}</M3Badge>
                </div>
              </div>
              <div className="rounded-[14px] border border-md-outline-variant p-3.5">
                <p className="text-[10.5px] font-medium uppercase tracking-[.06em] text-md-on-surface-variant">Tren 30 hari</p>
                <div className="mt-2 flex items-center gap-2">
                  <M3Badge variant={trendBadge(selected.trend.code)}>{selected.trend.label}</M3Badge>
                  <span className="text-[12px] text-md-on-surface-variant">{selected.trend.delta > 0 ? "+" : ""}{selected.trend.delta}</span>
                </div>
                <p className="mt-2 text-[10.5px] leading-4 text-md-on-surface-variant">Kini {selected.trend.currentComparable} · sebelumnya {selected.trend.previousComparable}</p>
              </div>
              <div className="rounded-[14px] border border-md-outline-variant p-3.5">
                <p className="text-[10.5px] font-medium uppercase tracking-[.06em] text-md-on-surface-variant">Lingkup</p>
                <p className="mt-2 text-[12.5px] font-semibold text-md-on-surface">{selected.accessMode === "FULL" ? "Profil sekolah penuh" : "Profil PKL terbatas"}</p>
                <p className="mt-1 text-[10.5px] leading-4 text-md-on-surface-variant">{selected.student.homeroomTeacher ? "Wali: " + selected.student.homeroomTeacher.displayName : "Wali kelas belum ditetapkan"}</p>
              </div>
            </div>

            <section>
              <h3 className="hig-section-title">Kontribusi per sumber</h3>
              <div className="mt-3 space-y-2.5">
                {sourceRows(selected).map((row) => (
                  <div key={row.source} className="grid grid-cols-[118px_minmax(0,1fr)_38px] items-center gap-3">
                    <span className="flex items-center gap-2 text-[11.5px] font-medium text-md-on-surface">
                      <M3Icon name={row.meta.icon} size={15} />{row.meta.label}
                    </span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-md-surface-container-high">
                      <span className="block h-full rounded-full bg-md-primary" style={{ width: Math.min(100, (row.score / row.meta.cap) * 100) + "%" }} />
                    </span>
                    <span className="text-right text-[11.5px] font-semibold tabular-nums text-md-on-surface">{row.score}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between">
                <h3 className="hig-section-title">Faktor aktif</h3>
                <M3Badge variant="outline">{selected.signals.length}</M3Badge>
              </div>
              {selected.signals.length ? (
                <div className="mt-3 divide-y divide-md-outline-variant overflow-hidden rounded-[14px] border border-md-outline-variant">
                  {selected.signals.map((item: any) => {
                    const meta = STUDENT_RISK_SOURCE_META[item.source as StudentRiskSource];
                    return (
                      <a key={item.id} href={item.href} className="flex gap-3 px-3.5 py-3 transition-colors hover:bg-md-surface-container-low">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-md-surface-container-high text-md-on-surface-variant">
                          <M3Icon name={meta.icon} size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[12px] font-semibold text-md-on-surface">{item.title}</span>
                            <M3Badge variant="outline" size="sm">+{item.points}</M3Badge>
                          </span>
                          <span className="mt-0.5 block text-[10.8px] leading-4 text-md-on-surface-variant">{item.detail}</span>
                          <span className="mt-1 block text-[9.5px] text-md-on-surface-variant">{meta.label} · {formatDateTime(item.occurredAt)}</span>
                        </span>
                        <span className="text-[18px] text-md-on-surface-variant/40">›</span>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 rounded-[14px] border border-md-outline-variant p-4 text-[11.5px] text-md-on-surface-variant">Tidak ada faktor risiko aktif pada lingkup data yang dapat Anda lihat.</div>
              )}
            </section>

            {!!selected.recommendations.length && (
              <section>
                <h3 className="hig-section-title">Rekomendasi tindak lanjut</h3>
                <div className="mt-3 space-y-2">
                  {selected.recommendations.map((item: any) => (
                    <a key={item.source} href={item.href} className="flex items-start gap-3 rounded-[12px] border border-md-outline-variant px-3.5 py-3 transition-colors hover:bg-md-surface-container-low">
                      <M3Icon name={STUDENT_RISK_SOURCE_META[item.source as StudentRiskSource].icon} size={17} />
                      <span className="flex-1 text-[11.5px] leading-5 text-md-on-surface-variant">{item.text}</span>
                      <span className="text-md-on-surface-variant/40">›</span>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </M3Dialog>
    </SchoolLayout>
  );
}
