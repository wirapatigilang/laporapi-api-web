# Hasil Black Box Testing: UC-05 Memantau Status Laporan

Tanggal: 2026-11-25 · Lingkungan: Bun 1.4.4, ElysiaJS 1.4, PostgreSQL 16 (`lapor_api_test`) · Berkas uji: `tests/blackbox/uc05-track-status.test.ts`

| Kode | Lapis | Skenario | Teknik | Masukan / kondisi | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|---|
| UJ-05.01 | API | US1-1 | UC | Warga dengan 3 laporan (+1 laporan Warga lain) | 3 laporan miliknya, terbaru lebih dulu, nomor/waktu/kecamatan/foto/status; foto dapat diambil | Lulus |
| UJ-05.02 | API | US1-2 | EP | `status=VERIFIED`, `ALL`, `DONE` | Hanya yang Diverifikasi; semua; 422 | Lulus |
| UJ-05.03 | API | US1-3 | EP | Warga baru | Daftar kosong | Lulus |
| UJ-05.04 | API | US2-1 | UC | Laporan Petugas Ditugaskan | Status, riwayat bertanggal (Diterima, Diverifikasi, Ditugaskan), nama petugas; tanpa posisi tim, data pelapor lain, titik panas | Lulus |
| UJ-05.05 | API | US2-2 | EP | Laporan ditolak "Lainnya" + catatan | `rejection` berisi alasan dan catatan | Lulus |
| UJ-05.06 | API | US2-3 | EP | Laporan ganda dari Kejadian yang diverifikasi | "Tergabung dengan laporan #LA-…", status Laporan Diverifikasi (di detail dan daftar) | Lulus |
| UJ-05.07 | API | US2-4 | EP | Warga lain membuka detail dan foto | 403 | Lulus |
| UJ-05.08 | API | US3-1 | UC | Admin memverifikasi | Notifikasi baru belum dibaca, menyebut nama Admin; ditandai dibaca; `reportId` membuka detail Diverifikasi; Notifikasi orang lain 404 | Lulus |

**Ringkasan:** 8 dari 8 lulus pada putaran pertama. Seluruh rangkaian: **93/93 lulus**.

Catatan: UJ-05.04 menyiapkan status Petugas Ditugaskan di basis data uji; diuji ulang lewat Penerusan pada iterasi 9 (UC-10).

## Converge

FR-001–FR-005 punya kode dan kasus uji. Hasil: **converged**.
