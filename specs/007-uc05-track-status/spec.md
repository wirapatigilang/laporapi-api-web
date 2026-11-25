# Feature Specification: UC-05 Memantau Status Laporan

**Feature Branch**: `007-uc05-track-status`

**Created**: 2026-11-25

**Status**: Lolos Requirements Review, Preliminary Design Review, dan Critical Design Review (2026-11-25)

**Input**: Teks UC-05 dari `use-case-sementara.md` versi 5, FR-15, FR-16, NFR-01, NFR-03, ASUMSI-10, domain model (Laporan, Kejadian, Riwayat Status, Alasan Penolakan, Notifikasi).

**Use case ICONIX**: UC-05 · **Aktor utama**: Warga · **Lapis**: API (layar dibuat di aplikasi Android oleh Khoirul)

## Teks use case (sumber)

**Prasyarat:** Warga sudah masuk dan pernah mengirim Laporan. **Hasil akhir:** Warga melihat status terbaru dan Riwayat Status Laporan miliknya.

Basic course:
1. Warga membuka Layar Riwayat. Sistem mengembalikan daftar Laporan milik Warga (nomor laporan, waktu, nama kecamatan, foto kecil, status) diurutkan dari yang terbaru.
2. Warga memilih status pada filter (Semua atau salah satu status). Sistem mengembalikan daftar yang sudah disaring.
3. Warga memilih satu Laporan. Sistem mengembalikan Detail Laporan: foto, lokasi, keterangan, status saat ini, dan Riwayat Status bertanggal.
4. Saat status Laporan berubah (UC-07, UC-08, UC-10, UC-11, UC-12), Sistem mengirim Notifikasi ke Warga, dan Warga dapat membukanya untuk langsung melihat Detail Laporan.

Alternate course:
- **1a.** Belum pernah melapor: daftar kosong ("Belum ada laporan" di Android).
- **3a.** Laporan Ditolak: Detail menampilkan Alasan Penolakan.
- **3b.** Laporan milik orang lain: ditolak "tidak diizinkan".
- **3c.** Laporan ganda: keterangan "Tergabung dengan laporan #LA-xxxx", status mengikuti laporan utama.
- Notifikasi dan Detail menyebut nama petugas yang menangani tanpa posisi tim (ASUMSI-10).

## Clarifications

### Session 2026-11-25

- Q: Endpoint daftar? → A: `GET /api/reports/mine?status=` (khusus Warga). `status` kosong atau `ALL` = semua; nilai lain yang tidak dikenal 422.
- Q: Urutan "terbaru"? → A: Waktu diterima sistem (`receivedAt`) menurun.
- Q: Foto kecil dari mana? → A: `photoUrl` yang sama dengan detail (`/api/reports/:id/photo`); Android memperkecil saat menampilkan. API tidak membuat berkas thumbnail terpisah.
- Q: Riwayat apa yang dilihat Warga? → A: Hanya entri perubahan status (bertanggal, dengan nama petugas pengubah dan catatan). Kegiatan internal petugas (cek lapangan, siaga Polsek, konfirmasi dan keberangkatan instansi) tidak ditampilkan kepada Warga. *(keputusan kerja, perlu dikonfirmasi Gilang)*
- Q: Data apa yang tidak boleh sampai ke Warga? → A: Identitas dan nomor HP pelapor lain (daftar laporan ganda), tanda selisih lokasi, koordinat EXIF, petunjuk titik panas, dan posisi tim.
- Q: "Nama petugas yang menangani" sebelum Penerusan ada? → A: Nama pengubah status pada tiap entri riwayat (`actorName`). Nama Instansi yang ditugaskan ditambahkan pada iterasi UC-10.
- Q: Bagaimana Warga "membuka" Notifikasi? → A: `GET /api/notifications` memuat `reportId`; `POST /api/notifications/:id/read` menandai sudah dibaca dan mengembalikan `reportId` untuk membuka detail. Notifikasi milik orang lain 404.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Daftar Laporan milik Warga (Priority: P1) — langkah 1–2, 1a

**Acceptance Scenarios**:
1. **Given** Warga dengan tiga Laporan, **When** meminta daftar, **Then** tiga Laporan miliknya tampil, terbaru lebih dulu, berisi nomor, waktu, kecamatan, foto, dan status.
2. **Given** salah satu Laporan Diverifikasi, **When** daftar disaring Laporan Diverifikasi, **Then** hanya Laporan tersebut.
3. **Given** Warga belum pernah melapor, **When** meminta daftar, **Then** daftar kosong.

### User Story 2 - Detail Laporan (Priority: P1) — langkah 3, 3a, 3b, 3c

**Acceptance Scenarios**:
1. **Given** Laporan Petugas Ditugaskan, **When** Warga membuka detail, **Then** status saat ini, riwayat bertanggal, dan nama petugas tampil, tanpa posisi tim.
2. **Given** Laporan Ditolak, **When** dibuka, **Then** Alasan Penolakan tampil.
3. **Given** laporan ganda, **When** dibuka, **Then** keterangan tergabung dengan nomor laporan utama dan status mengikuti laporan utama.
4. **Given** Laporan milik Warga lain, **When** dibuka, **Then** 403.

### User Story 3 - Notifikasi perubahan status (Priority: P2) — langkah 4

**Acceptance Scenarios**:
1. **Given** Admin memverifikasi Laporan, **When** Warga membaca Notifikasi, **Then** ada Notifikasi baru menyebut nama petugas, dapat ditandai dibaca, dan mengarah ke detail.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001** (FR-15): `GET /api/reports/mine` MUST mengembalikan Laporan milik Warga, terbaru lebih dulu, dengan saringan status.
- **FR-002** (FR-15): `GET /api/reports/:id` untuk Warga MUST mengembalikan foto, lokasi, kecamatan, keterangan, status, dan Riwayat Status bertanggal; Laporan orang lain 403.
- **FR-003** (FR-16): Detail Laporan Ditolak MUST memuat `rejection`; laporan ganda MUST memuat `primaryReportNumber` dan `duplicateNote`.
- **FR-004** (FR-16, ASUMSI-10, NFR-03): Detail Warga MUST memuat nama petugas pengubah status dan MUST NOT memuat posisi tim, data pelapor lain, atau data verifikasi internal.
- **FR-005** (FR-16): Notifikasi perubahan status MUST tersimpan untuk Warga dengan `reportId`; `POST /api/notifications/:id/read` MUST menandai dibaca.

## Success Criteria *(mandatory)*
- **SC-001**: UJ-05.01–UJ-05.08 lulus.
- **SC-002**: Uji iterasi 1–6 tetap lulus.

## Assumptions
- Layar Riwayat, Detail Laporan, dan Notifikasi dibangun di aplikasi Android (Khoirul); iterasi ini menyediakan API-nya.
- UJ-05.04 disiapkan lewat basis data uji sampai UC-10 tersedia, lalu diuji ulang di iterasi 9.
