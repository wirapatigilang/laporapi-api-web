# Feature Specification: UC-10 Meneruskan Laporan ke Instansi

**Feature Branch**: `009-uc10-dispatch`

**Created**: 2026-11-25

**Status**: Lolos Requirements Review, Preliminary Design Review, dan Critical Design Review (2026-11-25)

**Input**: Teks UC-10 dari `use-case-sementara.md` versi 5 (status Petugas Ditugaskan diberikan Admin Polres saat meneruskan), FR-25, FR-26, FR-29, FR-31, NFR-01, ASUMSI-17, ASUMSI-18, domain model (Instansi, Penerusan, Laporan, Riwayat Status, Notifikasi).

**Use case ICONIX**: UC-10 · **Aktor utama**: Admin Polres · **Aktor pendukung**: Petugas Instansi · **Lapis**: web dan API

## Teks use case (sumber)

**Prasyarat:** Laporan berstatus Laporan Diverifikasi (UC-07). **Hasil akhir:** Penerusan tercatat untuk tiap Instansi yang dipilih, status Laporan menjadi Petugas Ditugaskan, dan Petugas Instansi serta Warga menerima Notifikasi.

Basic course:
1. Admin Polres menekan tombol Teruskan ke Instansi di Halaman Detail Laporan.
2. Sistem membuka Dialog Teruskan ke Instansi berisi daftar Instansi (BPBD, Damkar, Manggala Agni, Dinas Lingkungan Hidup, TNI) dan kolom catatan.
3. Admin Polres memilih satu atau lebih Instansi, boleh menulis catatan, lalu menekan Teruskan.
4. Sistem menyimpan Penerusan untuk setiap Instansi, mengubah status Laporan menjadi Petugas Ditugaskan, dan mencatat perubahan status beserta Instansi penerima di Riwayat Status.
5. Sistem mengirim Notifikasi ke semua Petugas Instansi yang dipilih dan Notifikasi perubahan status ke Warga.
6. Sistem menampilkan daftar Instansi penerima beserta tanda "menunggu konfirmasi" di Halaman Detail Laporan.

Alternate course:
- **3a.** Tidak ada Instansi dipilih: diminta minimal satu Instansi.
- **3b.** Instansi sudah pernah diteruskan: tidak ada Penerusan ganda, hanya Instansi baru ditambahkan; pada Petugas Ditugaskan/Penanganan Berlangsung status tetap dan penambahan dicatat sebagai kegiatan.
- **Kapan saja.** Pengguna selain Admin Polres: "tidak diizinkan".
- **6a.** Belum ada konfirmasi Instansi setelah 60 menit: penanda "belum direspons" di Dasbor Laporan.

## Clarifications

### Session 2026-11-25

- Q: Penerusan disimpan pada Laporan mana? → A: Pada laporan utama Kejadian (satu Penerusan per Instansi per Kejadian, UNIQUE `report_id, agency_id`). Status Petugas Ditugaskan diterapkan pada semua Laporan dalam Kejadian.
- Q: Kapan tepatnya penanda "belum direspons" muncul (Tabel 3.5 "tepat 60 menit" vs robustness "> 60 menit")? → A: Saat umur Penerusan pertama **≥ 60 menit** dan belum ada satu pun Instansi yang mengonfirmasi, selama status masih Petugas Ditugaskan (FR-26). 59 menit tanpa penanda, 60 menit dengan penanda (UJ-10.05/06). *(keputusan kerja, perlu dikonfirmasi Gilang)*
- Q: Siapa yang melihat penanda? → A: Admin Polres (dasbor dan detail).
- Q: Bila semua Instansi yang dipilih sudah pernah diteruskan? → A: 409 "Semua instansi yang dipilih sudah menerima penerusan" tanpa perubahan.
- Q: Isi Riwayat Status? → A: Perubahan status Petugas Ditugaskan dengan catatan "Diteruskan ke [Instansi, …]" (+ catatan Admin); penambahan Instansi berupa kegiatan `AGENCY_ADDED` "Instansi ditambahkan: […]".
- Q: Siapa penerima Notifikasi? → A: Semua Petugas Instansi aktif dari Instansi yang baru ditambahkan; Warga pelapor (semua Laporan dalam Kejadian) hanya bila status berubah.
- Q: Kapan Petugas Instansi bisa melihat Laporan? → A: Sejak Instansinya menerima Penerusan (cakupan dasbor, detail, foto, dan siaran SSE). Petugas Instansi tidak melihat nomor HP Warga (NFR-03).
- Q: Apa yang dilihat Warga? → A: `handlingAgencies` (nama Instansi dan sudah/belum konfirmasi) pada Detail Laporan Warga; tanpa posisi tim (ASUMSI-10).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin meneruskan Laporan (Priority: P1)

**Acceptance Scenarios**:
1. **Given** Laporan Diverifikasi, **When** Admin memilih BPBD dan menekan Teruskan, **Then** Penerusan tercatat, status Petugas Ditugaskan tercatat di riwayat dengan Instansi penerima, Petugas BPBD dan Warga menerima Notifikasi, dan BPBD tampil "menunggu konfirmasi".
2. **Given** Laporan Diverifikasi, **When** Admin memilih Damkar dan Dinas Lingkungan Hidup, **Then** dua Penerusan tercatat dan petugas kedua Instansi menerima Notifikasi.

### User Story 2 - Isian dan Penerusan ganda (Priority: P1) — 3a, 3b

**Acceptance Scenarios**:
1. **Given** dialog tanpa Instansi dipilih, **When** Teruskan, **Then** tampil "Pilih minimal satu instansi" dan tidak ada Penerusan.
2. **Given** Laporan Petugas Ditugaskan yang sudah diteruskan ke BPBD, **When** BPBD dan TNI dipilih, **Then** hanya TNI ditambahkan dan dicatat sebagai kegiatan; status tetap.

### User Story 3 - Penanda belum direspons (Priority: P2) — 6a

**Acceptance Scenarios**:
1. **Given** Penerusan 59 menit tanpa konfirmasi, **When** Admin membuka dasbor, **Then** tanpa penanda.
2. **Given** Penerusan 60 menit tanpa konfirmasi, **When** Admin membuka dasbor, **Then** penanda "belum direspons" tampil (juga di detail); setelah satu Instansi mengonfirmasi penanda hilang.

### User Story 4 - Perubahan yang ditolak (Priority: P1)

**Acceptance Scenarios**:
1. **Given** Laporan Diterima, **When** Admin meneruskan, **Then** 409 tanpa Penerusan.
2. **Given** Petugas Instansi atau Operator Polsek, **When** meneruskan Laporan Diverifikasi, **Then** 403 dan status tetap.
3. **Given** Laporan diteruskan ke Manggala Agni, **When** Petugas BPBD membuka detail atau dasbor, **Then** 403 / tidak tampil.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001** (FR-25): `GET /api/agencies` MUST mengembalikan lima Instansi dari data.
- **FR-002** (FR-25): `POST /api/reports/:id/dispatches {agencyIds, note?}` MUST menyimpan Penerusan per Instansi baru, mengubah Kejadian Laporan Diverifikasi menjadi Petugas Ditugaskan, dan mencatat riwayat dengan Instansi penerima.
- **FR-003** (FR-25 3b): Instansi yang sudah diteruskan MUST dilewati; pada Petugas Ditugaskan/Penanganan Berlangsung penambahan dicatat sebagai kegiatan `AGENCY_ADDED`.
- **FR-004** (FR-25): Notifikasi MUST tersimpan untuk Petugas Instansi baru dan, bila status berubah, untuk Warga.
- **FR-005** (FR-29, NFR-05): Selain Admin 403; daftar kosong/Instansi tidak dikenal 422; status lain 409.
- **FR-006** (FR-26): Daftar Kejadian dan detail untuk Admin MUST memuat `isOverdue` sesuai aturan ≥ 60 menit.
- **FR-007** (NFR-01): Cakupan Petugas Instansi MUST mengikuti Penerusan (daftar, detail, foto, SSE).
- **FR-008**: Web MUST menyediakan Dialog Teruskan ke Instansi dan daftar Instansi penerima dengan tanda "menunggu konfirmasi".

## Success Criteria *(mandatory)*
- **SC-001**: UJ-10.01–UJ-10.09 lulus.
- **SC-002**: Uji iterasi 1–8 tetap lulus; UJ-05.04 diuji ulang dengan Penerusan sungguhan.
