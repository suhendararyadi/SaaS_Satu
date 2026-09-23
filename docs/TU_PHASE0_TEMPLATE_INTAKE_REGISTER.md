# School OS TU — Phase 0 Template Intake Register

**Tenant:** SMKN 12 GARUT  
**Tujuan:** checklist pengumpulan contoh surat nyata dan konversinya menjadi template School OS.  
**Aturan:** jangan membuat template final berdasarkan asumsi; satu contoh nyata terbaru harus dianalisis sebelum status berubah dari `WAITING_SAMPLE`.

## 1. Register prioritas

| ID | Jenis dokumen | Priority | Sample | Numbering | Signer | Approval | Status |
|---|---|---:|---|---|---|---|---|
| TU-TPL-001 | Surat Keterangan Aktif Siswa | P0 | belum ada | pending | pending | pending | `WAITING_SAMPLE` |
| TU-TPL-002 | Surat Keterangan Siswa | P0 | belum ada | pending | pending | pending | `WAITING_SAMPLE` |
| TU-TPL-003 | Surat Tugas | P0 | belum ada | pending | pending | pending | `WAITING_SAMPLE` |
| TU-TPL-004 | Surat Pengantar | P0 | belum ada | pending | pending | pending | `WAITING_SAMPLE` |
| TU-TPL-005 | Surat Undangan | P0 | belum ada | pending | pending | pending | `WAITING_SAMPLE` |
| TU-TPL-006 | Surat Pemberitahuan | P1 | belum ada | pending | pending | pending | `WAITING_SAMPLE` |
| TU-TPL-007 | Surat Permohonan | P1 | belum ada | pending | pending | pending | `WAITING_SAMPLE` |
| TU-TPL-008 | Surat Rekomendasi | P1 | belum ada | pending | pending | pending | `WAITING_SAMPLE` |
| TU-TPL-009 | Surat Pengantar PKL | P1 | belum ada | pending | pending | pending | `WAITING_SAMPLE` |
| TU-TPL-010 | Surat Panggilan Orang Tua/Wali | P1 | belum ada | pending | pending | pending | `WAITING_SAMPLE` |

## 2. Checklist analisis per sample

Untuk setiap file/surat yang diterima, catat:

- tanggal dokumen;
- jenis dokumen;
- nomor surat;
- register yang dipakai;
- struktur nomor;
- kode klasifikasi;
- kop/header;
- logo/instansi induk;
- alamat/kontak pada kop;
- tempat/tanggal surat;
- tujuan/penerima;
- sifat surat;
- lampiran;
- perihal;
- pembuka;
- body/content blocks;
- variable data vs static wording;
- tanda tangan;
- nama jabatan signer;
- NIP ditampilkan/tidak;
- cap/stempel;
- tembusan;
- footer;
- margin/page configuration;
- approval/paraf yang terjadi sebelum terbit;
- apakah surat memakai QR/TTE;
- klasifikasi keamanan;
- kebijakan arsip/retensi bila diketahui.

## 3. Variable extraction worksheet

Setiap teks dinilai menjadi salah satu:

### Static text

Contoh: kalimat baku yang tetap sama pada setiap surat.

### Master-data variable

Candidate namespace:

```text
school.*
student.*
classRoom.*
department.*
academicYear.*
staff.*
pkl.*
company.*
signer.*
document.*
```

### Manual field

Field yang memang berubah per surat tetapi tidak berasal dari master data, misalnya:

```text
manual.purpose
manual.eventName
manual.location
manual.notes
```

Manual field harus punya schema, label, type, required/optional, max length, dan validation rule.

### Forbidden/sensitive variable

Data yang tidak boleh masuk template default hanya karena tersedia di database.

## 4. Sample anonymization rule

Sebelum contoh surat disimpan sebagai artefak pengembangan:

- redact NIK/KK;
- redact rekening;
- redact nomor bantuan sosial;
- redact alamat pribadi bila tidak diperlukan;
- redact nomor telepon pribadi bila tidak diperlukan;
- redact signature image jika tidak diperlukan untuk layout analysis;
- pertahankan struktur/layout dan placeholder sehingga analisis tetap valid.

Nama sekolah/jabatan pejabat boleh dipertahankan bila dokumen memang merupakan surat resmi sekolah dan pengguna mengizinkan penggunaannya sebagai configuration source.

## 5. Template conversion states

```text
WAITING_SAMPLE
→ ANALYZED
→ VARIABLE_MAPPED
→ DRAFT_TEMPLATE
→ SCHOOL_REVIEWED
→ UAT_APPROVED
→ ACTIVE
→ ARCHIVED
```

`ACTIVE` hanya setelah:

- layout disetujui;
- variable resolver disetujui;
- numbering register disetujui;
- signer/approval rule disetujui;
- rendering PDF UAT sesuai sample;
- privacy check pass.

## 6. Minimum sample quality

Ideal per jenis surat:

- 2–3 contoh terbaru untuk melihat bagian yang benar-benar variable;
- minimal satu contoh dengan data panjang (nama/alamat/perihal panjang);
- minimal satu multi-page bila jenis surat dapat multi-page;
- contoh yang benar-benar dipakai, bukan draft lama yang tidak lagi berlaku.

Jika hanya satu sample tersedia, template dapat dibuat `DRAFT_TEMPLATE` tetapi tidak langsung dianggap format final seluruh variasi.

## 7. Intake batch pertama yang direkomendasikan

Untuk mulai Phase 1 dengan cepat, cukup unggah terlebih dahulu empat jenis P0:

1. Surat Keterangan Aktif Siswa;
2. Surat Tugas;
3. Surat Pengantar;
4. Surat Undangan.

Empat sample ini cukup untuk menguji empat pola berbeda: student merge, staff/task assignment, external recipient, dan event/invitation layout.

Setelah engine stabil, lanjutkan enam template lainnya.

## 8. Definition of Ready per template

Satu template siap masuk implementation/UAT bila seluruh item berikut diketahui:

- latest official sample tersedia;
- static wording teridentifikasi;
- variable map selesai;
- numbering/register diketahui;
- approval route diketahui;
- signer rule diketahui;
- letterhead asset diketahui;
- privacy review selesai;
- expected PDF output tersedia sebagai comparison target.
