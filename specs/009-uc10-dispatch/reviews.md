# Catatan Tinjauan Iterasi 9: UC-10 Meneruskan Laporan ke Instansi

## 1. Requirements Review (2026-11-25)

Diperiksa: teks UC-10 v5, FR-25, FR-26, FR-29, ASUMSI-17, ASUMSI-18, storyboard Dialog Teruskan ke Instansi, Bab 4 catatan "Penanda 60 menit".

| No | Temuan | Tindakan |
|---|---|---|
| RR-9.1 | Batas 60 menit bertentangan antara Tabel 3.5 ("tepat 60 menit") dan robustness ("> 60 menit") | ≥ 60 menit (sesuai UJ-10.05/06); keputusan kerja, konfirmasi Gilang |
| RR-9.2 | FR-26 menghitung "belum ada instansi yang mengonfirmasi", sedangkan rancangan awal menghitung per Penerusan | Mengikuti FR-26 (tingkat Kejadian) |
| RR-9.3 | Tidak jelas perilaku bila semua Instansi terpilih sudah diteruskan | 409 tanpa perubahan |
| RR-9.4 | Cakupan Petugas Instansi (UC-06, UC-11) bergantung pada Penerusan | Diaktifkan di iterasi ini; ditambah UJ-10.09 |
| RR-9.5 | Instansi penerima untuk Warga (FR-16) belum ditentukan | `handlingAgencies` di Detail Laporan Warga; UJ-05.04 diuji ulang |

Hasil: **lolos**.

## 2. Preliminary Design Review (2026-11-25)

Robustness diagram: `iconix/uc10-robustness.png` (tanpa perubahan).

| Langkah / alternate | Objek robustness | Cocok? |
|---|---|---|
| 1–2 | Dialog Teruskan ke Instansi; "Ambil daftar Instansi" ↔ Agency | Ya |
| 3, 3a | "Periksa minimal satu Instansi dipilih", "Minta minimal satu Instansi dipilih" | Ya |
| 3b | "Lewati Instansi yang sudah pernah diteruskan" ↔ Dispatch | Ya |
| 4 | "Periksa status …", "Simpan Penerusan", "Ubah status … Petugas Ditugaskan", "Catat Riwayat Status (status atau kegiatan)" | Ya |
| 5 | "Kirim Notifikasi ke Petugas Instansi terpilih dan Warga" ↔ User, Notification | Ya |
| 6 | "Tampilkan Instansi penerima 'menunggu konfirmasi'" | Ya |
| 6a | "Hitung tanda 'belum direspons' (> 60 menit)" | Ya; ambang diubah menjadi ≥ 60 menit (RR-9.1), label control perlu diperbarui |
| Kapan saja | — | **Kurang**: pemeriksaan peran Admin tidak tergambar (ada di sequence). Dicatat |

Hasil: **lolos** dengan dua catatan diagram.

## 3. Critical Design Review (2026-11-25)

| Pemeriksaan | Hasil |
|---|---|
| Langkah ↔ pesan sequence | Cocok, termasuk cabang 403, 422, 409, VERIFIED vs ASSIGNED/IN_PROGRESS |
| Pesan ↔ operasi class | `Agency.list`, `DispatchService.dispatch`, `Dispatch.save`, `Incident.applyStatus`, `StatusHistory.record`, `NotificationService.send` |
| Skenario ↔ kontrak | 201, 403, 404, 409, 422 |
| Requirement ↔ uji | FR-001–FR-008 punya kasus uji |

Temuan analyze:
- **A-9.1 (sedang)**: Sequence `changeStatus(ASSIGNED)` pada Report tanpa kunci; dua Admin yang meneruskan bersamaan bisa membuat dua entri Petugas Ditugaskan. Dipakai `lockByReport` seperti UC-07.
- **A-9.2 (rendah)**: Sequence menyimpan Penerusan per Laporan; diwujudkan pada laporan utama agar laporan ganda tidak menggandakan Penerusan.
- **A-9.3 (rendah)**: Sequence tidak memuat kasus "semua Instansi sudah diteruskan" (RR-9.3). Ditambah 409.
- **A-9.4 (rendah)**: Saat uji pertama, skrip menekan tombol sebelum halaman selesai aktif (hidrasi), sehingga dialog tidak terbuka. Skrip uji menunggu peta siap lebih dulu, seperti uji UC-07.

Hasil: **lolos**.
