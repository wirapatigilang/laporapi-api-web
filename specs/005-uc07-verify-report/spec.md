# Feature Specification: UC-07 Memverifikasi Laporan

**Feature Branch**: `005-uc07-verify-report`

**Created**: 2026-11-25

**Status**: Lolos Requirements Review, Preliminary Design Review, dan Critical Design Review (2026-11-25)

**Input**: Teks UC-07 dari `use-case-sementara.md` versi 5, FR-21, FR-22, FR-29, FR-31, NFR-03, NFR-05, aturan bisnis AB-04, domain model (Laporan, Kejadian, Riwayat Status, Notifikasi, Pengguna).

**Use case ICONIX**: UC-07 · **Aktor utama**: Admin Polres · **Lapis**: web (Halaman Detail Laporan) dan API

## Teks use case (sumber)

**Prasyarat:** Admin Polres sudah masuk dan membuka Halaman Detail Laporan dengan status Laporan Diterima (UC-06). **Hasil akhir:** Status Laporan (dan laporan gandanya) menjadi Laporan Diverifikasi dan Warga menerima Notifikasi.

Basic course:
1. Admin Polres memeriksa foto, lokasi pada peta, waktu lapor, dan keterangan di Halaman Detail Laporan. Bila Laporan bertanda selisih lokasi foto, peta menampilkan titik GPS perangkat dan titik koordinat foto beserta jaraknya; bila koordinat foto tidak tersedia, halaman menampilkan keterangan tersebut. Halaman juga menampilkan petunjuk titik panas NASA FIRMS di sekitar lokasi. Tanda selisih lokasi dan titik panas hanya bahan pertimbangan Admin Polres, bukan penentu keputusan, dan tidak mengubah status secara otomatis.
2. Admin Polres menekan tombol Verifikasi.
3. Sistem meminta konfirmasi. Admin Polres menyetujui.
4. Sistem mengubah status Laporan menjadi Laporan Diverifikasi, mencatat Riwayat Status (waktu dan nama Admin Polres), dan menerapkan status yang sama pada laporan ganda di Kejadian tersebut.
5. Sistem mengirim Notifikasi ke Warga (termasuk warga pengirim laporan ganda) dan ke Operator Polsek wilayah.
6. Sistem menampilkan status baru di Halaman Detail Laporan dan mengaktifkan tombol Teruskan ke Instansi (UC-10).

Alternate course:
- **1a.** Bukti belum cukup: Admin menekan Hubungi Warga (nomor HP Warga tampil), atau meminta cek lapangan ke Operator Polsek dengan catatan; catatan tercatat di Riwayat Status tanpa mengubah status dan Operator Polsek menerima Notifikasi.
- **2a.** Laporan tidak valid: UC-08 Menolak Laporan.
- **4a.** Laporan sudah diverifikasi atau ditolak Admin lain lebih dulu: perubahan ditolak, tampil "Laporan sudah diproses oleh [nama] pada [waktu]".

## Clarifications

### Session 2026-11-25

- Q: Verifikasi dikirim dari laporan ganda, bukan laporan utama. Bagaimana? → A: Endpoint menerima ID laporan mana pun dalam Kejadian; status selalu diterapkan pada seluruh Laporan di Kejadian tersebut (laporan utama dan semua laporan ganda), masing-masing dengan satu entri Riwayat Status.
- Q: Bagaimana mencegah dua Admin memverifikasi bersamaan (4a)? → A: Baris Kejadian dikunci (`SELECT … FOR UPDATE`) di dalam transaksi; status diperiksa setelah kunci didapat. Admin kedua menerima 409 `ALREADY_PROCESSED` dengan nama dan waktu perubahan status terakhir.
- Q: Format waktu pada pesan 4a? → A: WIB, misalnya "25 November 2026 10.09 WIB".
- Q: Apakah catatan cek lapangan wajib diisi dan berapa panjangnya? → A: Wajib (tidak boleh kosong atau hanya spasi), paling panjang 500 karakter; bila tidak valid 422 dengan pesan pada `fields.note`.
- Q: Ke laporan mana catatan cek lapangan dicatat? → A: Ke laporan utama Kejadian sebagai entri Riwayat Status jenis kegiatan `FIELD_CHECK_REQUESTED`.
- Q: Bila Laporan berstatus "Polsek belum ditentukan", ke mana Notifikasi cek lapangan? → A: Tidak ada Operator yang menerima; kegiatan tetap tercatat dan pesan hasil menyebut "Polsek belum ditentukan".
- Q: Apakah cek lapangan boleh diminta setelah verifikasi? → A: Tidak. Alternate 1a terjadi sebelum keputusan, jadi hanya untuk status Laporan Diterima (409 bila tidak).
- Q: Notifikasi push? → A: Sama seperti UC-04: Notifikasi disimpan dan dibaca lewat `GET /api/notifications`; pengiriman push mengikuti kesepakatan dengan aplikasi Android.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin memverifikasi Laporan (Priority: P1)

**Independent Test**: Admin membuka detail Laporan Diterima, menekan Verifikasi, menyetujui, lalu memeriksa status, riwayat, notifikasi, dan tombol Teruskan ke Instansi.

**Acceptance Scenarios**:
1. **Given** Laporan berstatus Laporan Diterima, **When** Admin menekan Verifikasi dan menyetujui konfirmasi, **Then** status menjadi Laporan Diverifikasi, Riwayat Status mencatat waktu dan nama Admin, Warga dan Operator Polsek wilayah menerima Notifikasi, dan tombol Teruskan ke Instansi aktif.
2. **Given** Kejadian dengan dua laporan ganda, **When** laporan utama diverifikasi, **Then** kedua laporan ganda ikut berstatus Laporan Diverifikasi dan masing-masing pelapornya menerima Notifikasi.

### User Story 2 - Bahan pertimbangan tidak memutuskan sendiri (Priority: P1) — langkah 1

**Acceptance Scenarios**:
1. **Given** Laporan bertanda selisih lokasi foto, **When** Admin membuka detail, **Then** titik GPS perangkat, titik foto, dan jaraknya tampil, dan tombol Verifikasi tetap aktif.
2. **Given** ada titik panas di sekitar Laporan, **When** Admin membuka detail, **Then** petunjuk tampil dan status tetap Laporan Diterima sampai Admin memutuskan.

### User Story 3 - Bukti belum cukup (Priority: P2) — 1a

**Acceptance Scenarios**:
1. **Given** Laporan Diterima, **When** Admin menekan Hubungi Warga, **Then** nomor HP Warga tampil.
2. **Given** Laporan Diterima, **When** Admin mengirim permintaan cek lapangan dengan catatan, **Then** catatan tercatat sebagai kegiatan, status tetap Laporan Diterima, dan Operator Polsek menerima Notifikasi.
3. **Given** catatan kosong, **When** permintaan dikirim, **Then** 422 dengan pesan "Catatan cek lapangan wajib diisi" dan tidak ada kegiatan tercatat.

### User Story 4 - Perubahan yang ditolak (Priority: P1) — 4a, FR-29

**Acceptance Scenarios**:
1. **Given** Laporan sudah diverifikasi Admin lain, **When** Admin memverifikasi, **Then** 409 "Laporan sudah diproses oleh [nama] pada [waktu]" dan tidak ada entri riwayat baru.
2. **Given** Laporan berstatus Laporan Ditolak, **When** Admin memverifikasi, **Then** 409 dan status tetap.
3. **Given** Operator Polsek masuk, **When** ia memanggil verifikasi atau cek lapangan, **Then** 403 dan status tetap.

### Edge Cases
- ID laporan bukan UUID atau tidak ada: 404.
- Verifikasi dari ID laporan ganda memverifikasi seluruh Kejadian.
- Penerima Notifikasi ganda (Warga yang mengirim dua laporan di satu Kejadian) menerima satu Notifikasi per laporannya.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001** (FR-21): `POST /api/reports/:id/verify` MUST mengubah semua Laporan dalam Kejadian dari Laporan Diterima menjadi Laporan Diverifikasi dalam satu transaksi, hanya untuk Admin Polres.
- **FR-002** (FR-31): Setiap Laporan yang berubah MUST mendapat satu entri Riwayat Status berisi status, waktu, dan Admin pengubah.
- **FR-003** (FR-21): Sistem MUST menyimpan Notifikasi untuk setiap pelapor Laporan dalam Kejadian dan untuk Operator Polsek wilayah.
- **FR-004** (FR-21 4a, FR-29): Bila status Kejadian sudah bukan Laporan Diterima, sistem MUST menjawab 409 "Laporan sudah diproses oleh [nama] pada [waktu WIB]" tanpa perubahan.
- **FR-005** (FR-22): `POST /api/reports/:id/notes` MUST mencatat kegiatan `FIELD_CHECK_REQUESTED` beserta catatan tanpa mengubah status dan menyimpan Notifikasi untuk Operator Polsek wilayah.
- **FR-006** (FR-29, NFR-05): Peran selain Admin Polres MUST mendapat 403; catatan tidak valid 422.
- **FR-007**: Halaman Detail Laporan MUST menampilkan tombol Verifikasi (dengan dialog konfirmasi), Hubungi Warga, dan Minta cek lapangan untuk Admin; Verifikasi dan cek lapangan hanya aktif pada Laporan Diterima; Teruskan ke Instansi aktif sejak Laporan Diverifikasi.
- **FR-008**: Perubahan status MUST disiarkan ke dasbor (`incident-updated`) agar daftar dan peta pengguna lain ikut berubah.

### Key Entities
- **StatusHistory**: atribut baru `activity` (jenis kegiatan) untuk entri `type = ACTIVITY`.
- **Incident**, **Report**, **Notification**, **User**: sudah ada.

## Success Criteria *(mandatory)*
- **SC-001**: UJ-07.01–UJ-07.09 lulus.
- **SC-002**: Uji UC-01, UC-02, UC-04, dan UC-06 tetap lulus (regresi).

## Assumptions
- Tombol Tolak (UC-08) ditambahkan pada iterasi 6; UJ-07.03 bagian tombol Tolak diuji ulang di sana.
- Tombol Teruskan ke Instansi membuka formulir Penerusan pada iterasi 9 (UC-10).
