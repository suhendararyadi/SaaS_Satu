import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getDailyJournals,
  getPlacements,
  createDailyJournal,
  reviewDailyJournal,
} from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Star,
  MessageSquare,
  X,
} from "lucide-react";

export function JournalsPage({ user }: { user: AuthUser }) {
  const { data: placements } = useQuery(getPlacements);
  const { data: journals, isLoading, refetch } = useQuery(getDailyJournals);

  const activePlacement = placements?.find((p) => p.status === "ACTIVE");

  // Add journal modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [activityDescription, setActivityDescription] = useState("");
  const [obstacleDescription, setObstacleDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Review modal state (for teachers)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<any>(null);
  const [reviewStatus, setReviewStatus] = useState<"APPROVED" | "REVISION">("APPROVED");
  const [score, setScore] = useState<number>(85);
  const [feedback, setFeedback] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlacement) return;
    setSubmitting(true);
    try {
      await createDailyJournal({
        placementId: activePlacement.id,
        activityDescription,
        obstacleDescription: obstacleDescription || null,
        photoUrl: photoUrl || null,
      });
      setModalOpen(false);
      setActivityDescription("");
      setObstacleDescription("");
      setPhotoUrl("");
      await refetch();
    } catch (err: any) {
      alert(err.message || "Gagal mengirim jurnal.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJournal) return;
    setReviewing(true);
    try {
      await reviewDailyJournal({
        id: selectedJournal.id,
        status: reviewStatus,
        score: Number(score),
        feedback: feedback || undefined,
      });
      setReviewModalOpen(false);
      await refetch();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan penilaian jurnal.");
    } finally {
      setReviewing(false);
    }
  };

  return (
    <SchoolLayout user={user}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Jurnal Kegiatan Harian PKL
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Laporan aktivitas harian siswa di tempat PKL dan verifikasi guru pembimbing.
          </p>
        </div>
        {activePlacement && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm shadow transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tulis Jurnal Harian
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : journals?.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Belum Ada Jurnal
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Siswa dapat mengisi jurnal harian setiap hari setelah menyelesaikan jam kerja PKL.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {journals?.map((j) => {
            const dateStr = new Date(j.date).toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            });

            return (
              <div
                key={j.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      {j.placement?.student?.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {j.placement?.company?.name} • {dateStr}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        j.status === "APPROVED"
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                          : j.status === "REVISION"
                          ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {j.status === "APPROVED"
                        ? "Disetujui"
                        : j.status === "REVISION"
                        ? "Perlu Revisi"
                        : "Menunggu Review"}
                    </span>

                    {/* Teacher can click to review */}
                    <button
                      onClick={() => {
                        setSelectedJournal(j);
                        setScore(j.score || 85);
                        setFeedback(j.feedback || "");
                        setReviewModalOpen(true);
                      }}
                      className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg text-xs font-semibold"
                    >
                      Beri Nilai / Catatan
                    </button>
                  </div>
                </div>

                {/* Activity & Obstacles */}
                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Deskripsi Kegiatan
                    </h4>
                    <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line">
                      {j.activityDescription}
                    </p>
                  </div>

                  {j.obstacleDescription && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
                        Kendala yang Dihadapi
                      </h4>
                      <p className="text-slate-700 dark:text-slate-300 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg text-xs">
                        {j.obstacleDescription}
                      </p>
                    </div>
                  )}

                  {/* Feedback & Score */}
                  {(j.feedback || j.score !== null) && (
                    <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
                      <Star className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Nilai: {j.score ?? "-"} / 100
                        </span>
                        {j.feedback && (
                          <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                            Catatan Guru: "{j.feedback}"
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add Journal (Student) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Tulis Jurnal Harian PKL
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJournal} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Uraian Kegiatan Hari Ini *
                </label>
                <textarea
                  required
                  rows={4}
                  value={activityDescription}
                  onChange={(e) => setActivityDescription(e.target.value)}
                  placeholder="Jelaskan pekerjaan atau proyek yang Anda kerjakan hari ini..."
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Kendala & Solusi (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={obstacleDescription}
                  onChange={(e) => setObstacleDescription(e.target.value)}
                  placeholder="Ada kendala teknis atau kendala kerja? Bagaimana solusinya..."
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? "Mengirim..." : "Kirim Jurnal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Review Journal (Teacher) */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Penilaian & Feedback Jurnal
              </h3>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewJournal} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Status Verifikasi *
                </label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value as "APPROVED" | "REVISION")}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                >
                  <option value="APPROVED">Setujui (Approved)</option>
                  <option value="REVISION">Perlu Revisi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Skor Nilai (0 - 100)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / Masukan Guru
                </label>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Beri arahan atau catatan perbaikan untuk siswa..."
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={reviewing}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {reviewing ? "Menyimpan..." : "Simpan Penilaian"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SchoolLayout>
  );
}
