# Hasil Black Box Testing: UC-12 Menyatakan Penanganan Selesai

Tanggal: 2026-11-25 · Lingkungan: Bun 1.4.4, ElysiaJS 1.4, SvelteKit 3.4 + Svelte 5, PostgreSQL 16 (`lapor_api_test`), Chromium (Playwright 1.63) · Berkas uji: `tests/blackbox/web/uc12-resolve.test.ts`

| Kode | Lapis | Skenario | Teknik | Masukan / kondisi | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|---|
| UJ-12.01 | Web | US1-1 | UC, ST | Kejadian Penanganan Berlangsung dengan 1 laporan ganda | Keduanya Penanganan Selesai; tiket ditutup; Notifikasi Warga (2), Admin, Operator; dialog tanpa isian | Lulus |
| UJ-12.02 | Web, API | US2-1 | ST | Petugas Ditugaskan | Tombol nonaktif; 409 "… penanganan belum berlangsung" | Lulus |
| UJ-12.03 | API | US2-2 | EP | Operator Polsek (`/resolve` dan `/status`) | 403; status tetap | Lulus |
| UJ-12.04 | API | US2-2 | EP | Admin Polres (`/resolve` dan `/status`) | 403; status tetap | Lulus |
| UJ-12.05 | API | US2-3 | ST | Selesai lewat `/status`, lalu `/resolve`, `IN_PROGRESS`, keberangkatan Operator | 409 tiap permintaan; status tetap Penanganan Selesai | Lulus |
| UJ-12.06 | API | US1-2 | DT | Laporan baru 30 m dari Kejadian selesai | Kejadian baru | Lulus |
| UJ-12.07 | API | US2-4 | EP | Petugas BPBD pada Kejadian yang ditangani Manggala Agni | 403; status tetap | Lulus |

**Ringkasan:** 7 dari 7 lulus pada putaran pertama. Seluruh rangkaian: **125/125 lulus**.

## Converge

FR-001–FR-005 punya kode dan kasus uji. Hasil: **converged**.
