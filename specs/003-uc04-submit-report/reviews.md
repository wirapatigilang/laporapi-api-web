# Catatan Tinjauan Iterasi 3: UC-04 Mengirim Laporan Karhutla

## 1. Requirements Review (2026-11-24)

Diperiksa: teks UC-04 v4, FR-05–FR-14, NFR-05/06, aturan bisnis 1, 5, 6, 10–12, Tabel 3.6, storyboard Layar Isi Laporan.

| No | Temuan | Tindakan |
|---|---|---|
| RR-3.1 | Perbandingan "tepat 50 m" tidak terukur: jarak Haversine berupa bilangan pecahan sehingga titik uji 50 m bisa terhitung 50,0000000001 m dan EXIF menyimpan koordinat dengan ketelitian terbatas | Ditetapkan: jarak dibulatkan ke milimeter sebelum dibandingkan (Clarifications); kasus uji BVA memakai EXIF ketelitian tinggi |
| RR-3.2 | Bentuk tanggapan 6b dan 7a, kode status kirim ulang (3b), dan nama kolom multipart belum ada | Ditetapkan di Clarifications, ditandai [SEPAKATI] |
| RR-3.3 | Format nomor laporan masih `FR-xxxx` di use case, sedangkan daftar requirement mengusulkan `LA-xxxx` | Dipakai `LA-0001` (keputusan kerja) [SEPAKATI] |
| RR-3.4 | Batas ukuran dan tipe foto tidak disebut | JPEG/PNG/WebP/HEIC, maks. 10 MB, diperiksa dari isi berkas |
| RR-3.5 | Cara memeriksa "Notifikasi terkirim" secara Black Box belum ada karena push belum disepakati | Notifikasi disimpan + `GET /api/notifications`; push dan SSE menyusul |
| RR-3.6 | Riwayat Status laporan ganda tidak diatur | Satu entri `STATUS` mengikuti laporan utama dengan catatan penggabungan |
| RR-3.7 | Dua laporan berdekatan yang masuk bersamaan bisa membuat dua Kejadian | Pemeriksaan dan penyimpanan dikunci (diatur di plan) |
| RR-3.8 | Bab 4 Tabel 4.11 memuat 23 kasus uji; belum ada uji keterangan kosong, foto > 10 MB, `reportedAt` salah format, dan koordinat di luar rentang | Ditambah UJ-04.24–UJ-04.27 |

Hasil: **lolos**.

## 2. Preliminary Design Review (2026-11-24)

Robustness diagram: `iconix/uc04-robustness.png` (diperbarui; draf lama di `skripsi/iconix/02-robustness/arsip/`).

| Langkah / alternate | Objek | Cocok? |
|---|---|---|
| Prasyarat (sudah masuk) | — | **Tidak** → ditambah control "Periksa token dan peran Warga (401/403)" |
| 3, 3b | Terima data; Periksa clientId ↔ Report | Ya |
| 4, 4a, 4c | Periksa foto dan keterangan; Tolak foto/keterangan | Ya |
| 5, 5a–5d | Baca EXIF; Tentukan lokasi; Hitung jarak; Tolak lokasi | Ya |
| 6, 6b | Cari kecamatan dan Polsek ↔ District, PoliceSector; Tolak di luar Sekadau | Ya |
| 6a | — | **Tidak** → ditambah control "Tandai 'Polsek belum ditentukan'" |
| 7, 7a, 3a | Cari Kejadian terbuka ≤ 50 m ↔ Incident | Ya |
| 8 | Buat nomor laporan; Simpan Laporan, Kejadian, Riwayat Status | Ya |
| 9 | Kirim Notifikasi ↔ Notification, Layanan Push, Dasbor | Ya (push dan dasbor menyusul) |
| 10 | Kembalikan nomor laporan dan status | Ya |

Perubahan domain model: tidak ada objek baru. Atribut baru: `District.code` (kode wilayah Kemendagri, untuk memuat data batas), `Report.photoPath` sudah ada. Batas Kecamatan disimpan sebagai GeoJSON (kolom `jsonb`).

Hasil: **lolos** setelah dua control ditambahkan dan diagram dirender ulang.

## 3. Critical Design Review (2026-11-24)

`/speckit.analyze` (mengikuti `templates/commands/analyze.md`):

| Pemeriksaan | Hasil |
|---|---|
| Langkah 1–10 dan semua alternate ↔ pesan sequence | Draf belum memuat pemeriksaan token, 6a, kunci transaksi, dan Riwayat Status laporan ganda → sequence diagram diperbarui (draf lama di arsip) |
| Pesan sequence ↔ operasi class | Cocok setelah penambahan `requireRole`, `notifyNewReport`, `findByClientId(reporterId, clientId)` |
| Atribut class ↔ data-model | Ditambah `District.code`, `Report.latitude/longitude` (wujud `location()`) |
| Skenario ↔ kontrak | Semua skenario punya kode status dan bentuk tanggapan; 7a memakai 201 + `isDuplicate` |
| Requirement ↔ tugas/uji | FR-001–FR-012 masing-masing punya tugas dan kasus uji |
| Konsistensi istilah | `mergedInto` (draf sequence) diganti `primaryReportNumber` agar sama dengan istilah "laporan utama" di glosarium |

Temuan analyze:
- **A-3.1 (sedang)**: FR-009 (Notifikasi) bergantung pada kesepakatan push dengan Android. Diputuskan simpan di basis data dulu; tidak menghalangi uji UC-04.
- **A-3.2 (rendah)**: Polsek per Kecamatan masih data awal hasil asumsi (satu Polsek per Kecamatan); perlu konfirmasi Polres, tidak mengubah kode.

Hasil: **lolos**, `implement` boleh dijalankan.
