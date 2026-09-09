import React, { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import {
  useQuery,
  getDailyJournals,
  getPlacements,
  createDailyJournal,
  reviewDailyJournal,
} from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  M3Card,
  M3Button,
  M3TextField,
  M3Select,
  M3Dialog,
  M3Badge,
  M3CircularProgress,
  M3Banner,
  M3Text,
  M3Icon,
} from "../../client/components/m3";


export function JournalsPage({ user }: { user: AuthUser }) {
  const { data: placements } = useQuery(getPlacements);
  const { data: journals, isLoading, refetch } = useQuery(getDailyJournals);

  const activePlacement = placements?.find((p) => p.status === "ACTIVE");
  const canCreateJournal = user.role === "STUDENT" && !!activePlacement;
  const canReview = !!user.isAdmin || ["SUPERADMIN", "SCHOOL_ADMIN", "TEACHER", "DUDI_MENTOR"].includes(user.role);

  // Add journal modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [activityDescription, setActivityDescription] = useState("");
  const [obstacleDescription, setObstacleDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [createErrorMsg, setCreateErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Review modal state (for teachers)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<any>(null);
  const [reviewStatus, setReviewStatus] = useState<string>("APPROVED");
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [reviewErrorMsg, setReviewErrorMsg] = useState("");
  const [reviewing, setReviewing] = useState(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlacement) return;
    if (!activityDescription.trim()) {
      setCreateErrorMsg("Deskripsi kegiatan wajib diisi.");
      return;
    }
    setCreateErrorMsg("");
    setSubmitting(true);
    try {
      await createDailyJournal({
        placementId: activePlacement.id,
        activityDescription: activityDescription.trim(),
        obstacleDescription: obstacleDescription.trim() || null,
        photoUrl: photoUrl.trim() || null,
      });
      setModalOpen(false);
      setActivityDescription("");
      setObstacleDescription("");
      setPhotoUrl("");
      await refetch();
    } catch (err: any) {
      setCreateErrorMsg(err.message || "Gagal mengirim jurnal.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJournal) return;
    setReviewErrorMsg("");
    setReviewing(true);
    try {
      await reviewDailyJournal({
        id: selectedJournal.id,
        status: reviewStatus as "APPROVED" | "REVISION",
        score: score.trim() ? Number(score) : undefined,
        feedback: feedback.trim() || undefined,
      });
      setReviewModalOpen(false);
      await refetch();
    } catch (err: any) {
      setReviewErrorMsg(err.message || "Gagal menyimpan penilaian jurnal.");
    } finally {
      setReviewing(false);
    }
  };

  const reviewStatusOptions = [
    { value: "APPROVED", label: "Setujui (Approved)" },
    { value: "REVISION", label: "Perlu Revisi (Revision)" },
  ];

  const filteredJournals = journals?.filter((j) => {
    if (statusFilter !== "ALL") {
      if (
        statusFilter === "PENDING" &&
        (j.status === "APPROVED" || j.status === "REVISION")
      )
        return false;
      if (statusFilter !== "PENDING" && j.status !== statusFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchStudent = j.placement?.student?.name
        ?.toLowerCase()
        .includes(q);
      const matchCompany = j.placement?.company?.name
        ?.toLowerCase()
        .includes(q);
      const matchActivity = j.activityDescription?.toLowerCase().includes(q);
      return matchStudent || matchCompany || matchActivity;
    }
    return true;
  });

  const totalItems = filteredJournals?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedJournals = (filteredJournals || []).slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const statusOptions = [
    { value: "ALL", label: "Semua Status" },
    { value: "APPROVED", label: "Disetujui" },
    { value: "REVISION", label: "Perlu Revisi" },
    { value: "PENDING", label: "Menunggu Review" },
  ];

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">

        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-medium text-md-on-surface">
              Jurnal Harian Siswa PKL
            </h2>
            <p className="text-xs sm:text-sm text-md-on-surface-variant mt-0.5">
              Catatan aktivitas harian siswa dan verifikasi guru pembimbing.
            </p>
          </div>
          {canCreateJournal && (
            <M3Button
              variant="filled"
              size="md"
              icon="add"
              onClick={() => {
                setCreateErrorMsg("");
                setModalOpen(true);
              }}
            >
              Tulis Jurnal Harian
            </M3Button>
          )}
        </div>

        {/* Search & Filter Toolbar */}
        <M3Card variant="outlined" className="p-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <M3TextField
                placeholder="Cari siswa, mitra, atau kegiatan..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                leadingIcon="search"
                size="sm"
              />
            </div>

            <div className="w-full sm:w-48">
              <M3Select
                options={statusOptions}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                size="sm"
              />
            </div>

            <M3Badge variant="secondary" size="md">
              {totalItems} Jurnal
            </M3Badge>
          </div>
        </M3Card>

        {/* Content Section */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <M3CircularProgress size={40} />
          </div>
        ) : filteredJournals?.length === 0 ? (
          <M3Banner
            variant="standard"
            headline="Belum Ada Jurnal"
            supportingText="Siswa dapat mengisi jurnal harian setiap hari setelah menyelesaikan jam kerja PKL."
            actionLabel={canCreateJournal ? "Tulis Jurnal Sekarang" : undefined}
            onAction={canCreateJournal ? () => setModalOpen(true) : undefined}
            icon="menu_book"
            className="p-6"
          />
        ) : (
          <div className="space-y-4">
            {paginatedJournals.map((j) => {
              const dateStr = new Date(j.date).toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              });

              return (
                <M3Card key={j.id} variant="outlined" className="p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-md-outline-variant/30">
                    <div>
                      <h4 className="font-semibold text-base text-md-on-surface">
                        {j.placement?.student?.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-md-on-surface-variant mt-0.5">
                        <div className="flex items-center gap-1">
                          <M3Icon name="apartment" size={14} className="opacity-70" />
                          <span>{j.placement?.company?.name}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <M3Icon name="calendar_month" size={14} className="opacity-70" />
                          <span>{dateStr}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {j.status === "APPROVED" && (
                        <M3Badge variant="success" size="sm">
                          Disetujui
                        </M3Badge>
                      )}
                      {j.status === "REVISION" && (
                        <M3Badge variant="warning" size="sm">
                          Perlu Revisi
                        </M3Badge>
                      )}
                      {j.status !== "APPROVED" && j.status !== "REVISION" && (
                        <M3Badge variant="outline" size="sm">
                          Menunggu Review
                        </M3Badge>
                      )}

                      {canReview && (
                      <M3Button
                        variant="tonal"
                        size="sm"
                        icon="grade"
                        onClick={() => {
                          setSelectedJournal(j);
                          setScore(j.score !== null && j.score !== undefined ? String(j.score) : "");
                          setFeedback(j.feedback || "");
                          setReviewStatus(
                            j.status === "REVISION" ? "REVISION" : "APPROVED"
                          );
                          setReviewErrorMsg("");
                          setReviewModalOpen(true);
                        }}
                      >
                        Nilai / Catatan
                      </M3Button>
                      )}
                    </div>
                  </div>

                  {/* Activity Description */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold tracking-wider uppercase text-md-on-surface-variant">
                      Deskripsi Kegiatan
                    </p>
                    <p className="text-sm text-md-on-surface whitespace-pre-line leading-relaxed">
                      {j.activityDescription}
                    </p>
                  </div>

                  {/* Obstacle Description */}
                  {j.obstacleDescription && (
                    <M3Banner
                      variant="warning"
                      headline="Kendala yang Dihadapi & Solusi"
                      supportingText={j.obstacleDescription}
                    />
                  )}

                  {/* Feedback & Score */}
                  {(j.feedback || j.score !== null) && (
                    <div className="p-3.5 rounded-[12px] bg-md-surface-container border border-md-outline-variant/40 flex items-start gap-3">
                      <M3Icon name="star" size={20} className="text-md-tertiary shrink-0 mt-0.5" />
                      <div className="text-xs space-y-0.5">
                        <p className="font-bold text-md-on-surface">
                          Nilai: {j.score ?? "-"} / 100
                        </p>
                        {j.feedback && (
                          <p className="text-md-on-surface-variant">
                            Catatan Guru: &ldquo;{j.feedback}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </M3Card>
              );
            })}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 pt-2">
                <p className="text-xs text-md-on-surface-variant">
                  Menampilkan {(currentPage - 1) * pageSize + 1} -{" "}
                  {Math.min(currentPage * pageSize, totalItems)} dari {totalItems} jurnal
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

        {/* Modal Add Journal (Student) */}
        <M3Dialog
          isOpen={canCreateJournal && modalOpen}
          onClose={() => setModalOpen(false)}
          title="Tulis Jurnal Harian PKL"
          subtitle="Ceritakan aktivitas kerja praktik dan pencapaian Anda hari ini."
          icon={<M3Icon name="edit_note" size={24} className="text-md-primary" />}
          actions={
            <>
              <M3Button
                variant="text"
                size="sm"
                onClick={() => setModalOpen(false)}
              >
                Batal
              </M3Button>
              <M3Button
                variant="filled"
                size="sm"
                onClick={handleCreateJournal}
                isLoading={submitting}
              >
                Kirim Jurnal
              </M3Button>
            </>
          }
        >
          <form onSubmit={handleCreateJournal} className="space-y-4">
            {createErrorMsg && (
              <M3Banner
                variant="error"
                supportingText={createErrorMsg}
                dismissible
                onDismiss={() => setCreateErrorMsg("")}
              />
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-md-on-surface-variant">
                Uraian Kegiatan Hari Ini *
              </label>
              <textarea
                rows={4}
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                placeholder="Jelaskan pekerjaan, tugas atau proyek yang Anda selesaikan hari ini..."
                required
                className="w-full rounded-[8px] border border-md-outline bg-transparent p-2.5 text-sm text-md-on-surface placeholder:text-md-outline focus:outline-none focus:border-md-primary focus:ring-1 focus:ring-md-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-md-on-surface-variant">
                Kendala &amp; Solusi (Opsional)
              </label>
              <textarea
                rows={2}
                value={obstacleDescription}
                onChange={(e) => setObstacleDescription(e.target.value)}
                placeholder="Ada kendala teknis atau masalah di lapangan? Bagaimana Anda mengatasinya..."
                className="w-full rounded-[8px] border border-md-outline bg-transparent p-2.5 text-sm text-md-on-surface placeholder:text-md-outline focus:outline-none focus:border-md-primary focus:ring-1 focus:ring-md-primary"
              />
            </div>
          </form>
        </M3Dialog>

        {/* Modal Review Journal (Teacher) */}
        <M3Dialog
          isOpen={canReview && reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          title="Penilaian &amp; Feedback Jurnal"
          subtitle="Berikan validasi status, skor penilaian, dan catatan bimbingan."
          icon={<M3Icon name="grade" size={24} className="text-md-primary" />}
          actions={
            <>
              <M3Button
                variant="text"
                size="sm"
                onClick={() => setReviewModalOpen(false)}
              >
                Batal
              </M3Button>
              <M3Button
                variant="filled"
                size="sm"
                onClick={handleReviewJournal}
                isLoading={reviewing}
              >
                Simpan Penilaian
              </M3Button>
            </>
          }
        >
          <form onSubmit={handleReviewJournal} className="space-y-4">
            {reviewErrorMsg && (
              <M3Banner
                variant="error"
                supportingText={reviewErrorMsg}
                dismissible
                onDismiss={() => setReviewErrorMsg("")}
              />
            )}

            <M3Select
              label="Status Verifikasi *"
              options={reviewStatusOptions}
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value)}
            />

            <M3TextField
              label="Skor nilai (opsional)"
              type="number"
              placeholder="0 - 100"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />

            <div className="space-y-1">
              <label className="text-xs font-medium text-md-on-surface-variant">
                Catatan / Masukan Guru Pembimbing
              </label>
              <textarea
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Beri arahan atau catatan perbaikan untuk siswa..."
                className="w-full rounded-[8px] border border-md-outline bg-transparent p-2.5 text-sm text-md-on-surface placeholder:text-md-outline focus:outline-none focus:border-md-primary focus:ring-1 focus:ring-md-primary"
              />
            </div>
          </form>
        </M3Dialog>
      </div>
    </SchoolLayout>
  );
}
