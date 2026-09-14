
import { useEffect, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { getWakasekDashboardData, useQuery } from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import { WAKASEK_ROLE_META, type WakasekRoleCode } from "../../school/wakasek";
import {
  M3Badge,
  M3Banner,
  M3Button,
  M3Card,
  M3CircularProgress,
  M3EmptyState,
  M3Icon,
  M3StatCard,
  M3Table,
  M3TableBody,
  M3TableCell,
  M3TableHead,
  M3TableHeader,
  M3TableRow,
  M3Tabs,
} from "../../client/components/m3";

function MetricGrid({ metrics }: { metrics: any[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <M3StatCard
          key={metric.label}
          label={metric.label}
          value={metric.value}
          helper={metric.helper}
          tone={metric.tone}
        />
      ))}
    </div>
  );
}

function CurriculumPanel({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <M3Button href="/school/lms/courses" variant="tonal" size="sm" icon="menu_book">Buka LMS & CBT</M3Button>
        <M3Button href="/school/reports" variant="outlined" size="sm" icon="description">Laporan</M3Button>
      </div>
      {!data.teacherCompliance?.length ? (
        <M3EmptyState
          icon="menu_book"
          title="Belum ada ruang mengajar aktif"
          description="Data supervisi akan muncul setelah mapel, rombel, dan guru pengampu tersedia pada semester aktif."
        />
      ) : (
        <M3Card variant="outlined" className="overflow-hidden p-0">
          <M3Table>
            <M3TableHeader>
              <M3TableRow>
                <M3TableHead>Guru Pengampu</M3TableHead>
                <M3TableHead>Mapel / Rombel</M3TableHead>
                <M3TableHead>Agenda Hari Ini</M3TableHead>
                <M3TableHead>Total Agenda</M3TableHead>
              </M3TableRow>
            </M3TableHeader>
            <M3TableBody>
              {data.teacherCompliance.map((row: any) => (
                <M3TableRow key={row.teacherId}>
                  <M3TableCell className="font-semibold text-md-on-surface">{row.teacherName}</M3TableCell>
                  <M3TableCell>{row.totalCourses}</M3TableCell>
                  <M3TableCell>
                    <M3Badge variant={row.todayAgendasFilled ? "success" : "outline"}>
                      {row.todayAgendasFilled ? String(row.todayAgendasFilled) + " terisi" : "Belum terisi"}
                    </M3Badge>
                  </M3TableCell>
                  <M3TableCell>{row.totalAgendasSemester}</M3TableCell>
                </M3TableRow>
              ))}
            </M3TableBody>
          </M3Table>
        </M3Card>
      )}
    </div>
  );
}

function StudentAffairsPanel({ data, isAdmin }: { data: any; isAdmin: boolean }) {
  return (
    <div className="space-y-4">
      <M3Banner
        variant="standard"
        headline="Kesiswaan Terpadu"
        supportingText="Pelanggaran, prestasi, pembinaan, pemanggilan orang tua, izin/dispensasi, presensi, dan tindak lanjut sekarang dikelola dalam satu pusat kerja."
        icon="school"
      />
      <div className="flex flex-wrap justify-end gap-2">
        <M3Button href="/school/student-affairs" variant="tonal" size="sm" icon="school">Buka Kesiswaan</M3Button>
        <M3Button href="/school/follow-up" variant="outlined" size="sm" icon="assignment_turned_in">Tindak Lanjut</M3Button>
        {isAdmin && <M3Button href="/school/attendance" variant="outlined" size="sm" icon="fact_check">Presensi Harian</M3Button>}
        <M3Button href="/school/students" variant="outlined" size="sm" icon="groups">Data Siswa</M3Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <M3Card variant="outlined" className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-md-on-surface">Pelanggaran Aktif</p>
              <p className="text-xs text-md-on-surface-variant">Kasus yang masih tercatat atau sedang ditangani.</p>
            </div>
            <M3Badge variant={data.recentViolations?.length ? "warning" : "success"} size="sm">{data.recentViolations?.length || 0}</M3Badge>
          </div>
          {!data.recentViolations?.length ? (
            <M3EmptyState icon="task_alt" title="Tidak ada pelanggaran aktif" description="Kasus yang perlu perhatian akan muncul di sini." />
          ) : (
            <div className="space-y-2">
              {data.recentViolations.map((item: any) => (
                <div key={item.id} className="rounded-[11px] border border-md-outline-variant/45 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12.5px] font-semibold text-md-on-surface">{item.title}</p>
                      <p className="mt-0.5 text-[11px] text-md-on-surface-variant">{item.student?.name || "Siswa"} · {item.student?.classRoom?.name || "-"}</p>
                    </div>
                    <M3Badge variant={item.severity === "CRITICAL" ? "error" : item.severity === "HIGH" ? "warning" : "outline"} size="sm">{item.severity}</M3Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-md-on-surface-variant">
                    <span>PIC: {item.handledBy?.name || "Belum ditetapkan"}</span>
                    <M3Button href={"/school/student-affairs?tab=VIOLATIONS&student=" + item.student.id} variant="text" size="sm">Buka</M3Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </M3Card>

        <M3Card variant="outlined" className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-md-on-surface">Pembinaan Aktif</p>
              <p className="text-xs text-md-on-surface-variant">Pembinaan dan pemanggilan orang tua yang belum selesai.</p>
            </div>
            <M3Badge variant={data.recentCoachings?.length ? "warning" : "success"} size="sm">{data.recentCoachings?.length || 0}</M3Badge>
          </div>
          {!data.recentCoachings?.length ? (
            <M3EmptyState icon="task_alt" title="Tidak ada pembinaan aktif" description="Pembinaan yang masih berjalan akan muncul di sini." />
          ) : (
            <div className="space-y-2">
              {data.recentCoachings.map((item: any) => (
                <div key={item.id} className="rounded-[11px] border border-md-outline-variant/45 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12.5px] font-semibold text-md-on-surface">{item.topic}</p>
                      <p className="mt-0.5 text-[11px] text-md-on-surface-variant">{item.student?.name || "Siswa"} · {item.student?.classRoom?.name || "-"}</p>
                    </div>
                    <M3Badge variant="outline" size="sm">{item.type}</M3Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-md-on-surface-variant">
                    <span>PIC: {item.assignedTo?.name || "Belum ditetapkan"}</span>
                    <M3Button href={"/school/student-affairs?tab=COACHING&student=" + item.student.id} variant="text" size="sm">Buka</M3Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </M3Card>
      </div>

      {!data.classRows?.length ? (
        <M3EmptyState icon="groups" title="Rombel aktif belum tersedia" description="Ringkasan presensi kesiswaan akan muncul setelah tahun ajaran dan rombel aktif tersedia." />
      ) : (
        <M3Card variant="outlined" className="overflow-hidden p-0">
          <M3Table>
            <M3TableHeader>
              <M3TableRow>
                <M3TableHead>Rombel</M3TableHead><M3TableHead>Wali Kelas</M3TableHead><M3TableHead>Siswa</M3TableHead><M3TableHead>Tercatat</M3TableHead><M3TableHead>Alpa</M3TableHead><M3TableHead>Terlambat</M3TableHead><M3TableHead>Kehadiran</M3TableHead>
              </M3TableRow>
            </M3TableHeader>
            <M3TableBody>
              {data.classRows.map((row: any) => (
                <M3TableRow key={row.id}>
                  <M3TableCell className="font-semibold text-md-on-surface">{row.name}</M3TableCell>
                  <M3TableCell>{row.homeroomTeacherName || "-"}</M3TableCell>
                  <M3TableCell>{row.studentCount}</M3TableCell>
                  <M3TableCell>{row.recordedCount}</M3TableCell>
                  <M3TableCell>{row.alpa}</M3TableCell>
                  <M3TableCell>{row.terlambat}</M3TableCell>
                  <M3TableCell>{row.rate === null ? "-" : String(row.rate) + "%"}</M3TableCell>
                </M3TableRow>
              ))}
            </M3TableBody>
          </M3Table>
        </M3Card>
      )}
    </div>
  );
}

function FacilitiesPanel({ data, isAdmin }: { data: any; isAdmin: boolean }) {
  return (
    <div className="space-y-4">
      <M3Banner
        variant="standard"
        headline="Inventaris dan pemeliharaan Sarpras"
        supportingText="Data ruang, aset fisik, kondisi, pemeliharaan, dan tindak lanjut sekarang dikelola sebagai inventaris operasional sekolah."
        icon="inventory_2"
      />
      <div className="flex flex-wrap justify-end gap-2">
        <M3Button href="/school/sarpras" variant="tonal" size="sm" icon="inventory_2">Buka Inventaris</M3Button>
        <M3Button href="/school/follow-up" variant="outlined" size="sm" icon="assignment_turned_in">Tindak Lanjut</M3Button>
        {isAdmin && <M3Button href="/school/governance/organization" variant="outlined" size="sm" icon="account_tree">Penugasan</M3Button>}
      </div>

      {!data.attentionAssets?.length ? (
        <M3EmptyState
          icon="task_alt"
          title="Tidak ada aset yang perlu perhatian"
          description="Aset dengan kondisi cukup, rusak, hilang, atau dalam pemeliharaan akan muncul di sini."
        />
      ) : (
        <M3Card variant="outlined" className="overflow-hidden p-0">
          <M3Table>
            <M3TableHeader>
              <M3TableRow>
                <M3TableHead>Kode</M3TableHead>
                <M3TableHead>Aset</M3TableHead>
                <M3TableHead>Lokasi</M3TableHead>
                <M3TableHead>Kondisi</M3TableHead>
                <M3TableHead>Unit</M3TableHead>
                <M3TableHead>PIC</M3TableHead>
                <M3TableHead>Maintenance</M3TableHead>
              </M3TableRow>
            </M3TableHeader>
            <M3TableBody>
              {data.attentionAssets.map((row: any) => (
                <M3TableRow key={row.id}>
                  <M3TableCell className="font-mono text-[11.5px] font-semibold text-md-on-surface">{row.code}</M3TableCell>
                  <M3TableCell className="font-semibold text-md-on-surface">{row.name}</M3TableCell>
                  <M3TableCell>{row.room ? `${row.room.code} · ${row.room.name}` : "-"}</M3TableCell>
                  <M3TableCell><M3Badge variant={row.condition === "DAMAGED" || row.condition === "LOST" ? "error" : "warning"} size="sm">{row.condition}</M3Badge></M3TableCell>
                  <M3TableCell>{row.quantity}</M3TableCell>
                  <M3TableCell>{row.responsibleUser?.name || "-"}</M3TableCell>
                  <M3TableCell>{row._count.maintenances}</M3TableCell>
                </M3TableRow>
              ))}
            </M3TableBody>
          </M3Table>
        </M3Card>
      )}

      {!!data.recentMaintenance?.length && (
        <M3Card variant="outlined" className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-md-on-surface">Maintenance aktif</p>
              <p className="text-xs text-md-on-surface-variant">Laporan yang belum selesai.</p>
            </div>
            <M3Button href="/school/sarpras" variant="text" size="sm">Lihat Semua</M3Button>
          </div>
          <div className="space-y-2">
            {data.recentMaintenance.map((item: any) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-[11px] border border-md-outline-variant/45 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[12.5px] font-semibold text-md-on-surface">{item.asset.code} · {item.asset.name}</p>
                  <p className="mt-0.5 text-[11.5px] text-md-on-surface-variant">{item.issue}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <M3Badge variant={item.priority === "CRITICAL" ? "error" : item.priority === "HIGH" ? "warning" : "outline"} size="sm">{item.priority}</M3Badge>
                  <M3Badge variant="outline" size="sm">{item.status}</M3Badge>
                  <M3Badge variant="outline" size="sm">{item.assignedTo?.name || "Belum ada PIC"}</M3Badge>
                </div>
              </div>
            ))}
          </div>
        </M3Card>
      )}
    </div>
  );
}

function PublicRelationsPanel({ data, isAdmin }: { data: any; isAdmin: boolean }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <M3Card variant="outlined" className="p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-md-tertiary-container text-md-on-tertiary-container">
              <M3Icon name="language" size={20} />
            </span>
            <div>
              <p className="text-sm font-bold text-md-on-surface">{data.website?.title || "Website Sekolah"}</p>
              <p className="mt-0.5 text-xs leading-5 text-md-on-surface-variant">
                Status: <strong>{data.website?.status || "NOT_INITIALIZED"}</strong> · {data.website?.publishedContent || 0} konten terbit · {data.website?.pendingContent || 0} konten proses.
              </p>
            </div>
          </div>
        </M3Card>
        <div className="flex flex-wrap gap-2">
          {data.usesPkl && isAdmin && <M3Button href="/school/pkl/companies" variant="tonal" size="sm" icon="apartment">Mitra DUDI</M3Button>}
          {data.usesPkl && <M3Button href="/school/pkl/placements" variant="outlined" size="sm" icon="work">Penempatan PKL</M3Button>}
          {isAdmin && <M3Button href="/school/website" variant="outlined" size="sm" icon="language">Website</M3Button>}
        </div>
      </div>

      {!data.companyRows?.length ? (
        <M3EmptyState
          icon="handshake"
          title="Mitra DUDI belum tersedia"
          description="Tambahkan mitra industri agar hubungan sekolah, PKL, dan penempatan siswa dapat dipantau dari panel ini."
          actionLabel="Kelola Mitra DUDI"
          actionHref="/school/pkl/companies"
        />
      ) : (
        <M3Card variant="outlined" className="overflow-hidden p-0">
          <M3Table>
            <M3TableHeader>
              <M3TableRow>
                <M3TableHead>Mitra DUDI</M3TableHead>
                <M3TableHead>Bidang</M3TableHead>
                <M3TableHead>PIC</M3TableHead>
                <M3TableHead>PKL Aktif</M3TableHead>
              </M3TableRow>
            </M3TableHeader>
            <M3TableBody>
              {data.companyRows.map((row: any) => (
                <M3TableRow key={row.id}>
                  <M3TableCell className="font-semibold text-md-on-surface">{row.name}</M3TableCell>
                  <M3TableCell>{row.industrySector || "-"}</M3TableCell>
                  <M3TableCell>{row.picName || "-"}</M3TableCell>
                  <M3TableCell>{row.activePlacements}</M3TableCell>
                </M3TableRow>
              ))}
            </M3TableBody>
          </M3Table>
        </M3Card>
      )}
    </div>
  );
}

export function WakasekDashboardPage({ user }: { user: AuthUser }) {
  const [selectedRole, setSelectedRole] = useState<WakasekRoleCode | "">(() => {
    if (typeof window === "undefined") return "";
    const role = new URLSearchParams(window.location.search).get("role") as WakasekRoleCode | null;
    return role && WAKASEK_ROLE_META[role] ? role : "";
  });
  const query = useQuery(getWakasekDashboardData, selectedRole ? { role: selectedRole } : {});

  useEffect(() => {
    const resolvedRole = query.data?.access?.selectedRole as WakasekRoleCode | undefined;
    if (!selectedRole && resolvedRole) setSelectedRole(resolvedRole);
  }, [query.data?.access?.selectedRole, selectedRole]);

  const data = query.data as any;
  const availableRoles = (data?.access?.availableRoles || []) as WakasekRoleCode[];
  const currentRole = (data?.access?.selectedRole || selectedRole) as WakasekRoleCode | "";
  const meta = currentRole ? WAKASEK_ROLE_META[currentRole] : null;

  return (
    <SchoolLayout user={user}>
      <div className="space-y-5">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="v2-eyebrow">TATA KELOLA SEKOLAH</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.02em] text-md-on-surface">Panel Wakasek</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-md-on-surface-variant">
              Dashboard kerja modular berdasarkan bidang Wakil Kepala Sekolah. Hak akses mengikuti penugasan guru yang ditetapkan Admin Sekolah.
            </p>
          </div>

          {availableRoles.length > 1 ? (
            <M3Tabs
              tabs={availableRoles.map((role) => ({
                id: role,
                label: WAKASEK_ROLE_META[role].shortLabel,
                icon: WAKASEK_ROLE_META[role].icon,
              }))}
              activeTab={currentRole}
              onChange={(role) => setSelectedRole(role as WakasekRoleCode)}
            />
          ) : meta ? (
            <M3Badge variant="tertiary" size="md">{meta.label}</M3Badge>
          ) : null}
        </header>

        {query.error && (
          <M3Banner
            variant="error"
            headline="Panel Wakasek tidak dapat dibuka"
            supportingText={(query.error as any)?.message || "Akses atau data belum dapat diproses."}
          />
        )}

        {query.isLoading && !data ? (
          <div className="flex min-h-[340px] items-center justify-center">
            <M3CircularProgress size={40} />
          </div>
        ) : data && meta ? (
          <>
            <M3Card variant="elevated" className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-[15px] bg-md-primary-container text-md-on-primary-container">
                    <M3Icon name={meta.icon} size={23} />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-md-on-surface">{meta.label}</h2>
                    <p className="mt-0.5 text-xs leading-5 text-md-on-surface-variant">{meta.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[.05em] text-md-on-surface-variant">Penanggung jawab</span>
                  {data.owners?.length ? data.owners.map((owner: any) => (
                    <M3Badge key={owner.id} variant="outline" size="sm">{owner.name}</M3Badge>
                  )) : (
                    <M3Badge variant="outline" size="sm">Belum ditetapkan</M3Badge>
                  )}
                </div>
              </div>
            </M3Card>

            <MetricGrid metrics={data.roleData?.metrics || []} />

            {data.roleData?.type === "KURIKULUM" && <CurriculumPanel data={data.roleData} />}
            {data.roleData?.type === "KESISWAAN" && <StudentAffairsPanel data={data.roleData} isAdmin={!!data.access?.isAdmin} />}
            {data.roleData?.type === "SARPRAS" && <FacilitiesPanel data={data.roleData} isAdmin={!!data.access?.isAdmin} />}
            {data.roleData?.type === "HUMAS_HUBIN" && <PublicRelationsPanel data={data.roleData} isAdmin={!!data.access?.isAdmin} />}
          </>
        ) : !query.isLoading && !query.error ? (
          <M3EmptyState
            icon="verified_user"
            title="Belum ada penugasan Wakasek"
            description="Admin Sekolah dapat menetapkan bidang Wakasek dari Data Guru & Tendik."
            actionLabel="Buka Data Guru"
            actionHref="/school/teachers"
          />
        ) : null}
      </div>
    </SchoolLayout>
  );
}
