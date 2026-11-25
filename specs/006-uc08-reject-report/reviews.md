# Catatan Tinjauan Iterasi 6: UC-08 Menolak Laporan

## 1. Requirements Review (2026-11-25)

Diperiksa: teks UC-08 v5, FR-23, FR-29, NFR-09, ASUMSI-14, ASUMSI-15, storyboard Dialog Tolak Laporan.

| No | Temuan | Tindakan |
|---|---|---|
| RR-6.1 | UC-08 tidak punya alternate untuk Laporan yang sudah diproses Admin lain (ada di UC-07 4a) | Perilaku 409 yang sama dipakai; diuji UJ-08.08 |
| RR-6.2 | "Menutup tiket Kejadian" belum dijelaskan akibatnya bagi laporan baru di lokasi yang sama | Kejadian tertutup tidak dipakai lagi untuk deteksi laporan ganda; diuji UJ-08.09 |
| RR-6.3 | Panjang catatan tidak dibatasi | Maksimal 500 karakter |
| RR-6.4 | Tabel 4.14 belum menguji akses Operator dan alasan yang tidak dikenal | Ditambah UJ-08.10 |

Hasil: **lolos**.

## 2. Preliminary Design Review (2026-11-25)

Robustness diagram: `iconix/uc08-robustness.png` (dari `skripsi/iconix/`, tanpa perubahan).

| Langkah / alternate | Objek robustness | Cocok? |
|---|---|---|
| 1–2 | Boundary Dialog Tolak Laporan; control "Ambil pilihan Alasan Penolakan" ↔ RejectionReason | Ya |
| 3, 3a, 3b | "Periksa alasan dipilih; catatan wajib bila 'Lainnya'", "Minta alasan atau catatan diisi" | Ya |
| 3c | "Tutup dialog tanpa perubahan" | Ya |
| 4, 4a | "Periksa status masih Laporan Diterima", "Ubah status … simpan alasan", "Tutup tiket Kejadian", "Catat Riwayat Status" | Ya |
| 5 | "Kirim Notifikasi berisi alasan ke Warga dan ke Operator Polsek" | Ya |
| 6 | "Tampilkan status baru" | Ya |
| Status sudah diproses | — | **Kurang**: control "Periksa status" tidak punya keluaran galat (lihat RR-6.1). Memakai pesan 4a UC-07; dicatat agar diagram dilengkapi |

Hasil: **lolos** dengan satu catatan kelengkapan diagram.

## 3. Critical Design Review (2026-11-25)

`/speckit.analyze`:

| Pemeriksaan | Hasil |
|---|---|
| Langkah dan alternate ↔ pesan sequence | Cocok, kecuali cabang 409 yang tidak digambar (A-6.1) |
| Pesan sequence ↔ operasi class | `RejectionReason.list`, `RejectionService.reject`, `Incident.applyStatus`, `Incident.close`, `StatusHistory.record`, `NotificationService.send` ada |
| Skenario ↔ kontrak | 200, 403, 404, 409, 422 |
| Requirement ↔ tugas/uji | FR-001–FR-007 punya tugas dan kasus uji |

Temuan analyze:
- **A-6.1 (rendah)**: Sequence UC-08 tidak memuat cabang "status sudah bukan Laporan Diterima". Kode memakai `alreadyProcessed` dari UC-07; sequence perlu dilengkapi.
- **A-6.2 (sedang)**: Urutan pesan di sequence (`changeStatusIf … save reason` lalu `applyStatus`) jika diterapkan apa adanya melanggar CHECK `reports_rejection_check` bila status diubah sebelum alasan tersimpan. Ditemukan saat uji pertama (500); alasan kini disimpan sebelum status diubah.
- **A-6.3 (rendah)**: Validasi isian dilakukan sebelum mengunci Kejadian, sehingga isian salah pada Laporan yang sudah diproses menghasilkan 422, bukan 409. Diterima: Admin memperbaiki isian lebih dulu.

Hasil: **lolos**.
