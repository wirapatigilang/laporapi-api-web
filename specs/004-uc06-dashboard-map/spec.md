# Feature Specification: UC-06 Melihat Daftar dan Peta Laporan

**Feature Branch**: `004-uc06-dashboard-map`

**Created**: 2026-11-25

**Status**: Lolos Requirements Review, Preliminary Design Review, dan Critical Design Review (2026-11-25)

**Input**: Teks UC-06 dari `use-case-sementara.md` versi 5, FR-17–FR-20, NFR-01, NFR-03, NFR-10, aturan bisnis AB-04, AB-17, AB-18, domain model (Kejadian, Laporan, Riwayat Status, Pengguna, Titik Panas).

**Use case ICONIX**: UC-06 · **Aktor utama**: Admin Polres, Operator Polsek · **Lapis**: web (Dasbor Laporan, Halaman Detail Laporan) dan API

## Teks use case (sumber)

**Prasyarat:** Pengguna sudah masuk ke aplikasi web. **Hasil akhir:** Pengguna melihat Laporan yang menjadi kewenangannya dalam bentuk daftar dan peta.

Basic course:
1. Admin Polres membuka Dasbor Laporan.
2. Sistem menampilkan daftar Kejadian beserta laporan utamanya (nomor laporan, waktu, kecamatan, status, jumlah laporan ganda) dan menampilkan titik setiap Kejadian pada peta Kabupaten Sekadau, dengan warna penanda sesuai status.
3. Admin Polres menyaring berdasarkan status, kecamatan/Polsek, atau rentang tanggal. Sistem memperbarui daftar dan peta.
4. Admin Polres memilih satu Laporan dari daftar atau dari peta. Sistem membuka Halaman Detail Laporan berisi foto, koordinat, akurasi GPS, koordinat foto (EXIF) beserta tanda selisih lokasi bila ada, waktu lapor, keterangan, identitas Warga, daftar laporan ganda, dan Riwayat Status, serta jumlah titik panas NASA FIRMS di sekitar lokasi dan jarak titik panas terdekat sebagai petunjuk. Bila layanan FIRMS tidak dapat dihubungi, halaman tetap tampil dengan keterangan data titik panas tidak tersedia.

Alternate course:
- **1a.** Operator Polsek membuka Dasbor Laporan: hanya Laporan dengan Polsek wilayah milik Operator tersebut.
- **2a.** Ada Laporan baru masuk saat dasbor terbuka: ditambahkan ke atas daftar dan peta dengan penanda "baru" tanpa memuat ulang halaman.
- **2b.** Tidak ada Laporan sesuai saringan: "Tidak ada laporan".
- **4a.** Operator Polsek membuka Detail Laporan: nomor HP Warga ditampilkan lengkap.

## Clarifications

### Session 2026-11-25

- Q: Titik panas dicari dalam radius dan rentang waktu berapa (FR-20 masih [SESUAIKAN])? → A: Kotak pencarian 5 km di sekeliling lokasi Laporan, lalu hanya titik yang jaraknya ≤ 5 km (Haversine) yang dihitung. Rentang waktu: `day_range=2` pada API FIRMS (hari ini dan kemarin, UTC), dari sumber MODIS_NRT, VIIRS_SNPP_NRT, dan VIIRS_NOAA20_NRT. *(keputusan kerja, perlu dikonfirmasi Gilang)*
- Q: Kapan data titik panas dianggap "tidak tersedia"? → A: Bila kunci FIRMS tidak diatur, layanan tidak menjawab dalam 5 detik, atau salah satu sumber menjawab galat. Detail tetap 200 dengan `hotspots.available = false` dan keterangan "Data titik panas tidak tersedia".
- Q: Rentang tanggal disaring menurut waktu apa? → A: Waktu lapor laporan utama, dibaca dalam zona WIB (tanggal awal 00.00 sampai tanggal akhir 23.59 WIB).
- Q: Apakah Petugas Instansi memakai dasbor yang sama? → A: Ya (UC-02 langkah 5), tetapi hanya Laporan yang diteruskan ke Instansinya. Penerusan baru ada di UC-10, jadi sampai iterasi 9 daftar Petugas Instansi kosong; cakupannya diuji di UC-11 (UJ-11.10).
- Q: Siapa yang boleh melihat nomor HP Warga? → A: Admin Polres dan Operator Polsek (NFR-03, AB-17). Petugas Instansi hanya melihat nama Warga.
- Q: Bagaimana foto ditampilkan bila token disimpan di cookie server? → A: Foto diambil lewat `GET /api/reports/:id/photo` dengan hak akses yang sama dengan detail; aplikasi web meneruskannya lewat servernya sendiri.
- Q: Bagaimana siaran Laporan baru dikirim? → A: *Server-Sent Events* `GET /api/stream`, dengan cakupan sama seperti daftar (Operator hanya menerima Laporan wilayahnya). Aplikasi web meneruskan aliran ini lewat servernya agar token tetap di cookie `httpOnly`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin melihat semua Kejadian di daftar dan peta (Priority: P1)

**Independent Test**: Masuk sebagai Admin, buka Dasbor Laporan, cocokkan baris daftar dan penanda peta dengan Kejadian di basis data uji.

**Acceptance Scenarios**:
1. **Given** ada beberapa Kejadian berbagai status, satu di antaranya punya laporan ganda, **When** Admin membuka Dasbor Laporan, **Then** setiap Kejadian tampil sebagai satu baris (nomor laporan utama, waktu, kecamatan, status, jumlah laporan ganda) dan satu penanda peta berwarna sesuai status.
2. **Given** dasbor terbuka, **When** Admin memilih saringan status, kecamatan atau Polsek, dan rentang tanggal, **Then** daftar dan peta hanya memuat Kejadian yang sesuai.
3. **Given** saringan tidak cocok dengan Kejadian mana pun, **When** saringan diterapkan, **Then** tampil "Tidak ada laporan".

### User Story 2 - Operator Polsek hanya melihat wilayahnya (Priority: P1) — 1a, 4a

**Acceptance Scenarios**:
1. **Given** ada Laporan di wilayah Polsek Sekadau Hilir dan di wilayah lain, **When** Operator Polsek Sekadau Hilir membuka dasbor (atau `GET /api/incidents`), **Then** hanya Laporan wilayahnya yang tampil.
2. **Given** Laporan di wilayahnya, **When** Operator membuka detail, **Then** nomor HP Warga tampil utuh.
3. **Given** Laporan di luar wilayahnya, **When** Operator meminta `GET /api/reports/:id`, **Then** 403.

### User Story 3 - Laporan baru muncul tanpa memuat ulang (Priority: P2) — 2a

**Acceptance Scenarios**:
1. **Given** Admin membuka dasbor, **When** Warga mengirim Laporan baru, **Then** Laporan muncul di atas daftar dan di peta dengan penanda "baru" tanpa memuat ulang halaman.

### User Story 4 - Detail Laporan dan petunjuk titik panas (Priority: P1) — langkah 4

**Acceptance Scenarios**:
1. **Given** Laporan bertanda selisih lokasi foto dan punya laporan ganda, **When** Admin membuka detail, **Then** tampil foto, koordinat, akurasi GPS, koordinat EXIF dengan tanda selisih dan jaraknya, waktu lapor, keterangan, nama dan nomor HP Warga, daftar laporan ganda, dan Riwayat Status.
2. **Given** layanan FIRMS (tiruan) mengembalikan satu titik panas 800 m dari Laporan, **When** detail dibuka, **Then** tampil jumlah titik panas 1 dan jarak terdekat sekitar 800 m sebagai petunjuk.
3. **Given** layanan FIRMS tidak dapat dihubungi, **When** detail dibuka, **Then** detail tetap tampil dengan keterangan "Data titik panas tidak tersedia".

### Edge Cases
- Laporan tanpa koordinat foto menampilkan "Koordinat foto tidak tersedia".
- Kejadian yang tiketnya ditutup (ditolak/selesai) tetap tampil dan dapat disaring menurut status.
- Titik panas di luar radius 5 km tidak dihitung walaupun berada di dalam kotak pencarian.
- Laporan "Polsek belum ditentukan" hanya tampil untuk Admin Polres.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001** (FR-17): `GET /api/incidents` MUST mengembalikan Kejadian beserta laporan utama, status, koordinat, dan jumlah laporan ganda, dengan saringan `status`, `districtId`, `policeSectorId`, `from`, `to`.
- **FR-002** (FR-17, NFR-01): Cakupan data MUST mengikuti peran: Admin Polres semua, Operator Polsek hanya Polsek-nya, Petugas Instansi hanya Laporan yang diteruskan ke Instansinya, Warga ditolak 403.
- **FR-003** (FR-18): Sistem MUST menyiarkan Laporan baru lewat `GET /api/stream` (SSE) kepada pengguna yang cakupannya memuat Laporan tersebut, dan dasbor MUST menambahkannya dengan penanda "baru".
- **FR-004** (FR-19): `GET /api/reports/:id` MUST mengembalikan detail lengkap langkah 4 untuk pengguna yang berhak, dan 403 untuk yang tidak.
- **FR-005** (NFR-03): Nomor HP Warga MUST hanya disertakan untuk Admin Polres dan Operator Polsek.
- **FR-006** (FR-20, AB-04): Detail MUST memuat jumlah titik panas dalam radius 5 km dan jarak terdekat, tanpa mengubah status.
- **FR-007** (NFR-10): Kegagalan layanan FIRMS MUST tidak menggagalkan detail; detail memuat keterangan "Data titik panas tidak tersedia".
- **FR-008**: Dasbor MUST menampilkan peta Leaflet dengan peta dasar citra satelit (Esri World Imagery, dengan label wilayah; pilihan Jalan memakai OpenStreetMap) dan warna penanda per status, serta "Tidak ada laporan" bila daftar kosong.

### Key Entities
- **Incident**, **Report**, **StatusHistory**, **User**: sudah ada sejak iterasi 3.
- **Hotspot (Titik Panas)**: data luar FIRMS, tidak disimpan: koordinat, waktu deteksi, satelit, tingkat kepercayaan.

## Success Criteria *(mandatory)*
- **SC-001**: Kasus uji UJ-06.01–UJ-06.10 lulus.
- **SC-002**: Uji UC-01, UC-02, dan UC-04 tetap lulus (regresi).

## Assumptions
- Kunci FIRMS (`FIRMS_MAP_KEY`) diatur di lingkungan produksi; pengujian memakai layanan FIRMS tiruan.
- Peta dasar citra satelit Esri World Imagery (dan OpenStreetMap untuk pilihan Jalan) dimuat dari peladen ubin oleh peramban pengguna.

## Amandemen 2026-11-25 (masukan dosen pembimbing)

- Peta dasar diganti dari OpenStreetMap biasa menjadi **citra satelit** agar tutupan lahan (hutan, sawah, kebun, permukiman) terlihat di sekitar titik laporan. Label nama tempat dan batas wilayah ditumpuk di atas citra. Kontrol lapisan di pojok kanan atas memungkinkan beralih ke tampilan Jalan (OpenStreetMap). Berlaku untuk peta Dasbor dan peta Detail Laporan karena keduanya memakai komponen peta yang sama.
