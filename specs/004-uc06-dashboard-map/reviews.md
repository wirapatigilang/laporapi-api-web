# Catatan Tinjauan Iterasi 4: UC-06 Melihat Daftar dan Peta Laporan

## 1. Requirements Review (2026-11-25)

Diperiksa: teks UC-06 v5, FR-17–FR-20, NFR-01, NFR-03, NFR-10, AB-04, AB-17, AB-18, storyboard Dasbor Laporan dan Halaman Detail Laporan.

| No | Temuan | Tindakan |
|---|---|---|
| RR-4.1 | FR-20 masih [SESUAIKAN]: radius dan rentang waktu titik panas belum ditetapkan, padahal UJ-06.08 memakai jarak 800 m "dalam rentang waktu pencarian" | Ditetapkan radius 5 km dan `day_range=2` (keputusan kerja, perlu konfirmasi Gilang) |
| RR-4.2 | "Tidak dapat dihubungi" belum terukur | Batas tunggu 5 detik, galat sumber mana pun, atau kunci FIRMS kosong = tidak tersedia |
| RR-4.3 | Rentang tanggal tidak menyebut waktu mana dan zona waktunya | Waktu lapor laporan utama, zona WIB |
| RR-4.4 | Dasbor Petugas Instansi (UC-02 langkah 5, FR-17) belum punya data sebelum UC-10 | Cakupan ditulis sekarang; daftar Petugas Instansi kosong sampai iterasi 9, diuji di UJ-11.10 |
| RR-4.5 | Bab 4 Tabel 4.12 belum menguji Warga yang meminta daftar Kejadian dan saringan tidak valid | Ditambah UJ-06.11 dan UJ-06.12 |

Hasil: **lolos**.

## 2. Preliminary Design Review (2026-11-25)

Robustness diagram: `iconix/uc06-robustness.png` (dari `skripsi/iconix/`, tanpa perubahan).

| Langkah / alternate | Objek robustness | Cocok? |
|---|---|---|
| 1, 1a | Boundary Dasbor Laporan; control "Tentukan cakupan sesuai peran" | Ya |
| 2 | Control "Ambil Kejadian, laporan utama, dan jumlah laporan ganda" ↔ Incident, Report; "Beri warna penanda" | Ya |
| 2a | Control "Terima siaran Laporan baru, beri penanda 'baru'" | Ya |
| 2b | Control "Tampilkan 'Tidak ada laporan'" | Ya |
| 3 | Control "Terapkan saringan" | Ya |
| 4 | Control "Ambil detail" ↔ Report, StatusHistory, User; "Ambil titik panas terdekat" ↔ Layanan NASA FIRMS, Hotspot | Ya |
| 4 (FIRMS gagal) | — | **Kurang**: tidak ada control untuk keterangan "Data titik panas tidak tersedia" (NFR-10). Ditangani di dalam control "Ambil titik panas terdekat"; dicatat agar diagram dilengkapi |
| 4 (hak akses detail) | — | **Kurang**: pemeriksaan bahwa Operator hanya membuka detail wilayahnya (UJ-06.10) tidak tergambar. Memakai control cakupan yang sama dengan langkah 1a |

Hasil: **lolos** dengan dua catatan kelengkapan diagram (tidak mengubah objek domain).

## 3. Critical Design Review (2026-11-25)

`/speckit.analyze` (mengikuti `templates/commands/analyze.md`):

| Pemeriksaan | Hasil |
|---|---|
| Langkah dan alternate ↔ pesan sequence | Cocok. Sequence memakai `fetchHotspots(bbox, 1 day)`; diubah menjadi 2 hari sesuai RR-4.1 (lihat A-4.1) |
| Pesan sequence ↔ operasi class | `ReportService.listIncidents`, `getDetail`, `FirmsClient.fetchHotspots`, `DashboardStream.broadcast` ada di class diagram |
| Skenario ↔ kontrak | Semua skenario punya tanggapan; ditambah `GET /api/reports/:id/photo`, `GET /api/districts`, `GET /api/police-sectors` yang belum ada di sequence |
| Requirement ↔ tugas/uji | FR-001–FR-008 masing-masing punya tugas dan kasus uji |

Temuan analyze:
- **A-4.1 (sedang)**: `day_range=1` pada sequence hanya mencakup tanggal UTC hari ini, sehingga titik panas pukul 22.00 WIB kemarin tidak terlihat pagi harinya. Dipakai 2 hari; sequence perlu diperbarui.
- **A-4.2 (sedang)**: Token web disimpan di cookie `httpOnly`, sehingga peramban tidak dapat membuka `EventSource` dan gambar langsung ke API. Ditambah dua rute penerus di server web (`/dashboard/stream`, `/reports/:id/photo`). Kontrak API tidak berubah.
- **A-4.3 (rendah)**: Siaran SSE disimpan di memori proses API (satu proses). Cukup untuk skala Polres Sekadau; dicatat sebagai keterbatasan.

Hasil: **lolos**, `implement` boleh dijalankan.
