# Catatan Tinjauan Iterasi 5: UC-07 Memverifikasi Laporan

## 1. Requirements Review (2026-11-25)

Diperiksa: teks UC-07 v5, FR-21, FR-22, FR-29, FR-31, NFR-03, NFR-05, storyboard Halaman Detail Laporan (tombol Verifikasi, dialog konfirmasi, Hubungi Warga).

| No | Temuan | Tindakan |
|---|---|---|
| RR-5.1 | Langkah 4a tidak menyebut bagaimana bentrokan dua Admin dicegah, hanya pesannya | Kunci baris Kejadian dalam transaksi; diuji UJ-07.06 |
| RR-5.2 | Aturan isi catatan cek lapangan (wajib? panjang?) tidak ada | Wajib, maks. 500 karakter, 422 bila tidak valid; ditambah UJ-07.09 |
| RR-5.3 | Tidak jelas apakah cek lapangan masih boleh setelah keputusan | Hanya pada Laporan Diterima (sesuai posisi alternate 1a) |
| RR-5.4 | Riwayat Status belum punya tempat untuk jenis kegiatan (cek lapangan, siaga Polsek, konfirmasi instansi) | Atribut `StatusHistory.activity` ditambahkan |
| RR-5.5 | Format waktu pada pesan 4a belum ada | WIB, "25 November 2026 10.09 WIB" |

Hasil: **lolos**.

## 2. Preliminary Design Review (2026-11-25)

Robustness diagram: `iconix/uc07-robustness.png` (dari `skripsi/iconix/`, tanpa perubahan).

| Langkah / alternate | Objek robustness | Cocok? |
|---|---|---|
| 1 | Boundary Halaman Detail Laporan; control "Tampilkan titik GPS, titik foto, jarak, dan petunjuk titik panas" | Ya (dibangun di UC-06) |
| 2–3 | Control "Minta konfirmasi" → boundary Dialog Konfirmasi | Ya |
| 4 | "Periksa status masih Laporan Diterima", "Ubah status Laporan dan laporan ganda", "Catat Riwayat Status" ↔ Report, Incident, StatusHistory | Ya |
| 4a | "Tampilkan 'Laporan sudah diproses oleh …'" | Ya |
| 5 | "Kirim Notifikasi" ↔ Notification, Layanan Push | Ya (push mengikuti kesepakatan Android, sama dengan UC-04) |
| 6 | "Tampilkan status baru, aktifkan tombol Teruskan ke Instansi" | Ya |
| 1a | "Tampilkan nomor HP Warga", boundary Formulir Catatan Cek Lapangan, "Catat permintaan cek lapangan tanpa ubah status" → Kirim Notifikasi | Ya |
| Kewenangan | — | **Kurang**: pemeriksaan bahwa hanya Admin Polres boleh memverifikasi (UJ-07.08) tidak tergambar. Ditangani penjaga peran di route; dicatat agar diagram dilengkapi |

Hasil: **lolos** dengan satu catatan kelengkapan diagram.

## 3. Critical Design Review (2026-11-25)

`/speckit.analyze`:

| Pemeriksaan | Hasil |
|---|---|
| Langkah dan alternate ↔ pesan sequence | Cocok. Sequence memakai `changeStatusIf(RECEIVED → VERIFIED)` pada Report; diwujudkan sebagai `IncidentCommands.lockByReport` + pemeriksaan status + `applyStatus` (lihat A-5.1) |
| Pesan sequence ↔ operasi class | `VerificationService.verify`, `requestFieldCheck`, `Incident.applyStatus`, `StatusHistory.record`, `NotificationService.send` ada |
| Skenario ↔ kontrak | Semua skenario punya tanggapan (200, 201, 403, 404, 409, 422) |
| Requirement ↔ tugas/uji | FR-001–FR-008 masing-masing punya tugas dan kasus uji |

Temuan analyze:
- **A-5.1 (sedang)**: `changeStatusIf` per Laporan dapat lolos untuk laporan ganda walaupun laporan utama sudah diproses. Pemeriksaan dipindah ke tingkat Kejadian (status laporan utama setelah kunci). Sequence tetap benar secara urutan; nama pesan dicatat.
- **A-5.2 (rendah)**: `now()` PostgreSQL bernilai sama sepanjang transaksi sehingga urutan dua entri Riwayat Status dalam satu transaksi tidak pasti. Kolom `created_at` pada `status_histories` dan `notifications` diganti default `clock_timestamp()`.
- **A-5.3 (rendah)**: Class diagram belum memuat atribut `StatusHistory.activity`. Ditambahkan di migrasi 006; diagram perlu diperbarui.

Hasil: **lolos**, `implement` boleh dijalankan.
