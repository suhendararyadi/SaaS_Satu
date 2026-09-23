# SaaS Satu Smart School: UX Audit Phase 0 v2

> **Status:** Phase 0 baseline, documentation only  
> **Tanggal:** 8 September 2026  
> **Acuan utama:** [`UI_UX_REDESIGN_PLAN_V2.md`](./UI_UX_REDESIGN_PLAN_V2.md)  
> **Scope:** signed-in school portal, terutama app shell dan dashboard  
> **Tidak termasuk:** perubahan runtime, database, authorization, atau deployment

---

## 1. Tujuan Audit

Audit ini memetakan masalah UI/UX aktual sebelum redesign dimulai. Fokus utamanya bukan mencari tampilan yang "lebih cantik", tetapi memastikan struktur informasi, navigasi, role experience, responsive behavior, dan state aplikasi cocok dengan pekerjaan nyata pengguna sekolah.

Pertanyaan yang dipakai:

1. Apakah setiap role melihat informasi yang relevan dengan pekerjaannya?
2. Apakah navigasi hanya menawarkan tujuan yang nyata dan memang berguna?
3. Apakah dashboard membantu pengguna mengambil keputusan berikutnya?
4. Apakah mobile merupakan layout tersendiri, bukan desktop yang diperkecil?
5. Apakah data, angka, status, dan CTA jujur terhadap sumber data dan izin pengguna?
6. Apakah komponen yang ada cukup reusable untuk menjadi fondasi redesign?

---

## 2. Sumber yang Diaudit

Source utama yang diperiksa:

- `app/src/school/components/SchoolLayout.tsx`
- `app/src/school/pages/SchoolDashboardPage.tsx`
- `app/src/client/components/m3/M3NavigationDrawer.tsx`
- `app/src/client/components/m3/M3TopAppBar.tsx`
- `app/src/client/Main.css`
- `app/src/school/school.wasp.ts`
- `app/src/lms/lms.wasp.ts`
- `app/src/lms/operations.ts`
- `app/src/pkl/operations.ts`
- `app/src/governance/operations.ts`
- halaman master data, LMS, PKL, governance, dan reports sebagai sampel pola antarmuka.

Acuan desain dan kualitas:

- `docs/UI_UX_REDESIGN_PLAN_V2.md`
- `docs/DESIGN_SYSTEM_M3.md`
- project Anti-Slop core, UI, mobile, dan human accessibility guidance.

---

## 3. Ringkasan Kondisi Saat Ini

Fondasi teknis UI saat ini cukup baik untuk direstrukturisasi tanpa rewrite total.

### Yang sudah kuat

- Hampir semua modul sekolah menggunakan `SchoolLayout` yang sama.
- Material 3 component layer sudah tersedia dan memiliki unit test.
- Sidebar sudah role-aware pada level dasar.
- Desktop drawer mendukung expanded, collapsed rail, dan hidden state.
- Mobile drawer sudah tersedia.
- Light/dark theme sudah ada.
- Banyak halaman sudah memiliki empty state, loading state, dialog, table, dan form yang reusable.
- Authorization server-side sudah diperketat pada fase hardening sebelumnya.
- LMS dan PKL sudah membatasi data berdasarkan relasi siswa/guru pada server.

### Masalah utama

Masalah terbesar bukan komponen visual, tetapi **dashboard dan information architecture belum benar-benar role-first**.

Saat ini `SchoolDashboardPage` pada dasarnya adalah dashboard administrator sekolah yang juga dipakai siswa, guru, dan DUDI mentor.

Akibatnya beberapa role menerima informasi yang tidak membantu pekerjaan mereka, sementara informasi yang justru penting untuk role tersebut belum tersedia pada dashboard.

---

## 4. Temuan Prioritas

### UX-01: Dashboard tunggal untuk semua role

**Prioritas:** P0 UX  
**Area:** Dashboard  
**Source:** `SchoolDashboardPage.tsx`

`SchoolDashboardPage` hanya membedakan `canManageSchool` untuk beberapa CTA dan setup checklist. Isi utama lainnya tetap sama untuk seluruh pengguna.

Siswa, guru, DUDI mentor, admin sekolah, dan Super Admin dapat menerima komposisi informasi yang hampir sama.

**Dampak:**

- siswa tidak langsung melihat tugas, CBT, kelas, dan PKL miliknya;
- guru tidak langsung melihat kelas yang diampu, pekerjaan penilaian, atau jurnal PKL yang perlu direview;
- dashboard kehilangan fungsi sebagai halaman keputusan pertama;
- role yang berbeda dipaksa membaca informasi administratif yang sama.

**Keputusan v2:**

Dashboard harus memiliki komposisi berbeda untuk minimal:

1. siswa;
2. guru;
3. admin sekolah;
4. Super Admin.

DUDI mentor dapat menggunakan dashboard ringan yang fokus ke PKL pada tahap berikutnya.

---

### UX-02: CTA manajemen terlihat pada role yang tidak mengelola data tersebut

**Prioritas:** P0 UX  
**Area:** Dashboard / affordance

Metric cards menampilkan CTA seperti:

- `Kelola Siswa`
- `Kelola Guru`
- `Kelola Kelas`
- `Kelola DUDI`

Card ini tidak dibatasi menggunakan `canManageSchool`.

**Dampak:**

Pengguna dapat diarahkan ke halaman atau query yang tidak sesuai perannya. Server tetap menjadi penjaga authorization, tetapi UX seharusnya tidak menawarkan aksi yang sudah diketahui tidak relevan.

**Keputusan v2:**

Navigation dan CTA adalah affordance, bukan authorization. Keduanya harus role-aware, sedangkan server-side authorization tetap menjadi sumber kebenaran keamanan.

---

### UX-03: Dashboard terlalu berpusat pada administrasi tenant

**Prioritas:** P0 UX  
**Area:** Dashboard hierarchy

Informasi dominan saat ini:

- status multi-tenant;
- tier sekolah;
- kuota siswa;
- jumlah seluruh siswa;
- jumlah seluruh guru;
- jumlah rombel;
- jumlah DUDI atau LMS.

Informasi ini relevan untuk administrator, tetapi bukan kebutuhan utama siswa dan guru.

**Keputusan v2:**

- tenant/tier hanya tampil pada role yang mengelola organisasi atau subscription;
- kuota siswa hanya menjadi concern admin sekolah/Super Admin;
- siswa fokus ke learning actions;
- guru fokus ke teaching/review actions.

---

### UX-04: Istilah infrastruktur muncul sebagai pesan pengguna

**Prioritas:** P1 UX  
**Contoh:** `Multi-Tenant Aktif`

Multi-tenant adalah konsep arsitektur internal. Untuk pengguna sekolah, badge tersebut tidak membantu menyelesaikan pekerjaan.

**Keputusan v2:**

Gunakan ruang visual untuk identitas sekolah, konteks tahun ajaran, role, atau status yang benar-benar memengaruhi tindakan pengguna.

---

### UX-05: Navigation role-aware belum assignment-aware

**Prioritas:** P0/P1 UX  
**Area:** Sidebar

Teacher saat ini masuk kelompok `isSchoolStaff`, sehingga mendapat banyak menu akademik dan seluruh kelompok tata kelola.

Contoh tata kelola yang tampil untuk teacher:

- Guru Piket
- Wali Kelas
- Waka Kurikulum

Padahal operasi server memiliki relasi/assignment khusus, misalnya `isWaka` dan data wali kelas.

**Dampak:**

- menu yang tidak relevan memperbesar cognitive load;
- halaman bisa berakhir kosong atau ditolak server;
- hierarchy sidebar menjadi terlalu administratif bagi guru biasa.

**Keputusan v2:**

Navigation context harus mempertimbangkan:

- role;
- active school;
- assignment guru;
- status wali kelas;
- status Waka;
- PKL supervision relationship;
- school level.

Navigation context tidak boleh menggantikan authorization server-side.

---

### UX-06: Mobile masih memakai desktop information architecture melalui drawer

**Prioritas:** P0 UX Mobile

Mobile saat ini membuka `M3NavigationDrawer` melalui tombol menu. Ini bekerja secara teknis, tetapi pola navigasinya masih merupakan sidebar desktop yang dipindahkan ke modal drawer.

**Keputusan v2:**

- siswa memakai bottom navigation untuk tujuan utama;
- guru memakai bottom navigation atau compact primary navigation ditambah sheet/menu untuk fungsi sekunder;
- admin memakai compact navigation yang memprioritaskan fungsi harian, bukan seluruh menu sidebar sekaligus;
- secondary destinations tetap dapat masuk menu/drawer.

---

### UX-07: Beberapa target sentuh top app bar di bawah target mobile yang direncanakan

**Prioritas:** P1 Accessibility

Contoh:

- dark mode button: `w-9 h-9`, sekitar 36 x 36 px;
- menu icon menggunakan icon 24 px dengan padding 8 px, sekitar 40 x 40 px.

Design specification v2 dan project accessibility guidance menargetkan minimum sekitar 44 x 44 px.

**Keputusan v2:**

Semua interactive target di app shell minimum 44 x 44 px, dengan jarak yang cukup antar target.

---

### UX-08: User avatar di SchoolLayout hanya visual, bukan account menu

**Prioritas:** P1 UX

`SchoolLayout` menampilkan avatar inisial pada top bar, tetapi avatar tersebut bukan tombol dan tidak membuka account/profile/logout menu.

Project sebenarnya sudah memiliki route `/account` serta `UserDropdown`/logout pada bagian lain.

**Keputusan v2:**

Avatar menjadi account menu yang nyata dengan minimal:

- Profil/Akun;
- preferensi tema bila tetap dibutuhkan di menu;
- Keluar.

Tidak boleh ada control yang terlihat interaktif tetapi tidak memiliki behavior.

---

### UX-09: Footer role label tidak akurat untuk semua role

**Prioritas:** P1 Copy / identity

Drawer footer memakai label sederhana:

- `Super Administrator` untuk `user.isAdmin`;
- `Staff Sekolah` untuk seluruh pengguna lain.

Akibatnya siswa dan DUDI mentor dapat dilabeli `Staff Sekolah`.

**Keputusan v2:**

Gunakan role label yang benar dan human-readable:

- Super Admin;
- Admin Sekolah;
- Guru;
- Siswa;
- Pembimbing DUDI.

---

### UX-10: Error state SchoolLayout tercampur dengan onboarding

**Prioritas:** P0 UX State

Kondisi berikut saat ini menggunakan onboarding yang sama:

```text
error || !school
```

Artinya kegagalan query sementara dapat terlihat seperti "akun belum memiliki sekolah".

Server hardening akan menolak registrasi yang tidak sah, tetapi pengalaman pengguna tetap membingungkan.

**Keputusan v2:**

Pisahkan tiga state:

1. loading school context;
2. authenticated user benar-benar belum terhubung sekolah;
3. gagal memuat school context.

Error state harus menawarkan retry, bukan form registrasi.

---

### UX-11: Loading dashboard terlalu generik

**Prioritas:** P1 UX State

Dashboard memakai circular spinner pada area kosong tanpa menjelaskan apa yang sedang dimuat.

**Keputusan v2:**

Gunakan page skeleton yang mengikuti struktur dashboard role, atau loading state dengan label spesifik seperti `Memuat ruang belajar Anda...`.

---

### UX-12: Data honesty perlu diperketat pada fallback UI

**Prioritas:** P0/P1 Data honesty

Contoh dashboard:

```text
studentQuota = school?.studentQuota || 100
school?.tier || "FREE_TRIAL"
```

Nilai fallback yang terlihat seperti data nyata berpotensi menyembunyikan kondisi data yang sebenarnya tidak tersedia.

**Keputusan v2:**

- nilai domain tidak boleh dibuat hanya untuk mengisi UI;
- gunakan nilai yang berasal dari database;
- jika data seharusnya ada tetapi gagal tersedia, tampilkan unavailable/error state;
- fallback hanya untuk presentational label yang memang didefinisikan aman oleh domain contract.

---

### UX-13: Default dashboard pattern terlalu seragam

**Prioritas:** P1 Visual hierarchy

Dashboard menggunakan empat metric card dengan bentuk, weight, dan kepentingan hampir sama, lalu setup cards di bawahnya.

Ini adalah pola dashboard generik yang tidak menunjukkan prioritas pekerjaan pengguna.

**Keputusan v2:**

Gunakan modular composition hanya ketika konten memang memiliki weight berbeda.

Contoh:

- next action dapat lebih besar;
- reminders dapat compact;
- course list dapat berbentuk list, bukan card grid;
- metric count tidak harus selalu menjadi card.

Istilah internal `Bento Education` pada plan v2 berarti **content-driven modular layout**, bukan decorative bento mosaic.

---

### UX-14: Top app bar tidak membawa page context yang cukup

**Prioritas:** P1 Navigation / orientation

Top app bar selalu mengutamakan nama sekolah. Page context biasanya diletakkan pada breadcrumb di content.

Pada mobile, ini membuat pengguna lebih sulit mengetahui halaman yang sedang dibuka karena horizontal space terbatas.

**Keputusan v2:**

Top bar v2 memisahkan:

- product/school context;
- current page/task context.

Desktop dapat menggunakan page title + contextual school switcher. Mobile menggunakan page title singkat.

---

### UX-15: Breadcrumb diulang hampir di setiap halaman

**Prioritas:** P2 Information architecture

Banyak halaman mengulang breadcrumb `Portal Sekolah / ...` secara manual.

**Dampak:**

- kode repetitif;
- hierarchy halaman tidak selalu konsisten;
- mobile vertical space terbuang untuk breadcrumb yang kurang penting.

**Keputusan v2:**

Page shell menyediakan page header/breadcrumb abstraction.

Pada mobile breadcrumb dapat:

- disederhanakan menjadi back affordance;
- atau dihilangkan jika navigation context sudah jelas.

---

### UX-16: Design token implementasi v1 belum sesuai direction v2

**Prioritas:** P1 Design system

Current `Main.css` masih menggunakan:

- Roboto;
- primary teal sekitar `#005256` pada light mode;
- token M3 v1 yang belum mengikuti Academic Indigo direction v2.

Dokumen v2 menargetkan:

- Academic Indigo sebagai primary;
- Learning Teal sebagai secondary;
- Amber/Coral sebagai controlled accents;
- typography target Inter, dengan final loading strategy masih perlu ditetapkan.

**Keputusan v2:**

Jangan mengubah palette per halaman. Migrasi dimulai melalui semantic design tokens pada Sprint UI-01.

---

### UX-17: Inline module colors masih melewati semantic token layer

**Prioritas:** P1 Maintainability / theming

Contoh dashboard memakai utilitas warna langsung seperti:

- `emerald-*`;
- `amber-*`;
- `sky-*`.

**Keputusan v2:**

Module accents harus didefinisikan sebagai semantic token atau component variant. Dark mode dan contrast harus diverifikasi di token layer.

---

### UX-18: Beberapa halaman sangat besar dan menggabungkan banyak concern

**Prioritas:** P1 Implementation readiness

Contoh ukuran file saat audit:

- `LmsCourseDetailPage.tsx`: sekitar 1100 baris;
- `ReportsPage.tsx`: sekitar 776 baris;
- `LmsCoursesPage.tsx`: sekitar 700 baris;
- `SchoolLayout.tsx`: sekitar 684 baris;
- `StudentsPage.tsx`: sekitar 600 baris;
- `TeachersPage.tsx`: sekitar 560 baris.

Angka ini adalah ukuran source saat audit, bukan kualitas score.

**Keputusan v2:**

Saat redesign halaman tersebut, ekstrak pattern reusable secara bertahap:

- `PageHeader`;
- `RoleDashboard` sections;
- `DataToolbar`;
- responsive record list/table;
- empty/loading/error state;
- contextual action group.

Jangan melakukan refactor besar sekaligus hanya untuk mengejar ukuran file tertentu.

---

## 5. Peta Masalah Berdasarkan Role

### Siswa

**Saat ini terlalu banyak:**

- tier;
- kuota siswa;
- jumlah guru seluruh sekolah;
- jumlah siswa seluruh sekolah;
- CTA pengelolaan master data.

**Yang seharusnya dominan:**

- kelas/mapel milik siswa;
- tugas yang belum selesai;
- CBT yang sedang/akan tersedia;
- deadline;
- PKL hari ini bila aktif;
- jurnal PKL;
- progress yang benar-benar memiliki data sumber.

---

### Guru

**Saat ini terlalu banyak:**

- tenant metadata;
- school quota;
- school-wide counts sebagai konten utama;
- menu governance yang belum mempertimbangkan assignment.

**Yang seharusnya dominan:**

- kelas/mapel yang diampu;
- pekerjaan yang menunggu penilaian;
- aktivitas/agenda mengajar yang perlu dilengkapi;
- jurnal PKL siswa bimbingan;
- konteks wali kelas jika memang menjadi wali kelas;
- konteks Waka bila `isWaka` benar.

---

### Admin Sekolah

Dashboard sekarang paling dekat dengan kebutuhan admin, tetapi hierarchy masih perlu diperbaiki.

**Yang tetap relevan:**

- siswa;
- guru;
- rombel;
- LMS;
- PKL;
- student quota;
- school setup.

**Yang perlu ditambahkan secara data-driven:**

- masalah setup yang membutuhkan tindakan;
- data belum lengkap;
- tahun ajaran aktif;
- capacity warning;
- actionable operational attention.

Tidak perlu chart hanya karena dashboard memiliki ruang kosong.

---

## 6. Navigation Audit

### Desktop v1

Kekuatan:

- grouping sudah ada;
- collapse/rail tersedia;
- active state jelas;
- navigation drawer reusable.

Masalah:

- grouping guru terlalu lebar;
- governance belum assignment-aware;
- role identity di footer terlalu generik;
- school header menampilkan tier terlalu sering;
- account/logout tidak terintegrasi ke school shell.

### Mobile v1

Kekuatan:

- drawer dapat dibuka dari menu;
- scrim tersedia;
- menu menggunakan destination yang sama dengan desktop.

Masalah:

- belum ada role-specific primary navigation;
- pengguna harus membuka drawer untuk hampir semua perpindahan halaman;
- mobile experience masih mengikuti struktur desktop.

---

## 7. State Audit

Setiap screen v2 wajib memiliki state yang berbeda untuk:

### Loading

Menjelaskan konteks yang sedang dimuat.

Contoh:

- `Memuat kelas Anda...`
- `Memuat ringkasan sekolah...`

### Empty

Menjelaskan kenapa kosong dan, jika role berwenang, aksi untuk mengisinya.

### Error

Menjelaskan kegagalan dan menyediakan retry atau jalan keluar.

### Permission / relationship state

Contoh:

- siswa belum memiliki rombel;
- siswa belum memiliki PKL aktif;
- guru tidak menjadi wali kelas;
- integrasi belum dikonfigurasi.

State relationship tidak boleh disamakan dengan error teknis.

---

## 8. Keputusan Phase 0

Phase 0 menetapkan keputusan berikut.

### D-01: Role dashboard dipisahkan secara komposisi

`/school` tetap boleh menjadi route tunggal, tetapi component composition dan data contract berbeda berdasarkan role.

### D-02: Server memberikan dashboard DTO sesuai role

Direkomendasikan query terpisah:

- `getStudentDashboardData`
- `getTeacherDashboardData`
- `getSchoolAdminDashboardData`
- `getSuperAdminDashboardData`

Alasan:

- lebih mudah di-audit;
- DTO lebih kecil;
- tidak mengirim data yang tidak diperlukan role;
- authorization contract lebih jelas.

Alternatif satu query bercabang role hanya dipakai bila types tetap eksplisit dan tidak menghasilkan mega-DTO.

### D-03: Navigation menjadi role + assignment aware

Client navigation hanya menentukan apa yang ditampilkan. Server tetap memutuskan apakah action/query diizinkan.

### D-04: Mobile bukan sidebar yang diperkecil

Primary destinations harus langsung terjangkau, secondary destinations masuk sheet/drawer/menu.

### D-05: Tidak ada dashboard metric tanpa pertanyaan yang jelas

Sebelum menambahkan metric/chart, tulis pertanyaan yang dijawab.

Contoh valid:

`Apakah kapasitas siswa hampir penuh?`

Jika angka tidak mengubah keputusan, angka tersebut tidak perlu menjadi kartu utama.

### D-06: Tidak ada fake progress atau fake achievement

Progress/achievement baru boleh muncul jika data event dan formula completion sudah nyata.

---

## 9. Expressiveness Dials v2

Untuk menjaga Playful Academic tetap profesional:

| Role/Area | Energy | Rhythm | Motion | Catatan |
|---|---:|---:|---:|---|
| Siswa | 4/5 | 4/5 | 3/5 | paling hidup, tetap fokus belajar |
| Guru | 3/5 | 3/5 | 2/5 | task-oriented |
| Admin Sekolah | 2/5 | 3/5 | 2/5 | tenang dan operasional |
| Super Admin | 2/5 | 2/5 | 1-2/5 | paling profesional |
| Master data table | 2/5 | 2/5 | 1/5 | density lebih penting |
| LMS learning view | 4/5 | 4/5 | 3/5 | ruang ekspresi utama |

Skala ini adalah design-direction dial, bukan skor kualitas.

---

## 10. Prioritas Implementasi Setelah Phase 0

### P0 Redesign

1. role-specific dashboard data contract;
2. role-specific dashboard composition;
3. navigation role + assignment context;
4. mobile primary navigation;
5. pemisahan onboarding/error state.

### P1 Redesign

1. semantic token v2;
2. page header abstraction;
3. account menu pada SchoolLayout;
4. responsive data presentation;
5. loading/empty/error patterns;
6. touch target audit.

### P2 Redesign

1. micro-interaction;
2. optional illustration family;
3. richer learning progress;
4. visual regression tooling;
5. motion polish.

---

## 11. Acceptance Criteria Phase 0

Phase 0 dianggap selesai ketika:

- audit aktual terdokumentasi;
- tiga dashboard utama memiliki desktop + mobile wireframe;
- setiap blok wireframe mempunyai sumber data atau label `requires new aggregate`;
- mobile navigation memiliki tujuan atau behavior yang nyata;
- tidak ada fake statistic;
- keamanan tenant tetap dinyatakan sebagai server concern;
- dokumen plan utama menautkan hasil Phase 0.

Wireframe terkait:

[`WIREFRAMES_DASHBOARDS_V2.md`](./WIREFRAMES_DASHBOARDS_V2.md)
