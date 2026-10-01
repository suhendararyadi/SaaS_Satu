# Release — Monitoring Lokasi Sesi Mengajar, Fase 0 dan 1

**Tanggal:** 2 Oktober 2026 (Asia/Jakarta)  
**Rencana induk:** [`PLAN_TEACHING_SESSION_LOCATION_MONITORING.md`](./PLAN_TEACHING_SESSION_LOCATION_MONITORING.md)  
**Rilis:** `900af40-teaching-audit-location` (backend + static, Fase 0) dan `b8fd556-peta-kbm` (static saja, Fase 1)  
**Rollback:** backend `e7a7fc3-teaching-timetable`; static `e55ab83-geo-coordinate-input` (untuk Fase 0) dan `900af40-teaching-audit-location` (untuk Fase 1)

## Keputusan pemilik

- Tingkat ketelitian: **cukup marker titik lokasi di peta**; pencocokan ke ruangan atau area (Fase 2) tidak diperlukan sekarang.
- Sumber peta: **OpenStreetMap**.

## Fase 0 — perbaikan Audit KBM (`/school/lms/teaching/audit`)

- **Foto bukti dapat dibuka.** Tautan "Foto Masuk/Pulang" membuka endpoint foto dengan tautan mentah yang tidak membawa token sesi, sehingga selalu 401 (terbukti pada produksi). Sekarang foto diambil dengan token sesi dan ditampilkan dalam dialog di dalam aplikasi (`TeachingEvidenceDialog`), dengan pesan jelas bila foto tidak ada, tidak berwenang, atau gagal dimuat.
- **Lokasi tampil di daftar:** untuk check-in dan check-out, koordinat, akurasi GPS (±m), jarak dari titik sekolah, status geofence, label ruang pada jadwal, dan selisih jarak antara kedua titik.
- **Tanda untuk ditinjau** (kondisi objektif, bukan kesimpulan bahwa guru tidak mengajar): geofence belum diatur saat check-in; check-in/out tanpa koordinat; akurasi di atas batas kebijakan; check-out tanpa check-in; check-in lewat 15 menit dari jadwal (SLA yang sama dengan KBM Hari Ini); sesi masih berjalan setelah jam selesai. Ada filter "Hanya yang bertanda" dan kartu hitungan.
- **Backend:** `getTeachingAudit` kini juga mengembalikan titik sekolah dan radiusnya (`school`) agar jarak dan akurasi dapat dinilai. Cakupan dan hak akses tidak berubah. Diverifikasi pada klon produksi: titik sekolah ikut, tenant lain tidak ikut, guru tanpa penugasan tetap ditolak 403.
- Fungsi murni di `app/src/lms/teachingLocation.ts` (diuji) dan komponen bersama `TeachingLocationPoint.tsx`.

## Fase 1 — Peta KBM (`/school/lms/peta-kbm`)

- Halaman baru memakai query audit yang sama (tanpa perubahan backend), dengan menu **Peta KBM** di bagian Pembelajaran sidebar admin dan tombol "Lihat di peta" pada halaman audit. Rute sengaja berada di luar awalan `/school/lms/teaching` agar sidebar tidak menyorot dua item.
- **OpenStreetMap lewat Leaflet 1.9.4** (lisensi BSD-2), dimuat hanya di peramban sebagai chunk terpisah, lengkap dengan atribusi. Marker digambar di sisi klien, sehingga koordinat guru tidak pernah dikirim ke server ubin; yang diminta hanya area tampilan. Tidak ada tautan peta eksternal yang membawa koordinat guru.
- **Penanda:** **M** (bulat biru) check-in, **P** (kotak hijau) check-out, **S** (belah ketupat) titik sekolah, cincin oranye untuk yang dipilih, lingkaran tipis untuk akurasi GPS, garis putus-putus untuk radius sekolah. Arti penanda dibawa oleh huruf dan bentuk, bukan hanya warna. Setiap marker punya `aria-label` lengkap (guru, mapel, rombel, jam); tanpa itu nama aksesibelnya hanya "M" atau "P". Daftar sesi di samping peta menjadi alternatif teks.
- **Filter:** rentang tanggal, cari guru/mapel/rombel, tombol Check-in dan Check-out, "Hanya yang bertanda". Memilih marker atau baris daftar menampilkan rincian: koordinat, akurasi, jarak, geofence, tanda, dan foto dalam dialog.
- Bila koordinat sekolah belum diatur, titik dan radius sekolah tidak digambar dan halaman memberi tahu.

## Verifikasi

- Regresi penuh **299/299 di 46 file** (sebelumnya 259/259 di 42 file); `wasp build` lolos; pemeriksaan TypeScript pada build klien menangkap satu kelalaian tipe di tes dan sudah diperbaiki.
- Fase 0: tes halaman audit (8) dan fungsi murni (14); query audit diuji pada klon produksi; promote backend lewat `ops/deploy-school-os-release.mjs`, idempoten, tanpa error di log, data tidak berubah.
- Fase 1: tes pembangun marker, tes komponen peta dengan Leaflet tiruan (sumber ubin OSM, atribusi, marker, klik, pembersihan, label aksesibel), dan tes halaman (10).
- **Uji peramban sungguhan** (Chromium, hasil build) dengan respons API ditiru dan **ubin OSM sungguhan**, pada desktop 1366 px dan ponsel 390 px: 4 marker M, 4 P, 1 S, ubin dan atribusi termuat, 9 lingkaran, klik marker memilih sesi, marker terpilih bercincin, tidak ada galat JS. Halaman admin tidak diuji dengan sesi admin sungguhan karena tidak ada kredensial uji; datanya fiktif dan tangkapan layar sudah dihapus.
- Rute `/school/lms/peta-kbm` dan `/school/lms/teaching/audit` 200; `get-teaching-audit` dan foto tanpa login 401.

## Batasan dan yang belum dikerjakan

- Belum ada sesi KBM nyata (hanya 6 sesi demo), jadi tampilan dengan data nyata belum pernah dilihat. Hasil pertama akan muncul setelah guru mulai cek-in.
- Titik adalah perkiraan posisi ponsel (±akurasi), bukan bukti guru berada di ruang tertentu. Pencocokan ke ruangan/area, antrean tinjauan, QR ruang, laporan, dan retensi (Fase 2–4) tidak dikerjakan.
- **Catatan akses** (siapa membuka peta atau foto) dan **retensi** koordinat belum ada; rencana induk memuatnya dan sebaiknya dikerjakan sebelum data nyata menumpuk.
- Menu Peta KBM hanya ada di sidebar admin. Guru yang berwenang memantau (Wakasek, Kajur) dapat membukanya lewat URL; belum ada entri menu untuk mereka.
- Penggunaan OpenStreetMap mengikuti kebijakan ubin mereka (cocok untuk skala sekolah). Bila pemakaian membesar, ganti sumber ubin atau gunakan denah sekolah.
- Semua jarak dihitung dari koordinat di Pengaturan Kehadiran. Selama uji coba nilainya sengaja dipindah pemilik ke lokasi ujinya; titik resmi SMKN 12 Garut yang diberikan pemilik (-7.200116595457873, 107.8887518789388) harus dikembalikan sebelum dipakai di sekolah.
- Tautan "Foto" memakai endpoint yang sama dengan sebelumnya; hanya cara membukanya yang diperbaiki.
