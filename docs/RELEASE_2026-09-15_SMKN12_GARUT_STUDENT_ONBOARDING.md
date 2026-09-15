# Production Baseline — SMKN 12 Garut Student Onboarding

Date: **15 September 2026 (Asia/Jakarta)**
Status: **LIVE / production baseline**

Dokumen ini adalah handoff lintas-agent untuk School OS setelah onboarding tenant **SMKN 12 Garut** dan import data peserta didik Dapodik. Dokumen ini sengaja hanya menyimpan agregat dan keputusan operasional; **tidak menyimpan identitas pribadi siswa**.

## Current production runtime

Production pointers pada saat dokumentasi ini diperbarui:

- backend: `/home/ubuntu/deployments/SaaS_Satu/releases/24cb787-panel-hardening`
- static: `/var/www/saas-satu/releases/24cb787-panel-hardening`
- `saas-satu.service`: **active**
- source branch aktif: `redesign/apple-hig`
- source HEAD: `24cb787` — `fix(school): harden non-admin panels`

Release production saat ini sudah mencakup rangkaian pengembangan setelah fondasi Dapodik, termasuk adaptasi fitur menurut jenjang sekolah, presensi harian siswa, panel Wakasek modular, organization assignment center, follow-up workflow, sarpras, Kesiswaan Terpadu, notification center, EWS lintas modul generasi kedua, dan hardening panel non-admin.

## Active tenant context

Untuk kelanjutan pekerjaan setelah titik ini, tenant operasional yang menjadi fokus adalah:

**SMKN 12 Garut**

Jangan menganggap tenant demo/tenant sebelumnya sebagai target aktif kecuali pemilik produk secara eksplisit mengganti konteks.

## Student import result

Import Dapodik production untuk SMKN 12 Garut selesai dengan hasil agregat:

- siswa berhasil diimpor: **1.539**
- `StudentProfile` terisi: **1.539**
- rombel terisi: **50**
- siswa tanpa rombel: **0**
- baris gagal pada proses import yang diterima: **0**
- duplikasi NISN pada data yang diterima: **0**
- duplikasi NIK pada data yang diterima: **0**
- duplikasi NIPD/NIS pada data yang diterima: **0**
- akun/login siswa dibuat: **0**
- pencocokan `Rombel Saat Ini` Dapodik ke rombel School OS: **100% cocok**

Distribusi siswa:

| Tingkat | Jumlah |
| --- | ---: |
| X | 570 |
| XI | 456 |
| XII | 513 |
| **Total** | **1.539** |

## Source-row conflict intentionally not imported

Ada **2 baris sumber Dapodik** yang sengaja tidak ditulis karena menggunakan **NIK yang sama**, sehingga importer memperlakukannya sebagai konflik identitas.

Identitas kedua siswa tersebut **tidak disimpan di dokumen permanen ini**. Jangan memilih salah satu, mengubah NIK, atau membuat identitas sintetis secara otomatis. Perbaikan harus berdasarkan data Dapodik/sekolah yang benar, lalu import ulang hanya setelah sumber authoritative sudah dikoreksi.

## Tenant-isolation proof

Setelah import:

- **SMKN 12 Garut:** 1.539 siswa
- **SMKN 1 Rongga:** tetap 21 siswa
- **SMPN 1 Gununghalu:** tetap 0 siswa

Ini adalah baseline penting untuk mendeteksi accidental cross-tenant mutation pada pekerjaan berikutnya.

## Backup and privacy cleanup

Backup sebelum penulisan siswa:

`/home/ubuntu/backups/SaaS_Satu/pre-smkn12-student-write-20260915T2238WIB.dump`

Payload sementara, JSON hasil ekstraksi, data base64, dan script import sementara yang memuat data pribadi siswa telah dibersihkan dari VPS setelah verifikasi.

Jangan menyalin raw student PII ke dokumentasi, memory agent, issue text, log debug, atau artefak generatif.

## Unfinished mapping: program/konsentrasi keahlian

Semua **50 rombel sudah ada dan sudah terhubung ke 1.539 siswa**, tetapi rombel belum dipetakan ke Program/Konsentrasi Keahlian karena file Dapodik yang dipakai hanya menyediakan nama rombel seperti:

- `X A_1`
- `XI B_3`
- `XII F_1`

Arti kode **A–G belum memiliki sumber authoritative** di konteks proyek.

### Rule

**Jangan menebak arti A–G.**

Tahap berikutnya yang direkomendasikan:

1. dapatkan mapping resmi A–G → Program/Konsentrasi Keahlian SMKN 12 Garut;
2. cocokkan mapping dengan 50 rombel yang sudah ada;
3. tulis relasi program/konsentrasi secara tenant-scoped;
4. verifikasi jumlah rombel dan siswa per program;
5. pastikan tenant lain tetap tidak berubah;
6. buat backup sebelum mutation material.

Setelah mapping authoritative tersedia, relasi rombel dapat menjadi basis pengelompokan seluruh 1.539 siswa menurut program/konsentrasi tanpa mengubah identitas siswa.

## Account policy

Import ini **tidak membuat akun autentikasi siswa**. Student records saat ini berfungsi sebagai database sekolah.

Jangan membuat akun massal/login siswa sebagai efek samping pekerjaan data master. Provisioning akun harus menjadi workflow terpisah dengan keputusan eksplisit, policy password/activation yang aman, dan tenant isolation yang diverifikasi.

## Agent handoff rules

Agent berikutnya harus:

- membaca `docs/PROJECT_CONTEXT.md` dan dokumen ini sebelum mutation School OS;
- memakai **SMKN 12 Garut** sebagai konteks tenant aktif sampai ada instruksi eksplisit lain;
- memperlakukan angka 1.539 siswa / 50 rombel sebagai baseline production setelah import;
- menganggap angka 21 siswa pada release Dapodik 13 September sebagai **historical pre-import preservation proof**, bukan jumlah siswa production saat ini;
- tidak menyimpan PII siswa di long-term agent memory;
- tidak menebak mapping kode rombel A–G;
- tetap memakai backup + tenant-isolation verification untuk mutation production.
