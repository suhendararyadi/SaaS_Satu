# SaaS Satu Smart School: Dashboard Wireframes v2

> **Status:** Phase 0 approved wireframe baseline  
> **Tanggal:** 8 September 2026  
> **Design direction:** Playful Academic  
> **Jenis:** low-fidelity structural wireframe  
> **Acuan:** [`UI_UX_REDESIGN_PLAN_V2.md`](./UI_UX_REDESIGN_PLAN_V2.md) dan [`UX_AUDIT_PHASE0_V2.md`](./UX_AUDIT_PHASE0_V2.md)

---

## 1. Cara Membaca Wireframe

Wireframe ini menentukan:

- hierarchy;
- urutan informasi;
- role-specific navigation;
- jenis component;
- behavior desktop/mobile;
- data contract yang dibutuhkan.

Wireframe ini **belum menentukan final pixel styling**.

Notasi:

- `[REAL DATA]`: hanya tampil jika data nyata tersedia;
- `[existing query]`: dapat diturunkan dari operasi yang sudah ada;
- `[requires aggregate]`: membutuhkan query/dashboard DTO baru;
- `[conditional]`: hanya tampil jika relasi/role memenuhi syarat;
- `[action]`: harus memiliki route atau behavior nyata;
- `[no fake value]`: jika data belum tersedia, blok disembunyikan atau memakai honest state.

---

## 2. Shared App Shell v2

### 2.1 Desktop shell

```text
┌─────────────────────────┬────────────────────────────────────────────────────────────┐
│ SAAS SATU               │ [Current page]                         [Theme] [Account]   │
│ Nama Sekolah            │ School / role context                                      │
│                         ├────────────────────────────────────────────────────────────┤
│ PRIMARY NAV             │                                                            │
│                         │                    PAGE CONTENT                            │
│ Role-specific           │                                                            │
│ destinations            │                                                            │
│                         │                                                            │
│ SECONDARY NAV           │                                                            │
│                         │                                                            │
│                         │                                                            │
│─────────────────────────│                                                            │
│ Account / role          │                                                            │
└─────────────────────────┴────────────────────────────────────────────────────────────┘
```

### 2.2 App shell rules

- School name menjadi context, bukan page title utama.
- Current page title harus jelas di top bar atau page header.
- Account avatar adalah button, bukan decorative circle.
- Target interaktif minimum sekitar 44 x 44 px.
- Desktop drawer dapat tetap collapse menjadi rail.
- Sidebar tidak menampilkan menu berdasarkan role saja jika assignment juga diperlukan.
- `Super Admin` school switcher hanya tampil pada Super Admin.
- Theme switch harus tetap usable pada light dan dark mode.

---

## 3. Navigation Contract v2

### 3.1 Siswa

Tujuan yang sudah memiliki route nyata:

```text
Beranda             /school
Kelas Saya          /school/lms/courses
Presensi PKL        /school/pkl/attendance       [conditional SMA/SMK + placement]
Jurnal PKL          /school/pkl/journals         [conditional SMA/SMK + placement]
Akun                /account
```

Tugas dan CBT belum menjadi primary nav mandiri karena saat ini berada di dalam course detail. Dashboard dapat deep-link ke course/assessment yang nyata.

### 3.2 Guru

Primary:

```text
Beranda             /school
Kelas & Mapel       /school/lms/courses
Siswa               /school/students             [directory/read context]
Jurnal PKL          /school/pkl/journals          [conditional supervisor]
Monitoring PKL      /school/pkl/monitoring        [conditional supervisor]
```

Assignment navigation:

```text
Wali Kelas          /school/governance/walikelas [conditional homeroom]
Waka Kurikulum      /school/governance/waka       [conditional isWaka]
Guru Piket          /school/governance/piket      [conditional duty context when available]
```

Secondary:

```text
Kelas & Rombel      /school/classes               [read context]
Guru & Tendik       /school/teachers              [directory/read context]
Akun                /account
```

### 3.3 Admin Sekolah

Primary groups:

```text
Beranda
Akademik
Pembelajaran
PKL
Tata Kelola
Laporan
Pengaturan
```

Child destinations tetap menggunakan route yang sudah ada.

### 3.4 Rule

Navigation visibility tidak pernah dianggap sebagai authorization. Setiap query/action tetap wajib melalui server-side authorization.

---

# BAGIAN A: DASHBOARD SISWA

## 4. Tujuan Dashboard Siswa

Dashboard siswa harus menjawab tiga pertanyaan dalam beberapa detik:

1. Apa yang perlu saya kerjakan sekarang?
2. Apa deadline/ujian berikutnya?
3. Di mana saya membuka kelas atau PKL saya?

Bukan menjawab:

- berapa total siswa sekolah;
- berapa guru di sekolah;
- apa tier subscription sekolah.

---

## 5. Dashboard Siswa: Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────────────┐
│ Beranda Belajar                                            [Theme] [Account]        │
│ Nama Sekolah · Kelas/Rombel [REAL DATA]                                            │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│  Selamat pagi, [Nama]                                                              │
│  [Hari, tanggal dari client/server locale]                                          │
│                                                                                    │
│ ┌────────────────────────────────────────────┐ ┌──────────────────────────────────┐ │
│ │ PRIORITAS BERIKUTNYA                      │ │ PERLU DISELESAIKAN               │ │
│ │                                            │ │                                  │ │
│ │ [Tugas / CBT / PKL paling dekat]          │ │ [2-4 item nyata]                │ │
│ │ Nama mapel / kegiatan                     │ │ • Tugas Basis Data              │ │
│ │ Deadline / availability                   │ │ • CBT ...                       │ │
│ │                                            │ │ • Jurnal PKL                    │ │
│ │ [Buka aktivitas]                          │ │                                  │ │
│ └────────────────────────────────────────────┘ └──────────────────────────────────┘ │
│                                                                                    │
│  KELAS SAYA                                                                         │
│ ┌────────────────────────┐ ┌────────────────────────┐ ┌────────────────────────┐    │
│ │ Basis Data             │ │ KIK                    │ │ ...                    │    │
│ │ Guru [REAL DATA]       │ │ Guru [REAL DATA]       │ │                        │    │
│ │ status ringkas        │ │ status ringkas        │ │                        │    │
│ │ [Buka kelas]           │ │ [Buka kelas]           │ │                        │    │
│ └────────────────────────┘ └────────────────────────┘ └────────────────────────┘    │
│                                                                                    │
│ ┌─────────────────────────────────────────────────────┐ ┌──────────────────────────┐ │
│ │ TUGAS & CBT MENDATANG                              │ │ PKL HARI INI             │ │
│ │                                                     │ │ [conditional]            │ │
│ │ [deadline list, max 5]                             │ │ Perusahaan               │ │
│ │ [status submission/result]                         │ │ Presensi status          │ │
│ │                                                     │ │ Jurnal status            │ │
│ │ [Lihat dari kelas terkait]                         │ │ [Presensi] [Jurnal]      │ │
│ └─────────────────────────────────────────────────────┘ └──────────────────────────┘ │
│                                                                                    │
│ [Optional real progress block only after formula and source are defined]           │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Hierarchy

**Primary:** Prioritas berikutnya.  
**Secondary:** Tugas/CBT yang perlu diselesaikan.  
**Tertiary:** Kelas Saya dan PKL.  
**Optional:** Personal progress bila data completion nyata tersedia.

### 5.2 Kenapa layout modular digunakan

Ukuran blok berbeda karena weight informasinya berbeda:

- next action harus paling cepat ditemukan;
- reminder list lebih compact;
- course card merupakan collection;
- PKL hanya muncul jika relationship ada.

Ini bukan decorative bento grid.

---

## 6. Dashboard Siswa: Mobile Wireframe

```text
┌──────────────────────────────┐
│ Beranda Belajar      [Akun] │
├──────────────────────────────┤
│                              │
│ Selamat pagi, [Nama]         │
│ [Rombel]                     │
│                              │
│ ┌──────────────────────────┐ │
│ │ PRIORITAS BERIKUTNYA    │ │
│ │                          │ │
│ │ [real next action]       │ │
│ │ deadline/status          │ │
│ │                          │ │
│ │ [Buka aktivitas]         │ │
│ └──────────────────────────┘ │
│                              │
│ Perlu diselesaikan           │
│ ┌──────────────────────────┐ │
│ │ [item nyata]            │ │
│ ├──────────────────────────┤ │
│ │ [item nyata]            │ │
│ └──────────────────────────┘ │
│                              │
│ Kelas saya                   │
│ ┌──────────────────────────┐ │
│ │ Mapel + guru             │ │
│ │ [Buka kelas]             │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Mapel + guru             │ │
│ └──────────────────────────┘ │
│                              │
│ PKL hari ini [conditional]   │
│ ┌──────────────────────────┐ │
│ │ status presensi/jurnal   │ │
│ │ [Presensi] [Jurnal]      │ │
│ └──────────────────────────┘ │
│                              │
│ padding-bottom: nav + safe   │
├──────────────────────────────┤
│ Beranda  Kelas  PKL*  Saya  │
└──────────────────────────────┘
```

`PKL*` hanya muncul bila jenjang/relationship relevan. Jika tidak ada PKL, bottom nav tidak memaksakan item kosong.

### 6.1 Mobile behavior

- satu kolom;
- next action berada di atas fold;
- tidak ada horizontal card carousel yang wajib digeser untuk menemukan tugas penting;
- course collection dapat berupa stacked list;
- bottom nav tidak menutup konten terakhir;
- secondary destinations dapat dibuka dari `Menu` bila dibutuhkan.

---

## 7. Dashboard Siswa: Data Contract

Direkomendasikan query server:

```text
getStudentDashboardData()
```

DTO minimum:

```text
student
  id
  displayName
  classRoom { id, name }

courses[]
  id
  subjectName
  teacherDisplayName

pendingAssignments[]
  assignmentId
  courseId
  courseName
  title
  deadline
  submissionStatus

upcomingAssessments[]
  assessmentId
  courseId
  courseName
  title
  startsAt
  endsAt
  attemptStatus

pkl [nullable]
  placementId
  companyName
  attendanceTodayStatus
  journalTodayStatus
```

### Data rules

- hanya kelas/rombel siswa;
- assessment answer key tidak pernah masuk DTO;
- deadline/availability dihitung server dari record nyata;
- tidak mengirim daftar siswa lain;
- progress tidak dimasukkan sebelum formula nyata ditetapkan.

---

## 8. Student Empty / Relationship States

### Belum punya rombel

```text
Kelas belajar belum tersedia

Akun Anda belum ditempatkan ke rombel aktif.
Hubungi admin sekolah atau wali kelas.

[Buka Akun]
```

Tidak ada fake course.

### Tidak ada tugas

```text
Tidak ada tugas yang perlu dikumpulkan saat ini.
Kelas Anda tetap dapat dibuka dari bagian Kelas Saya.
```

### Belum ada PKL

PKL section tidak perlu tampil sebagai error. Bila context pendidikan memerlukan explanation:

```text
PKL belum aktif untuk akun Anda.
```

---

# BAGIAN B: DASHBOARD GURU

## 9. Tujuan Dashboard Guru

Dashboard guru harus menjawab:

1. Kelas/mapel mana yang saya tangani?
2. Apa yang sedang menunggu tindakan saya?
3. Apakah ada tanggung jawab tambahan sebagai wali kelas/Waka/pembimbing PKL?

---

## 10. Dashboard Guru: Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────────────┐
│ Beranda Guru                                              [Theme] [Account]         │
│ Nama Sekolah · Guru                                                              │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│  Selamat pagi, [Nama Guru]                                                         │
│  [Context tahun ajaran aktif jika tersedia]                                        │
│                                                                                    │
│ ┌─────────────────────────────────────────────────┐ ┌─────────────────────────────┐ │
│ │ KELAS YANG DIAMPU                              │ │ PERLU PERHATIAN             │ │
│ │                                                 │ │                             │ │
│ │ [Course 1] [Rombel]                            │ │ [pending grading]           │ │
│ │ [Course 2] [Rombel]                            │ │ [agenda incomplete]         │ │
│ │ [Course 3] [Rombel]                            │ │ [PKL review]                │ │
│ │                                                 │ │                             │ │
│ │ [Buka semua kelas]                             │ │ setiap item punya action    │ │
│ └─────────────────────────────────────────────────┘ └─────────────────────────────┘ │
│                                                                                    │
│  QUICK ACTION                                                                       │
│  [Buka LMS]  [Lihat Siswa]  [Jurnal PKL*]                                          │
│                                                                                    │
│ ┌───────────────────────────────────┐ ┌──────────────────────────────────────────┐  │
│ │ PKL SISWA BIMBINGAN              │ │ TANGGUNG JAWAB TAMBAHAN                  │  │
│ │ [conditional supervisor]         │ │ [conditional]                            │  │
│ │                                   │ │                                          │  │
│ │ jurnal menunggu review           │ │ Wali Kelas: [Rombel]                    │  │
│ │ alert terkait siswa bimbingan    │ │ Waka Kurikulum                          │  │
│ │ [Buka monitoring]                │ │ Guru Piket [when assignment exists]     │  │
│ └───────────────────────────────────┘ └──────────────────────────────────────────┘  │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### 10.1 Yang tidak menjadi hero

- jumlah seluruh siswa sekolah;
- jumlah seluruh guru;
- quota subscription;
- jumlah DUDI seluruh sekolah.

Informasi school-wide dapat tersedia di halaman directory jika memang role teacher boleh melihatnya.

---

## 11. Dashboard Guru: Mobile Wireframe

```text
┌──────────────────────────────┐
│ Beranda Guru         [Akun] │
├──────────────────────────────┤
│                              │
│ Selamat pagi, [Nama]         │
│                              │
│ Perlu perhatian              │
│ ┌──────────────────────────┐ │
│ │ [real pending item]      │ │
│ │ [Buka]                   │ │
│ └──────────────────────────┘ │
│                              │
│ Kelas yang diampu            │
│ ┌──────────────────────────┐ │
│ │ Mapel                    │ │
│ │ Rombel                   │ │
│ │ [Buka kelas]             │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Mapel                    │ │
│ │ Rombel                   │ │
│ └──────────────────────────┘ │
│                              │
│ PKL [conditional]            │
│ ┌──────────────────────────┐ │
│ │ review/alert nyata       │ │
│ └──────────────────────────┘ │
│                              │
│ Tanggung jawab tambahan      │
│ [Wali Kelas] [Waka]*         │
│                              │
├──────────────────────────────┤
│ Beranda  LMS  PKL*  Menu    │
└──────────────────────────────┘
```

`Menu` membuka sheet/drawer untuk destination sekunder dan account bila account tidak berada di top bar.

---

## 12. Dashboard Guru: Data Contract

Direkomendasikan:

```text
getTeacherDashboardData()
```

DTO minimum:

```text
teacher
  id
  displayName

courses[]
  id
  subjectName
  classRoom { id, name }
  academicYear

attention
  ungradedSubmissionCount [requires aggregate]
  incompleteAgendaCount [requires aggregate]
  pendingPklJournalReviewCount [requires aggregate]

pkl [conditional]
  activePlacementCount
  pendingJournalReviews[]
  alerts[]

assignments
  homeroomClass [nullable]
  isWaka
  dutyTeacherContext [nullable, only if domain data exists]
```

### Existing data reuse

- `getLmsCourses` sudah scope teacher berdasarkan `teacherId`;
- `getDailyJournals`/PKL operations sudah memiliki relationship filtering;
- `getHomeroomDashboardData` sudah tersedia untuk wali kelas;
- `getWakaSupervisionData` sudah tersedia untuk Waka.

Dashboard aggregate sebaiknya tidak memanggil banyak query besar dari browser jika satu DTO server dapat memberi ringkasan kecil yang aman.

---

## 13. Teacher Navigation Assignment Rules

```text
IF teacher has courses
  show Kelas & Mapel

IF teacher supervises PKL
  show Jurnal PKL + Monitoring PKL

IF teacher is homeroom teacher
  show Wali Kelas

IF teacherProfile.isWaka == true
  show Waka Kurikulum

IF duty-teacher domain has real assignment context
  show Guru Piket as primary/secondary according to assignment
ELSE
  do not fabricate assignment state
```

---

# BAGIAN C: DASHBOARD ADMIN SEKOLAH

## 14. Tujuan Dashboard Admin

Dashboard admin sekolah harus menjawab:

1. Apakah data inti sekolah sudah siap dipakai?
2. Apa masalah administrasi yang perlu tindakan?
3. Bagaimana kapasitas dan ringkasan operasional sekolah?
4. Ke mana admin harus menuju untuk memperbaiki masalah tersebut?

---

## 15. Dashboard Admin: Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────────────┐
│ Ringkasan Sekolah                                          [Theme] [Account]        │
│ Nama Sekolah · [Tahun ajaran aktif]                                               │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│ ┌────────────────────────────────────────────────────────────────────────────────┐ │
│ │ KONDISI SEKOLAH                                                               │ │
│ │ Nama Sekolah                                                                  │ │
│ │ [school level] [active academic year]                                         │ │
│ │                                                                                │ │
│ │ [Import Data]  [Pengaturan Sekolah]                                           │ │
│ └────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                    │
│  RINGKASAN                                                                          │
│  Siswa [REAL]   Guru [REAL]   Rombel [REAL]   LMS/PKL relevant [REAL]             │
│  (compact metrics, not four equal decorative cards)                                │
│                                                                                    │
│ ┌──────────────────────────────────────────────────┐ ┌────────────────────────────┐ │
│ │ PERLU PERHATIAN                                 │ │ KAPASITAS SISWA            │ │
│ │                                                  │ │                            │ │
│ │ [setup/data issue from real aggregate]          │ │ [studentCount/quota]       │ │
│ │ • siswa belum punya rombel                      │ │ progress bar only if real  │ │
│ │ • academic year issue                           │ │ warning threshold domain   │ │
│ │ • teacher assignment issue                      │ │ [Status paket]             │ │
│ │                                                  │ │                            │ │
│ │ setiap issue -> destination                     │ │                            │ │
│ └──────────────────────────────────────────────────┘ └────────────────────────────┘ │
│                                                                                    │
│  KELOLA CEPAT                                                                       │
│ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐              │
│ │ Siswa              │ │ Guru               │ │ Rombel             │              │
│ │ [Kelola]           │ │ [Kelola]           │ │ [Kelola]           │              │
│ └────────────────────┘ └────────────────────┘ └────────────────────┘              │
│                                                                                    │
│  MODUL AKTIF                                                                        │
│  [LMS] [PKL if level] [Tata Kelola] [Laporan]                                      │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### 15.1 Ringkasan metric

Metric tidak harus selalu card. Desktop dapat menggunakan compact summary row dengan icon/label dan clear hierarchy.

### 15.2 Attention list

Hanya tampilkan issue yang dapat diturunkan dari data nyata.

Contoh calon issue yang memerlukan aggregate query:

- siswa tanpa rombel;
- tidak ada tahun ajaran aktif;
- rombel tanpa wali kelas jika domain mengharuskannya;
- course tanpa teacher hanya jika kondisi tersebut valid menurut model;
- kapasitas siswa mencapai threshold domain.

Jangan menampilkan issue dengan angka contoh.

---

## 16. Dashboard Admin: Mobile Wireframe

```text
┌──────────────────────────────┐
│ Ringkasan Sekolah    [Akun] │
├──────────────────────────────┤
│                              │
│ Nama Sekolah                 │
│ Tahun ajaran [REAL]          │
│ [Import] [Pengaturan]        │
│                              │
│ Ringkasan                    │
│ Siswa [REAL]   Guru [REAL]   │
│ Rombel [REAL]  LMS [REAL]    │
│                              │
│ Perlu perhatian              │
│ ┌──────────────────────────┐ │
│ │ issue nyata             │ │
│ │ [Perbaiki]              │ │
│ ├──────────────────────────┤ │
│ │ issue nyata             │ │
│ │ [Perbaiki]              │ │
│ └──────────────────────────┘ │
│                              │
│ Kapasitas siswa              │
│ ┌──────────────────────────┐ │
│ │ [real quota]            │ │
│ └──────────────────────────┘ │
│                              │
│ Kelola cepat                 │
│ [Siswa] [Guru] [Rombel]     │
│                              │
│ padding-bottom nav           │
├──────────────────────────────┤
│ Beranda Siswa LMS PKL* Menu │
└──────────────────────────────┘
```

Admin mobile memakai bottom destinations yang paling sering dipakai. `Menu` membuka seluruh secondary navigation.

Final mobile nav dapat berubah setelah usage telemetry/user testing tersedia. Tidak boleh menambah item hanya agar jumlahnya lima.

---

## 17. Dashboard Admin: Data Contract

Direkomendasikan:

```text
getSchoolAdminDashboardData()
```

DTO minimum:

```text
school
  id
  name
  level
  tier
  studentQuota

academicYear
  id
  yearName
  semester

counts
  students
  teachers
  classRooms
  lmsCourses
  companies [conditional]
  placements [conditional]

attention[]
  code
  severity
  label
  count [nullable]
  destination

capacity
  studentCount
  studentQuota
  percentage [computed from real values]
```

### Attention item rule

Setiap `attention` item harus berasal dari rule server yang dapat dijelaskan dan diuji.

Tidak membuat "aktivitas terbaru" jika event/audit log belum nyata.

---

# BAGIAN D: SHARED STATES

## 18. Dashboard Loading State

### Desktop

Gunakan skeleton berdasarkan role, bukan satu spinner di tengah.

```text
Memuat ringkasan belajar Anda...

[priority skeleton]
[list skeleton]
[course skeleton]
```

### Mobile

Skeleton mengikuti satu kolom dan tidak memakai shimmer berlebihan.

Motion harus menghormati reduced-motion preference saat implementasi.

---

## 19. Dashboard Error State

```text
Ringkasan belum dapat dimuat

Koneksi ke data sekolah mengalami kendala.
Data Anda tidak diubah.

[Coba Lagi]
```

Jika hanya satu section gagal, gunakan section-level error. Jangan mengganti seluruh portal dengan onboarding.

---

## 20. School Context Missing State

Hanya digunakan bila server memastikan user benar-benar belum memiliki `schoolId`.

```text
Akun belum terhubung ke sekolah

[role-aware explanation]

[Daftarkan Sekolah] [only for valid onboarding role]
```

Super Admin tidak menggunakan onboarding ini untuk membuat tenant baru.

---

# BAGIAN E: PAGE HEADER DAN ACCOUNT

## 21. Page Header v2

### Desktop

```text
[Page Title]
Supporting context / breadcrumb only when useful

                                         [Contextual primary action]
```

### Mobile

```text
[Back or Menu] Page Title                    [Account]
```

Breadcrumb panjang tidak wajib tampil.

---

## 22. Account Menu

```text
┌──────────────────────────────┐
│ [Initial] Nama Pengguna      │
│ Role yang benar              │
│──────────────────────────────│
│ Akun & Profil       /account │
│ Tema                 toggle  │
│──────────────────────────────│
│ Keluar                action │
└──────────────────────────────┘
```

Semua item memiliki behavior nyata.

---

# BAGIAN F: COMPONENT MAPPING

## 23. Reuse Existing Components

Komponen v1 yang layak dipertahankan dan di-evolve:

- `M3Button`
- `M3Card`
- `M3Badge`
- `M3TextField`
- `M3Select`
- `M3Dialog`
- `M3Banner`
- `M3Table`
- `M3Tabs`
- `M3Icon`
- `M3NavigationDrawer`
- `M3TopAppBar`

Jangan membuat library kedua hanya untuk redesign.

---

## 24. New Shared Components Recommended

### `SchoolPageHeader`

Tugas:

- page title;
- supporting context;
- optional breadcrumbs desktop;
- contextual actions;
- responsive behavior.

### `DashboardAttentionList`

Tugas:

- real attention items;
- severity + text;
- destination/action;
- empty state.

### `CourseCompactCard`

Variant berbeda untuk siswa/guru berdasarkan content, bukan warna dekoratif.

### `DashboardPriorityCard`

Hanya satu atau sedikit priority card per screen.

### `ResponsiveDataView`

Desktop table + mobile record list dengan data contract sama.

### `SchoolBottomNavigation`

Role-aware, real destination/behavior, safe-area aware.

### `SchoolAccountMenu`

Profile/theme/logout.

### `DashboardState`

Loading/error/empty primitives dengan copy yang contextual.

---

# BAGIAN G: RESPONSIVE RULES

## 25. Desktop to Mobile Reflow

| Desktop | Mobile |
|---|---|
| persistent drawer | bottom nav + secondary menu/drawer |
| 2-column priority/attention | stacked, priority first |
| course grid/list | stacked list |
| compact metrics row | 2-column compact grid or inline pairs |
| breadcrumbs | back affordance / short context |
| wide data table | mobile record list or contained horizontal table only when unavoidable |

---

## 26. Mobile Constraints

- tidak ada horizontal page scroll;
- bottom nav tidak menutup last item;
- safe-area inset diperhitungkan;
- tap target minimum sekitar 44 x 44 px;
- title tidak bertabrakan dengan actions;
- primary action tidak disembunyikan hanya karena hover;
- form input harus tetap terlihat saat mobile keyboard terbuka.

---

# BAGIAN H: VISUAL DIRECTION PADA WIREFRAME

## 27. Student Visual Treatment

Energy paling tinggi:

- Academic Indigo sebagai anchor;
- controlled module accent;
- lebih banyak shape variation pada priority/learning card;
- progress hanya jika nyata;
- motion 150-250ms untuk state transition dan pressed feedback;
- tidak memakai emoji sebagai decorative UI icon.

---

## 28. Teacher Visual Treatment

Lebih task-oriented:

- less decoration;
- attention list lebih dominan;
- course cards compact;
- assignment badge meaningful;
- secondary accent untuk PKL/role responsibility.

---

## 29. Admin Visual Treatment

Paling tenang di tiga dashboard ini:

- metrics compact;
- attention list kuat;
- quota/capacity jelas;
- no decorative charts;
- administrative density cukup tinggi tetapi tetap breathable.

---

# BAGIAN I: INTERACTION SPEC

## 30. Priority Item Behavior

Priority item selalu memiliki destination nyata.

Contoh:

```text
assignment -> route course detail + assignment focus if supported
assessment -> route course detail + assessment focus if supported
PKL attendance -> /school/pkl/attendance
PKL journal -> /school/pkl/journals
```

Jika deep-link anchor belum ada, implementasi sprint terkait harus menambah behavior tersebut atau menggunakan destination yang benar-benar dapat dicapai.

---

## 31. Attention Item Behavior

Admin/guru attention item terdiri dari:

```text
icon/status + label + optional count + clear action
```

Tidak menggunakan decorative colored left stripe.

Severity tidak hanya dibedakan dengan warna. Gunakan label/icon/text.

---

## 32. Course Card Behavior

Course card memiliki satu primary behavior:

```text
Buka kelas
```

Metadata hanya yang membantu memilih course:

- subject;
- rombel;
- teacher untuk siswa;
- relevant pending count bila nyata.

Tidak menampilkan badge hanya untuk memenuhi ruang.

---

# BAGIAN J: IMPLEMENTATION SEQUENCE

## 33. Sprint UI-01: Tokens and App Shell Contract

Deliverable:

- semantic color tokens v2;
- typography strategy;
- spacing/shape/motion tokens;
- `SchoolPageHeader` contract;
- account menu contract;
- navigation context contract.

No full page redesign yet.

---

## 34. Sprint UI-02: Core Dashboard Components

Deliverable:

- priority card;
- attention list;
- compact course card;
- compact metric;
- role dashboard loading/error/empty states.

---

## 35. Sprint UI-03: App Shell / Navigation

Deliverable:

- role/assignment-aware desktop navigation;
- mobile primary navigation;
- account menu;
- top app bar/page header alignment;
- onboarding/error state separation.

---

## 36. Sprint UI-04: Student Dashboard

Implement wireframe Bagian A.

Quality gate:

- only student DTO;
- no cross-student data;
- no answer key;
- mobile bottom nav;
- loading/error/empty;
- keyboard + touch target check.

---

## 37. Sprint UI-05: Teacher Dashboard

Implement wireframe Bagian B.

Quality gate:

- only teacher-related course/PKL data;
- assignment-aware governance;
- pending counts from real aggregate;
- no school quota content as primary dashboard.

---

## 38. Sprint UI-06: Admin Dashboard

Implement wireframe Bagian C.

Quality gate:

- real operational attention items;
- real capacity values;
- no fake trend/chart;
- responsive quick management.

---

# BAGIAN K: TEST PLAN

## 39. Role E2E Scenarios

### Student

- login student;
- dashboard does not show `Kelola Siswa/Guru/Rombel`;
- only own courses appear;
- only own assignment/assessment state appears;
- PKL section follows relationship;
- mobile primary nav destinations work.

### Teacher

- only assigned courses appear;
- teacher cannot see admin quota CTA;
- governance nav follows assignment;
- PKL review only for supervised placements;
- account/logout works.

### Admin

- admin sees real school metrics;
- attention actions navigate correctly;
- capacity displays real count/quota;
- school settings/import action works.

---

## 40. Accessibility Scenarios

- complete dashboard navigation using keyboard;
- visible focus on every control;
- account menu opens/closes with keyboard;
- dialog/sheet closes with Escape;
- contrast verified per semantic token;
- 200% zoom does not clip critical content;
- mobile bottom nav does not cover content;
- reduced-motion path remains understandable.

---

# BAGIAN L: DECISIONS RESOLVED BY PHASE 0

## 41. Dashboard Composition

Resolved:

- no single generic dashboard for all roles;
- content-driven modular composition;
- student priority first;
- teacher attention + courses first;
- admin operational attention + capacity first.

---

## 42. Mobile Navigation Direction

Resolved at structural level:

### Student

Bottom navigation is primary.

### Teacher

Bottom navigation for primary tasks + secondary menu.

### Admin

Compact bottom destinations + secondary menu/drawer.

Exact labels can be tuned during implementation only if destination remains real and role relevant.

---

## 43. Still Open

Tetap dibawa ke Sprint UI-01:

- final palette shades 50-950;
- final font loading strategy;
- exact dark semantic mapping;
- illustration family;
- exact density token for admin tables;
- visual regression tool;
- exact motion token names.

---

## 44. Phase 0 Exit Criteria

Wireframe phase dianggap siap implementasi bila developer berikutnya dapat menjawab dengan jelas:

- apa yang tampil untuk role tertentu;
- data mana yang harus disediakan server;
- apa yang berbeda di mobile;
- control mana menuju route mana;
- state apa yang muncul bila data kosong/error;
- komponen mana yang reusable;
- bagian mana yang tidak boleh dibuat dari data contoh.

Audit terkait:

[`UX_AUDIT_PHASE0_V2.md`](./UX_AUDIT_PHASE0_V2.md)
