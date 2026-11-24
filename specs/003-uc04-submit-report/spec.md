# Feature Specification: UC-04 Mengirim Laporan Karhutla

**Feature Branch**: `003-uc04-submit-report`

**Created**: 2026-11-24

**Status**: Lolos Requirements Review dan Preliminary Design Review (2026-11-24)

**Input**: Teks UC-04 (use case v4), FR-05 – FR-14, NFR-01, NFR-05, NFR-06, aturan bisnis 1, 5, 6, 10, 11, 12, domain model (Report, Incident, StatusHistory, District, PoliceSector, Notification), Tabel 3.6 (tabel keputusan laporan ganda).

**Use case ICONIX**: UC-04 · **Aktor utama**: Pelapor · **Aktor pendukung**: Admin Polres, Operator Polsek (penerima Notifikasi) · **Lapis**: API (dipanggil Layar Isi Laporan aplikasi Android)

## Teks use case (sumber, versi 4)

**Prasyarat:** Pelapor sudah masuk (UC-02). GPS dan kamera ponsel aktif.
**Hasil akhir:** Laporan tersimpan dengan status Laporan Diterima, Polsek wilayah yang sesuai, dan hasil pembandingan koordinat foto, atau dikaitkan ke Kejadian yang sudah ada, dan Notifikasi terkirim.

Basic course:
1. Pelapor menekan tombol LAPOR pada Layar Home, mengambil foto titik api, lalu masuk ke Layar Isi Laporan.
2. Aplikasi Android mengisi koordinat GPS perangkat, akurasi GPS, dan waktu lapor secara otomatis. Pelapor boleh menulis keterangan (maksimal 300 karakter). Tidak ada pilihan kategori laporan.
3. Pelapor menekan tombol Kirim. Aplikasi Android mengirim berkas foto asli beserta metadata EXIF-nya, data Laporan, dan nomor unik perangkat (`clientId`) ke API.
4. Sistem memeriksa bahwa foto ada dan bertipe gambar, dan keterangan tidak lebih dari 300 karakter.
5. Sistem membaca tag GPS EXIF dari foto, mengubahnya ke derajat desimal, lalu menghitung jarak antara koordinat foto dan koordinat GPS perangkat dengan formula Haversine. Jaraknya tidak lebih dari 50 meter, sehingga Sistem menyimpan koordinat foto dan jaraknya tanpa tanda selisih lokasi. Koordinat GPS perangkat tetap menjadi lokasi Laporan.
6. Sistem mencari Kecamatan yang batas wilayahnya memuat koordinat Laporan. Kecamatan ditemukan, sehingga lokasi berada di Kabupaten Sekadau, dan Polsek wilayah diambil dari Kecamatan tersebut.
7. Sistem memeriksa laporan ganda: mencari Kejadian dengan tiket terbuka yang laporan utamanya berjarak paling jauh 50 meter dari koordinat Laporan baru. Tidak ditemukan.
8. Sistem menyimpan Laporan dengan nomor laporan baru dan status Laporan Diterima, membuat Kejadian baru dengan Laporan ini sebagai laporan utama, dan mencatat Riwayat Status pertama.
9. Sistem mengirim Notifikasi secara bersamaan kepada semua Admin Polres dan Operator Polsek wilayah tersebut.
10. Sistem mengembalikan nomor laporan dan status ke aplikasi Android, yang menampilkan pesan "Laporan #… terkirim, sedang diverifikasi".

Alternate course: 3a (laporan berulang digabung lewat aturan 50 m), 3b (kirim ulang dengan `clientId` yang sama), 4a (foto tidak ada/bukan gambar), 4c (keterangan > 300), 5a (tanpa tag GPS EXIF), 5b (selisih > 50 m), 5c (tag EXIF tidak valid), 5d (GPS perangkat tidak dikirim), 6a (Kecamatan tanpa Polsek), 6b (di luar Kabupaten Sekadau), 7a (Kejadian terbuka ≤ 50 m). Teks lengkap ada di `use-case-sementara.md` versi 4.

## Clarifications

### Session 2026-11-24

- Q: Format nomor laporan? → A: `LA-` diikuti nomor urut minimal 4 digit (`LA-0001`), sesuai usulan daftar requirement agar tidak tertukar dengan kode FR. *(keputusan kerja)* [SEPAKATI dengan Android]
- Q: Bagaimana jarak tepat 50 m dibandingkan, mengingat galat pembulatan bilangan pecahan? → A: Jarak Haversine (R = 6.371.000 m) dibulatkan ke milimeter (0,001 m) lalu dibandingkan: ≤ 50,000 m dianggap "paling jauh 50 m". Jarak yang ditampilkan dibulatkan ke 0,1 m. Ini menafsirkan NFR-06 ("dibandingkan sebelum dibulatkan untuk ditampilkan") secara terukur.
- Q: Kode status dan isi tanggapan? → A: 201 Laporan baru; 201 laporan ganda dengan `isDuplicate: true`, `primaryReportNumber`, dan pesan "Laporan Anda tergabung dengan laporan lain di lokasi yang sama"; 200 untuk kirim ulang `clientId` yang sama (mengembalikan Laporan lama); 422 untuk 4a, 4c, 5d, 6b; 401/403 untuk token. [SEPAKATI]
- Q: Tanggapan 6b? → A: 422 dengan `error.code = OUTSIDE_SERVICE_AREA`, pesan "Lokasi di luar wilayah layanan Polres Sekadau, silakan hubungi 110", dan `error.emergencyNumber = "110"`.
- Q: Bentuk kiriman? → A: `multipart/form-data`: `photo` (berkas), `deviceLat`, `deviceLng`, `gpsAccuracy` (meter), `reportedAt` (ISO 8601), `description`, `clientId`. [SEPAKATI]
- Q: Tipe gambar yang diterima dan ukuran maksimal? → A: JPEG, PNG, WebP, HEIC, diperiksa dari isi berkas (bukan hanya nama/MIME); maksimal 10 MB. Berkas lebih besar ditolak 422 "Ukuran foto maksimal 10 MB".
- Q: `reportedAt` tidak dikirim atau tidak valid? → A: Bila tidak dikirim, dipakai waktu diterima server; bila formatnya salah, 422. Waktu lapor asli dipertahankan untuk kiriman ulang dari draf (3b).
- Q: `clientId` unik untuk siapa? → A: Unik per Pelapor (pasangan Pelapor + `clientId`). `clientId` boleh kosong (tanpa perlindungan kirim ulang).
- Q: Koordinat perangkat setengah (hanya lintang) atau di luar rentang? → A: 422 pada kolom terkait; koordinat perangkat harus lengkap atau tidak dikirim sama sekali.
- Q: Notifikasi push ke Android/web? → A: Iterasi ini menyimpan Notifikasi di basis data dan menyediakan `GET /api/notifications` untuk pengguna yang masuk. Pengiriman push (FCM) dan siaran ke dasbor (SSE) menyusul (UC-06 dan kesepakatan dengan Android). [SEPAKATI]
- Q: Riwayat Status laporan ganda? → A: Laporan ganda mendapat satu Riwayat Status jenis `STATUS` dengan status laporan utama dan catatan "Tergabung dengan laporan LA-xxxx".
- Q: Dua laporan dalam radius 50 m dikirim hampir bersamaan? → A: Pemeriksaan laporan ganda dan penyimpanan dijalankan berurutan (dikunci) sehingga hanya satu Kejadian yang dibuat.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pelapor mengirim laporan baru (Priority: P1) 🎯

**Independent Test**: Pelapor yang sudah masuk mengirim foto ber-EXIF dengan koordinat di Kabupaten Sekadau; periksa 201, status `RECEIVED`, Kejadian baru, Riwayat Status pertama, dan Notifikasi Admin Polres dan Operator Polsek wilayah.

**Acceptance Scenarios**:
1. **Given** Pelapor sudah masuk, koordinat perangkat di Kecamatan Sekadau Hilir, EXIF 20 m dari koordinat perangkat, tidak ada Kejadian terbuka di sekitar, **When** mengirim laporan, **Then** 201 dengan nomor laporan `LA-…`, status `RECEIVED`, Polsek Sekadau Hilir, Kejadian baru dengan laporan ini sebagai laporan utama, satu Riwayat Status `RECEIVED`, dan Notifikasi tersimpan untuk semua Admin Polres dan Operator Polsek Sekadau Hilir (tidak untuk Operator Polsek lain).
2. **Given** keterangan tepat 300 karakter, **When** mengirim, **Then** 201.
3. **Given** keterangan kosong, **When** mengirim, **Then** 201 (keterangan opsional).

### User Story 2 - Validasi foto dan keterangan (P1) — 4a, 4c
1. **Given** tanpa foto, **Then** 422 "Foto wajib dilampirkan", tidak ada Laporan tersimpan.
2. **Given** berkas bukan gambar (teks yang dinamai `.jpg`), **Then** 422, tidak tersimpan.
3. **Given** keterangan 301 karakter, **Then** 422 dengan pesan batas karakter.

### User Story 3 - Koordinat foto (P1) — langkah 5, 5a, 5b, 5c
1. **Given** EXIF 49 m dari GPS perangkat, **Then** 201, koordinat foto tersimpan, tanpa tanda selisih.
2. **Given** EXIF tepat 50 m, **Then** 201 tanpa tanda selisih.
3. **Given** EXIF 51 m, **Then** 201 dengan tanda selisih lokasi dan jaraknya (≈ 51 m); lokasi Laporan tetap GPS perangkat.
4. **Given** foto tanpa tag GPS EXIF, **Then** 201 dengan keterangan "Koordinat foto tidak tersedia".
5. **Given** EXIF bernilai 0,0, **Then** diperlakukan seperti skenario 4.

### User Story 4 - GPS perangkat tidak dikirim (P2) — 5d
1. **Given** tanpa koordinat perangkat, EXIF di Sekadau, **Then** 201, lokasi dari EXIF, sumber lokasi `PHOTO`.
2. **Given** tanpa koordinat perangkat dan tanpa EXIF, **Then** 422 "Lokasi tidak terdeteksi, aktifkan GPS lalu kirim ulang".

### User Story 5 - Wilayah dan Polsek (P1) — langkah 6, 6a, 6b
1. **Given** koordinat di luar Kabupaten Sekadau (Pontianak), **Then** 422 `OUTSIDE_SERVICE_AREA` dengan pesan arahan dan nomor 110, tidak tersimpan.
2. **Given** Kecamatan belum terpetakan ke Polsek, **Then** 201 dengan tanda "Polsek belum ditentukan", Notifikasi hanya ke Admin Polres.

### User Story 6 - Laporan ganda (P1) — langkah 7, 7a, 3a (tabel keputusan)

| Aturan | Jarak ke laporan utama | Tiket Kejadian | Hasil |
|---|---|---|---|
| R1 | ≤ 50 m | terbuka | Laporan ganda, tanpa Kejadian dan Notifikasi baru |
| R2 | ≤ 50 m | tertutup | Kejadian baru |
| R3 | > 50 m | terbuka | Kejadian baru |
| R4 | > 50 m | tertutup | Kejadian baru |

1. **Given** Kejadian terbuka, laporan baru tepat 50 m dari laporan utama (R1), **Then** 201 `isDuplicate: true`, `primaryReportNumber`, status mengikuti laporan utama, tidak ada Notifikasi baru ke petugas.
2. **Given** 30 m, tiket tertutup (R2), **Then** 201, Kejadian baru.
3. **Given** 51 m, tiket terbuka (R3), **Then** 201, Kejadian baru.
4. **Given** 51 m, tiket tertutup (R4), **Then** 201, Kejadian baru.
5. **Given** 49 m, tiket terbuka, **Then** laporan ganda.
6. **Given** Pelapor yang sama mengirim lagi 20 m dari laporan pertamanya (3a), **Then** diterima sebagai laporan ganda, tidak ditolak.
7. **Given** Kejadian terbuka sudah berumur 3 hari, laporan baru 20 m, **Then** tetap laporan ganda (umur tiket tidak membatasi).

### User Story 7 - Kirim ulang dari draf (P2) — 3b
1. **Given** Laporan dengan `clientId` X sudah diterima, **When** Pelapor yang sama mengirim lagi dengan `clientId` X, **Then** 200 berisi Laporan yang sama, jumlah Laporan tidak bertambah.

### User Story 8 - Hak akses (P1) — prasyarat
1. **Given** tanpa token, **Then** 401.
2. **Given** token Admin Polres, **Then** 403.

### Edge Cases
- Foto lebih dari 10 MB → 422.
- `reportedAt` salah format → 422; tidak dikirim → waktu server.
- Koordinat perangkat setengah atau di luar rentang (lintang > 90) → 422.
- Dua Kejadian terbuka dalam 50 m → dikaitkan ke yang laporan utamanya paling dekat.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001** (FR-05): Sistem MUST menerima Laporan berisi foto, koordinat perangkat, akurasi GPS, waktu lapor, keterangan opsional ≤ 300 karakter, dan `clientId`, tanpa kategori.
- **FR-002** (FR-06): Sistem MUST menolak tanpa foto, bukan gambar, foto > 10 MB, atau keterangan > 300 karakter dengan 422.
- **FR-003** (FR-08): Sistem MUST membaca koordinat GPS EXIF, menghitung jarak Haversine ke koordinat perangkat, dan menandai selisih lokasi bila jarak > 50 m; foto tanpa EXIF atau EXIF tidak valid tetap diterima.
- **FR-004** (FR-09): Sistem MUST memakai koordinat EXIF bila koordinat perangkat tidak dikirim (`locationSource = PHOTO`) dan menolak bila keduanya tidak ada.
- **FR-005** (FR-07, FR-10): Sistem MUST menentukan Kecamatan dengan uji titik di dalam poligon; di luar semua Kecamatan → 422 dengan nomor 110 dan tidak disimpan; Polsek dari Kecamatan, atau tanda "Polsek belum ditentukan".
- **FR-006** (FR-11): Sistem MUST mengaitkan Laporan ke Kejadian terbuka terdekat yang laporan utamanya ≤ 50 m, tanpa melihat umur tiket atau pengirim, tanpa Notifikasi baru, dengan status mengikuti laporan utama.
- **FR-007** (FR-12): Selain itu Sistem MUST menyimpan Laporan berstatus `RECEIVED` dengan nomor unik, membuat Kejadian baru, dan mencatat Riwayat Status pertama.
- **FR-008** (FR-13): Sistem MUST mengembalikan Laporan lama (200) untuk `clientId` yang sama dari Pelapor yang sama.
- **FR-009** (FR-14): Sistem MUST membuat Notifikasi untuk semua Admin Polres aktif dan Operator Polsek wilayah untuk Laporan baru (bukan laporan ganda); hanya Admin Polres bila Polsek belum ditentukan.
- **FR-010** (NFR-01): Hanya peran `REPORTER` yang boleh mengirim Laporan.
- **FR-011** (FR-31): Setiap Riwayat Status mencatat waktu dan pengubah (Pelapor untuk status awal).
- **FR-012**: Sistem MUST menyediakan `GET /api/notifications` berisi Notifikasi milik pengguna yang masuk.

### Key Entities
- **District (Kecamatan)**: nama, kode wilayah, batas wilayah GeoJSON, Polsek (boleh kosong).
- **Report (Laporan)**: nomor laporan, `clientId`, Pelapor, Kejadian, berkas foto, koordinat perangkat, akurasi GPS, koordinat foto, sumber lokasi, jarak dan tanda selisih lokasi, Kecamatan, Polsek, waktu lapor, waktu diterima, keterangan, status saat ini.
- **Incident (Kejadian)**: laporan utama, terbuka/tertutup, waktu dibuka, waktu ditutup.
- **StatusHistory (Riwayat Status)**: Laporan, jenis `STATUS`/`ACTIVITY`, status, pengubah, waktu, catatan.
- **Notification (Notifikasi)**: penerima, Laporan, judul, isi, waktu, sudah dibaca.

## Success Criteria *(mandatory)*
- **SC-001**: Semua kasus uji UJ-04.01 – UJ-04.28 lulus, termasuk titik batas 49/50/51 m.
- **SC-002**: Regresi UC-01 dan UC-02 tetap lulus.

## Assumptions
- Batas kecamatan dari data terbuka (`fityannugroho/idn-area-boundary`, bersumber dari Alf-Anas/batas-administrasi-indonesia); satu Polsek per Kecamatan sebagai data awal yang perlu dikonfirmasi ke Polres Sekadau.
- Foto disimpan di penyimpanan berkas server (`UPLOAD_DIR`), bukan di basis data.
