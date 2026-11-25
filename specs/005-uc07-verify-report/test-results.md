# Hasil Black Box Testing: UC-07 Memverifikasi Laporan

Tanggal: 2026-11-25 · Lingkungan: Bun 1.4.4, ElysiaJS 1.4, SvelteKit 3.4 + Svelte 5, PostgreSQL 16 (`lapor_api_test`), Chromium (Playwright 1.63), layanan NASA FIRMS tiruan · Berkas uji: `tests/blackbox/web/uc07-verify.test.ts`

| Kode | Lapis | Skenario | Teknik | Masukan / kondisi | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|---|
| UJ-07.01 | Web | US1-1 | UC, ST | Laporan Diterima; Admin menekan Verifikasi lalu "Ya, verifikasi" | Status Laporan Diverifikasi; riwayat mencatat waktu WIB dan nama Admin; Notifikasi untuk Warga dan Operator Polsek; Teruskan ke Instansi aktif, Verifikasi nonaktif | Lulus |
| UJ-07.02 | Web | US1-2 | UC | Kejadian dengan 2 laporan ganda | Laporan ganda Laporan Diverifikasi, masing-masing satu entri riwayat; pelapornya menerima Notifikasi | Lulus |
| UJ-07.03 | Web | US2-1 | EP | Laporan dengan EXIF 120 m dari GPS perangkat | "Selisih lokasi foto: 120 m", titik foto di peta, tombol Verifikasi aktif (tombol Tolak diuji di iterasi 6) | Lulus |
| UJ-07.04 | Web | US2-2 | EP | Titik panas tiruan 800 m | Petunjuk 1 titik panas; status tetap Laporan Diterima | Lulus |
| UJ-07.05 | Web | US3-1, US3-2 | EP | Hubungi Warga; catatan cek lapangan | Nomor HP Warga tampil; kegiatan "Permintaan cek lapangan" beserta catatan; status tetap; Notifikasi Operator berisi catatan | Lulus |
| UJ-07.06 | API | US4-1 | ST | Admin Kedua memverifikasi lebih dulu | 409 `ALREADY_PROCESSED` "Laporan sudah diproses oleh Admin Kedua pada … WIB"; hanya satu entri Laporan Diverifikasi | Lulus |
| UJ-07.07 | API | US4-2 | ST | Laporan Ditolak | 409; status tetap Laporan Ditolak | Lulus |
| UJ-07.08 | API | US4-3 | EP | Operator Polsek memanggil verify dan notes | 403; status tetap | Lulus |
| UJ-07.09 | API | US3-3 | BVA | Catatan hanya spasi | 422, `fields.note` "Catatan cek lapangan wajib diisi"; tidak ada kegiatan tercatat | Lulus |

**Ringkasan:** 9 dari 9 kasus uji lulus pada putaran pertama. Regresi UC-01, UC-02, UC-04, UC-06: lulus. Seluruh rangkaian: **75/75 lulus**.

Catatan: UJ-07.07 menyiapkan Laporan Ditolak langsung di basis data uji karena UC-08 dibangun pada iterasi 6; diuji ulang lewat API penolakan pada iterasi 6.

## Converge

FR-001–FR-008 punya kode dan kasus uji; tidak ada tugas tambahan. Hasil: **converged**.
