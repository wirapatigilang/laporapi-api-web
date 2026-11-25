# Hasil Black Box Testing: UC-11 Memperbarui Status Penanganan

Tanggal: 2026-11-25 · Lingkungan: Bun 1.4.4, ElysiaJS 1.4, SvelteKit 3.4 + Svelte 5, PostgreSQL 16 (`lapor_api_test`), Chromium (Playwright 1.63) · Berkas uji: `tests/blackbox/web/uc11-handling.test.ts`

| Kode | Lapis | Skenario | Teknik | Masukan / kondisi | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|---|
| UJ-11.01 | Web, API | US1-1 | UC | Petugas BPBD, Penerusan 61 menit | Penerusan terkonfirmasi + kegiatan; status tetap; "belum direspons" hilang; Notifikasi Warga menyebut "Petugas BPBD" tanpa posisi; nomor HP Warga tidak tampil | Lulus |
| UJ-11.02 | Web | US1-2 | EP | Damkar setelah BPBD | Dua kegiatan konfirmasi; status tetap; konfirmasi ulang BPBD 409 | Lulus |
| UJ-11.03 | Web | US1-3 | EP | Catat Keberangkatan + catatan | Kegiatan "Tim instansi berangkat" berisi catatan; status tetap | Lulus |
| UJ-11.04 | Web | US1-4 | UC, ST | Mulai Penanganan | Penanganan Berlangsung; Notifikasi Warga (nama petugas) dan Admin | Lulus |
| UJ-11.05 | API | US3-1 | ST | Diverifikasi → Penanganan Berlangsung | 409 "Status hanya boleh maju satu tahap …"; status tetap | Lulus |
| UJ-11.06 | API | US3-2 | ST | Penanganan Berlangsung → Petugas Ditugaskan | 409; status tetap | Lulus |
| UJ-11.07 | API | US3-3 | EP | Petugas BPBD pada Laporan untuk Manggala Agni | 403 (status dan konfirmasi); status tetap | Lulus |
| UJ-11.08 | Web, API | US2-1 | EP | Operator, Laporan Diterima; Laporan di luar wilayah | Kegiatan "Personel Polsek berangkat"; status tetap; luar wilayah 403 | Lulus |
| UJ-11.09 | API | US2-2 | ST | Operator, Laporan Ditolak | 409; tidak ada kegiatan | Lulus |
| UJ-11.10 | Web, API | US3-4 | EP | Dasbor Petugas BPBD | Hanya Laporan yang diteruskan ke BPBD | Lulus |
| UJ-11.11 | API | US3-5 | ST | Petugas BPBD / Operator: Diverifikasi → Petugas Ditugaskan | 403 "Status Petugas Ditugaskan hanya diberikan Admin Polres …"; status tetap | Lulus |

**Ringkasan:** 11 dari 11 lulus pada putaran pertama. Seluruh rangkaian: **118/118 lulus**.

## Converge

FR-001–FR-006 punya kode dan kasus uji. Hasil: **converged**.

## Uji ulang setelah amandemen 2026-11-25 (masukan dosen)

| Kode | Masukan | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| UJ-11.04 (diubah) | Mulai Penanganan, dialog konfirmasi, lalu Ya | Penanganan Berlangsung setelah konfirmasi; Notifikasi Warga dan Admin | Lulus |

Seluruh rangkaian setelah amandemen: **134/134 lulus** (25 November 2026).
