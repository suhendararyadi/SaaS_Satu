# Sistem Desain Google Material 3 (Material You)

Aplikasi SaaS Sistem Informasi Sekolah menerapkan spesifikasi resmi **Google Material 3 (Material You)** dengan penyesuaian Expressive untuk platform berbasis web desktop dan mobile.

---

## 1. Filosofi & Karakter Desain

1. **Peran Warna Semantik (Semantic Color Roles)**: Seluruh warna antarmuka direferensikan melalui peran token semantik (`primary`, `surface`, `container`, `outline`, dll.), bukan kode warna hex sembarangan.
2. **Skala Bentuk M3 Expressive**:
   - **Tombol & Chips**: Bentuk pil penuh (`rounded-full`).
   - **Kartu Kontainer**: Sudut membulat 16px (`rounded-[16px]`).
   - **Modal Dialog & FAB**: Sudut membulat 28px (`rounded-[28px]`).
3. **Standar Target Sentuh**: Setiap tombol interaktif memiliki target sentuh minimum 44px (`min-h-[44px]` dan `touch-manipulation`) untuk menjamin aksesibilitas sentuhan pada perangkat tablet dan layar sentuh.
4. **Ikonografi Seragam**: 100% menggunakan **Google Material Symbols Rounded** dengan bobot opsional (wgh 400–600, opsz 20–24px).

---

## 2. Token Warna & Palet Tema (Green Education Palette)

Palet warna tema didesain dengan kontras yang nyaman bagi pendidik dan tenaga kependidikan:

| Token Peran Warna | Kode Hex | Penggunaan Antarmuka |
| :--- | :--- | :--- |
| `md-primary` | `#12512E` | Aksi utama, tombol `filled`, tab aktif, indikator seleksi. |
| `md-on-primary` | `#FEFFFE` | Teks dan ikon di atas latar `primary`. |
| `md-primary-container` | `#B1F1C5` | Latar tombol tonal, chip terpilih, badge penanda aktif. |
| `md-on-primary-container` | `#00391C` | Teks dan ikon di atas latar `primary-container`. |
| `md-secondary-container` | `#D3E8D8` | Latar netral lembut, badge info rombel dan data sekunder. |
| `md-on-secondary-container` | `#243429` | Teks di atas latar `secondary-container`. |
| `md-tertiary-container` | `#BBEBF2` | Latar badge khusus (misal: penanda Waka Kurikulum, siswa perempuan). |
| `md-surface` | `#F5FBF6` | Warna dasar kanvas antarmuka (*scaffold background*). |
| `md-surface-container-low` | `#EFF5F1` | Latar kartu level rendah, baris tabel selang-seling. |
| `md-surface-container` | `#EAEFEB` | Latar kontainer navigasi samping (*Navigation Drawer*). |
| `md-surface-container-high` | `#E4EAE5` | Latar kartu sorotan dan header dialog. |
| `md-surface-container-highest` | `#DEE4E0` | Latar isian input textfield dan switch track tidak aktif. |
| `md-on-surface` | `#181C1A` | Teks judul utama dan konten berkontras tinggi (13.5:1). |
| `md-on-surface-variant` | `#333E36` | Teks sekunder, label pembantu, dan ikon sekunder (6.8:1). |
| `md-outline` | `#566159` | Garis batas kartu, tabel, dan input (kontras WCAG AA >= 3:1). |
| `md-outline-variant` | `#94A198` | Garis pemisah halus (*divider*). |
| `md-error` | `#B3261E` | Aksi destruktif, peringatan kritis, status alpa/batal. |
| `md-error-container` | `#F9DEDC` | Latar banner error dan kartu peringatan validasi. |
| `md-on-error-container` | `#410E0B` | Teks di atas banner error. |

---

## 3. Skala Tipografi Standar M3

Menggunakan font keluarga **Roboto** dan **Google Sans** dengan hierarki keterbacaan:

| Tipe Gaya M3 | Ukuran / Line Height | Bobot | Penggunaan |
| :--- | :--- | :--- | :--- |
| `display-large` | 57px / 64px | Regular (400) | Judul hero besar. |
| `headline-large` | 32px / 40px | Medium (500) | Judul utama halaman panel sekolah. |
| `headline-medium`| 28px / 36px | Medium (500) | Judul seksi kartu utama. |
| `title-large` | 22px / 28px | Medium (500) | Judul modal dialog (`M3Dialog`). |
| `title-medium` | 16px / 24px | Semi-bold (600)| Judul tabel dan nama mapel LMS. |
| `body-large` | 16px / 24px | Regular (400) | Paragraf teks deskripsi panjang. |
| `body-medium` | 14px / 20px | Regular (400) | Teks isi tabel dan formulir isian. |
| `label-large` | 14px / 20px | Medium (500) | Teks label pada tombol (`M3Button`). |
| `label-medium` | 12px / 16px | Medium (500) | Teks badge status dan chip tag. |

Komponen pembantu tipografi tersedia di `M3Text`:
```tsx
import { M3Text } from "@/client/components/m3";

<M3Text variant="headline-large" color="primary">Ruang Mapel (LMS)</M3Text>
<M3Text variant="body-medium" color="on-surface-variant">Daftar kelas aktif</M3Text>
```

---

## 4. Katalog Komponen Bawaan (`app/src/client/components/m3/`)

Seluruh komponen dibuat secara mandiri di direktori `app/src/client/components/m3/`:

### 1. `M3Button`
- **Varian**: `filled` (primer), `tonal` (sekunder), `outlined` (garis batas), `text` (tanpa latar), `elevated`.
- **Fitur**: Target sentuh 44px, status `isLoading` (spinner terintegrasi), dukungan ikon awalan (`icon`) dan akhiran (`trailingIcon`).

### 2. `M3Card`
- **Varian**: `elevated` (bayangan level 1), `filled` (kontainer datar), `outlined` (border 1px `outline`).
- **Bentuk**: Sudut membulat 16px (`rounded-[16px]`).

### 3. `M3TextField`
- **Fitur**: Teks label mengambang, teks pembantu (*supporting text*), status error dengan pesan validasi, ikon awalan (`leadingIcon`) dan akhiran (`trailingIcon`).

### 4. `M3Select`
- **Fitur**: Dropdown terstandardisasi dengan penanganan opsi berbasis data array `{ value, label }`, pesan error, dan status tidak aktif.

### 5. `M3Switch`
- **Fitur**: Kontrol geser accessible (`role="switch"`, `aria-checked`), animasi transisi mulus tombol geser, teks label terhubung.

### 6. `M3Dialog`
- **Fitur**: Modal pop-up resmi Material 3 dengan sudut membulat 28px (`rounded-[28px]`), penguncian scroll latar belakang (*scroll lock*), penutup tombol `Escape`, dukungan ikon header, judul, deskripsi, dan aksi responsif.

### 7. `M3Banner`
- **Varian**: `standard`, `tonal`, `info`, `warning`, `error`, `success`, `hero`.
- **Fitur**: Judul (*headline*), teks penjelasan (*supportingText*), tombol aksi kontekstual (`actionLabel`, `onAction`), tombol dismissible.

### 8. `M3Table`
- **Struktur**: `M3Table`, `M3TableHeader`, `M3TableBody`, `M3TableRow`, `M3TableHead`, `M3TableCell`.
- **Fitur**: Selalu dibungkus dalam kontainer `overflow-x-auto` agar aman dan nyaman digunakan pada layar perangkat kecil.

### 9. `M3Badge` & `M3Chip`
- **Fitur**: Penanda status ringkas (misal: `HADIR`, `TERLAMBAT`, `Lulus`), varian warna semantik M3, dan dukungan ikon mini.

### 10. `M3NavigationDrawer` & `M3TopAppBar`
- **Fitur**: Drawer samping dengan kemampuan ekspansi penuh dan penciutan menjadi *Navigation Rail* ringkas, penanda lencana notifikasi, dan Top App Bar dengan profil pengguna terhubung.
