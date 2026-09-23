# E2E SaaS Satu Smart School

Pengujian end-to-end memakai Playwright dan berfokus pada alur aplikasi sekolah yang aktual.

## Cakupan

- branding dan modul utama landing page;
- redirect pengguna terautentikasi ke `/school`;
- status pembayaran ketika integrasi belum diaktifkan;
- isolasi multi-tenant untuk baca dan tulis, termasuk penolakan update lintas sekolah.

## Menjalankan lokal

Gunakan database PostgreSQL khusus pengujian. Jangan arahkan `DATABASE_URL` ke database staging atau produksi.

```bash
cd app
wasp install
wasp test client --run
cd .wasp/out/server && npm run bundle
cd ../../../../e2e-tests
npm ci --include=dev
npx playwright install chromium
DATABASE_URL=postgresql://... npm run e2e
```

Konfigurasi Playwright mematikan payment, analytics, dan file upload selama E2E serta melewati verifikasi email hanya pada mode development.

## CI

Workflow `.github/workflows/ci.yml` menjalankan quality gate dan E2E pada PostgreSQL ephemeral dengan Node 24.14.1 dan Wasp 0.25.0.
