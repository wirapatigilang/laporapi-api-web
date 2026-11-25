# Catatan Tinjauan Iterasi 10: UC-11 Memperbarui Status Penanganan

## 1. Requirements Review (2026-11-25)

Diperiksa: teks UC-11 v5, FR-27, FR-28, FR-29, ASUMSI-10, ASUMSI-19, storyboard Halaman Detail Laporan (Petugas Instansi).

| No | Temuan | Tindakan |
|---|---|---|
| RR-10.1 | Bila aturan status dan hak dilanggar bersamaan, kode jawaban tidak ditentukan; UJ-11.05 (409) dan UJ-11.11 (403) bergantung padanya | Urutan pemeriksaan ditetapkan di Clarifications |
| RR-10.2 | Tidak jelas apakah Mulai Penanganan mensyaratkan konfirmasi | Tidak; konfirmasi dicatat otomatis |
| RR-10.3 | Keberangkatan tidak disebut di langkah 6 (Notifikasi) | Tanpa Notifikasi |
| RR-10.4 | Prasyarat "atau berada di wilayah Polsek operator" berlaku hanya untuk 4a | Operator hanya boleh `DEPARTED` |

Hasil: **lolos**.

## 2. Preliminary Design Review (2026-11-25)

Robustness diagram: `iconix/uc11-robustness.png` (tanpa perubahan).

| Langkah / alternate | Objek robustness | Cocok? |
|---|---|---|
| 1 | Dasbor Laporan (Instansi); "Ambil Laporan yang diteruskan ke Instansinya"; "Tampilkan tombol status berikutnya" | Ya (cakupan dari UC-10) |
| 1a, 2b | "Periksa hak …", "Tolak: tidak diizinkan" | Ya |
| Kapan saja | "Periksa status hanya maju satu tahap", "Tolak lompat atau mundur" | Ya |
| 2, 2a, 3 | "Tandai Penerusan dikonfirmasi", "Catat kegiatan tanpa ubah status" ↔ Dispatch, StatusHistory | Ya |
| 4, 4a | "Catat kegiatan tanpa ubah status (keberangkatan)" | Ya |
| 5 | "Ubah status Laporan dan laporan ganda", "Catat Riwayat Status" | Ya |
| 6 | "Kirim Notifikasi ke Warga dan Admin Polres (memuat nama petugas)" | Ya |

Hasil: **lolos**.

## 3. Critical Design Review (2026-11-25)

| Pemeriksaan | Hasil |
|---|---|
| Langkah ↔ pesan sequence | Cocok, kecuali urutan pemeriksaan (A-10.1) |
| Pesan ↔ operasi class | `HandlingService.update`, `Dispatch.confirm`, `ReportStatus.canTransitionTo`, `Incident.applyStatus`, `StatusHistory.record`, `NotificationService.send` |
| Skenario ↔ kontrak | 200, 403, 404, 409, 422 |
| Requirement ↔ uji | FR-001–FR-006 punya kasus uji |

Temuan analyze:
- **A-10.1 (sedang)**: Sequence memeriksa hak (403) sebelum urutan status (409). Dengan urutan itu UJ-11.05 (Laporan Diverifikasi belum diteruskan ke BPBD) akan menghasilkan 403, bukan 409 seperti Tabel 4.18. Urutan dibalik: urutan status lebih dulu; sequence perlu diperbarui.
- **A-10.2 (rendah)**: Akibat A-10.1, petugas yang tidak berhak dapat mengetahui status Laporan lewat pesan 409. Dinilai dapat diterima: tidak ada data pribadi yang terbuka.
- **A-10.3 (rendah)**: Konfirmasi dua kali belum ada di diagram; ditambah 409 "Penugasan sudah dikonfirmasi".

Hasil: **lolos**.
