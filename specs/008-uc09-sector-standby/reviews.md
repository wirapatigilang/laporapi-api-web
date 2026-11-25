# Catatan Tinjauan Iterasi 8: UC-09 Menyiagakan Personel Polsek

## 1. Requirements Review (2026-11-25)

Diperiksa: teks UC-09 v5, FR-24 [SEPAKATI], FR-28, ASUMSI-16, storyboard Halaman Detail Laporan (Operator).

| No | Temuan | Tindakan |
|---|---|---|
| RR-8.1 | Tidak jelas apakah penyiagaan masih boleh setelah Laporan diverifikasi atau selesai | Boleh sampai selesai; Ditolak dan Selesai ditolak 409 |
| RR-8.2 | Penyiagaan berulang belum diatur | Boleh, tanda menampilkan yang terakhir |
| RR-8.3 | Daftar Notifikasi web belum ada di iterasi sebelumnya, padahal langkah 1 berangkat dari sana | Halaman `/notifications` dibuat di iterasi ini |
| RR-8.4 | Tabel 4.16 belum menguji urutan penyiagaan sebelum verifikasi ("tanpa menunggu verifikasi") | Ditambah UJ-09.05 |
| RR-8.5 | FR-24 masih [SEPAKATI] dengan Khoirul | Tidak memengaruhi API Android (Operator memakai web); tetap dicatat |

Hasil: **lolos**.

## 2. Preliminary Design Review (2026-11-25)

Robustness diagram: `iconix/uc09-robustness.png` (tanpa perubahan).

| Langkah / alternate | Objek robustness | Cocok? |
|---|---|---|
| 1 | Boundary Daftar Notifikasi (web); "Buka Detail Laporan dari Notifikasi" ↔ Notification | Ya |
| 2b | "Periksa Laporan berada di wilayah Polsek", "Tolak: tidak diizinkan" | Ya |
| 2a | "Periksa Laporan belum ditolak", "Tampilkan 'Laporan sudah ditolak', nonaktifkan tombol" | Ya |
| 3 | "Catat kegiatan 'Personel Polsek disiagakan' tanpa ubah status" ↔ StatusHistory | Ya |
| 4 | "Tampilkan tanda", "Siarkan tanda siaga ke Dasbor Admin" → boundary Dasbor Laporan | Ya |

Hasil: **lolos**.

## 3. Critical Design Review (2026-11-25)

| Pemeriksaan | Hasil |
|---|---|
| Langkah ↔ pesan sequence | Cocok |
| Pesan ↔ operasi class | `StandbyService.standby`, `StatusHistory.record`, `DashboardStream.broadcast` |
| Skenario ↔ kontrak | 201, 403, 404, 409, 422 |
| Requirement ↔ uji | FR-001–FR-005 punya kasus uji |

Temuan analyze:
- **A-8.1 (rendah)**: Sequence menyiarkan peristiwa `sector-standby`; dasbor sudah memuat ulang data pada `incident-updated`, jadi dipakai peristiwa yang sama agar tidak menambah jenis peristiwa. Nama pesan di sequence dicatat.
- **A-8.2 (rendah)**: Sequence memakai `findById` lalu memeriksa; diwujudkan dengan `lockByReport` agar pemeriksaan "belum ditolak" dan pencatatan tidak bertabrakan dengan penolakan bersamaan.

Hasil: **lolos**.
