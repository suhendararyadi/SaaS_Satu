import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import {
  useQuery,
  getLmsCourses,
  getClassRooms,
  getSchoolTeachers,
  getAcademicYears,
  createLmsCourse,
} from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  BookOpen,
  Plus,
  Building2,
  User,
  Users,
  FileText,
  ClipboardList,
  Award,
  CalendarCheck,
  X,
  Filter,
} from "lucide-react";

export function LmsCoursesPage({ user }: { user: AuthUser }) {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const { data: courses, isLoading, refetch } = useQuery(getLmsCourses, {
    classRoomId: selectedClass || undefined,
  });
  const { data: classes } = useQuery(getClassRooms);
  const { data: teachers } = useQuery(getSchoolTeachers);
  const { data: academicYears } = useQuery(getAcademicYears);

  const [modalOpen, setModalOpen] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [classRoomId, setClassRoomId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openAddModal = () => {
    setSubjectName("");
    setClassRoomId(classes?.[0]?.id || "");
    setTeacherId(teachers?.[0]?.id || "");
    setDescription("");
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeYear = academicYears?.find((y) => y.isActive) || academicYears?.[0];
    if (!activeYear) {
      setErrorMsg("Tahun ajaran aktif belum ditentukan.");
      return;
    }

    setErrorMsg("");
    setSubmitting(true);
    try {
      await createLmsCourse({
        subjectName,
        classRoomId,
        teacherId,
        academicYearId: activeYear.id,
        description: description.trim() || null,
      });
      setModalOpen(false);
      await refetch();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membuat ruang mapel.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SchoolLayout user={user}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Ruang Kelas & Mata Pelajaran (LMS)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manajemen KBM, materi ajar, agenda guru, tugas, dan ujian CBT daring.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          Buka Ruang Mapel Baru
        </button>
      </div>

      {/* Filter by Class */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-500">Filter Rombel:</span>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="bg-transparent text-xs font-semibold text-slate-800 dark:text-white outline-none cursor-pointer"
        >
          <option value="">Semua Kelas</option>
          {classes?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.department.code})
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : courses?.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Belum Ada Ruang Mata Pelajaran
          </h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Buka ruang mapel pertama untuk memulai pembelajaran daring dan pencatatan agenda KBM.
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg"
          >
            Buat Mapel Baru
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses?.map((c) => (
            <Link
              key={c.id}
              to={`/school/lms/courses/${c.id}`}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-indigo-500 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {c.classRoom.name}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {c.academicYear.yearName}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                  {c.subjectName}
                </h3>

                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Pengampu: <strong className="text-slate-700 dark:text-slate-300">{c.teacher.name}</strong>
                </p>

                {c.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                    {c.description}
                  </p>
                )}
              </div>

              {/* Course Mini Badges */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-1 rounded bg-slate-50 dark:bg-slate-800">
                  <span className="font-bold block text-slate-800 dark:text-white">
                    {c._count?.agendas || 0}
                  </span>
                  <span className="text-[10px] text-slate-400">Agenda</span>
                </div>
                <div className="p-1 rounded bg-slate-50 dark:bg-slate-800">
                  <span className="font-bold block text-slate-800 dark:text-white">
                    {c._count?.materials || 0}
                  </span>
                  <span className="text-[10px] text-slate-400">Materi</span>
                </div>
                <div className="p-1 rounded bg-slate-50 dark:bg-slate-800">
                  <span className="font-bold block text-slate-800 dark:text-white">
                    {c._count?.assignments || 0}
                  </span>
                  <span className="text-[10px] text-slate-400">Tugas</span>
                </div>
                <div className="p-1 rounded bg-slate-50 dark:bg-slate-800">
                  <span className="font-bold block text-slate-800 dark:text-white">
                    {c._count?.assessments || 0}
                  </span>
                  <span className="text-[10px] text-slate-400">CBT</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal Add Course */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Buka Ruang Mata Pelajaran
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Nama Mata Pelajaran *
                </label>
                <input
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Contoh: Pemrograman Web dan Perangkat Bergerak"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Rombel Kelas *
                </label>
                <select
                  required
                  value={classRoomId}
                  onChange={(e) => setClassRoomId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.department.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Guru Pengampu *
                </label>
                <select
                  required
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name || t.email} {t.teacherProfile?.title ? `(${t.teacherProfile.title})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi / Info Mapel (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi silabus mapel..."
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
                  {submitting ? "Memproses..." : "Buka Kelas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SchoolLayout>
  );
}
