# Catatan Tinjauan Iterasi 7: UC-05 Memantau Status Laporan

## 1. Requirements Review (2026-11-25)

Diperiksa: teks UC-05 v5, FR-15, FR-16, NFR-03, ASUMSI-10, storyboard Android Layar Riwayat dan Detail Laporan (skripsi Khoirul).

| No | Temuan | Tindakan |
|---|---|---|
| RR-7.1 | "Riwayat Status bertanggal" tidak menyebut apakah kegiatan petugas ikut tampil untuk Warga | Hanya perubahan status (keputusan kerja, konfirmasi Gilang) |
| RR-7.2 | Detail petugas (UC-06) memuat nama pelapor laporan ganda dan nomor HP; tidak boleh sampai ke Warga | Detail Warga disusun terpisah |
| RR-7.3 | "Foto kecil" belum jelas: berkas terpisah atau diperkecil di Android | Satu `photoUrl`, diperkecil di Android |
| RR-7.4 | "Warga dapat membukanya" belum punya operasi API | `POST /api/notifications/:id/read` |
| RR-7.5 | Penulisan "#FR-xxxx" di teks UC berbeda dengan format nomor laporan `LA-0001` | Dipakai "#LA-xxxx"; teks UC perlu diperbaiki |

Hasil: **lolos**.

## 2. Preliminary Design Review (2026-11-25)

Robustness diagram: `iconix/uc05-robustness.png` (tanpa perubahan).

| Langkah / alternate | Objek robustness | Cocok? |
|---|---|---|
| 1, 1a | Boundary Layar Riwayat; "Ambil Laporan milik Warga, urut terbaru", "Kembalikan daftar kosong" | Ya |
| 2 | "Saring berdasarkan status" | Ya |
| 3, 3a, 3c | Boundary Layar Detail Laporan; "Susun detail: status, Riwayat Status, nama petugas, alasan penolakan, laporan utama" ↔ Report, Incident, StatusHistory, RejectionReason, User | Ya |
| 3b | "Periksa Laporan milik Warga", "Tolak: tidak diizinkan" | Ya |
| 4 | Boundary Layar Notifikasi; "Ambil Notifikasi Warga" ↔ Notification | Ya; operasi menandai dibaca ditambahkan (RR-7.4) |

Hasil: **lolos**.

## 3. Critical Design Review (2026-11-25)

| Pemeriksaan | Hasil |
|---|---|
| Langkah ↔ pesan sequence | Cocok (`listByReporter`, `isOwnedBy`, `listByReport`, `primaryReport`) |
| Pesan ↔ operasi class | `ReportService.listMine`, `getDetail`; `NotificationService.listFor`, `markRead` |
| Skenario ↔ kontrak | 200, 403, 404, 422 |
| Requirement ↔ uji | FR-001–FR-005 punya kasus uji |

Temuan analyze:
- **A-7.1 (rendah)**: Sequence tidak memuat langkah 4 (membuka Notifikasi). Ditambah `POST /api/notifications/:id/read`; sequence perlu dilengkapi.
- **A-7.2 (rendah)**: `GET /api/reports/:id` kini mengembalikan bentuk berbeda untuk Warga dan petugas. Dicatat di kontrak agar Android memakai bentuk Warga.

Hasil: **lolos**.
