# SaaS Satu Smart School — UI/UX Redesign Plan v2

> **Status:** Implemented and deployed to production
> **Tanggal penetapan:** 8 September 2026  
> **Design direction:** **Playful Academic**  
> **Target utama:** SMP, SMA, dan SMK  
> **Fondasi:** Material 3 / Material 3 Expressive  
> **Source of truth untuk redesign UI/UX v2:** dokumen ini

### Phase 0 artifacts

Phase 0 audit dan structural wireframe telah diselesaikan pada 8 September 2026:

- [`UX_AUDIT_PHASE0_V2.md`](./UX_AUDIT_PHASE0_V2.md): audit information architecture, role UX, navigation, responsive state, dan data honesty.
- [`WIREFRAMES_DASHBOARDS_V2.md`](./WIREFRAMES_DASHBOARDS_V2.md): wireframe desktop/mobile untuk Dashboard Siswa, Guru, dan Admin Sekolah beserta dashboard DTO contract.

Keputusan Phase 0 menjadi acuan tambahan untuk Sprint UI-01 dan seterusnya.

---

## 1. Tujuan Dokumen

Dokumen ini menyimpan secara permanen arah, prinsip, keputusan visual, arsitektur pengalaman, roadmap, serta quality gate untuk redesign **SaaS Satu Smart School v2**.

Tujuannya adalah agar seluruh developer, agent, designer, dan reviewer berikutnya mempunyai acuan yang sama dan tidak melakukan redesign secara ad-hoc per halaman.

Redesign v2 telah diimplementasikan berdasarkan arah dalam dokumen ini. Detail implementasi, quality gate, dan rollout dicatat di [`UI_UX_REDESIGN_IMPLEMENTATION_V2.md`](./UI_UX_REDESIGN_IMPLEMENTATION_V2.md). Jika terjadi konflik keputusan untuk pekerjaan UI baru, dokumen rencana ini tetap menjadi acuan arah desain v2, sedangkan implementation report menjadi acuan kondisi implementasi aktual.

---

## 2. Visi Produk

SaaS Satu harus terasa sebagai:

> **Ruang sekolah digital yang modern, ramah, hidup, dan menyenangkan — bukan dashboard ERP perusahaan.**

Pengalaman harus cukup fun untuk murid, cukup praktis untuk guru, dan cukup profesional serta terpercaya untuk administrator sekolah.

### Formula visual

- **70% Clean Educational**
- **20% Playful & Expressive**
- **10% Delightful Interaction**

### Karakter produk

- Educational
- Youthful
- Friendly
- Playful
- Modern
- Organized
- Trustworthy

### Prinsip inti

> **Serius dalam mengelola pendidikan, menyenangkan ketika digunakan.**

---

## 3. Sasaran Pengguna

Redesign harus mengakomodasi kebutuhan role berikut:

1. **Super Admin Platform**
2. **Admin Sekolah**
3. **Guru**
4. **Siswa**
5. **Pembimbing / DUDI Mentor**

Setiap role harus mendapatkan navigation, dashboard, shortcut, statistik, dan prioritas informasi yang relevan dengan tugasnya.

---

## 4. Design Principles

### 4.1 Playful, Not Childish

Gunakan:

- warna cerah secara terkendali;
- rounded shape;
- icon friendly;
- illustration geometris;
- micro-interaction;
- progress yang bermakna;
- bahasa yang hangat dan natural.

Hindari:

- kartun berlebihan;
- emoji di semua tempat;
- warna pelangi di setiap kartu;
- animasi dekoratif terus-menerus;
- gaya aplikasi anak usia dini.

### 4.2 Role First

UI harus mengikuti peran pengguna, bukan memaksa semua role menggunakan dashboard dan sidebar yang sama.

### 4.3 Action First

Halaman pertama harus membantu menjawab:

> **“Apa yang perlu saya lakukan sekarang?”**

Contoh guru:

- kelas berikutnya;
- tugas belum dinilai;
- jurnal PKL menunggu review;
- agenda mengajar belum lengkap.

Contoh siswa:

- jadwal hari ini;
- deadline terdekat;
- CBT mendatang;
- jurnal PKL yang belum diisi.

### 4.4 Calm Information Density

Dashboard bukan tempat menampilkan seluruh data. Prioritas informasi:

1. Urgent / perlu perhatian
2. Hari ini
3. Progress
4. Informasi pendukung

### 4.5 Progressive Disclosure

Tampilkan ringkasan terlebih dahulu, lalu arahkan ke detail melalui CTA yang jelas.

### 4.6 Accessible by Default

Semua komponen baru harus memperhatikan:

- keyboard navigation;
- visible focus;
- kontras teks dan komponen;
- target sentuh minimal yang nyaman;
- status tidak dibedakan hanya dengan warna;
- responsive layout;
- reduced motion jika tersedia;
- semantic HTML dan ARIA seperlunya.

### 4.7 Data Honesty

UI tidak boleh menampilkan:

- statistik buatan;
- progress palsu;
- nilai contoh yang terlihat seperti data nyata;
- persentase kehadiran default;
- placeholder bisnis seolah fitur sudah aktif.

Jika data belum tersedia, tampilkan **“Belum tersedia”**, empty state, atau penjelasan konfigurasi.

---

## 5. Design Personality

### Smart

Teknologi modern, cepat, dan terstruktur.

### Friendly

Bahasa mudah dipahami oleh guru dan murid.

### Energetic

Tidak terasa seperti aplikasi birokrasi atau ERP lama.

### Reliable

Data akademik tetap terlihat serius, jelas, dan terpercaya.

### Educational

Visual dan microcopy harus terasa berada di lingkungan pendidikan tingkat menengah.

---

## 6. Visual Direction — Playful Academic

Referensi rasa produk secara konseptual:

- clarity dan organization seperti aplikasi pendidikan modern;
- energi interaksi seperti aplikasi belajar yang engaging;
- fondasi komponen tetap mengikuti Material 3;
- tingkat ekspresi lebih tinggi pada siswa/LMS/CBT;
- tingkat ekspresi lebih tenang pada Reports, Settings, dan Super Admin.

**Tidak menyalin UI produk lain secara literal.** Semua keputusan harus menghasilkan identitas SaaS Satu sendiri.

---

## 7. Color System v2

### 7.1 Brand Colors

| Role | Nama | Hex | Penggunaan |
|---|---|---:|---|
| Primary | Academic Indigo | `#4F46E5` | primary button, active navigation, link utama, focus, brand |
| Primary Container | Soft Indigo | `#EEF2FF` | selected state, highlight, navigation container |
| Secondary | Learning Teal | `#0F9D8A` | progress, learning state, LMS accent |
| Tertiary | Creative Amber | `#F59E0B` | deadline, achievement, attention |
| Accent | Playful Coral | `#F97366` | illustration dan accent terbatas |
| Success | Fresh Green | `#22A06B` | status berhasil / selesai |
| Error | Soft Red | `#DC4C4C` | error / destructive action |
| Information | Learning Blue | `#3B82F6` | informational state |

### 7.2 Neutral — Light Mode

| Token | Hex |
|---|---:|
| Background | `#F8FAFC` |
| Surface | `#FFFFFF` |
| Surface Variant | `#F1F5F9` |
| Text Primary | `#172033` |
| Text Secondary | `#64748B` |
| Border | `#E2E8F0` |

### 7.3 Neutral — Dark Mode

| Token | Hex |
|---|---:|
| Background | `#111827` |
| Surface | `#182233` |
| Elevated Surface | `#1E293B` |
| Text Primary | `#F8FAFC` |
| Text Secondary | `#CBD5E1` |
| Border | `#334155` |

Dark mode tidak boleh dibuat dengan sekadar invert warna.

### 7.4 Module Accent

Accent modul membantu orientasi, tetapi tidak boleh membuat setiap halaman terasa seperti aplikasi berbeda.

| Modul | Accent |
|---|---|
| Beranda | Indigo |
| LMS | Blue |
| CBT | Purple |
| Siswa | Cyan |
| Guru | Teal |
| Rombel | Indigo |
| PKL | Orange |
| Governance | Green |
| Reports | Amber |
| Super Admin | Deep Indigo |

Accent digunakan terutama pada icon container, badge, progress, header kecil, atau illustration.

---

## 8. Typography v2

### Font utama

**Inter**

Fallback:

```css
font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

### Type scale

| Style | Size / Line Height | Weight | Penggunaan |
|---|---|---:|---|
| Display | 40 / 48 | 700 | hero / landing |
| H1 | 32 / 40 | 700 | page title |
| H2 | 24 / 32 | 700 | section title |
| H3 | 20 / 28 | 600 | card title |
| Body Large | 16 / 24 | 400 | supporting copy |
| Body | 14 / 22 | 400 | default UI copy |
| Label | 13 / 18 | 600 | control / metadata |
| Caption | 12 / 18 | 500 | secondary metadata |

Typography harus readable dan tidak terlalu padat, khususnya pada mobile.

---

## 9. Shape System

| Token | Radius | Penggunaan |
|---|---:|---|
| Small | 8px | chip kecil / utility |
| Medium | 12px | button / input |
| Large | 16px | standard card |
| XL | 24px | hero card / dashboard highlight |
| Full | 999px | badge / pill / avatar container |

Rounded shape menjadi karakter utama, tetapi jangan membuat semua elemen berbentuk pill.

---

## 10. Spacing System

Gunakan grid kelipatan 4:

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

Default:

- card padding desktop: **20–24px**;
- page padding desktop: **32px**;
- tablet: **24px**;
- mobile: **16px**.

---

## 11. Elevation

Gunakan shadow ringan dan selektif.

```css
/* Normal */
box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);

/* Elevated */
box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);

/* Hover */
box-shadow: 0 8px 24px rgba(15, 23, 42, 0.10);
```

Tidak semua grouping harus menjadi floating card. Gunakan whitespace dan surface hierarchy.

---

## 12. Iconography

Gunakan **Material Symbols Rounded**.

Contoh mapping:

| Fitur | Icon |
|---|---|
| Dashboard | `dashboard` |
| Siswa | `school` |
| Guru | `person_book` |
| LMS | `menu_book` |
| CBT | `quiz` |
| PKL | `work` |
| Reports | `description` |
| Settings | `settings` |

Ukuran default 20–24px. Dashboard icon container 40–48px.

---

## 13. Information Architecture & App Shell

### Desktop

- sidebar / navigation drawer;
- top app bar;
- main content area;
- role-aware menus;
- optional compact navigation rail.

Target width sidebar:

- expanded: **260px**;
- compact: **80px**.

### Admin Sekolah — struktur awal

```text
BERANDA
  Dashboard

AKADEMIK
  Siswa
  Guru
  Rombel
  Jurusan
  Tahun Ajaran

PEMBELAJARAN
  LMS
  CBT

PKL
  Perusahaan
  Penempatan
  Presensi
  Jurnal

TATA KELOLA
  Monitoring
  Laporan

PENGATURAN
  Pengaturan Sekolah
  Bantuan
```

### Navigation rule

Menu **harus role-aware**. Jangan hanya menyembunyikan menu di client; authorization server-side tetap menjadi sumber keamanan utama.

---

## 14. Mobile Navigation

### Siswa

Gunakan bottom navigation maksimal 5 item:

1. Beranda
2. Belajar
3. Tugas
4. Agenda
5. Saya

### Guru / Admin

Gunakan top app bar + drawer atau adaptive navigation sesuai kebutuhan data.

Mobile tidak boleh sekadar mengecilkan sidebar desktop.

---

## 15. Dashboard Pattern — Bento Education

Dashboard menggunakan pola **Bento Education** dengan jumlah card terbatas dan hierarchy yang jelas.

Setiap card idealnya memiliki:

- icon / visual cue;
- headline;
- satu informasi utama;
- optional supporting text;
- maksimal satu CTA utama.

Hindari dashboard yang dipenuhi 15–20 stat card tanpa prioritas.

---

## 16. Dashboard Siswa

### Tujuan

Ketika siswa membuka aplikasi:

> **“Saya tahu apa yang harus saya kerjakan hari ini.”**

### Prioritas konten

1. Greeting + konteks hari
2. Pelajaran hari ini
3. Tugas mendatang
4. CBT mendatang
5. Progress mingguan
6. PKL / jurnal jika relevan
7. Achievement personal ringan

### Gamification

Gunakan personal progress, completion, dan achievement.

Contoh:

- Semua tugas minggu ini selesai
- 5 materi dipelajari
- Jurnal PKL lengkap

Hindari leaderboard akademik agresif sebagai mekanisme utama.

---

## 17. Dashboard Guru

### Tujuan

Ketika guru membuka aplikasi:

> **“Saya langsung tahu kelas, tugas, dan pekerjaan yang perlu saya tangani.”**

### Prioritas

1. Jadwal mengajar hari ini
2. Kelas berikutnya
3. Tugas belum dinilai
4. Jurnal PKL menunggu review
5. Agenda mengajar belum lengkap
6. Shortcut ke LMS / input nilai

Dashboard guru adalah **action dashboard**, bukan statistik dashboard.

---

## 18. Dashboard Admin Sekolah

### Tujuan

Ketika admin membuka aplikasi:

> **“Saya dapat melihat kondisi sekolah dan masalah yang memerlukan perhatian.”**

### KPI terbatas

- siswa aktif;
- guru aktif;
- rombel;
- course aktif.

### Section penting

- Perlu Perhatian
- Aktivitas Akademik
- Kapasitas Sekolah
- Quick Management

Jangan membuat chart jika data tersebut tidak memberi keputusan yang jelas.

---

## 19. Dashboard Super Admin

Lebih tenang dan profesional.

Fokus:

- tenant / sekolah;
- tenant aktif / trial;
- user;
- subscription jika payment benar-benar aktif;
- system / integration status;
- aktivitas tenant.

Jangan menampilkan revenue/analytics palsu ketika provider belum dikonfigurasi.

---

## 20. Core Component System v2

Komponen prioritas:

1. Button
2. Icon Button
3. Text Field
4. Select
5. Card
6. Stat Card
7. Alert Card
8. Progress Card
9. Badge
10. Chip
11. Tabs
12. Empty State
13. Data Table
14. Dialog
15. Drawer / Sidebar
16. Top App Bar
17. Bottom Navigation
18. Toast / Snackbar
19. Skeleton
20. Filter Bar

Komponen baru harus menggunakan token, bukan nilai visual acak per halaman.

---

## 21. Button Hierarchy

### Primary

Solid Academic Indigo. Hanya untuk aksi utama.

### Secondary

Tonal / soft container.

### Tertiary

Text / ghost.

### Destructive

Semantic red.

Jangan membuat seluruh tombol menjadi primary.

---

## 22. Table & Data Management

Desktop:

- sticky header jika relevan;
- row hover;
- search;
- filter chip;
- pagination;
- contextual action;
- clear selected / active state.

Mobile:

- jangan memaksa tabel desktop selebar layar;
- ubah data prioritas menjadi list/card;
- kolom sekunder masuk detail sheet/page.

---

## 23. Form Pattern

Form panjang harus dipecah berdasarkan section, misalnya:

- Informasi Dasar
- Data Akademik
- Kontak
- Penempatan / Relasi

Aksi utama ditempatkan konsisten dan validation error harus dekat dengan field terkait.

---

## 24. Empty State

Pattern wajib:

1. icon/illustration;
2. headline;
3. supporting text;
4. primary action jika ada.

Contoh:

> **Belum ada materi**  
> Tambahkan materi pertama untuk memulai pembelajaran kelas ini.  
> **[Tambah Materi]**

Hindari sekadar `No records found`.

---

## 25. Loading & Feedback

### Loading

Gunakan skeleton untuk:

- dashboard;
- table;
- course card;
- user/profile card.

Spinner digunakan pada action singkat atau loading lokal.

### Feedback

Toast/snackbar:

- Success: `Data siswa berhasil disimpan.`
- Error: `Data gagal disimpan.`
- Warning: `Beberapa data belum lengkap.`
- Information: `Tahun ajaran baru tersedia.`

---

## 26. Motion & Micro-interaction

Durasi umum:

**150–250ms**

Gunakan untuk:

- hover;
- pressed state;
- drawer;
- accordion;
- sidebar;
- progress;
- success state;
- state transition.

Hindari:

- bouncing button;
- glow berlebihan;
- confetti rutin;
- gradient bergerak;
- animasi yang tidak membantu orientation/hierarchy.

---

## 27. Illustration Style

Karakter illustration:

- geometric;
- flat / simple depth;
- colorful;
- sedikit abstract;
- education-oriented;
- cocok untuk remaja.

Tema:

- buku;
- komputer;
- coding;
- kolaborasi;
- sekolah;
- achievement;
- praktik industri / PKL;
- belajar mandiri.

Jangan menggunakan stock photo sebagai identitas visual utama aplikasi.

---

## 28. Microcopy & Language

Bahasa utama: **Bahasa Indonesia yang natural, ringkas, dan ramah**.

Hindari:

- `Operation successfully executed.`
- `No records found.`
- istilah teknis internal yang tidak perlu diketahui pengguna.

Gunakan:

- `Data berhasil disimpan.`
- `Belum ada data siswa.`
- `Semua tugasmu sudah selesai.`
- `Tidak ada tugas administrasi yang memerlukan perhatian.`

Tone boleh sedikit lebih playful untuk siswa dan tetap profesional untuk admin/superadmin.

---

## 29. Responsive Breakpoints

| Mode | Breakpoint |
|---|---|
| Mobile | `< 640px` |
| Tablet | `640–1023px` |
| Desktop | `1024–1439px` |
| Large | `>= 1440px` |

Setiap halaman redesign harus diuji minimal pada mobile, tablet, desktop, dan large desktop yang relevan.

---

## 30. Role-Based UX Matrix

| Fitur | Super Admin | Admin Sekolah | Guru | Siswa | DUDI Mentor |
|---|---:|---:|---:|---:|---:|
| Tenant / sekolah | penuh | tenant sendiri | - | - | - |
| Master Data | monitor/manage | penuh | terbatas | - | - |
| LMS | monitor | manage | scope mengajar | scope enrollment | - |
| CBT | monitor | manage | scope mengajar | peserta | - |
| PKL | monitor | manage | scope bimbingan | placement sendiri | scope bimbingan |
| Reports | platform | sekolah | scope sendiri | terbatas/tidak ada | terbatas |
| Settings | platform | sekolah | profil/terbatas | profil | profil |

**Catatan keamanan:** matrix UI bukan pengganti authorization server-side.

---

## 31. Accessibility Baseline

Target redesign minimal:

- WCAG 2.2 AA untuk bagian inti;
- text contrast sesuai role dan ukuran;
- visible keyboard focus;
- touch target minimum praktis 44px untuk kontrol utama;
- semantic heading hierarchy;
- icon-only button mempunyai accessible label;
- table mempunyai heading dan semantics yang benar;
- error tidak hanya disampaikan dengan warna;
- motion dapat dikurangi jika `prefers-reduced-motion` aktif;
- form label selalu terhubung dengan input.

---

## 32. Implementation Strategy

### Jangan redesign langsung pada release live

Buat branch khusus, misalnya:

```text
redesign/ui-education-playful
```

### Urutan kerja setiap slice

```text
Design decision
    ↓
Design token / component
    ↓
Page implementation
    ↓
TypeScript
    ↓
Unit test
    ↓
Responsive check
    ↓
Dark mode
    ↓
Keyboard / accessibility check
    ↓
E2E
    ↓
Visual review
```

Security hardening yang sudah ada tidak boleh dilemahkan oleh redesign visual.

---

## 33. Sprint Roadmap

### Phase 0 — UX Audit

- inventory halaman;
- identifikasi inconsistency;
- screenshot baseline;
- daftar pain point per role;
- identifikasi komponen reusable vs legacy.

**Deliverable:** UI/UX audit report + page inventory.

### Sprint UI-01 — Design Tokens

- color tokens;
- typography;
- spacing;
- radius;
- elevation;
- motion;
- breakpoints.

**Deliverable:** token layer tanpa redesign halaman besar.

### Sprint UI-02 — Core Components

- button;
- input;
- select;
- card;
- badge;
- chip;
- empty state;
- skeleton;
- toast;
- dialog.

### Sprint UI-03 — App Shell

- overall layout;
- page container;
- adaptive content width;
- responsive behavior.

### Sprint UI-04 — Navigation

- sidebar;
- topbar;
- role-aware navigation;
- mobile navigation;
- active/hover/focus state.

### Sprint UI-05 — Dashboard Siswa

Desktop + mobile.

### Sprint UI-06 — Dashboard Guru

Desktop + tablet/mobile.

### Sprint UI-07 — Dashboard Admin

Desktop + tablet.

### Sprint UI-08 — Super Admin

Professional/quiet expressive variant.

### Sprint UI-09 — Master Data

Urutan:

1. Students
2. Teachers
3. Departments
4. Class Rooms
5. Academic Years

Fokus pada table/list, filters, form, empty state, responsive CRUD.

### Sprint UI-10 — LMS

- course list;
- course detail;
- materi;
- tugas;
- penilaian;
- agenda;
- presensi.

### Sprint UI-11 — CBT

- assessment setup;
- question editing;
- exam experience;
- result state;
- teacher/student DTO tetap dipisahkan secara aman.

### Sprint UI-12 — PKL

- companies;
- placements;
- attendance;
- journals;
- mentor review;
- EWS.

### Sprint UI-13 — Governance & Reports

Lebih tenang, data-dense, print-friendly.

### Sprint UI-14 — Settings, Auth & Landing

Dilakukan setelah app shell dan dashboard stabil agar branding publik mencerminkan produk aktual.

### Sprint UI-15 — Accessibility & UX Regression

- keyboard;
- contrast;
- reduced motion;
- responsive;
- role isolation;
- visual regression;
- E2E regression.

---

## 34. Page Redesign Priority

Urutan implementasi halaman:

1. `SchoolLayout`
2. Sidebar / navigation
3. Top App Bar
4. Dashboard siswa
5. Dashboard guru
6. Dashboard admin sekolah
7. Super Admin
8. Students
9. Teachers
10. Departments
11. Class Rooms
12. Academic Years
13. LMS Courses
14. LMS Course Detail
15. CBT
16. PKL
17. Governance
18. Reports
19. Settings
20. Landing Page
21. Login / Signup / Password flows

Prinsip Pareto: karakter v2 harus muncul dari app shell + core components sebelum menyentuh seluruh halaman.

---

## 35. Quality Gate per Sprint

Setiap sprint minimal melewati:

1. `git diff --check`
2. TypeScript strict
3. relevant unit tests
4. Wasp compile/build bila menyentuh runtime
5. desktop visual check
6. tablet check
7. mobile check
8. dark mode check
9. keyboard/focus check
10. relevant E2E
11. role/authorization regression jika navigation atau data access berubah
12. visual review sebelum merge/deploy

Tidak deploy hanya karena halaman terlihat bagus.

---

## 36. Non-Goals

Redesign v2 **bukan** proyek untuk:

- mengubah authorization model;
- membuka fitur payment/upload/analytics yang belum dikonfigurasi;
- mengubah schema database hanya untuk kebutuhan dekorasi;
- menambah statistik palsu;
- membangun leaderboard akademik;
- mengganti seluruh business logic bersamaan dengan redesign;
- menurunkan security hardening yang sudah diterapkan.

Jika redesign membutuhkan perubahan business logic, perubahan tersebut harus dibuat sebagai task terpisah dan diuji secara eksplisit.

---

## 37. Do / Don't

### DO

- hierarchy kuat;
- whitespace cukup;
- accent selektif;
- task-oriented dashboard;
- responsive design;
- icon untuk membantu scanning;
- empty state yang informatif;
- natural Indonesian copy;
- reusable components;
- accessible states.

### DON'T

- gradient di setiap komponen;
- shadow berat;
- glassmorphism berlebihan;
- card di dalam card berlapis-lapis;
- semua button primary;
- terlalu banyak chart;
- terlalu banyak emoji;
- puluhan menu tanpa grouping;
- fake statistics;
- fake progress;
- decorative motion tanpa fungsi.

---

## 38. Definition of Done — Redesign v2

Redesign baru dianggap selesai ketika:

- seluruh role mempunyai app shell dan navigation konsisten;
- dashboard siswa, guru, admin, superadmin sesuai kebutuhan role;
- core components memakai token v2;
- halaman master data, LMS, CBT, PKL, Governance, dan Reports sudah mengikuti system v2;
- mobile siswa mempunyai navigation dan hierarchy yang layak;
- dark mode konsisten;
- accessibility baseline tercapai;
- tidak ada data placeholder palsu;
- unit/E2E regression tetap hijau;
- cross-tenant authorization tetap terlindungi;
- dokumentasi design system diperbarui dari plan menjadi implementasi aktual;
- visual review final disetujui sebelum production rollout.

---

## 39. Target Experience Statements

### Siswa

> “Saya tahu apa yang harus saya kerjakan hari ini.”

### Guru

> “Saya langsung tahu kelas, tugas, dan pekerjaan yang perlu saya tangani.”

### Admin Sekolah

> “Saya dapat melihat kondisi sekolah dan masalah yang memerlukan perhatian.”

### Super Admin

> “Saya dapat mengelola banyak sekolah tanpa kehilangan konteks tenant.”

---

## 40. Handoff Notes untuk Developer / Agent Berikutnya

Sebelum mulai implementasi redesign:

1. baca dokumen ini seluruhnya;
2. baca `docs/DESIGN_SYSTEM_M3.md` untuk mengetahui baseline komponen v1;
3. audit komponen di `app/src/client/components/m3/` sebelum membuat komponen baru;
4. jangan langsung mengubah seluruh halaman;
5. mulai dari token → core component → app shell → dashboard;
6. pertahankan authorization server-side dan tenant isolation;
7. jangan menyalakan payment, analytics, atau file upload tanpa konfigurasi nyata;
8. jangan memasukkan fake statistic atau sample content ke production UI;
9. gunakan branch redesign khusus;
10. update dokumen ini jika keputusan desain v2 berubah secara material.

---

## 41. Keputusan yang Masih Terbuka

Keputusan berikut akan ditetapkan saat Sprint UI-01 / wireframe:

- final shade palette lengkap (50–950);
- final typography implementation dan font loading strategy;
- exact dark-mode semantic token mapping;
- illustration asset family;
- visual density mode untuk tabel administrasi;
- final motion token names;
- visual regression tooling yang dipakai di CI.

Keputusan terbuka tidak boleh dijawab dengan nilai acak hanya untuk mempercepat implementasi.

---

## 42. Ringkasan

**Product:** SaaS Satu Smart School  
**Design Direction:** Playful Academic  
**Primary:** Academic Indigo  
**Secondary:** Learning Teal  
**Accent:** Creative Amber + Coral  
**Typography target:** Inter  
**Icon:** Material Symbols Rounded  
**Shape:** Rounded / Expressive  
**Dashboard pattern:** Bento Education  
**Desktop:** Role-aware sidebar + top app bar  
**Mobile siswa:** Bottom navigation  
**Tone:** Friendly Professional  
**Safety:** Data honest + authorization server-side tetap wajib  

> **SaaS Satu v2 harus terasa seperti sekolah digital yang hidup: jelas ketika bekerja, menyenangkan ketika belajar, dan tetap terpercaya ketika mengelola data pendidikan.**
