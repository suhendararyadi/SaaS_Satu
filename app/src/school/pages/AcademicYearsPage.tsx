import React, { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import {
  useQuery,
  getAcademicYears,
  createAcademicYear,
  setActiveAcademicYear,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  M3Card,
  M3Button,
  M3TextField,
  M3Select,
  M3Switch,
  M3Dialog,
  M3Badge,
  M3Table,
  M3TableHeader,
  M3TableBody,
  M3TableRow,
  M3TableHead,
  M3TableCell,
  M3CircularProgress,
  M3Banner,
  M3Text,
  M3Icon,
} from "../../client/components/m3";


export function AcademicYearsPage({ user }: { user: AuthUser }) {
  const { data: years, isLoading, refetch } = useQuery(getAcademicYears);
  const [modalOpen, setModalOpen] = useState(false);
  const [yearName, setYearName] = useState("2026/2027");
  const [semester, setSemester] = useState<string>("GANJIL");
  const [isActive, setIsActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearName.trim()) {
      setErrorMsg("Format tahun ajaran wajib diisi.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    try {
      await createAcademicYear({
        yearName: yearName.trim(),
        semester: semester as "GANJIL" | "GENAP",
        isActive,
      });
      setModalOpen(false);
      await refetch();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membuat tahun ajaran.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetActive = async (id: string, name: string) => {
    try {
      await setActiveAcademicYear({ id });
      await refetch();
    } catch (err: any) {
      alert(err.message || "Gagal mengaktifkan tahun ajaran.");
    }
  };

  const filteredYears = years?.filter((y) => {
    if (searchQuery.trim()) {
      return y.yearName.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const totalItems = filteredYears?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedYears = (filteredYears || []).slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const semesterOptions = [
    { value: "GANJIL", label: "Semester Ganjil" },
    { value: "GENAP", label: "Semester Genap" },
  ];

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">
        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-medium text-md-on-surface">
              Tahun Ajaran
            </h2>
            <p className="text-xs sm:text-sm text-md-on-surface-variant mt-0.5">
              Atur tahun ajaran dan semester aktif sekolah.
            </p>
          </div>
          <M3Button
            variant="filled"
            size="md"
            icon="add"
            onClick={() => {
              setErrorMsg("");
              setModalOpen(true);
            }}
          >
            Tambah Tahun Ajaran
          </M3Button>
        </div>

        {/* Search Toolbar */}
        <M3Card variant="outlined" className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 max-w-md">
              <M3TextField
                placeholder="Cari tahun ajaran (contoh: 2026/2027)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                leadingIcon="search"
                size="sm"
              />
            </div>
            <M3Badge variant="secondary" size="md">
              {totalItems} Tahun Ajaran
            </M3Badge>
          </div>
        </M3Card>

        {/* Content Section */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <M3CircularProgress size={40} />
          </div>
        ) : years?.length === 0 ? (
          <M3Card variant="elevated" className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-md-secondary-container text-md-on-secondary-container flex items-center justify-center mx-auto shadow-xs">
              <M3Icon name="calendar_month" size={28} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-md-on-surface">
                Belum Ada Tahun Ajaran
              </h3>
              <p className="text-xs text-md-on-surface-variant max-w-sm mx-auto mt-1">
                Tambahkan tahun ajaran baru untuk mengaktifkan periode pembelajaran.
              </p>
            </div>
            <M3Button
              variant="filled"
              size="md"
              icon="add"
              onClick={() => setModalOpen(true)}
            >
              Tambah Tahun Ajaran
            </M3Button>
          </M3Card>
        ) : (
          <div className="space-y-4">
            <M3Table>
              <M3TableHeader>
                <M3TableRow>
                  <M3TableHead>Tahun Ajaran</M3TableHead>
                  <M3TableHead>Semester</M3TableHead>
                  <M3TableHead>Status</M3TableHead>
                  <M3TableHead>Rombel Terdaftar</M3TableHead>
                  <M3TableHead className="text-right">Aksi</M3TableHead>
                </M3TableRow>
              </M3TableHeader>
              <M3TableBody>
                {paginatedYears.map((y) => (
                  <M3TableRow key={y.id}>
                    <M3TableCell>
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            y.isActive ? "bg-md-secondary" : "bg-slate-300 dark:bg-slate-600"
                          }`}
                        />
                        <span className="font-semibold text-md-on-surface">
                          {y.yearName}
                        </span>
                      </div>
                    </M3TableCell>

                    <M3TableCell>
                      <M3Badge
                        variant={y.semester === "GANJIL" ? "primary" : "tertiary"}
                        size="sm"
                      >
                        {y.semester === "GANJIL" ? "Ganjil" : "Genap"}
                      </M3Badge>
                    </M3TableCell>

                    <M3TableCell>
                      {y.isActive ? (
                        <M3Badge
                          variant="success"
                          size="sm"
                          icon={<M3Icon name="check" size={12} className="mr-1" />}
                        >
                          Aktif Sekarang
                        </M3Badge>
                      ) : (
                        <M3Badge variant="outline" size="sm">
                          Arsip
                        </M3Badge>
                      )}
                    </M3TableCell>

                    <M3TableCell>
                      <span className="text-xs text-md-on-surface-variant">
                        {y._count?.classes || 0} Kelas
                      </span>
                    </M3TableCell>

                    <M3TableCell className="text-right">
                      {!y.isActive && (
                        <M3Button
                          variant="tonal"
                          size="sm"
                          onClick={() => handleSetActive(y.id, y.yearName)}
                        >
                          Jadikan Aktif
                        </M3Button>
                      )}
                    </M3TableCell>
                  </M3TableRow>
                ))}
              </M3TableBody>
            </M3Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 pt-2">
                <p className="text-xs text-md-on-surface-variant">
                  Menampilkan {(currentPage - 1) * pageSize + 1} -{" "}
                  {Math.min(currentPage * pageSize, totalItems)} dari {totalItems} tahun ajaran
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

        {/* Dialog Add Year */}
        <M3Dialog
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Tambah Tahun Ajaran Baru"
          subtitle="Buat kalender akademik dan semester aktif baru."
          icon={<M3Icon name="calendar_month" size={24} className="text-md-primary" />}
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
                onClick={handleSubmit}
                isLoading={submitting}
              >
                Simpan Tahun Ajaran
              </M3Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <M3Banner
                variant="error"
                supportingText={errorMsg}
                dismissible
                onDismiss={() => setErrorMsg("")}
              />
            )}

            <M3TextField
              label="Format Tahun (YYYY/YYYY) *"
              placeholder="Contoh: 2026/2027"
              value={yearName}
              onChange={(e) => setYearName(e.target.value)}
              required
            />

            <M3Select
              label="Semester *"
              options={semesterOptions}
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            />

            <div className="pt-2">
              <M3Switch
                label="Langsung aktifkan periode ini (arsip otomatis yang sebelumnya)"
                checked={isActive}
                onChange={setIsActive}
              />
            </div>
          </form>
        </M3Dialog>
      </div>
    </SchoolLayout>
  );
}
