# Hasil Black Box Testing: UC-10 Meneruskan Laporan ke Instansi

Tanggal: 2026-11-25 · Lingkungan: Bun 1.4.4, ElysiaJS 1.4, SvelteKit 3.4 + Svelte 5, PostgreSQL 16 (`lapor_api_test`), Chromium (Playwright 1.63) · Berkas uji: `tests/blackbox/web/uc10-dispatch.test.ts`

| Kode | Lapis | Skenario | Teknik | Masukan / kondisi | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|---|
| UJ-10.01 | Web, API | US1-1 | UC, ST | Laporan Diverifikasi → BPBD | 1 Penerusan; Petugas Ditugaskan di riwayat "Diteruskan ke BPBD …"; Notifikasi Petugas BPBD dan Warga; "menunggu konfirmasi"; Petugas BPBD dapat membuka Laporan | Lulus |
| UJ-10.02 | Web | US1-2 | EP | Damkar + Dinas Lingkungan Hidup | 2 Penerusan; petugas kedua Instansi menerima Notifikasi, BPBD tidak; satu entri Petugas Ditugaskan | Lulus |
| UJ-10.03 | Web | US2-1 | EP | Tanpa Instansi | "Pilih minimal satu instansi"; dialog tetap; tidak ada Penerusan | Lulus |
| UJ-10.04 | Web | US2-2 | EP, ST | BPBD (sudah) + TNI pada Petugas Ditugaskan | Hanya TNI ditambahkan, kegiatan "Instansi ditambahkan: TNI …"; status tetap; BPBD tidak menerima Notifikasi kedua | Lulus |
| UJ-10.05 | Web | US3-1 | BVA | Penerusan 59 menit tanpa konfirmasi | Tanpa penanda | Lulus |
| UJ-10.06 | Web, API | US3-2 | BVA | Penerusan 60 menit tanpa konfirmasi | "belum direspons" di dasbor dan detail; hilang setelah ada konfirmasi | Lulus |
| UJ-10.07 | API | US4-1 | ST | Laporan Diterima | 409; tanpa Penerusan | Lulus |
| UJ-10.08 | API | US4-2 | ST | Petugas BPBD dan Operator Polsek | 403; status tetap Laporan Diverifikasi | Lulus |
| UJ-10.09 | API | US4-3 | EP | Laporan diteruskan ke Manggala Agni dibuka Petugas BPBD; Instansi tidak dikenal | 403 dan tidak tampil di dasbor; 422 | Lulus |

**Putaran 1:** 3 dari 9 lulus. Kegagalan disebabkan skrip uji menekan tombol Teruskan sebelum halaman selesai aktif (A-9.4), lalu peramban uji tertutup karena batas waktu sehingga uji berikutnya ikut gagal. Aplikasi tidak diubah.

**Putaran 2:** 9 dari 9 lulus. Uji ulang UJ-05.04 dengan Penerusan sungguhan: lulus. Seluruh rangkaian: **107/107 lulus**.

## Converge

FR-001–FR-008 punya kode dan kasus uji. Hasil: **converged**.
