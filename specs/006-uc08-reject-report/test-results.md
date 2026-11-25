# Hasil Black Box Testing: UC-08 Menolak Laporan

Tanggal: 2026-11-25 · Lingkungan: Bun 1.4.4, ElysiaJS 1.4, SvelteKit 3.4 + Svelte 5, PostgreSQL 16 (`lapor_api_test`), Chromium (Playwright 1.63) · Berkas uji: `tests/blackbox/web/uc08-reject.test.ts`

| Kode | Lapis | Skenario | Teknik | Masukan / kondisi | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|---|
| UJ-08.01 | Web | US1-1 | UC, ST | Alasan "Laporan iseng" | Laporan Ditolak; alasan tersimpan; tiket ditutup; Notifikasi Warga berisi alasan; Notifikasi Operator; tombol Tolak/Verifikasi nonaktif | Lulus |
| UJ-08.02 | Web | US2-1 | EP | Tanpa alasan | "Pilih alasan penolakan"; dialog tetap terbuka; status tetap | Lulus |
| UJ-08.03 | Web | US2-2 | EP | "Lainnya" tanpa catatan | "Catatan wajib diisi untuk alasan Lainnya"; pilihan dipertahankan; status tetap | Lulus |
| UJ-08.04 | Web | US1-3 | EP | "Lainnya" + catatan | Berhasil; catatan tersimpan dan tampil di detail | Lulus |
| UJ-08.05 | Web | US2-3 | EP | Batal | Dialog tertutup; status dan riwayat tidak berubah | Lulus |
| UJ-08.06 | Web | US1-2 | UC | Kejadian dengan 2 laporan ganda, ditolak dari laporan ganda | Ketiga Laporan Ditolak dengan alasan sama; tiap Warga menerima Notifikasi berisi alasan | Lulus |
| UJ-08.07 | Web | US3-1 | EP | Saringan status Laporan Ditolak | Laporan tampil, detail terbuka dengan alasan | Lulus |
| UJ-08.08 | API | US4-1 | ST | Laporan Diverifikasi | 409 "Laporan sudah diproses oleh … WIB"; status tetap | Lulus |
| UJ-08.09 | API | US3-2 | DT | Laporan baru 30 m dari Laporan Ditolak | Kejadian baru (bukan laporan ganda) | Lulus |
| UJ-08.10 | API | US4-2 | EP | Operator Polsek; alasan tidak dikenal | 403; 422 `fields.reasonId`; status tetap | Lulus |

**Putaran 1:** 7 dari 10 lulus. UJ-08.01, 08.06, 08.07 (dan UJ-07.07) gagal dengan 500: status diubah sebelum alasan tersimpan sehingga CHECK `reports_rejection_check` menolak (A-6.2). UJ-08.03 dan 08.04 gagal karena pencari label "Lainnya" di skrip uji juga cocok dengan label catatan; skrip diperbaiki (pencocokan persis), perilaku aplikasi tidak berubah.

**Putaran 2 (setelah perbaikan):** 10 dari 10 lulus. Uji ulang UJ-07.03 (tombol Tolak aktif) dan UJ-07.07 (Laporan Ditolak lewat API): lulus. Seluruh rangkaian: **85/85 lulus**.

## Converge

FR-001–FR-007 punya kode dan kasus uji. Hasil: **converged**.

## Uji ulang setelah amandemen 2026-11-25 (masukan dosen)

| Kode | Masukan | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| UJ-08.08 (diubah) | Laporan Diverifikasi ditolak, lalu ditolak lagi | 200 Laporan Ditolak; penolakan kedua 409 "Laporan sudah diproses oleh … WIB" | Lulus |

Seluruh rangkaian setelah amandemen: **134/134 lulus** (25 November 2026).
