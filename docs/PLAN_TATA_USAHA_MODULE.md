# School OS — Blueprint Modul Tata Usaha (TU)

**Status:** Approved planning baseline — implementation belum dimulai  
**Tanggal:** 23 September 2026  
**Produk:** School OS  
**Fokus utama:** otomatisasi surat menyurat berbasis template, layanan administrasi sekolah, disposisi, dan arsip digital  
**Otoritas desain:** root `DESIGN.md` — Apple HIG-inspired School OS  

---

## 1. Tujuan modul

Modul Tata Usaha (TU) dirancang sebagai pusat administrasi dokumen sekolah yang mengubah proses surat manual menjadi alur digital yang **cepat, konsisten, dapat ditelusuri, dan tetap mengikuti aturan tata naskah yang dikonfigurasi oleh sekolah/instansi**.

Fungsi inti yang harus dicapai:

1. membuat surat resmi dari template tanpa mengetik ulang data siswa/guru/sekolah;
2. mengelola nomor surat secara aman dan tidak ganda;
3. memproses draft → review → persetujuan → penandatanganan → penerbitan → pengiriman → arsip;
4. mencatat surat masuk dan disposisi;
5. menyediakan buku agenda surat masuk/keluar digital;
6. membuat dokumen final PDF yang konsisten dan dapat diverifikasi;
7. menyediakan jejak audit lengkap setiap perubahan;
8. mengelola arsip dinamis berdasarkan klasifikasi, tingkat akses, dan aturan retensi yang dikonfigurasi;
9. menyediakan layanan administrasi siswa/guru tanpa menggandakan master data School OS.

Modul ini **bukan** pengganti seluruh administrasi sekolah. Data siswa, guru/tendik, rombel, PKL, sarpras, kehadiran, LMS, dan kesiswaan tetap berada pada modul master masing-masing.

---

## 2. Prinsip desain produk

### 2.1 Single source of truth

TU tidak memiliki tabel master siswa/guru sendiri. Semua variable dokumen membaca dari sumber yang sudah ada:

- `School`;
- `User`;
- `StudentProfile`;
- `TeacherProfile`;
- `ClassRoom`;
- `Department`;
- `AcademicYear`;
- struktur dan penugasan sekolah;
- PKL/Company/Placement jika dokumen berkaitan dengan PKL;
- data lain hanya melalui kontrak integrasi yang eksplisit.

Jika data induk berubah setelah dokumen diterbitkan, dokumen lama **tidak ikut berubah**. Dokumen final harus menyimpan snapshot data saat diterbitkan.

### 2.2 Configurable, not hard-coded

Format kop, nomor, pejabat penandatangan, kode klasifikasi, jenis surat, pola nomor, tingkat keamanan, dan jalur persetujuan tidak boleh di-hard-code hanya untuk satu sekolah atau satu pemerintah daerah.

School OS harus menyediakan **Administrative Rules Profile** per sekolah sehingga tenant dapat menyesuaikan tata naskah yang berlaku pada instansinya.

### 2.3 Draft is editable; issued document is immutable

Dokumen berstatus draft dapat diperbaiki. Setelah `ISSUED`, isi final, nomor, template version, variable snapshot, file final, dan hash verifikasi menjadi immutable.

Koreksi dokumen yang telah diterbitkan dilakukan melalui mekanisme:

- `VOID/CANCELED` dengan alasan;
- dokumen pengganti/revisi baru;
- relasi ke dokumen sebelumnya;
- audit event permanen.

### 2.4 Human approval remains authoritative

School OS membantu menyiapkan, memvalidasi, dan merender dokumen, tetapi tidak boleh menganggap persetujuan otomatis sebagai keputusan pejabat.

Nomor dan tanda tangan final hanya diterbitkan setelah jalur persetujuan yang ditetapkan terpenuhi.

### 2.5 Security by default

Dokumen dapat berisi data pribadi. Semua query harus `schoolId` scoped, capability checked, dan document-level access aware.

Public verification hanya menampilkan metadata minimum dan **tidak pernah membuka isi surat penuh secara publik** kecuali sekolah secara eksplisit mengatur jenis dokumen tersebut untuk dapat dilihat.

---

## 3. Konteks regulasi Indonesia

Plan ini menggunakan regulasi berikut sebagai **referensi desain**, bukan alasan untuk hard-code satu format nasional ke seluruh sekolah:

- Permendikdasmen Nomor 2 Tahun 2026 tentang Tata Naskah Dinas Kementerian Pendidikan Dasar dan Menengah;
- Peraturan ANRI Nomor 5 Tahun 2021 tentang Pedoman Umum Tata Naskah Dinas;
- Undang-Undang Nomor 43 Tahun 2009 tentang Kearsipan;
- Peraturan Pemerintah Nomor 28 Tahun 2012 tentang pelaksanaan UU Kearsipan;
- Permendagri Nomor 1 Tahun 2023 tentang Tata Naskah Dinas di Lingkungan Pemerintah Daerah;
- untuk konteks Jawa Barat, aturan provinsi tentang tata naskah dinas dan tata naskah dinas elektronik perlu dijadikan profil konfigurasi tenant, termasuk aturan daerah yang masih berlaku pada saat implementasi.

Catatan penting:

- sekolah negeri yang berada dalam struktur pemerintah daerah dapat memiliki aturan tata naskah daerah yang berbeda dengan format internal kementerian;
- status hukum dan aturan turunan daerah **wajib diverifikasi ulang sebelum template produksi dikunci**;
- engine School OS harus memungkinkan pembaruan aturan/template tanpa migrasi data dokumen lama.

---

## 4. Scope fitur

## 4.1 Dashboard TU

Route rencana: `/school/administration`

Dashboard menampilkan:

- surat masuk hari ini;
- surat keluar hari ini;
- draft menunggu review;
- dokumen menunggu tanda tangan/persetujuan;
- disposisi belum selesai;
- permintaan layanan administrasi siswa/guru;
- nomor surat terakhir per register;
- dokumen yang harus ditindaklanjuti;
- arsip yang mendekati review retensi;
- shortcut `Buat Surat`, `Catat Surat Masuk`, `Permintaan Layanan`, `Arsip`.

Tidak menggunakan dashboard penuh grafik jika data sedikit; utamakan queue/actionable work.

---

## 4.2 Template Surat

Route rencana: `/school/administration/templates`

Template harus mendukung:

- nama template;
- kategori dokumen;
- kode/slug template;
- versioning;
- status `DRAFT`, `ACTIVE`, `ARCHIVED`;
- kop surat;
- pembuka/isi/penutup;
- blok tanda tangan;
- lampiran;
- tujuan default;
- sifat/urgensi default;
- klasifikasi keamanan;
- register/format nomor yang digunakan;
- approval route;
- daftar variable yang diizinkan;
- aturan field wajib;
- page size/margin;
- watermark opsional;
- footer dan QR verification opsional.

### Template engine

Gunakan placeholder terstruktur, contoh konseptual:

```text
{{school.name}}
{{school.npsn}}
{{student.name}}
{{student.nisn}}
{{student.classRoom.name}}
{{teacher.name}}
{{academicYear.yearName}}
{{letter.number}}
{{letter.date}}
{{signer.name}}
{{signer.title}}
```

Jangan menggunakan arbitrary code/eval pada template.

Variable harus berasal dari **whitelist resolver** server-side.

### Template versioning

Setiap perubahan template membuat versi baru. Dokumen final menyimpan:

- `templateId`;
- `templateVersionId`;
- rendered content snapshot;
- variable snapshot;
- metadata penandatangan saat penerbitan.

Dengan demikian surat lama tetap identik walau template baru berubah.

---

## 4.3 Jenis dokumen awal

Baseline template library sebaiknya menyediakan kategori berikut, tetapi tenant bebas mengaktifkan/menonaktifkan:

### Layanan siswa

- Surat Keterangan Aktif Siswa;
- Surat Keterangan Siswa;
- Surat Pengantar;
- Surat Rekomendasi;
- Surat Izin/Dispensasi kegiatan;
- Surat Panggilan Orang Tua/Wali;
- Surat Keterangan PKL;
- Surat Pengantar PKL;
- Surat Tugas siswa untuk kegiatan;
- Surat Keterangan Kelulusan hanya bila workflow dan kewenangannya benar-benar disiapkan.

### Guru/Tendik

- Surat Tugas;
- Surat Keterangan;
- Surat Rekomendasi;
- Surat Pengantar;
- Surat Undangan internal/eksternal;
- dokumen administrasi lain yang diotorisasi sekolah.

### Organisasi/sekolah

- Surat Undangan;
- Surat Pemberitahuan;
- Surat Permohonan;
- Surat Balasan;
- Surat Pengantar;
- Nota/nota dinas bila sesuai profil aturan tenant;
- berita acara;
- surat tugas;
- surat keputusan hanya jika kewenangan, format, register, dan penandatangan telah dikonfigurasi secara khusus.

Template default School OS harus ditandai sebagai **starter**, bukan dianggap otomatis sesuai untuk setiap instansi.

---

## 4.4 Surat Keluar

Route rencana: `/school/administration/outgoing`

Workflow utama:

`DRAFT → IN_REVIEW → APPROVED → NUMBERED → SIGNED → ISSUED → SENT → ARCHIVED`

Status tambahan:

- `REJECTED`;
- `VOID`;
- `RETURNED_FOR_REVISION`.

### Pembuatan surat

1. pilih template;
2. pilih subjek data, misalnya siswa/guru/kelas/perusahaan;
3. resolver mengisi variable otomatis;
4. operator melengkapi field manual yang memang diperbolehkan;
5. preview dokumen;
6. validasi field wajib;
7. submit review;
8. reviewer memberi approve/revision note;
9. pejabat memberikan approval/sign decision;
10. nomor final dialokasikan secara atomik;
11. final render dibuat;
12. hash dokumen dan QR verification dibuat;
13. dokumen dikirim/diterima secara fisik/digital;
14. status pengiriman dicatat;
15. arsip dibuat otomatis.

### Mail merge / bulk issuance

Template tertentu dapat diterbitkan massal, misalnya surat pemberitahuan satu kelas.

Guardrail:

- preview jumlah penerima;
- dedupe penerima;
- maksimal batch terkontrol;
- satu dokumen per penerima jika nomor individual diperlukan;
- batch parent untuk pelacakan;
- tidak boleh mencampur tenant/rombel yang tidak authorized.

---

## 4.5 Penomoran Surat

Route konfigurasi: `/school/administration/settings/numbering`

Penomoran adalah komponen kritis dan harus menggunakan transaksi database/concurrency guard.

### Model konseptual

`LetterRegister`

- nama register;
- kode register;
- direction: incoming/outgoing;
- sequence scope;
- reset period: yearly/academic-year/never/custom;
- pattern;
- current sequence;
- active.

Contoh pola bersifat konfigurasi, bukan default legal:

```text
{{sequence}}/{{classification}}/{{unit}}/{{monthRoman}}/{{year}}
```

### Aturan

- draft belum mendapat nomor final;
- nomor final hanya dialokasikan setelah approval yang dipersyaratkan;
- alokasi nomor atomik;
- uniqueness minimal `(schoolId, registerId, periodKey, sequence)`;
- nomor yang sudah `ISSUED` tidak boleh dipakai ulang;
- voided number tetap tersimpan dengan status `VOID`, bukan dihapus;
- manual override hanya untuk user berizin dan wajib audit reason;
- dukung nomor legacy/migrasi tanpa mengubah sequence history.

---

## 4.6 Persetujuan dan Penandatangan

Route konfigurasi: `/school/administration/settings/approval`

Approval tidak hanya satu tingkat. Template dapat menentukan workflow, contoh:

`TU Operator → Kepala TU/Reviewer → Kepala Sekolah`

atau:

`TU Operator → Wakasek terkait → Kepala Sekolah`

### Approval step

Setiap step menyimpan:

- actor/role/assignment requirement;
- status;
- timestamp;
- note;
- document version reviewed;
- decision.

Jika draft berubah setelah approval, approval yang terdampak harus invalidated sesuai aturan workflow.

### Signature

Fase awal:

- signer identity;
- signer title;
- approval record;
- visual signature block;
- optional uploaded signature image hanya jika kebijakan sekolah mengizinkan dan harus diproteksi ketat.

Fase lanjutan:

- adapter untuk TTE tersertifikasi/layanan resmi yang dipakai instansi;
- jangan membuat “tanda tangan digital” palsu hanya dengan menempel gambar;
- integrasi TTE harus menyimpan verification metadata yang disediakan penyedia.

---

## 4.7 QR Verification dan Authenticity

Route publik rencana: `/verify/document/:token`

QR pada surat final mengarah ke halaman verifikasi minimal yang menampilkan:

- status dokumen `VALID`, `VOID`, atau `REPLACED`;
- nomor surat;
- tanggal terbit;
- sekolah penerbit;
- jenis surat;
- nama penerima hanya jika policy dokumen mengizinkan;
- signer/title;
- document fingerprint/hash pendek.

Tidak menampilkan:

- NIK;
- alamat lengkap;
- nomor kontak;
- data keluarga;
- isi surat penuh secara default;
- file PDF secara publik kecuali jenis dokumen dan policy tenant secara eksplisit mengizinkan.

Token verification harus acak, tidak enumerable, dan revocable melalui status dokumen.

---

## 4.8 Surat Masuk

Route: `/school/administration/incoming`

Field minimum:

- nomor agenda internal;
- nomor surat asal;
- tanggal surat;
- tanggal diterima;
- pengirim;
- instansi pengirim;
- perihal;
- sifat/urgensi;
- klasifikasi;
- jumlah lampiran;
- media penerimaan;
- attachment scan/file;
- penerima pertama;
- status disposisi;
- catatan.

Workflow:

`RECEIVED → REGISTERED → DISPOSITION_PENDING → DISPOSITIONED → IN_PROGRESS → COMPLETED → ARCHIVED`

Deteksi duplikat berdasarkan kombinasi pengirim + nomor surat + tanggal, tetapi operator tetap dapat override dengan alasan.

---

## 4.9 Disposisi

Route: `/school/administration/dispositions`

Fungsi:

- kepala sekolah/reviewer mengarahkan surat kepada unit/personel;
- instruksi disposisi;
- due date;
- prioritas;
- penerima utama dan CC internal;
- status `NEW`, `ACKNOWLEDGED`, `IN_PROGRESS`, `DONE`;
- komentar/tindak lanjut;
- attachment hasil tindak lanjut;
- reminder overdue;
- audit actor dan timestamp.

Disposisi adalah workflow internal, bukan mengubah file surat asli.

---

## 4.10 Buku Agenda Digital

Sediakan view dan export untuk:

- agenda surat masuk;
- agenda surat keluar;
- register penomoran;
- daftar disposisi;
- daftar dokumen void/replaced;
- rekap per jenis/kategori/periode/unit.

Filter:

- tanggal;
- nomor;
- perihal;
- pengirim/penerima;
- jenis;
- klasifikasi;
- status;
- unit;
- signer;
- creator.

Export awal: PDF dan spreadsheet/CSV sesuai kebutuhan operasional.

---

## 4.11 Layanan Administrasi / Front Office

Route: `/school/administration/services`

Ini direkomendasikan sebagai fitur TU Generasi 2 setelah surat inti stabil.

### Request type

- permohonan Surat Keterangan Aktif;
- legalisasi/verifikasi dokumen;
- surat rekomendasi;
- pengantar PKL;
- dokumen administrasi siswa lain yang disetujui sekolah;
- layanan guru/tendik yang sesuai scope.

Workflow:

`REQUESTED → VERIFIED → PROCESSING → READY → DELIVERED`

Status tambahan:

- `NEEDS_REVISION`;
- `REJECTED`;
- `CANCELED`.

Siswa tidak langsung membuat surat final. Siswa membuat **request**, TU memverifikasi, dan document engine yang menerbitkan dokumen.

Dashboard siswa dapat menampilkan status permohonan tanpa membuka panel TU.

### SLA

Per jenis layanan dapat ditentukan target waktu layanan. Dashboard TU menyorot request yang overdue.

---

## 4.12 Arsip Digital

Route: `/school/administration/archive`

Arsip bukan sekadar folder upload.

Metadata minimum:

- classification code;
- document type;
- direction;
- date;
- creator unit;
- related entity;
- security class;
- retention profile;
- active/inactive state;
- file checksum;
- immutable issued-file reference;
- tags/search metadata.

### Retention

Sediakan `RetentionPolicy` configurable:

- retention active period;
- retention inactive period;
- final disposition: review/permanent/destroy candidate;
- legal hold flag.

School OS **tidak melakukan pemusnahan otomatis**.

Jika masa retensi tercapai, sistem hanya menghasilkan candidate queue untuk review dan proses berita acara sesuai kebijakan instansi.

### Security classification

Minimum configurable classification:

- `PUBLIC`;
- `INTERNAL`;
- `RESTRICTED`;
- `CONFIDENTIAL`.

Nama kategori dapat disesuaikan tenant jika aturan instansi menggunakan istilah berbeda.

---

## 4.13 Direktori Kontak Kedinasan

Route: `/school/administration/contacts`

Untuk mencegah pengetikan tujuan berulang:

- nama instansi;
- unit;
- nama pejabat/kontak;
- jabatan;
- alamat;
- email;
- telepon;
- category;
- active/inactive;
- notes.

Jangan mencampurkan direktori kontak kedinasan dengan akun login `User`.

---

## 5. Role dan authorization

## 5.1 Jangan membuat semua TU menjadi SCHOOL_ADMIN

Best practice untuk School OS adalah menggunakan capability-based authorization.

Rencana capability baru:

```text
viewAdministration
manageCorrespondence
manageIncomingMail
manageArchives
manageAdministrationTemplates
manageLetterNumbering
reviewAdministrationDocuments
approveAdministrationDocuments
signAdministrationDocuments
manageAdministrationServices
```

### Actor yang direncanakan

**TU Operator**

- membuat draft;
- mencatat surat masuk;
- mengelola layanan;
- mengelola arsip dalam scope;
- tidak otomatis dapat approve/sign.

**TU Coordinator / Kepala TU**

- review;
- administrasi register;
- validasi penomoran;
- monitoring SLA;
- approval jika workflow mengizinkan.

**Kepala Sekolah**

- final approval/signature untuk template yang mengharuskannya;
- disposisi surat masuk;
- void/replacement authorization sesuai policy.

**Wakasek/Kaprog/Guru**

- hanya reviewer, signer, recipient, atau disposition assignee bila template/workflow menentukan;
- tidak otomatis memperoleh akses seluruh arsip TU.

**School Admin**

- konfigurasi tenant dan emergency administration;
- akses tidak boleh menggantikan audit workflow.

### Model penugasan

Rekomendasi awal:

- perluas `SchoolStaffAssignmentRole` dengan `TATA_USAHA` dan bila diperlukan `HEAD_OF_ADMINISTRATION`;
- jangan menambah role primer baru pada `UserRole` di fase awal kecuali audit implementasi menunjukkan bahwa penggunaan role `TEACHER` untuk tendik menyebabkan privilege yang terlalu luas;
- semua access tetap menggunakan capability hasil assignment + role, bukan label UI.

Catatan teknis: model `SchoolStaffAssignment.teacherId` saat ini secara nama masih teacher-centric. Implementasi TU perlu mengaudit apakah relasi ini cukup aman untuk tendik atau perlu refactor bertahap menjadi relasi generik ke `User` tanpa migration berisiko besar.

---

## 6. Data model konseptual

Nama akhir model dapat disesuaikan saat implementation design review.

### Core

`AdministrationTemplate`

- id, schoolId, code, name, category, status, activeVersionId.

`AdministrationTemplateVersion`

- templateId, version, bodyDefinition, variableSchema, pageConfig, approvalDefinition, createdById, publishedAt.

`AdministrationDocument`

- schoolId;
- templateId/versionId;
- direction;
- category;
- status;
- subject;
- documentDate;
- number/register fields;
- related entity references;
- currentRevision;
- renderedSnapshot;
- variableSnapshot JSON;
- signer snapshot;
- finalFileKey;
- finalFileHash;
- verificationTokenHash;
- securityClass;
- classificationCode;
- issuedAt;
- sentAt;
- voidedAt/reason;
- replacesDocumentId.

`AdministrationDocumentRevision`

- documentId;
- revision;
- content snapshot;
- variable snapshot;
- changedById;
- changeReason;
- createdAt.

`AdministrationApprovalStep`

- documentId;
- sequence;
- required assignment/capability;
- actorId;
- status;
- reviewedRevision;
- note;
- decidedAt.

`LetterRegister`

- numbering configuration and sequence scope.

`LetterSequence`

- registerId;
- periodKey;
- lastValue;
- optimistic/transaction guard.

### Incoming/disposition

`IncomingMail`

`MailDisposition`

`MailDispositionEvent`

### Services

`AdministrationServiceType`

`AdministrationServiceRequest`

`AdministrationServiceEvent`

### Archive

`ArchiveClassification`

`RetentionPolicy`

`AdministrationArchiveEntry`

### Audit

`AdministrationAuditEvent`

Events minimum:

- CREATED;
- UPDATED;
- SUBMITTED;
- REVIEWED;
- APPROVED;
- REJECTED;
- RETURNED_FOR_REVISION;
- NUMBER_ALLOCATED;
- SIGNED;
- ISSUED;
- SENT;
- DOWNLOADED;
- VOIDED;
- REPLACED;
- ARCHIVED;
- DISPOSITION_CREATED;
- DISPOSITION_UPDATED;
- SERVICE_STATUS_CHANGED;
- MANUAL_NUMBER_OVERRIDE.

---

## 7. Document rendering architecture

### Canonical format

Recommended pipeline:

`Template definition + validated variables → canonical HTML/document model → PDF`

Optional later:

`→ DOCX export`

PDF yang diterbitkan menjadi canonical immutable artifact.

### Requirements

- A4 support;
- configurable margins;
- predictable page breaks;
- repeating header/footer jika diperlukan;
- signature block tidak terpisah secara buruk ke halaman berikutnya;
- attachment list;
- page numbering;
- QR verification;
- Indonesian locale date formatting;
- Roman month formatter jika numbering policy membutuhkannya;
- font policy menggunakan font legal/system/server-approved, tidak menyimpan aset font proprietary tanpa hak.

Preview dan final render harus menggunakan engine yang sama agar tidak ada perbedaan signifikan.

---

## 8. Template authoring UX

Fase pertama **tidak perlu** Word-like editor yang terlalu kompleks.

Rekomendasi:

- library template;
- section-based editor;
- rich text terbatas;
- variable picker;
- preview desktop/A4;
- validation panel;
- version history;
- duplicate template;
- publish/archive.

Variable picker dikelompokkan:

- Sekolah;
- Siswa;
- Guru/Tendik;
- Rombel;
- Akademik;
- PKL;
- Dokumen;
- Penandatangan;
- Field Manual.

Admin tidak mengetik nama placeholder secara bebas jika dapat dipilih dari picker.

---

## 9. Integrasi dengan modul existing

### Data Siswa

- auto-fill profil siswa;
- link dari detail siswa: `Buat Surat`;
- tidak menyalin data siswa.

### Guru & Tendik

- auto-fill identitas;
- daftar pejabat/penandatangan;
- assignment-based authorization.

### Struktur & Penugasan

- sumber jabatan Kepala Sekolah/Wakasek/Kepala Program/Kepala TU/operator;
- approval resolver.

### PKL

- Surat Pengantar PKL;
- Surat Tugas Pembimbing;
- Surat Keterangan PKL;
- data perusahaan dan penempatan sebagai variable source.

### Kesiswaan

- Surat Panggilan Orang Tua;
- Surat Dispensasi/administrative notice;
- relation link ke case bila diperlukan, tetapi isi sensitif tidak otomatis dituangkan ke surat.

### LMS/Kurikulum

Hanya integrasi jika dibutuhkan untuk dokumen akademik; jangan tarik nilai/assessment ke TU secara default.

### Sarpras

Tidak diduplikasi. Dokumen seperti berita acara serah terima barang dapat menggunakan referensi asset jika kelak dibutuhkan.

### Reports

Laporan TU masuk ke `/school/reports` hanya sebagai summary/export entry; workspace operasional tetap di modul TU.

### Notification Center

Event TU penting masuk ke notification center:

- document waiting approval;
- disposition assigned;
- service request overdue;
- document returned for revision.

---

## 10. Search dan retrieval

Search harus mendukung:

- nomor surat;
- perihal;
- nama siswa/guru;
- instansi pengirim/penerima;
- tanggal;
- template;
- klasifikasi;
- status;
- signer;
- tags.

Search result harus role/scoped. Spotlight global boleh menampilkan hasil TU hanya bagi user yang mempunyai `viewAdministration`.

Full-text indexing isi surat adalah fase lanjutan dan perlu privacy review terlebih dahulu.

---

## 11. Audit, concurrency, dan integrity

### Audit

Tidak boleh ada silent mutation pada:

- nomor surat;
- status approval;
- signer;
- final PDF;
- recipient;
- disposisi;
- klasifikasi keamanan;
- archive status.

### Concurrency

Harus diuji khusus pada:

- dua operator mengalokasikan nomor bersamaan;
- approve vs revision bersamaan;
- void vs sent bersamaan;
- multiple approver decisions;
- bulk generation.

Gunakan transaction + unique constraints + optimistic concurrency (`updatedAt` atau version field).

### Idempotency

- double-click issue tidak boleh menghasilkan dua nomor;
- retry upload tidak membuat dua final files;
- retry service generation tidak membuat dua dokumen;
- repeat disposition action tidak menghasilkan duplicate event.

---

## 12. Security & privacy

### Tenant isolation

Semua record memiliki `schoolId` langsung atau relation yang dapat divalidasi secara eksplisit.

Jangan hanya mengandalkan foreign key tanpa check tenant pada operation.

### File access

Attachment/final document:

- private storage by default;
- signed URL jangka pendek;
- access checked sebelum URL diterbitkan;
- public verification memakai endpoint metadata terpisah;
- virus/malware scanning adapter direkomendasikan untuk file eksternal pada fase production hardening.

### Sensitive content

Jangan menyimpan data rahasia pada nama file publik atau URL.

Template variable resolver harus menerapkan field policy sehingga template author tidak otomatis mendapatkan akses ke semua kolom StudentProfile/TeacherProfile.

### Public QR verification

Gunakan opaque token/hash. Jangan menggunakan sequential document id sebagai token publik.

---

## 13. UI/UX mengikuti DESIGN.md

### Desktop

Sidebar admin:

`TATA USAHA`

- Dashboard TU
- Surat Masuk
- Surat Keluar
- Disposisi
- Layanan Administrasi
- Template
- Arsip
- Kontak Kedinasan
- Pengaturan TU

Untuk TU operator, hanya menu yang mempunyai capability.

### Mobile

Prioritaskan task queue:

- inbox approval;
- surat masuk baru;
- disposisi;
- permintaan layanan;
- quick create.

Jangan mencoba menampilkan tabel desktop lebar secara penuh di mobile; gunakan cards/grouped list + detail sheet.

### Document preview

Desktop: split pane editor + A4 preview bila ruang cukup.  
Mobile: metadata/form dahulu, preview PDF/fullscreen terpisah.

### Visual rules

- root `DESIGN.md` authoritative;
- Apple system font stack;
- grouped surfaces;
- restrained shadows;
- radius 7–10 controls / 16 cards;
- Lucide icons;
- no emoji UI icon;
- status tidak hanya mengandalkan warna;
- touch target mobile >=44px;
- destructive `VOID` membutuhkan confirmation + reason.

---

## 14. Phase implementation plan

## Phase 0 — Discovery & Governance Contract

**Tujuan:** mengunci aturan sebelum coding workflow surat.

Deliverables:

- audit 20–30 surat nyata sekolah yang sudah dianonimkan;
- daftar jenis dokumen prioritas;
- pola nomor per register;
- daftar pejabat penandatangan;
- matriks approval;
- klasifikasi keamanan;
- kebutuhan kop/logo;
- profile aturan daerah;
- mapping variable ke master data School OS;
- capability matrix TU;
- decision record untuk assignment TU.

Exit criteria:

- minimal 10 template prioritas disepakati;
- numbering rules tidak ambigu;
- signer/approver rules terdokumentasi.

## Phase 1 — TU Foundation

Build:

- permission/capability;
- penugasan TU;
- Administration dashboard shell;
- template model/versioning;
- template library/editor sederhana;
- variable resolver;
- register/numbering configuration;
- document draft/revision model;
- audit events.

Belum mengeluarkan surat production hingga UAT numbering selesai.

## Phase 2 — Outgoing Correspondence Gen 1

Build:

- create from template;
- student/teacher/class/entity selector;
- preview;
- review/approval;
- atomic numbering;
- PDF final;
- issue/sent/archive;
- QR verification;
- void/replacement;
- buku agenda surat keluar.

Target UAT: Surat Keterangan Aktif + Surat Tugas + Surat Pengantar + Undangan.

## Phase 3 — Incoming Mail & Disposition

Build:

- incoming register;
- attachments;
- duplicate detection;
- disposition;
- due date/reminders;
- follow-up status;
- incoming agenda.

## Phase 4 — Front Office Services

Build:

- service type;
- request workflow;
- student request/status surface;
- auto document generation after TU verification;
- SLA dashboard;
- delivery acknowledgment.

## Phase 5 — Archive Gen 2

Build:

- archive classification;
- retention profile;
- security/access classification;
- archive search;
- retention review queue;
- legal hold;
- export/records report.

No automatic destruction.

## Phase 6 — Bulk, Integrations & Advanced Signing

Candidate scope:

- mail merge/bulk issue;
- official email dispatch adapter;
- e-office/SRIKANDI integration feasibility study if institution requires it;
- certified TTE provider adapter;
- DOCX export where necessary;
- inbound email ingestion;
- OCR-assisted metadata suggestion for scanned incoming mail, always human-confirmed;
- API/webhook integration.

Integrations must remain adapters; core TU cannot depend on one vendor.

---

## 15. MVP recommendation

MVP yang layak production **tidak perlu** semua fitur TU sekaligus.

### MVP wajib

1. Dashboard TU;
2. role/capability TU;
3. template library + versioning;
4. safe variable resolver;
5. surat keluar;
6. approval;
7. atomic numbering;
8. PDF final;
9. QR verification;
10. void/replacement;
11. audit event;
12. buku agenda surat keluar;
13. basic archive metadata.

### MVP template prioritas

- Surat Keterangan Aktif Siswa;
- Surat Keterangan Siswa;
- Surat Pengantar;
- Surat Tugas;
- Surat Undangan;
- Surat Pemberitahuan;
- Surat Permohonan;
- Surat Rekomendasi;
- Surat Pengantar PKL;
- Surat Panggilan Orang Tua/Wali.

Surat Masuk + Disposisi menjadi increment segera berikutnya.

---

## 16. UAT strategy

Gunakan tenant synthetic terisolasi, bukan data produksi genuine.

### Authorization

- TU operator authorized;
- teacher biasa denied;
- student denied TU workspace;
- cross-tenant query denied;
- signer hanya dokumen yang assigned;
- reviewer tidak otomatis menjadi signer.

### Template

- invalid variable rejected;
- template archived tidak dapat dipakai untuk draft baru;
- old issued document tetap sama setelah template update;
- required field enforced.

### Numbering

- sequence benar;
- reset period benar;
- race dua issue → dua nomor unik atau satu accepted/one conflict sesuai transaction strategy;
- no number reuse after void;
- manual override audited;
- cross-register independent.

### Approval

- invalid transition rejected;
- revision invalidates affected approval;
- required approval cannot be skipped;
- final issue blocked before approvals complete.

### Rendering

- A4 layout;
- multi-page;
- signature block;
- long names/addresses;
- missing optional values;
- Indonesian date formatting;
- QR works.

### Public verification

- valid document returns minimal metadata;
- voided document shows void status;
- unknown token returns not found;
- no sensitive data leakage;
- token not enumerable.

### Incoming/disposition

- duplicate warning;
- disposition scoping;
- overdue status;
- comments/history immutable.

### Data integrity

- no genuine production records altered during UAT;
- synthetic tenant fully cleaned;
- backups before any production DB write during rollout.

---

## 17. Release gates

Sebelum production:

- schema review;
- tenant-isolation review;
- authorization matrix tests;
- numbering race/concurrency test;
- template security test;
- file access security test;
- full regression;
- Wasp build;
- server bundle;
- SSR/client build;
- immutable release preflight;
- backup before migration;
- migration owner/privilege verification;
- deploy idempotency;
- unauthenticated operation checks = 401;
- cross-tenant tests;
- live health/log scan;
- manual visual UAT;
- rollback release retained.

---

## 18. Metrics keberhasilan

Setelah implementasi, ukur:

- median waktu membuat surat;
- jumlah surat yang dibuat dari template;
- duplicate numbering incidents = **0**;
- surat yang dikembalikan karena data/template salah;
- approval turnaround time;
- layanan administrasi selesai sesuai SLA;
- disposisi overdue;
- waktu pencarian dokumen;
- jumlah dokumen yang dapat diverifikasi QR;
- audit completeness;
- unauthorized access incidents = **0**.

---

## 19. Yang sengaja tidak dimasukkan pada fase awal

Untuk menghindari scope creep:

- keuangan/BOS;
- penggajian;
- procurement;
- inventaris (sudah Sarpras);
- absensi guru/siswa (sudah Attendance);
- akademik/rapor;
- HR lengkap;
- workflow SK kompleks tingkat pemerintah daerah;
- pemusnahan arsip otomatis;
- tanda tangan elektronik buatan sendiri;
- full document management system enterprise.

Fitur tersebut hanya ditambahkan melalui modul/integrasi terpisah bila ada kebutuhan nyata.

---

## 20. Struktur route yang direkomendasikan

```text
/school/administration
/school/administration/incoming
/school/administration/outgoing
/school/administration/documents/:id
/school/administration/dispositions
/school/administration/services
/school/administration/templates
/school/administration/archive
/school/administration/contacts
/school/administration/settings
/school/administration/settings/numbering
/school/administration/settings/approval
/school/administration/settings/archive
/verify/document/:token
```

---

## 21. Rekomendasi urutan implementasi School OS

Urutan paling aman:

1. **Phase 0 — audit surat nyata + aturan TU sekolah**;
2. **Phase 1 — role/capability + template/versioning + numbering foundation**;
3. **Phase 2 — outgoing correspondence production-grade**;
4. manual UAT dengan 4 template inti;
5. **Phase 3 — incoming + disposition**;
6. **Phase 4 — service request siswa/guru**;
7. **Phase 5 — archive/retention hardening**;
8. **Phase 6 — TTE/integration/bulk automation**.

Jangan mulai dari editor template visual yang kompleks. Risiko terbesar sebenarnya adalah **authorization, nomor surat, approval, immutability, dan archive integrity**, bukan tampilan editor.

---

## 22. Keputusan arsitektur baseline

Keputusan berikut dianggap baseline sampai implementation review menemukan bukti yang lebih kuat:

1. TU adalah modul tenant-scoped School OS, bukan fitur SaaS global.
2. Master data tetap berada di modul existing.
3. Template bersifat versioned.
4. Issued document immutable.
5. Nomor final dialokasikan server-side secara atomik.
6. Void tidak menghapus nomor.
7. Approval dan signature terpisah dari authoring.
8. TTE resmi menggunakan adapter eksternal, bukan signature palsu.
9. Public verification hanya expose metadata minimum.
10. Archive memiliki classification + access class + retention metadata.
11. Retention tidak pernah auto-destroy.
12. TU authorization berbasis capability + assignment.
13. Semua high-risk mutation memiliki audit event.
14. UI tetap mengikuti `DESIGN.md`.
15. Implementasi pertama fokus pada correspondence core sebelum ekspansi front-office/arsip advanced.

---

## 23. Input yang dibutuhkan sebelum implementasi Phase 1

Untuk membuat modul benar-benar sesuai SMKN 12 Garut/tenant pertama, kumpulkan setelah blueprint ini disetujui:

- 10–20 contoh surat sekolah yang sudah dianonimkan;
- pola nomor surat yang benar-benar digunakan;
- kode klasifikasi yang digunakan sekolah;
- kop surat resmi;
- daftar jabatan dan siapa yang berwenang tanda tangan;
- alur paraf/review aktual;
- daftar jenis layanan TU paling sering diminta;
- daftar register/buku agenda yang sekarang dipakai;
- aturan tata naskah tingkat Dinas Pendidikan/Pemprov yang wajib diikuti sekolah;
- kebutuhan TTE/QR/email bila sudah ada sistem resmi yang harus diintegrasikan.

Data tersebut menjadi bahan **configuration pack**, bukan alasan untuk mengubah core engine menjadi khusus satu sekolah.

---

## 24. Definition of Done — Modul TU Generasi 1

Modul dianggap production-grade jika:

- minimal 10 template resmi dapat dikelola dan versioned;
- surat dapat dibuat dari data existing tanpa copy-paste identitas;
- approval tidak dapat dilewati;
- nomor surat tidak pernah duplicate pada concurrency test;
- final PDF immutable;
- QR verification berfungsi tanpa membocorkan data sensitif;
- void/replacement terdokumentasi;
- buku agenda surat keluar akurat;
- surat masuk dan disposisi memiliki audit trail;
- role TU tidak membuka data tenant lain;
- siswa/guru biasa tidak memperoleh workspace TU tanpa penugasan;
- archive metadata dan access classification berfungsi;
- full regression/build/deploy gates School OS PASS;
- manual UAT operator TU + Kepala Sekolah PASS;
- dokumentasi dan rollback tersedia.


---

## 25. Phase 0 execution status — 23 September 2026

Phase 0 discovery baseline untuk tenant pertama **SMKN 12 GARUT** sudah dieksekusi secara read-only terhadap data School OS production.

Artefak:

- [`TU_PHASE0_SMKN12_GARUT_CONFIGURATION_PACK.md`](./TU_PHASE0_SMKN12_GARUT_CONFIGURATION_PACK.md);
- [`TU_PHASE0_GOVERNANCE_CONTRACT.md`](./TU_PHASE0_GOVERNANCE_CONTRACT.md);
- [`TU_PHASE0_TEMPLATE_INTAKE_REGISTER.md`](./TU_PHASE0_TEMPLATE_INTAKE_REGISTER.md).

Data yang sudah siap: identity sekolah, 1.539 siswa, 50 rombel, 7 program/konsentrasi, Kepala Sekolah candidate, empat Wakasek candidate, 22 tenaga administrasi candidate, dan academic year aktif.

Blocker sebelum surat production dapat diterbitkan: sample surat resmi, pattern penomoran/register, kode klasifikasi, assignment Kepala TU, approval/paraf matrix, signer authority per template, logo/kop asset, retention profile, dan kebijakan TTE.

Phase 1 foundation boleh dirancang dengan feature gate; `ISSUED` production tidak boleh dibuka sebelum blocker kritis dikonfirmasi.
