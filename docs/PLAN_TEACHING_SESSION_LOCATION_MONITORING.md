# Rencana — Monitoring Lokasi Sesi Mengajar (KBM)

**Status:** rencana, belum ada kode  
**Tanggal:** 2 Oktober 2026  
**Konteks:** SMKN 12 Garut, modul LMS Teaching Session (Gen1, live) dan Audit KBM

## 1. Permintaan

Role yang berwenang dapat memeriksa **titik lokasi cek-in dan cek-out guru** pada sesi mengajar, melihatnya pada **peta**, dan mengetahui titik itu berada di **area atau ruangan yang mana**. Alasannya: geofence sekolah hanya satu lingkaran, sehingga guru yang berada di dalam lingkungan sekolah tetapi tidak berada di kelas tetap dapat cek-in dan cek-out.

## 2. Audit: apa yang sudah ada dan yang belum

| Hal | Status | Bukti |
| --- | --- | --- |
| Koordinat, akurasi, jarak ke titik sekolah, status geofence, dan foto selfie disimpan **per sesi, untuk cek-in dan cek-out** | **Ada** | `LmsTeachingSession`: `checkIn/OutLatitude`, `Longitude`, `Accuracy`, `DistanceM`, `Geofence`, `EvidenceKey` |
| Cek-in guru ditolak di luar radius sekolah | **Ada, tetapi hanya satu titik sekolah** | `teachingOperations.ts` memakai `getAttendancePolicyOrDefault` (titik dan radius yang sama dengan presensi siswa, saat ini 100 m). Jika koordinat kebijakan kosong, statusnya `UNCONFIGURED` dan tetap lolos. |
| Halaman monitoring sesi | **Ada, tanpa lokasi** | `/school/lms/teaching/audit` ("Audit KBM") hanya menampilkan jam, status, dan tautan foto. Koordinat sudah ikut di respons `getTeachingAudit`, tetapi tidak ditampilkan. |
| Tampilan **peta** | **Tidak ada** | Tidak ada pustaka peta di `package.json`; tidak ada komponen peta di UI. |
| **Koordinat ruangan/area** | **Tidak ada** | `ClassRoom` dan `FacilityRoom` (Sarpras) tidak memiliki latitude/longitude. Jadwal hanya menyimpan `roomLabel` berupa teks bebas. |
| Pencocokan titik cek-in dengan ruangan jadwal | **Tidak ada** | Tidak ada logika pembanding. |
| Siapa yang berwenang memantau | **Ada** | `getTeachingMonitorScope`: admin sekolah, Wakasek Kurikulum, Kepala Sekolah (seluruh sekolah), Kajur (jurusannya). Guru biasa hanya sesi sendiri. |
| Membuka foto bukti | **Rusak** | Halaman audit membukanya dengan `<a href target=_blank>`. Endpoint-nya `auth: true` (token sesi di header), jadi tautan mentah menghasilkan **401** (diuji: `{"error":"Silakan login..."}`). `DESIGN.md` juga melarang pola ini. |
| Data nyata untuk diuji | **Belum ada** | Hanya 6 sesi demo; 5 di antaranya punya koordinat cek-in; belum ada sesi nyata. |

Data ruangan yang tersedia:

- Jadwal KBM (hasil import 1 Okt 2026) memakai **29 label ruang**: `K-1…K-13`, `RPS-1/2`, `AA-1/2`, `AB-1…3`, `LAB DKV 1/2`, `LAB KOM`, `LAB TSM`, `UB TSM`, `LAB.BIO`, `KAMPUS 2`, `MESJID`. Label ini tetap per rombel.
- Sarpras punya **75 ruangan** dari Dapodik (`DAP-PRAS-001`, `KELAS X A1`, `BENGKEL TBSM`, …) tanpa gedung/lantai dan tanpa koordinat. **Tidak satu pun** cocok dengan label jadwal (`K-13` bukan `KELAS X A1`). Perlu tabel pemetaan.
- "Kampus 2" dan "Mesjid" adalah lokasi tersendiri, bukan ruang kelas di titik utama.

**Kesimpulan:** fiturnya **belum ada**. Yang ada hanyalah datanya, dan data itu baru sebagian (koordinat guru ada, koordinat ruangan tidak).

## 3. Batas teknis yang harus diterima sejak awal

GPS ponsel tidak membuktikan guru berada di dalam kelas tertentu.

- Di luar ruangan akurasi tipikal 5–15 m; di dalam bangunan sering 15–50 m atau lebih, dan bisa meleset belasan meter. Dua ruang kelas bersebelahan hanya berjarak 6–9 m.
- GPS tidak membedakan **lantai**.
- Kelas berdinding tebal atau berlantai atas dapat memberi titik yang "melayang" ke sisi lain bangunan.

Karena itu fitur ini dirancang sebagai **alat tinjau**, bukan bukti hukum:

- menampilkan titik, lingkaran akurasi, dan **area terdekat**;
- memberi tanda **perlu ditinjau** bila titik jauh dari ruang jadwal, dengan mempertimbangkan akurasi;
- mengutamakan bukti yang lebih kuat bila diperlukan (kode QR di ruang, selfie berlatar kelas, presensi siswa yang tersimpan).

Hasil "tidak cocok" tidak boleh otomatis menjadi sanksi atau memblokir guru; selalu ada tinjauan manusia.

## 4. Fase

### Fase 0 — Perbaikan cepat (sekitar 1 hari)

Tanpa migrasi, tanpa pustaka baru.

1. **Perbaiki foto bukti**: ganti tautan mentah dengan penampil di dalam aplikasi (ambil dengan token sesi, tampilkan dalam dialog), seperti yang dilakukan modul presensi dan PKL.
2. Pada daftar Audit KBM tampilkan **koordinat, akurasi (±m), jarak dari titik sekolah**, dan status geofence untuk cek-in dan cek-out.
3. Pasang tanda sederhana: `UNCONFIGURED`, akurasi buruk (> 50 m), cek-out tanpa cek-in, dan cek-in jauh dari jadwal.

### Fase 1 — Peta KBM (2–3 hari)

Halaman baru `/school/lms/teaching/map` ("Peta KBM"), tautan dari Audit KBM dan menu admin/Kurikulum.

- Peta dengan **marker cek-in** (biru) dan **cek-out** (hijau), **lingkaran akurasi** (dari `checkInAccuracy`), lingkaran radius sekolah, dan garis penghubung cek-in ke cek-out.
- Filter: tanggal atau rentang, guru, rombel, jurusan, status, dan "hanya yang bermasalah".
- Klik marker: guru, mapel, rombel, jadwal, jam cek-in/out, jarak, akurasi, foto selfie (penampil dalam aplikasi), dan tautan ke detail sesi.
- Daftar dan peta saling terhubung (klik baris menyorot marker), plus tampilan tabel sebagai alternatif aksesibel dan ekspor CSV.
- Backend: query baca-saja `getTeachingSessionMap` dengan proyeksi minimal dan cakupan sama seperti `getTeachingAudit`. Data hanya untuk role berwenang.
- Pustaka: **Leaflet** (ringan, tanpa kunci API). Sumber ubin peta menjadi keputusan (bagian 8).
- Belum ada pemetaan ruangan; peta menunjukkan titik dan jarak ke titik sekolah.

### Fase 2 — Ruangan dan area (4–6 hari)

Inilah yang menjawab "terlihat di area atau ruangan yang mana".

**Data (migrasi aditif):** tabel `TeachingRoomLocation`

- `schoolId`, `code` (cocok dengan `roomLabel` jadwal), `name`, `kind` (kelas, lab, bengkel, lapangan, masjid, kantor, lainnya)
- `campus` (utama atau Kampus 2), `buildingName`, `floor`
- `latitude`, `longitude`, `radiusMeters` (zona ruang), `polygon` GeoJSON opsional untuk bangunan besar
- `facilityRoomId` opsional ke `FacilityRoom` (Sarpras), `isActive`

Migrasi harus menyertakan `ALTER TABLE … OWNER TO saas_satu_staging` dan hak akses; tabel hasil migrasi pernah dimiliki `postgres` sehingga aplikasi gagal membaca (pengalaman PKL Gen2, `RELEASE_2026-09-21_PKL_GEN2_PERMISSION_FIX.md`).

**Halaman admin "Peta Ruang":**

- daftar ruang, awalnya diisi dari 29 label jadwal;
- tempatkan atau geser marker di peta, atau **kalibrasi di lokasi**: admin berdiri di ruang, ketuk "Gunakan lokasi saya", sistem merata-ratakan beberapa sampel dan mencatat akurasinya;
- pemetaan ke ruang Sarpras dengan saran nama.

**Evaluasi (fungsi murni, diuji):** pada setiap sesi hitung jarak titik cek-in dan cek-out ke ruang jadwal dan ke semua ruang aktif:

- `COCOK`: dalam radius ruang ditambah toleransi akurasi
- `DEKAT`: di luar ruang tetapi dalam bangunan atau zona yang sama
- `JAUH`: ruang lain atau luar zona
- `TIDAK_DIKETAHUI`: ruang belum dikalibrasi atau akurasi terlalu buruk

Tampilkan "Titik cek-in paling dekat: Lab TSM (± 12 m)".

**Antrean tinjauan:** sesi `JAUH` atau berulang masuk daftar tinjau. Peninjau memberi keputusan (wajar, perlu klarifikasi, tindak lanjut) beserta catatan, dan dapat membuat kasus di modul Tindak Lanjut yang sudah ada.

### Fase 3 — Bukti yang lebih kuat (opsional, 3–5 hari)

Bila GPS saja dianggap kurang:

- **Kode QR di setiap ruang**: guru memindai saat cek-in. Server memeriksa tanda tangan, ruang, dan jadwal. Ini satu-satunya cara praktis untuk membuktikan keberadaan di ruang tertentu. Kelemahan: foto QR bisa dibagikan, jadi dipadukan dengan GPS, selfie, dan jam.
- **Sinyal pendukung** yang sudah ada: presensi mapel siswa tersimpan selama sesi, agenda diisi, dan foto agenda. Tampilkan sebagai lencana, bukan skor tunggal.

### Fase 4 — Laporan dan kebijakan (2–3 hari)

- Rekap per guru, jurusan, dan ruang (persentase cocok, jumlah ditinjau), serta peringatan ke Kurikulum untuk pola berulang.
- Retensi dan pembersihan koordinat.

## 5. Kewenangan dan privasi

- **Siapa melihat apa:** admin sekolah dan Superadmin (semua), Wakasek Kurikulum dan Kepala Sekolah (seluruh sekolah), Kajur (jurusannya), guru (hanya sesinya sendiri). Siswa dan orang tua tidak pernah melihat data ini. Pemeriksaan ada di server, bukan hanya di menu.
- **Lokasi guru adalah data pribadi.** Rancangan harus patuh pada tujuan yang sempit (verifikasi pelaksanaan KBM):
  - hanya titik saat cek-in dan cek-out, **tidak ada pelacakan terus-menerus**;
  - guru diberi tahu dan tahu siapa yang dapat melihat;
  - **catatan akses**: siapa membuka peta atau foto, kapan, untuk sesi mana;
  - retensi: koordinat dan foto dihapus setelah periode tertentu (usulan 12 bulan), status sesi tetap;
  - tidak ada ekspor tanpa hak akses.
- Disarankan membahasnya dengan pimpinan sekolah dan perwakilan guru sebelum Fase 2, termasuk pemberitahuan resmi dan dasar penggunaan (UU PDP No. 27/2022).
- Peta dan ubin: gunakan sumber yang tidak membocorkan koordinat guru ke pihak ketiga. Ubin hanya meminta area tampilan; marker digambar di sisi klien. Tautan ke peta eksternal dengan koordinat guru **tidak** dipakai.

## 6. Kualitas dan pengujian

- Unit: jarak (haversine), toleransi akurasi, dan klasifikasi `COCOK/DEKAT/JAUH/TIDAK_DIKETAHUI`, termasuk kasus tepi (akurasi buruk, ruang belum dikalibrasi, Kampus 2).
- Server: tes cakupan kewenangan dan isolasi antar tenant (pola `teachingTimetable.integration.ts` pada klon produksi), dan proyeksi data minimal.
- Komponen: marker, filter, tabel alternatif, dan penampil foto.
- **Uji lapangan wajib sebelum menetapkan ambang:** jalan keliling dengan ponsel asli dan catat titik serta akurasi di tiap ruang (minimal 3 kali per ruang, pada jam berbeda). Ambang `COCOK/DEKAT` ditetapkan dari data itu, bukan ditebak. Chromium di server tidak punya GPS nyata.
- Tinjauan visual desktop dan ponsel seperti pada rilis login, serta kontras warna marker (jangan hanya mengandalkan warna).

## 7. Urutan dan perkiraan

| Fase | Isi | Perkiraan | Prasyarat |
| --- | --- | --- | --- |
| 0 | Foto bukti dapat dibuka, koordinat di daftar | 1 hari | tidak ada |
| 1 | Peta KBM | 2–3 hari | Fase 0, keputusan ubin peta |
| 2 | Ruangan dan area, antrean tinjauan | 4–6 hari | Fase 1, uji lapangan, daftar titik ruang |
| 3 | QR ruang dan sinyal pendukung | 3–5 hari | keputusan pemilik |
| 4 | Laporan dan retensi | 2–3 hari | Fase 2 |

Rekomendasi: kerjakan **Fase 0 dan 1 dahulu**, kumpulkan sesi nyata beberapa minggu, lalu putuskan seberapa jauh Fase 2 dan 3 diperlukan berdasarkan pola yang terlihat.

## 8. Keputusan yang dibutuhkan dari pemilik

1. **Tingkat ketelitian yang diharapkan**: "area/gedung terdekat" (realistis dengan GPS) atau "ruang kelas tertentu" (butuh QR)?
2. **Sumber peta**: OpenStreetMap (gratis, cukup untuk skala sekolah, perlu atribusi dan patuh kebijakan penggunaan), penyedia ubin berbayar, atau **denah sekolah** yang diunggah dan diselaraskan dengan beberapa titik acuan (tanpa ubin pihak ketiga, tampak seperti peta sekolah sendiri).
3. **Titik ruang**: siapa yang mengkalibrasi 29 ruang (waktu sekitar 1–2 jam berkeliling), dan apakah ada denah/foto udara sekolah.
4. **Kampus 2 dan Mesjid**: apakah koordinat titik utama sudah dikonfirmasi (nilai longitude yang tersimpan masih menunggu konfirmasi) dan bagaimana Kampus 2 diperlakukan.
5. **Ambang dan sanksi**: tanda "perlu ditinjau" bersifat saran saja (rekomendasi), bukan blokir cek-in?
6. **Retensi dan pemberitahuan** kepada guru, serta siapa yang menerima peringatan pola berulang.
7. **Radius guru**: sekarang sama dengan siswa (100 m dari satu titik). Apakah guru perlu radius atau titik tersendiri?

## 9. Risiko

- Positif palsu karena GPS dalam ruangan menimbulkan ketidakpercayaan; mitigasi: tampilkan akurasi, tinjauan manusia, ambang dari uji lapangan.
- Beban kalibrasi 29 ruang; mitigasi: kalibrasi di lokasi dengan perata-rataan sampel.
- Sensitivitas data lokasi guru; mitigasi: bagian 5.
- Ketergantungan ubin peta pihak ketiga; mitigasi: sumber ubin dapat diganti, atau memakai denah.
- Koordinat sekolah yang masih menunggu konfirmasi memengaruhi jarak ke titik utama; selesaikan sebelum Fase 1 dipakai untuk penilaian.
