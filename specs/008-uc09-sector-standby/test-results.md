# Hasil Black Box Testing: UC-09 Menyiagakan Personel Polsek

Tanggal: 2026-11-25 · Lingkungan: Bun 1.4.4, ElysiaJS 1.4, SvelteKit 3.4 + Svelte 5, PostgreSQL 16 (`lapor_api_test`), Chromium (Playwright 1.63) · Berkas uji: `tests/blackbox/web/uc09-standby.test.ts`

| Kode | Lapis | Skenario | Teknik | Masukan / kondisi | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|---|
| UJ-09.01 | Web, API | US1-1 | UC | Operator membuka Notifikasi Laporan baru, menekan Siagakan Personel | Kegiatan "Personel Polsek disiagakan" + nama Operator; status tetap Diterima; Notifikasi dibaca; "Polsek sudah siaga" di detail dan Dasbor Admin | Lulus |
| UJ-09.02 | Web, API | US2-1 | ST | Laporan Ditolak | "Laporan sudah ditolak"; tombol nonaktif; API 409; tidak ada kegiatan | Lulus |
| UJ-09.03 | API | US2-2 | EP | Laporan di Nanga Mahap oleh Operator Sekadau Hilir; Admin | 403; tidak ada kegiatan | Lulus |
| UJ-09.04 | Web | US1-2 | EP | Catatan "6 personel disiagakan di Mapolsek" | Catatan tersimpan dan tampil pada kegiatan | Lulus |
| UJ-09.05 | API | US1-3 | UC | Siaga lalu verifikasi | Riwayat: Diterima → siaga → Diverifikasi; tanda siaga menyebut Operator | Lulus |

**Ringkasan:** 5 dari 5 lulus pada putaran pertama. Seluruh rangkaian: **98/98 lulus**.

## Converge

FR-001–FR-005 punya kode dan kasus uji. Hasil: **converged**.
