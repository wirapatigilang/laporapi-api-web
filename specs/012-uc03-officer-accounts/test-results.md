# Hasil Black Box Testing: UC-03 Mengelola Akun Petugas

Tanggal: 2026-11-25 · Lingkungan: Bun 1.4.4, ElysiaJS 1.4, SvelteKit 3.4 + Svelte 5, PostgreSQL 16 (`lapor_api_test`), Chromium (Playwright 1.63) · Berkas uji: `tests/blackbox/web/uc03-accounts.test.ts`

| Kode | Lapis | Skenario | Teknik | Masukan / kondisi | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|---|
| UJ-03.01 | Web, API | US1-1 | UC | Operator Polsek Nanga Taman, nomor `+62…` | Akun tampil (nomor dinormalisasi 08…); kata sandi awal 10 karakter tampil sekali, tidak ada setelah muat ulang dan di daftar API; dapat dipakai masuk | Lulus |
| UJ-03.02 | Web, API | US1-2 | EP | Petugas Instansi tanpa Instansi; Operator tanpa Polsek | "Pilih Instansi untuk Petugas Instansi"; 422 "Pilih Polsek untuk Operator Polsek"; tidak tersimpan | Lulus |
| UJ-03.03 | Web, API | US1-3 | EP | `0811-0000-0002` (nomor Operator data awal) | "Nomor HP sudah dipakai" di kolom nomor HP; 409; tidak tersimpan | Lulus |
| UJ-03.04 | Web | US1-4 | EP | Nama kosong | "Nama wajib diisi"; tidak tersimpan | Lulus |
| UJ-03.05 | Web | US2-1 | UC | Petugas BPBD → Manggala Agni | Formulir terisi data lama; Instansi berubah di daftar dan basis data | Lulus |
| UJ-03.06 | Web, API | US2-2 | UC | Nonaktifkan + konfirmasi, lalu masuk | "Tidak aktif"; masuk ditolak "Akun Anda tidak aktif, hubungi Admin Polres"; token lama 401 `ACCOUNT_INACTIVE` | Lulus |
| UJ-03.07 | API, Web | US3-1 | EP | Operator Polsek dan Petugas Instansi | 403; menu Kelola Akun tidak tampil; halaman `/officers` 403 | Lulus |

**Ringkasan:** 7 dari 7 lulus pada putaran pertama. Seluruh rangkaian (iterasi 1–12): **132/132 lulus**.

## Converge

FR-001–FR-007 punya kode dan kasus uji. Hasil: **converged**.
