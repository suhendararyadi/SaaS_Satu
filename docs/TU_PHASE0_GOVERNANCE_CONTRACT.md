# School OS TU — Phase 0 Governance & Authorization Contract

**Tenant baseline:** SMKN 12 GARUT  
**Status:** implementation contract draft  
**Berlaku sebagai acuan:** Phase 1 design & authorization review

## 1. Tujuan

Dokumen ini mengunci batas kewenangan teknis sebelum Modul TU dibuat. Tujuannya mencegah shortcut seperti menjadikan semua operator TU `SCHOOL_ADMIN`, memperbolehkan penomoran tanpa approval, atau menganggap jabatan di database otomatis sama dengan kewenangan hukum menandatangani semua naskah.

## 2. Actor model

### TU Operator

Candidate source: user yang memiliki assignment TU aktif.

Capability planned:

- `viewAdministration`;
- `manageCorrespondence`;
- `manageIncomingMail`;
- `manageAdministrationServices`;
- archive write sesuai scope.

Tidak otomatis memiliki:

- `manageLetterNumbering`;
- `approveAdministrationDocuments`;
- `signAdministrationDocuments`;
- tenant-wide School Admin capability.

### TU Coordinator / Kepala TU

Status personel SMKN 12 Garut: **`PENDING_SCHOOL_CONFIRMATION`**.

Planned capability setelah personel/assignment resmi dikonfirmasi:

- review draft;
- manage numbering registers;
- monitor TU queue/SLA;
- archive governance;
- approval hanya untuk template yang policy-nya mengizinkan.

### Kepala Sekolah

Candidate identity tersedia di School OS.

Planned capability:

- final approval/sign decision pada template yang dikonfigurasi;
- incoming disposition;
- void/replacement authorization untuk kelas dokumen tertentu.

Kepala Sekolah **tidak otomatis dipaksa menjadi signer semua dokumen**. Template policy menentukan signer requirement.

### Wakasek

Empat bidang tersedia: Kurikulum, Kesiswaan, Sarpras, Humas/Hubin.

Planned usage:

- reviewer atau approver domain-specific;
- disposition assignee;
- signer hanya jika ada kewenangan yang dikonfirmasi.

Tidak memperoleh akses ke seluruh arsip TU hanya karena berstatus Wakasek.

### Kepala Program / unit lain

Dapat menjadi reviewer/assignee untuk naskah yang terkait unitnya. Tidak mendapat akses global.

### School Admin

Fungsi:

- configure tenant/module;
- emergency administration;
- manage assignments.

School Admin tidak boleh menjadi bypass diam-diam terhadap audit trail. Jika melakukan override, actor dan reason wajib tercatat.

### Student / teacher biasa

Tidak memiliki workspace TU.

Mereka dapat:

- menjadi subject/recipient dokumen;
- membuat service request bila jenis layanan diaktifkan;
- melihat status/request/dokumen miliknya melalui endpoint self-scoped yang terpisah.

## 3. Assignment strategy

Phase 1 harus menambah assignment/capability khusus TU.

Candidate enum:

```text
TATA_USAHA
HEAD_OF_ADMINISTRATION
```

Namun implementation review wajib mengecek model `SchoolStaffAssignment.teacherId` yang masih teacher-centric.

Keputusan yang diutamakan:

- relation tetap ke `User`;
- authorization berdasarkan assignment/capability;
- jangan menambah `UserRole=TATA_USAHA` hanya untuk kenyamanan UI tanpa alasan keamanan/arsitektur yang kuat.

## 4. Capability contract

| Capability | Operator | Coordinator | Principal | Waka/Unit | School Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| `viewAdministration` | ✓ | ✓ | ✓ | scoped | ✓ |
| `manageCorrespondence` | ✓ | ✓ | optional | scoped | ✓ |
| `manageIncomingMail` | ✓ | ✓ | view/dispose | scoped | ✓ |
| `manageArchives` | scoped | ✓ | view | scoped | ✓ |
| `manageAdministrationTemplates` | — | ✓ | — | — | ✓ |
| `manageLetterNumbering` | — | ✓ | — | — | ✓ with audit |
| `reviewAdministrationDocuments` | optional | ✓ | optional | scoped | ✓ |
| `approveAdministrationDocuments` | — | policy | policy | policy | emergency/policy |
| `signAdministrationDocuments` | — | policy | policy | policy | not by admin role alone |
| `manageAdministrationServices` | ✓ | ✓ | — | scoped | ✓ |

`policy` berarti kewenangan berasal dari konfigurasi template + assignment yang sudah diverifikasi, bukan role global.

## 5. Document state authority

Allowed baseline:

```text
DRAFT
→ IN_REVIEW
→ APPROVED
→ NUMBERED
→ SIGNED
→ ISSUED
→ SENT
→ ARCHIVED
```

Alternative exits:

```text
RETURNED_FOR_REVISION
REJECTED
VOID
REPLACED
```

Rules:

- author tidak boleh self-approve jika policy memerlukan reviewer lain;
- perubahan revision setelah approval meng-invalidasi approval yang relevan;
- nomor final tidak dialokasikan saat draft;
- `ISSUED` adalah immutable snapshot;
- `VOID` tidak menghapus nomor atau audit history;
- replacement adalah dokumen baru dengan relasi ke dokumen sebelumnya.

## 6. Number allocation contract

Nomor surat:

- dialokasikan server-side;
- menggunakan DB transaction;
- memiliki unique guard per register/period/sequence;
- retry harus idempotent;
- nomor void tidak digunakan kembali;
- override manual membutuhkan capability + reason + audit;
- preview tidak boleh mengklaim nomor final sebelum allocation.

Pattern aktual SMKN 12 Garut tetap `PENDING_SCHOOL_CONFIRMATION`.

## 7. Signer contract

Signer resolver membutuhkan dua lapis validasi:

1. user memang memiliki assignment/jabatan yang valid pada tenant;
2. template policy memperbolehkan jabatan tersebut menjadi signer untuk jenis dokumen itu.

Nama/jabatan pada dokumen final disimpan sebagai snapshot.

Jika pejabat berubah, surat lama tetap menyimpan signer lama.

## 8. Privacy contract

Template variable authoring harus memakai whitelist.

Default allow:

- identitas sekolah;
- nama/NIS/NISN siswa bila dibutuhkan template;
- rombel/program/tahun ajaran;
- identitas jabatan staf yang relevan;
- kontak institusi;
- data PKL yang relevan.

Default deny tanpa explicit policy:

- NIK;
- nomor KK;
- parent NIK;
- rekening bank;
- KIP/KPS/nomor bantuan;
- koordinat rumah;
- data kesehatan;
- credential/auth data;
- internal EWS risk score;
- catatan disiplin/konseling yang tidak diperlukan dokumen.

## 9. Public verification contract

Public endpoint QR hanya boleh mengembalikan metadata minimum:

- validity status;
- nomor;
- tanggal;
- sekolah;
- jenis dokumen;
- signer/title;
- fingerprint.

Recipient name bersifat template/policy opt-in. Isi surat penuh bukan default publik.

## 10. Archive governance contract

- final issued artifact immutable;
- checksum disimpan;
- classification/access level wajib;
- retention policy configurable;
- legal hold didukung;
- tidak ada automatic deletion/destruction;
- destruction candidate harus melalui human review dan proses instansi.

## 11. Tenant isolation contract

Setiap operation wajib:

1. resolve authenticated user;
2. resolve `schoolId` dari session/context;
3. resolve assignment/capability;
4. query record dalam tenant;
5. validate related entity masih tenant yang sama;
6. execute mutation;
7. append audit event.

Tidak boleh menerima `schoolId` dari client sebagai sumber otoritas.

## 12. Phase 1 feature gates

Walau foundation sudah dibangun, capability berikut harus tetap OFF sampai configuration pack lengkap:

- final number allocation;
- `ISSUED` transition;
- public QR activation;
- signer/TTE production;
- archive destruction workflow.

Draft/template/preview/UAT boleh aktif di synthetic tenant lebih awal.

## 13. SMKN 12 Garut current governance gaps

- Kepala TU belum teridentifikasi sebagai assignment terstruktur;
- 22 tenaga administrasi belum punya Auth;
- penugasan TU masih memakai generic `OTHER` + custom title;
- signer authority per template belum ada;
- approval/paraf route belum ada;
- numbering register belum ada;
- logo/kop resmi belum tersimpan;
- satu assignment Kepala Program terdeteksi duplikat.

Semua gap di atas harus diselesaikan atau sengaja di-feature-gate sebelum production issue.
