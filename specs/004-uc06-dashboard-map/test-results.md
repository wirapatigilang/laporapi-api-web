# Hasil Black Box Testing: UC-06 Melihat Daftar dan Peta Laporan

Tanggal: 2026-11-25 · Lingkungan: Bun 1.4.4, ElysiaJS 1.4.32, SvelteKit 3.4 + Svelte 5.57, Leaflet 1.9.4, PostgreSQL 16.15 (`lapor_api_test`), Chromium (Playwright 1.63), layanan NASA FIRMS tiruan (`tests/blackbox/firms-mock.ts`) · Berkas uji: `tests/blackbox/web/uc06-dashboard.test.ts`

| Kode | Lapis | Skenario | Teknik | Masukan / kondisi | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|---|
| UJ-06.01 | Web | US1-1 | UC | Kejadian A (1 laporan ganda, Diterima) dan B (Diverifikasi) | Satu baris dan satu penanda per Kejadian; warna penanda sesuai status; jumlah ganda 1 dan 0 | Lulus |
| UJ-06.02 | Web, API | US1-2 | EP | Saringan Diterima + Nanga Mahap + 10 Maret 2026; saringan Polsek Nanga Mahap | Hanya Kejadian yang sesuai di daftar dan peta | Lulus |
| UJ-06.03 | Web | US1-3 | EP | Selesai, 1–2 Januari 2000 | "Tidak ada laporan" | Lulus |
| UJ-06.04 | Web, API | US2-1 | EP | Operator Polsek Sekadau Hilir | Hanya laporan wilayahnya | Lulus |
| UJ-06.05 | Web | US3-1 | EP | Laporan baru dikirim saat dasbor terbuka | Muncul paling atas dengan penanda "baru", penanda peta berdenyut, halaman tidak dimuat ulang | Lulus |
| UJ-06.06 | Web | US4-1 | UC | Laporan dengan EXIF 80 m dan satu laporan ganda | Foto, koordinat, akurasi, EXIF + "Selisih lokasi foto: 80 m", waktu, keterangan, nama dan nomor HP Warga, laporan ganda, riwayat | Lulus |
| UJ-06.07 | Web | US2-2 | EP | Operator membuka detail di wilayahnya | Nomor HP Warga utuh | Lulus |
| UJ-06.08 | Web, API | US4-2 | EP | Titik panas tiruan 800 m (dan satu di sudut kotak > 5 km) | Jumlah 1, terdekat 795–805 m; status tetap Diterima | Lulus |
| UJ-06.09 | Web | US4-3 | EP | FIRMS tiruan menjawab 503 | Detail tetap tampil, "Data titik panas tidak tersedia" | Lulus |
| UJ-06.10 | API | US2-3 | EP | Operator meminta detail dan foto di luar wilayah | 403 | Lulus |
| UJ-06.11 | API | FR-002 | EP | Warga meminta `GET /api/incidents` | 403 | Lulus |
| UJ-06.12 | API | FR-001 | EP | `status=PENDING`, `from=10-03-2026` | 422 dengan pesan pada `status` dan `from` | Lulus |

**Ringkasan:** 12 dari 12 kasus uji lulus pada putaran pertama. Regresi UC-01, UC-02, UC-04: lulus. Seluruh rangkaian: **66/66 lulus**.

**Catatan pemeriksaan manual (tangkapan layar):** ubin peta OpenStreetMap tidak termuat di lingkungan uji karena akses jaringan ke peladen ubin dibatasi; penanda dan saringan tetap berfungsi. Ditambahkan keterangan warna pada peta detail agar titik laporan, titik foto, dan titik panas dapat dibedakan.

## Converge

Semua FR-001–FR-008 punya kode dan kasus uji; tidak ada tugas tambahan. Hasil: **converged**.
