import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import { useQuery, getSchoolStudents, getClassRooms } from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import { Users, Search, FileSpreadsheet, Filter, Building2, MapPin } from "lucide-react";

export function StudentsPage({ user }: { user: AuthUser }) {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: students, isLoading } = useQuery(getSchoolStudents, {
    classRoomId: selectedClass || undefined,
  });
  const { data: classes } = useQuery(getClassRooms);

  const filteredStudents = students?.filter((s) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = s.name?.toLowerCase().includes(term);
    const nisMatch = s.studentProfile?.nis?.toLowerCase().includes(term);
    const nisnMatch = s.studentProfile?.nisn?.toLowerCase().includes(term);
    return nameMatch || nisMatch || nisnMatch;
  });

  return (
    <SchoolLayout user={user}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Data Peserta Didik (Siswa)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Daftar seluruh siswa aktif, rombel kelas, dan status penempatan PKL.
          </p>
        </div>
        <Link
          to="/school/import"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm shadow transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Import Siswa CSV
        </Link>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari berdasarkan nama, NIS, atau NISN..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-transparent text-sm text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="">Semua Kelas</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.department.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredStudents?.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Belum Ada Data Siswa
          </h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Upload file CSV daftar siswa dari Dapodik / format Excel sekolah.
          </p>
          <Link
            to="/school/import"
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg inline-flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Upload CSV Siswa
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs uppercase font-semibold text-slate-500">
                <th className="px-6 py-4">Nama Siswa & NIS</th>
                <th className="px-6 py-4">L/P</th>
                <th className="px-6 py-4">Rombel Kelas</th>
                <th className="px-6 py-4">Status PKL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {filteredStudents?.map((s) => {
                const activePlacement = s.studentPlacements?.[0];
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {s.name || s.username}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        NIS: {s.studentProfile?.nis || "-"} • NISN: {s.studentProfile?.nisn || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block w-6 h-6 rounded-full text-center leading-6 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {s.studentProfile?.gender || "L"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {s.classRoom ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                          <Building2 className="w-3.5 h-3.5" />
                          {s.classRoom.name}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Belum ada kelas</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {activePlacement ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                          <MapPin className="w-3.5 h-3.5" />
                          {activePlacement.company?.name}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Belum plotting</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SchoolLayout>
  );
}
