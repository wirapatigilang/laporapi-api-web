# Catatan Tinjauan Iterasi 11: UC-12 Menyatakan Penanganan Selesai

## 1. Requirements Review (2026-11-25)

Diperiksa: teks UC-12 v5, FR-30, ASUMSI-20, ASUMSI-21, storyboard Halaman Detail Laporan (Petugas Instansi).

| No | Temuan | Tindakan |
|---|---|---|
| RR-11.1 | "Hanya Instansi penanganan" belum menyebut apakah Petugas Instansi lain (tanpa Penerusan) juga ditolak | Ditolak 403; ditambah UJ-12.07 |
| RR-11.2 | Ada dua jalan penyelesaian (`/resolve` dan `/status` UC-11) | Keduanya memakai satu aturan (`ResolutionService.markResolved`) |
| RR-11.3 | Pesan 409 belum ditentukan | Ditetapkan di Clarifications |

Hasil: **lolos**.

## 2. Preliminary Design Review (2026-11-25)

Robustness diagram: `iconix/uc12-robustness.png` (tanpa perubahan).

| Langkah / alternate | Objek robustness | Cocok? |
|---|---|---|
| 1b | "Periksa peran Petugas Instansi", "Tolak: tidak diizinkan" | Ya |
| 1a | "Periksa status Penanganan Berlangsung", "Tolak; tombol tidak aktif" | Ya |
| 2–3 | Dialog Konfirmasi; "Minta konfirmasi (tanpa catatan)" | Ya |
| 4 | "Ubah status …", "Tutup tiket Kejadian", "Catat Riwayat Status" | Ya |
| 5 | "Kirim Notifikasi 'api sudah padam' …" | Ya |
| Penerusan Instansi | — | **Kurang**: pemeriksaan bahwa Instansi petugas menerima Penerusan (RR-11.1) tidak tergambar; dicatat |

Hasil: **lolos** dengan satu catatan diagram.

## 3. Critical Design Review (2026-11-25)

| Pemeriksaan | Hasil |
|---|---|
| Langkah ↔ pesan sequence | Cocok |
| Pesan ↔ operasi class | `ResolutionService.markResolved`, `Incident.applyStatus`, `Incident.close`, `StatusHistory.record`, `NotificationService.send` |
| Skenario ↔ kontrak | 200, 403, 404, 409 |
| Requirement ↔ uji | FR-001–FR-005 punya kasus uji |

Temuan analyze:
- **A-11.1 (rendah)**: Sequence tidak memeriksa Penerusan (sama dengan catatan PDR). Ditambah pada kode setelah pemeriksaan status.

Hasil: **lolos**.
