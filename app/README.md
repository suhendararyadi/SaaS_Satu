# Aplikasi SaaS Sistem Informasi Sekolah (App Layer)

Aplikasi web full-stack yang mengelola sistem operasional sekolah multi-tenant, mencakup Master Data Akademik, Kepegawaian & Kesiswaan (CRUD Manual & CSV), LMS Kurikulum Merdeka, E-PKL Terpadu, Tata Kelola Kedinasan, dan Pelaporan Resmi berstandar **Google Material 3** dan **Anti-Slop**.

---

## 🛠️ Stack Teknologi

- **Framework Full-Stack**: [Wasp v0.25.0](https://wasp.sh) (Batteries-included full-stack framework)
- **Frontend**: React 18, Tailwind CSS, Google Material Symbols Rounded
- **Backend & API**: Node.js, Express (dikelola oleh Wasp)
- **Database & ORM**: PostgreSQL, Prisma ORM
- **Desain Sistem**: Google Material 3 (Material You) Expressive Tokens
- **Standar Kualitas**: Anti-Slop (R-01 s/d R-38)

---

## 🚀 Panduan Memulai Cepat (Quick Start)

### 1. Prasyarat Sistem
- **Node.js**: Versi 18.x atau 20.x LTS
- **Wasp CLI**: Pastikan Wasp CLI terpasang di sistem:
  ```bash
  curl -sSL https://get.wasp.sh/installer.sh | sh
  ```
- **Docker**: Diperlukan jika menggunakan PostgreSQL lokal bawaan Wasp (`wasp start db`).

### 2. Variabel Lingkungan (Environment Variables)
Pastikan file `.env.server` dan `.env.client` tersedia di direktori `app/`:

Contoh `.env.server`:
```env
DATABASE_URL=postgresql://wasp:wasp@localhost:5432/wasp
JWT_SECRET=your_jwt_secret_key_change_in_production
PORT=3001
```

Contoh `.env.client`:
```env
REACT_APP_API_URL=http://localhost:3001
```

### 3. Menjalankan Database & Migrasi
```bash
# 1. Jalankan PostgreSQL lokal (melalui docker runner bawaan Wasp)
wasp start db

# 2. Sinkronisasi skema Prisma ke database
wasp db migrate-dev

# 3. Muat data sampel sekolah (SMKN 9 Garut & SMPN 1 Bandung Juara)
wasp db seed
```

### 4. Menjalankan Server Aplikasi
```bash
# Menjalankan frontend dan backend secara bersamaan
wasp start
```
- Antarmuka pengguna (Client) aktif di: `http://localhost:3000`
- Server API backend aktif di: `http://localhost:3001`

---

## 🧪 Verifikasi & Pengujian Kode

```bash
# 1. Pengecekan tipe data TypeScript ketat (Strict Mode)
npx tsc --noEmit

# 2. Menjalankan pengujian komponen unit Wasp (60/60 lulus)
wasp test client --run

# 3. Menjalankan pengujian otomatis E2E Playwright (CRUD Guru & Siswa)
node ../scratch/test_crud_manual.mjs
```

---

## 📁 Struktur Direktori Aplikasi

```
app/
├── main.wasp.ts               # File konfigurasi spesifikasi Wasp utama
├── schema.prisma              # Skema pemodelan database multi-tenant Prisma
├── src/
│   ├── client/
│   │   ├── components/m3/     # Pustaka komponen antarmuka Google Material 3
│   │   │   ├── M3Button.tsx
│   │   │   ├── M3Card.tsx
│   │   │   ├── M3Dialog.tsx
│   │   │   ├── M3TextField.tsx
│   │   │   ├── M3Select.tsx
│   │   │   ├── M3Banner.tsx
│   │   │   ├── M3Icon.tsx
│   │   │   └── ...
│   │   ├── App.tsx            # Root component & theme provider
│   │   └── Main.css           # Token warna Material 3 & font loader
│   ├── school/                # Modul Master Data, Kuota, CRUD Guru/Siswa, dan CSV
│   │   ├── operations.ts      # Server queries & actions (CRUD manual guru & siswa)
│   │   └── pages/             # Tampilan halaman sekolah
│   ├── lms/                   # Modul LMS Kurikulum Merdeka (Materi, Tugas, KBM, CBT)
│   ├── pkl/                   # Modul E-PKL Terpadu & Sistem Peringatan Dini (EWS)
│   ├── governance/            # Modul Tata Kelola (Guru Piket, Wali Kelas, Waka)
│   └── reports/               # Modul Cetak Dokumen Kedinasan (KOP resmi & PDF)
└── tests/                     # Suite pengujian unit Wasp client
```

---

## 📚 Dokumentasi Lengkap Sistem

Dokumentasi arsitektur, panduan modul detail, aturan desain Material 3, dan pedoman Anti-Slop tersedia lengkap pada folder `../docs/`:
- [Master Index Dokumentasi](../docs/README.md)
- [Arsitektur & Keamanan Sistem](../docs/ARCHITECTURE.md)
- [Panduan Komponen & Desain M3](../docs/DESIGN_SYSTEM_M3.md)
- [Standar Kualitas & Audit Anti-Slop](../docs/ANTI_SLOP_GUIDELINES.md)
- [Panduan Operasional Modul](../docs/MODULES_GUIDE.md)
- [Riwayat Perkembangan Proyek](../docs/DEVELOPMENT_LOG.md)
