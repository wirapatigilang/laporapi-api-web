# Hasil Black Box Testing: UC-02 Masuk ke Sistem

Tanggal: 2026-11-24 · Lingkungan: Bun 1.4.4, ElysiaJS 1.4.32, SvelteKit 3.4 + Svelte 5.57, PostgreSQL 16.15, Chromium (Playwright 1.63) · Alat: `bun test` (API) dan Playwright (peramban).

| Kode | Lapis | Skenario | Teknik | Masukan / kondisi | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|---|
| UJ-02.01 | Web | US1-1 | UC | Admin Polres, data benar | Diarahkan ke Dasbor Laporan | Lulus |
| UJ-02.02 | Web | US1-2 | EP | Petugas Instansi (BPBD), data benar | Dasbor Laporan menyebut BPBD Kabupaten Sekadau | Lulus |
| UJ-02.03 | API | US2-1 | EP | Pelapor, kanal `android` | 200, token berperan `REPORTER` | Lulus |
| UJ-02.04 | Web | US3-1 | EP | Kata sandi salah | "Nomor HP atau kata sandi salah" | Lulus |
| UJ-02.05 | Web | US3-2 | EP | Nomor HP tidak terdaftar | Pesan sama dengan UJ-02.04 | Lulus |
| UJ-02.06 | Web | US3-3 | EP | Akun nonaktif, kata sandi benar | "Akun Anda tidak aktif, hubungi Admin Polres" | Lulus |
| UJ-02.07 | Web | US3-4 | EP | Akun Pelapor di Halaman Masuk web | "Akun pelapor hanya dapat dipakai di aplikasi Android" | Lulus |
| UJ-02.08 | API | US4-1 | EP | Token kedaluwarsa | 401 `TOKEN_EXPIRED` "Sesi berakhir, silakan masuk kembali" | Lulus |
| UJ-02.09 | Web | US1-3 | EP | Operator Polsek masuk dengan `+62…` (akun tersimpan `08…`) | Dasbor wilayah Polsek Sekadau Hilir | Lulus |
| UJ-02.10 | API | US3-5 | EP | Tanpa penanda kanal | 422 pada `channel` | Lulus |
| UJ-02.11 | API | US4-2 | EP | Tanpa token | 401 | Lulus |
| UJ-02.12 | Web | US4-3 | ST | Cookie sesi berisi token kedaluwarsa, buka Dasbor | Kembali ke Halaman Masuk dengan pesan sesi berakhir | Lulus |
| UJ-02.13 | API | Clarifications | EP | Akun nonaktif + kata sandi salah | 401 pesan 3a (status akun tidak bocor) | Lulus |
| UJ-02.14 | Web | FR-008 | ST | Keluar lalu buka Dasbor | Kembali ke Halaman Masuk | Lulus |
| UJ-02.15 | Web | Edge case (temuan) | EP | Mengetik sebelum halaman selesai dimuat | Isian tetap terkirim; pesan 3a | Lulus (setelah perbaikan) |
| UJ-02.16 | API | Edge case (revisi) | EP | Isian berupa email | 401 "Nomor HP atau kata sandi salah" | Lulus |

**Regresi UC-01:** 9/9 lulus setelah tabel `users` diubah (migrasi 002).

**Ringkasan:** 15 dari 15 kasus uji lulus; seluruh rangkaian 24 kasus (UC-01 + UC-02) lulus.

**Setelah revisi masuk dengan nomor HP (2026-11-24):** UJ-02.09 diubah dan UJ-02.16 ditambah; 16 dari 16 lulus, seluruh rangkaian 54/54 lulus.

## Temuan dan perbaikan

1. **Isian hilang sebelum halaman selesai dimuat (cacat kode).** Saat membuat tangkapan layar untuk Bab 4, nomor HP yang diketik segera setelah halaman terbuka hilang ketika Svelte selesai memuat halaman (*hydration*), sehingga API menjawab 422 "Nomor HP atau email wajib diisi". Kasus uji awal tidak menangkapnya karena selalu menunggu halaman selesai dimuat. Perilaku spec tidak berubah; kode diperbaiki (`value` → `defaultValue`) dan ditambah UJ-02.15. UJ-02.15 dibuktikan gagal pada kode lama dan lulus setelah perbaikan.
2. **Pesan galat per kolom tidak tampil di web.** Kesalahan validasi hanya menampilkan "Data tidak valid". Kode diperbaiki agar pesan per kolom tampil di bawah isian.

## Converge

Semua FR-001–FR-008 punya kode dan kasus uji. Tiga tugas perbaikan ditambahkan ke `tasks.md` (T017–T019) dan selesai. Hasil akhir: **converged**.
