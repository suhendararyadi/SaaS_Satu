import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import { useQuery, getSchoolTeachers } from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import { UserCheck, Search, FileSpreadsheet, ShieldCheck, Mail, Phone } from "lucide-react";

export function TeachersPage({ user }: { user: AuthUser }) {
  const { data: teachers, isLoading } = useQuery(getSchoolTeachers);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTeachers = teachers?.filter((t) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = t.name?.toLowerCase().includes(term);
    const emailMatch = t.email?.toLowerCase().includes(term);
    const nipMatch = t.teacherProfile?.nip?.toLowerCase().includes(term);
    return nameMatch || emailMatch || nipMatch;
  });

  return (
    <SchoolLayout user={user}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Tenaga Pendidik & Kependidikan (Guru)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Daftar guru pengajar, waka kurikulum, dan wali kelas di sekolah Anda.
          </p>
        </div>
        <Link
          to="/school/import"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm shadow transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Import Guru CSV
        </Link>
      </div>

      {/* Search Toolbar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari berdasarkan nama, email, atau NIP..."
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredTeachers?.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Belum Ada Data Guru
          </h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Upload file CSV daftar guru dari Dapodik atau tambah akun guru.
          </p>
          <Link
            to="/school/import"
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg inline-flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Upload CSV Guru
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs uppercase font-semibold text-slate-500">
                <th className="px-6 py-4">Nama Lengkap & NIP</th>
                <th className="px-6 py-4">Kontak</th>
                <th className="px-6 py-4">Penugasan Khusus</th>
                <th className="px-6 py-4">Peran Akun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {filteredTeachers?.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {t.name || t.email}{" "}
                      {t.teacherProfile?.title && (
                        <span className="font-normal text-slate-500">
                          {t.teacherProfile.title}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      NIP: {t.teacherProfile?.nip || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.email || "-"}</span>
                    </div>
                    {t.teacherProfile?.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t.teacherProfile.phone}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {t.teacherProfile?.isWaka && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          <ShieldCheck className="w-3 h-3" />
                          Waka Kurikulum
                        </span>
                      )}
                      {t.homeroomClasses?.map((hc) => (
                        <span
                          key={hc.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                        >
                          Wali {hc.name}
                        </span>
                      ))}
                      {!t.teacherProfile?.isWaka && (!t.homeroomClasses || t.homeroomClasses.length === 0) && (
                        <span className="text-xs text-slate-400">Guru Mapel</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {t.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SchoolLayout>
  );
}
