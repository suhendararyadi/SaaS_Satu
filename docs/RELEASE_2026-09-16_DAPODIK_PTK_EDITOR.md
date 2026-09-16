# Release — Complete Dapodik PTK Profile Editor

Date: **16 September 2026 (Asia/Jakarta)**  
Status: **LIVE**

School OS sekarang memiliki form edit lengkap Guru & Tenaga Kependidikan yang mengikuti field profil PTK Dapodik yang sudah tersedia pada halaman detail.

## Runtime

- release: `03655f4-ptk-editor`
- source commit: `03655f4e810879f575064ea2c65d74245b608a58`
- backend: `/home/ubuntu/deployments/SaaS_Satu/releases/03655f4-ptk-editor`
- static: `/var/www/saas-satu/releases/03655f4-ptk-editor`
- rollback backend/static: `e212f56-ptk-detail`
- service: `saas-satu.service` active

## UX

Route edit baru:

`/school/teachers/:id/edit`

Tombol **Edit** pada daftar Guru & Tendik dan halaman detail sekarang membuka halaman khusus ini, bukan modal edit lama.

Kelompok data:

1. Data Utama
2. Kualifikasi & Sertifikasi
3. Beban Kerja & Mengajar
4. Kontak & Akun School OS

Field yang dapat diedit:

- nama lengkap;
- NIP;
- NUPTK;
- jenis kelamin;
- tempat/tanggal lahir;
- NIK;
- status kepegawaian;
- jenis PTK;
- jabatan PTK;
- gelar depan/belakang;
- jenjang pendidikan;
- jurusan/prodi;
- sertifikasi;
- kompetensi;
- TMT kerja;
- tugas tambahan;
- mata pelajaran/mengajar;
- jam tugas tambahan;
- JJM;
- total JJM;
- jumlah/beban siswa;
- email;
- telepon/WhatsApp;
- peran akun School OS.

Form memiliki sidebar kelompok data pada desktop, penanda field sensitif, banner privacy, tombol simpan atas/bawah, dan tautan eksplisit ke Pusat Struktur & Penugasan.

## Boundary penugasan

Edit profil PTK **tidak** mengubah:

- penugasan Wakasek;
- wali kelas;
- kepala program/konsentrasi;
- `SchoolStaffAssignment`;
- struktur organisasi lain.

Perubahan tersebut tetap dilakukan melalui Pusat Struktur & Penugasan.

## Authorization & validation

Action baru:

`updateSchoolTeacherProfile`

Guard server:

`requireSchoolAdmin`

Dengan demikian hanya user ber-capability `manageSchool` atau platform admin yang dapat menyimpan profil lengkap.

Server memvalidasi:

- target PTK harus berada pada `schoolId` tenant aktif;
- target harus role TEACHER/SCHOOL_ADMIN;
- nama wajib;
- email valid;
- role hanya TEACHER/SCHOOL_ADMIN;
- gender hanya L/P atau kosong;
- tanggal memakai format YYYY-MM-DD;
- jam/beban numerik harus integer 0–999;
- NIP tidak boleh duplikat dalam sekolah yang sama;
- NUPTK tidak boleh duplikat dalam sekolah yang sama;
- NIK tidak boleh duplikat dalam sekolah yang sama;
- email tidak boleh digunakan user lain.

Action hanya meng-update `User` dan `TeacherProfile`. Username, Auth, WakasekAssignment, ClassRoom homeroom, dan SchoolStaffAssignment tidak disentuh.

## Database impact

Tidak ada perubahan `schema.prisma` dan tidak ada migration baru pada release ini.

Tidak ada bulk mutation production. Baseline sesudah rollout tetap:

- siswa SMKN 12 Garut: **1.539**;
- TeacherProfile: **103**;
- Auth PTK: **0**.

## Verification

- targeted tests: **9/9 PASS**;
- full Vitest: **136/136 PASS** pada 23 file;
- Wasp production compile/build: PASS;
- generated server bundle: PASS;
- Vite SSR: PASS;
- Vite client: PASS;
- static contains `TeacherEditPage` chunk;
- immutable deploy preflight: PASS;
- deploy cutover: PASS;
- repeat deploy: `idempotent: true`;
- `/school`: HTTP 200;
- `/school/teachers`: HTTP 200;
- edit route: HTTP 200;
- unauthenticated `update-school-teacher-profile`: HTTP 401;
- production service active;
- backend/static pointers both resolve to `03655f4-ptk-editor`.
