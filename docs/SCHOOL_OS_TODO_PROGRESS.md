# School OS — Current TODO & Progress Backlog

**Status:** Living document / source of truth backlog
**Last audited:** 29 September 2026 (Asia/Jakarta)
**Production tenant context:** SMKN 12 Garut
**Canonical repository:** `/home/ubuntu/projects/SaaS_Satu`

> Dokumen ini menyimpan backlog hasil audit aktual School OS. Gunakan dokumen ini untuk membedakan:
>
> 1. fitur yang **belum selesai dibangun**;
> 2. fitur yang **sudah selesai tetapi belum dikonfigurasi atau belum dipakai secara operasional**;
> 3. fitur yang **sengaja ditunda sebagai enhancement**;
> 4. polish kecil yang tidak memblokir operasional.
>
> Jangan membuka kembali modul yang sudah dinyatakan production-grade tanpa bukti regresi konkret.

## 1. Snapshot production saat audit

Pada audit 29 September 2026:

- canonical `main == origin/main`: `984d3ec5ac472e9f2944001e66f085ab29c0e8cd`;
- live backend: `3bd5515-teacher-login-provisioning`;
- live static/frontend: `bf79043-school-profile-routing`;
- `saas-satu.service`: active;
- tenant operasional: **SMKN 12 Garut**;
- siswa real/Dapodik: **1.539**;
- rombel aktif: **50**.

### Legend status

| Status | Arti |
| --- | --- |
| ✅ DONE | Fitur inti sudah production-grade. Jangan dibangun ulang tanpa regresi konkret. |
| 🟡 CONFIG | Engine selesai, tetapi tenant SMKN 12 Garut belum dikonfigurasi/diaktifkan. |
| 🟠 PARTIAL | Fitur sudah ada dan berguna, tetapi belum mencapai scope production yang diinginkan. |
| 🔴 TODO | Belum selesai dibangun atau masih placeholder. |
| 🔵 DEFERRED | Enhancement sengaja ditunda; bukan blocker operasional utama. |
| ⚪ POLISH | Perbaikan kecil konsistensi/UX; fungsi inti tidak rusak. |

---

# 2. Prioritas aktif

## P1 — Tata Usaha: dari Starter ke penerbitan resmi

**Status: 🟠 PARTIAL / prioritas tertinggi**

Yang sudah ada:

- Dashboard TU;
- Surat Keluar;
- 10 starter template editable;
- draft surat;
- redaksi dinamis;
- lookup siswa/guru;
- kop surat baseline Disdik Jabar;
- metadata Kepala Sekolah;
- audit trail;
- workflow internal draft/review/approve;
- template versioning dan refresh redaction.

Snapshot production:

- `AdministrationTemplate`: **10**;
- `LetterRegister`: **1**;
- configured register: **0**;
- `AdministrationDocument`: **3**;
- official issue masih feature-gated.

### TODO P1

- [ ] Tambahkan **Correspondence / Administrative Rules Settings** per tenant.
- [ ] Konfirmasi dan simpan pola nomor surat resmi SMKN 12 Garut.
- [ ] Implementasi **atomic final-number allocation** pada Letter Register.
- [ ] Implementasi reset sequence sesuai aturan sekolah.
- [ ] Implementasi kode klasifikasi / unit bila memang dipakai sekolah.
- [ ] Implementasi **approval / paraf route** per jenis naskah.
- [ ] Implementasi **signer authority** per template/jenis surat.
- [ ] Tambahkan capability/assignment TU yang eksplisit; jangan bergantung selamanya pada role TEACHER generik.
- [ ] Identifikasi assignment **Kepala TU** bila sekolah memang menggunakannya.
- [ ] Tambahkan status penerbitan resmi `ISSUED` / `SIGNED`.
- [ ] Implementasi immutable final PDF.
- [ ] Implementasi QR verification bila disetujui.
- [ ] Implementasi TTE jika integrasi/policy resmi tersedia.
- [ ] Tambahkan Surat Masuk.
- [ ] Tambahkan Disposisi.
- [ ] Tambahkan arsip/retention metadata.
- [ ] Rekonsiliasi menu **Laporan → Surat Keterangan Aktif** dengan modul TU agar tidak ada dua jalur surat resmi yang tumpang tindih.

### Dependency eksternal sebelum official issuing

Masih diperlukan sumber authoritative sekolah:

- contoh surat resmi terbaru;
- aturan penomoran/register;
- kewenangan penandatangan;
- alur approval/paraf;
- aturan klasifikasi;
- aset kop/logo final;
- aturan TTE/QR bila ada.

**Definition of Done P1:** operator dapat membuat surat dari template → review/paraf → mendapat nomor final server-side → ditandatangani/diterbitkan → final PDF immutable tersimpan → audit trail lengkap.

---

## P2 — Attendance 360 Production Activation

**Status: 🟡 CONFIG**

Engine Attendance 360 sudah production-grade. Jangan dibangun ulang.

Sudah tersedia:

- policy/calendar;
- student GPS + selfie check-in/out;
- geofence;
- Duty Teacher events;
- Wali Kelas reconciliation;
- Global attendance canonical;
- LMS subject attendance integration satu arah;
- izin/sakit;
- matrix bulanan;
- Pembiasaan;
- Command Center;
- audit;
- EWS.

Snapshot SMKN 12 Garut saat audit:

- `SchoolAttendancePolicy`: **0**;
- active attendance policy: **0**;
- `SchoolCalendarDay`: **0**.

Akibatnya student self-attendance belum siap dipakai secara nyata.

### TODO P2

- [ ] Tetapkan koordinat authoritative sekolah.
- [ ] Tetapkan radius geofence.
- [ ] Tetapkan batas akurasi GPS.
- [ ] Tetapkan jam buka check-in.
- [ ] Tetapkan batas terlambat.
- [ ] Tetapkan jam tutup check-in.
- [ ] Tetapkan window check-out.
- [ ] Tetapkan hari kerja resmi.
- [ ] Konfirmasi aturan selfie check-in/check-out.
- [ ] Isi Kalender Pendidikan / hari libur / override jadwal yang relevan.
- [ ] Aktifkan policy setelah konfigurasi diverifikasi.
- [ ] UAT siswa nyata/dummy melalui perangkat mobile:
  - GPS;
  - geofence;
  - selfie;
  - datang tepat waktu;
  - terlambat;
  - check-out;
  - hari libur;
  - idempotency;
  - koreksi Wali/Piket/Admin.
- [ ] Verifikasi Global → LMS prefill tetap satu arah.

**Definition of Done P2:** policy aktif dengan data authoritative dan self-attendance siswa dapat digunakan harian tanpa bypass/manual workaround.

---

## P3 — Guru Piket nyata SMKN 12 Garut

**Status: 🟡 CONFIG**

Engine Guru Piket sudah tersedia dan enforcement berdasarkan assignment/jadwal sudah ada.

Snapshot saat audit:

- active Duty Teacher assignment: **1**;
- assignment tersebut masih data demo:
  `[DEMO] SMKN12 Rina Contoh — RPL`;
- duty day: `TH`.

### TODO P3

- [ ] Dapatkan jadwal Guru Piket resmi SMKN 12 Garut.
- [ ] Masukkan assignment Guru Piket nyata per hari.
- [ ] Pastikan tanggal mulai/akhir penugasan benar.
- [ ] Verifikasi hanya Guru Piket yang terjadwal yang dapat menjalankan flow harian.
- [ ] Verifikasi reminder/notifikasi Guru Piket.
- [ ] Verifikasi Gate Console.
- [ ] Verifikasi koreksi Kehadiran Global.
- [ ] Verifikasi SLA Teaching Session / jam kosong.
- [ ] Setelah data resmi siap, cleanup assignment demo secara terkontrol.

**Definition of Done P3:** jadwal piket production merepresentasikan sekolah nyata dan seluruh permission/reminder mengikuti hari tugas resmi.

---

## P4 — CBT Gen 2 / Ujian School OS production-grade

**Status: ✅ DONE — live 29 September 2026**

Release production:

- runtime commit: `9b49eb6e8dabec72d65b356ea592fde8845a5818`;
- release: `9b49eb6-cbt-gen2`;
- migration: `20260929050000_add_cbt_gen2`;
- release record: [`RELEASE_2026-09-29_CBT_GEN2.md`](./RELEASE_2026-09-29_CBT_GEN2.md);
- architecture: [`CBT_GEN2_ARCHITECTURE.md`](./CBT_GEN2_ARCHITECTURE.md).

Legacy CBT tetap kompatibel. Pada saat deployment:

- `LmsAssessment`: **24**;
- `LmsAssessmentResult`: **36**;
- `LmsAssessmentQuestion`: **48**;
- seluruh 36 result legacy tetap tersimpan dengan `attemptId = NULL`;
- belum ada attempt Gen2 production sampai pengguna mulai memakai flow baru.

### P4 yang sudah selesai

- [x] Editor jadwal CBT yang proper: tanggal, jam mulai, jam selesai.
- [x] Bank soal.
- [x] Import soal CSV.
- [x] CRUD/edit/delete soal yang aman.
- [x] Pilihan tipe soal yang didukung secara jelas: pilihan ganda + esai.
- [x] Soal esai end-to-end.
- [x] Manual grading esai + feedback.
- [x] Randomisasi urutan soal yang benar-benar diterapkan dan stabil per attempt.
- [x] Randomisasi opsi pilihan ganda.
- [x] Configurable attempt policy.
- [x] Timer ujian server-authoritative.
- [x] Save-progress/autosave + resume/recovery setelah refresh.
- [x] Token ujian opsional + regenerate token.
- [x] Dashboard monitoring siswa: belum mulai / sedang mengerjakan / terkirim / dinilai.
- [x] Rekap nilai dan detail jawaban.
- [x] Analisis butir soal pilihan ganda + pending grading esai.
- [x] Audit CBT.
- [x] KKM/passing threshold sebagai konfigurasi.
- [x] UAT concurrency dan submission boundary.
- [x] Compatibility endpoint CBT lama diarahkan melalui aturan Attempt/Timer Gen2.
- [x] Mobile-first student runner dengan navigator soal dan touch target yang layak.

### Verification P4

- production-clone migration compatibility: **PASS**;
- official Prisma migration path pada fresh clone: **PASS**;
- CBT Gen2 production-clone lifecycle UAT: **16/16 PASS**;
- full School OS regression: **200/200 PASS across 37 test files**;
- Wasp build: **PASS**;
- server bundle: **PASS**;
- Vite SSR/client production builds: **PASS**;
- immutable preflight/deploy: **PASS**;
- repeated deploy: `idempotent=true`;
- unauthenticated CBT Gen2 operations: **401**;
- service/log health: **clean**.

### P4 enhancement yang sengaja ditunda

**Status: 🔵 DEFERRED / optional, bukan blocker CBT Gen2 core**

- [ ] Warning kehadiran mapel/EWS pada eligibility CBT bila nanti disetujui; default **tidak boleh menjadi hard-block**.
- [ ] Advanced remote proctoring.
- [ ] Webcam recording.
- [ ] Lockdown-browser integration.
- [ ] Full offline exam submission tanpa koneksi jaringan.
- [ ] External QTI/item-bank standards.

**Definition of Done P4:** ✅ tercapai. Guru dapat menyiapkan, menjalankan, memonitor, menilai, dan menganalisis CBT dari School OS; siswa menggunakan runner Gen2 dengan attempt, autosave/resume, timer server, dan final submission yang terjaga.

---

## P5 — Website Sekolah SMKN 12 Garut + media infrastructure

**Status: ✅ DONE — live 29 September 2026**

Release:

- runtime commit: `4ee295bac1d0cf32c430855ee38558b239255197`;
- release: `4ee295b-website-smkn12-media-proxy`;
- release record: [`RELEASE_2026-09-29_WEBSITE_SMKN12_OBJECT_STORAGE.md`](./RELEASE_2026-09-29_WEBSITE_SMKN12_OBJECT_STORAGE.md).

### Aktivasi tenant selesai

- [x] Inisialisasi Website Sekolah SMKN 12 Garut.
- [x] Isi title/tagline/kontak resmi dari sumber publik terverifikasi.
- [x] Isi Profil Sekolah awal dari Kemendikdasmen.
- [x] Program/konsentrasi tetap dinamis dari master data School OS.
- [x] Isi konten publik awal: 2 halaman + 3 berita terverifikasi.
- [x] Aktifkan indeks Agenda/Pengumuman tanpa membuat item fiktif.
- [x] Isi navigasi publik: Profil, Berita, Agenda, Pengumuman.
- [x] Publish secara terkontrol.
- [x] UAT public routes, sitemap dan SEO/public renderer.
- [x] Hero/media awal menggunakan sumber resmi Kemendikdasmen melalui URL eksternal.

Snapshot production setelah seed idempotent:

- `SchoolSite`: **1**;
- published content: **5**;
- PAGE: **2**;
- NEWS: **3**;
- visible nav: **4**;
- media library: **1** external official-source image.

### Object storage production selesai

- [x] Validasi object-storage production.
- [x] Aktifkan direct upload Website Sekolah.
- [x] Private S3-compatible Garage v2.4.1 aktif di loopback.
- [x] Tenant-scoped object key.
- [x] JPEG/PNG/WebP, max 5 MB, alt text wajib.
- [x] Public delivery melalui `/operations/site-media/:mediaId`.
- [x] UAT Head/Put/Get/Delete S3.
- [x] UAT synthetic public image: HTTP 200 `image/png`, lalu cleanup DB+object.
- [x] Upload tanpa login ditolak 401; nonexistent public media 404 JSON.

Verification:

- targeted Website/media: **10/10 PASS**;
- full regression: **204/204 PASS across 38 files**;
- Wasp build/server bundle/Vite SSR+client: **PASS**;
- immutable preflight/deploy: **PASS**;
- Website public routes + sitemap: **PASS**;
- `saas-satu.service` + `garage.service`: **active**.

### Enhancement P5 yang sengaja ditunda

**Status: 🔵 DEFERRED / bukan blocker P5 core**

- [ ] Image variants WebP/AVIF otomatis.
- [ ] Image transformation/CDN tuning.
- [ ] Custom domain verification.
- [ ] Optional AUTHOR/EDITOR role.
- [ ] Privacy-safe public analytics.
- [ ] Structured data `Event`.
- [ ] Cache/CDN tuning lanjutan.
- [ ] Ganti profil sementara hasil riset publik dengan visi/misi/sejarah resmi milik sekolah setelah dokumen authoritative tersedia.

**Definition of Done P5:** ✅ tercapai. Website SMKN 12 Garut telah published dengan konten nyata/source-backed dan admin dapat mengunggah media langsung ke object storage private tanpa ketergantungan URL eksternal untuk konten baru.

---

## P6 — SaaS / Super Admin completion

**Status: 🟢 DONE** (validasi 30 Sep 2026; payment tetap nonaktif per keputusan produk)

School portal tidak bergantung pada item ini. Scope P6 yang disetujui user (29 Sep 2026) sudah selesai: Messages dihapus, Settings menjadi halaman nyata.

### Super Admin → Messages

**Status: ✅ REMOVED** (keputusan user 29 Sep 2026 — modul dihapus, bukan dibangun)

- Route `/admin/messages` dihapus dari `admin.wasp.ts`.
- Menu sidebar dan tombol pesan di header dihapus.
- File `MessageButton.tsx` dan `MessagesPage.tsx` dihapus.
- Tidak ada sisa referensi "Messages"/"messages" di `app/src` (grep 30 Sep 2026: nol).

### Super Admin → Settings

**Status: ✅ DONE** (29–30 Sep 2026)

Placeholder diganti halaman status platform nyata (`app/src/admin/elements/settings/SettingsPage.tsx`):
- Menampilkan status layanan deployment: Pembayaran online (Nonaktif) dan Penyimpanan file object storage (Aktif).
- Scope dibedakan dari Account dan School Settings: halaman ini read-only, perubahan nilai hanya via environment deployment.
- Query admin-only `getPlatformStatus` (`app/src/admin/elements/settings/operations.ts`):
  - 401 untuk unauthenticated, 403 untuk non-admin (`context.user.isAdmin`).
  - Hanya mengembalikan boolean (`paymentsEnabled`, `fileUploadsEnabled`) — tidak membocorkan nilai secret.

### SaaS Payment / Subscription

**Status: 🟡 CONFIG / product decision** (tetap nonaktif — keputusan user 29 Sep 2026: "Untuk payment biarkan dulu saja")

Snapshot deployment:

- `PAYMENTS_ENABLED=false`;
- Stripe config values tersedia, tetapi pembayaran production sengaja disabled.

TODO bila monetisasi diaktifkan:

- [ ] finalisasi plan/entitlement;
- [ ] aktifkan provider yang dipilih;
- [ ] webhook verification;
- [ ] subscription lifecycle UAT;
- [ ] invoice/billing UX;
- [ ] tenant entitlement enforcement;
- [ ] cancellation/retry/failure policy;
- [ ] audit finance/subscription.

### Platform analytics

- [ ] Verifikasi pipeline statistik harian production.
- [ ] Pastikan revenue/profit tidak menampilkan angka semu saat payment disabled.
- [ ] Tetapkan source analytics canonical.

**Definition of Done P6:** Super Admin tidak memiliki menu placeholder dan seluruh fitur SaaS yang ditampilkan benar-benar memiliki backend/persistence/configuration yang aktif. — **TERPENUHI 30 Sep 2026** (Messages dihapus; Settings menampilkan status konfigurasi deployment yang nyata).

---

## P7 — Cleanup dan UX consistency

**Status: ⚪ POLISH**

### Profil Saya vs Account

Release terbaru sudah memisahkan:

- operational school profile → `/school/profile`;
- SaaS account/subscription → `/account`.

Namun audit masih menemukan link legacy:

- [ ] Student mobile bottom nav:
  `Akun → /account`
  harus menjadi `Profil → /school/profile`.
- [ ] DUDI mobile:
  `Saya → /account`
  harus menjadi `Profil Saya → /school/profile`.
- [ ] Student dashboard empty state:
  `Buka Akun → /account`
  harus menjadi `Buka Profil → /school/profile`.

Saat ini tidak error karena `/account` defensively redirects operational roles ke `/school/profile`, tetapi URL/label harus dirapikan untuk konsistensi.

### Dokumentasi lama

- [ ] Saat modul berubah, koreksi snapshot lama yang masih menyebut `/account` sebagai Student Profile.
- [ ] Tandai historical pointer sebagai historical, bukan current production.
- [ ] Pastikan dokumen release tidak dipakai sebagai current-state source jika sudah disupersede.

---

# 3. Modul yang sudah selesai — jangan dibangun ulang

## ✅ PKL Gen 2

Production-grade:

- Foundation;
- Period;
- Department/concentration relation;
- DUDI;
- capacity;
- placement;
- bulk plotting;
- PLANNED/ACTIVE/COMPLETED/CANCELED lifecycle;
- transfer/history;
- Attendance Gen2;
- geofence;
- work schedule;
- late/izin/sakit/alpa/libur;
- Journal Draft/Submit/Revision/Approved;
- Teacher + DUDI Mentor review;
- Monitoring/EWS;
- Reports;
- import;
- hardening/UAT.

Tindakan selanjutnya hanya berdasarkan bug nyata, konfigurasi, atau kebutuhan product baru.

## ✅ Attendance engine / Global attendance architecture

Kontrak canonical:

`Self/Piket/Wali/Admin → Global official daily truth → LMS prefill`

dan:

`LMS attendance tidak pernah merekonsiliasi balik ke Global`.

Jangan mengubah arsitektur ini tanpa keputusan desain eksplisit.

## ✅ Kesiswaan Terpadu + Tindak Lanjut

Sudah production-grade:

- violation;
- achievement;
- coaching;
- permit;
- audit events;
- Follow-Up;
- optimistic concurrency;
- EWS synchronization.

Snapshot transaksi saat audit masih berupa integrated demo:

- violation: `[DEMO] SMKN12 Siswa 01`;
- achievement: `[DEMO] SMKN12 Siswa 05`;
- coaching: `[DEMO] SMKN12 Siswa 02`;
- follow-up: `[DEMO] SMKN12 Siswa 01`.

Ini berarti **belum dipakai dengan data nyata**, bukan berarti fitur belum selesai.

## ✅ Sarpras & Inventaris engine

Sudah tersedia:

- Facility Room;
- Asset Category;
- Asset Item;
- responsible user;
- condition/status;
- maintenance report;
- maintenance workflow;
- vendor/cost;
- asset movement;
- Follow-Up integration.

Snapshot audit:

- FacilityRoom: **75**;
- AssetItem: **816** / 2.512 unit baseline;
- AssetMaintenance: **0**;
- AssetMovement: **0**.

Artinya engine ada tetapi workflow maintenance/movement belum digunakan secara nyata.

Catatan data lama: sebagian aset masih belum dipetakan ke `roomId` jika sumber lokasi ambigu. Jangan menebak mapping.

## ✅ LMS Teaching Session / integrasi model Jingga Asik

Fase integrasi School OS yang disepakati sudah diterapkan:

- Teaching Schedule;
- time window;
- Teaching Session;
- agenda;
- student subject attendance;
- Global → LMS prefill;
- teacher GPS/evidence check-in/out;
- attendance-completion check-out gate;
- absent teacher/delegation;
- Guru Piket SLA;
- history/recap;
- audit/monitoring;
- engagement rubric.

Snapshot audit:

- Teaching Schedule: **7**;
- Teaching Session: **6**.

### Enhancement yang sengaja ditunda

**Status: 🔵 DEFERRED**

- [ ] offline sync queue;
- [ ] push notification scheduler;
- [ ] Excel export administratif khusus Teaching Session.

Ketiganya bukan blocker utama Teaching Session saat ini.

## ✅ Teacher/GTK login provisioning

Sudah live:

- create login;
- reset password;
- revoke login;
- session invalidation;
- same-tenant TEACHER-only target;
- Wasp Auth hashing;
- Admin Teacher Detail integration.

## ✅ School Profile / SaaS Account separation

Sudah live:

- Teacher/Student/DUDI operational profile → `/school/profile`;
- operational roles tidak melihat SaaS billing;
- direct `/account` access operational roles redirect ke School Profile;
- Admin Teacher Detail tetap administrative surface.

---

# 4. Prioritas eksekusi rekomendasi

Urutan kerja setelah audit:

1. **P1 — Tata Usaha official issuing**
2. **P2 — Attendance 360 production activation**
3. **P3 — Guru Piket real schedule**
4. **P4 — CBT Gen 2** ✅ selesai 29 September 2026
5. **P5 — Website SMKN 12 Garut activation** ✅ selesai 29 September 2026
6. **P6 — SaaS/Super Admin completion**
7. **P7 — cleanup/polish**

Prinsip produk:

> Jangan menambah modul besar baru sebelum backlog operasional di atas lebih matang. School OS saat ini sudah memiliki cakupan modul yang luas; nilai terbesar berikutnya datang dari menyelesaikan dan mengaktifkan workflow yang sudah ada.

---

# 5. Cara memperbarui dokumen ini

Setelah sebuah pekerjaan selesai:

1. update checkbox terkait;
2. ubah status modul bila perlu;
3. catat release commit/release name;
4. catat hasil test/UAT;
5. pindahkan fitur yang benar-benar selesai ke bagian **Modul yang sudah selesai**;
6. pertahankan item historical jika berguna untuk provenance;
7. perbarui tanggal **Last audited**;
8. jangan menghapus backlog tanpa bukti implementasi atau keputusan owner.

Dokumen ini harus diperbarui setiap kali audit lintas modul dilakukan atau milestone P1–P7 selesai.
