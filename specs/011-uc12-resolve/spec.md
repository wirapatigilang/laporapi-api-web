# Feature Specification: UC-12 Menyatakan Penanganan Selesai

**Feature Branch**: `011-uc12-resolve`

**Created**: 2026-11-25

**Status**: Lolos Requirements Review, Preliminary Design Review, dan Critical Design Review (2026-11-25)

**Input**: Teks UC-12 dari `use-case-sementara.md` versi 5, FR-29, FR-30, FR-31, ASUMSI-20, ASUMSI-21, aturan R2 deteksi laporan ganda, domain model (Laporan, Kejadian, Riwayat Status, Notifikasi).

**Use case ICONIX**: UC-12 · **Aktor utama**: Admin Polres (amandemen 2026-11-25; sebelumnya Petugas Instansi) · **Lapis**: web dan API

## Teks use case (sumber)

**Prasyarat:** Laporan berstatus Penanganan Berlangsung. **Hasil akhir:** Status Laporan menjadi Penanganan Selesai, tiket Kejadian ditutup, dan Warga menerima Notifikasi.

Basic course:
1. Setelah api padam dan Instansi melapor, Admin Polres menekan tombol Nyatakan Selesai di Halaman Detail Laporan.
2. Sistem meminta konfirmasi. Tidak ada catatan penanganan yang wajib diisi.
3. Admin Polres menekan "Ya, nyatakan selesai".
4. Sistem mengubah status Laporan dan semua laporan gandanya menjadi Penanganan Selesai, mencatat Riwayat Status, dan menutup tiket Kejadian sehingga laporan baru di lokasi yang sama membuat Kejadian baru.
5. Sistem mengirim Notifikasi "Laporan selesai, api sudah padam" ke Warga, Admin Polres, dan Operator Polsek wilayah.

Alternate course:
- **1a.** Status belum Penanganan Berlangsung: tombol tidak aktif dan API menolak.
- **1b.** Operator Polsek atau Admin Polres mencoba: "tidak diizinkan"; hanya Instansi penanganan yang berhak.

## Clarifications

### Session 2026-11-25

- Q: Endpoint? → A: `POST /api/reports/:id/resolve` tanpa isi. `POST /api/reports/:id/status {nextStatus: RESOLVED}` (UC-11) memakai aturan yang sama.
- Q: Petugas Instansi mana yang berhak? → A: Petugas dari Instansi yang menerima Penerusan untuk Kejadian tersebut (Petugas Instansi lain 403).
- Q: Urutan pemeriksaan? → A: Peran (403) → status Penanganan Berlangsung (409) → Penerusan ke Instansinya (403), sejalan dengan UC-11.
- Q: Pesan 409? → A: "Laporan berstatus [status]; penanganan belum berlangsung", atau "Penanganan sudah selesai" bila sudah Selesai.
- Q: Isi Riwayat Status? → A: Satu entri Penanganan Selesai per Laporan dengan catatan nama Instansi.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Petugas menyatakan selesai (Priority: P1)

**Acceptance Scenarios**:
1. **Given** Kejadian Penanganan Berlangsung dengan laporan ganda, **When** Petugas Instansi menekan Nyatakan Selesai lalu Ya, **Then** Laporan dan laporan gandanya Penanganan Selesai, tiket ditutup, Warga/Admin/Operator Polsek menerima Notifikasi, dan dialog tidak berisi isian catatan.
2. **Given** Kejadian sudah selesai, **When** Warga mengirim Laporan 30 m dari lokasinya, **Then** Kejadian baru dibuat.

### User Story 2 - Penyelesaian yang ditolak (Priority: P1) — 1a, 1b, FR-29

**Acceptance Scenarios**:
1. **Given** Petugas Ditugaskan, **When** Petugas membuka detail, **Then** tombol tidak aktif dan API 409.
2. **Given** Penanganan Berlangsung, **When** Operator Polsek atau Admin Polres menyatakan selesai, **Then** 403.
3. **Given** Penanganan Selesai, **When** status diubah lagi, **Then** 409.
4. **Given** Laporan yang ditangani Instansi lain, **When** Petugas BPBD menyatakan selesai, **Then** 403.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001** (FR-30): `POST /api/reports/:id/resolve` MUST mengubah semua Laporan dalam Kejadian Penanganan Berlangsung menjadi Penanganan Selesai, mencatat riwayat, dan menutup Kejadian.
- **FR-002** (FR-30): Notifikasi "… selesai, api sudah padam" MUST tersimpan untuk semua pelapor, Operator Polsek wilayah, dan Petugas Instansi penerima Penerusan.
- **FR-003** (FR-30, amandemen 2026-11-25): Hanya Admin Polres; Petugas Instansi dan Operator Polsek 403.
- **FR-004** (FR-29): Status selain Penanganan Berlangsung 409; Penanganan Selesai adalah status akhir.
- **FR-005** (ASUMSI-20): Web MUST menampilkan tombol Nyatakan Selesai (aktif hanya pada Penanganan Berlangsung) dan dialog konfirmasi tanpa isian catatan.

## Success Criteria *(mandatory)*
- **SC-001**: UJ-12.01–UJ-12.07 lulus.
- **SC-002**: Uji iterasi 1–10 tetap lulus.

## Amandemen 2026-11-25 (masukan dosen pembimbing)

- Yang menyatakan Penanganan Selesai adalah **Admin Polres**, bukan Petugas Instansi. Petugas Instansi melaporkan di lapangan; Polres yang menutup laporan.
- Tombol Nyatakan Selesai pindah ke panel Admin Polres (aktif hanya pada Penanganan Berlangsung) dan tidak lagi tampil untuk Petugas Instansi. Admin tidak perlu menjadi penerima Penerusan.
- Dialog konfirmasi menampilkan perubahan status (Penanganan Berlangsung → Penanganan Selesai) dan akibatnya, tanpa isian catatan (ASUMSI-20 tetap).
- Bagian Klarifikasi tentang "Petugas Instansi mana yang berhak" dan Acceptance Scenario 2 dan 4 di atas digantikan oleh amandemen ini.
- Kasus uji diubah: UJ-12.01 (Admin menyatakan selesai lewat web), UJ-12.02 (tombol Admin tidak aktif pada Petugas Ditugaskan), UJ-12.04 (Petugas Instansi → 403, tombol tidak tampil), UJ-12.05 (penolakan Laporan Selesai → 409), UJ-12.07 (Admin menyatakan selesai tanpa Penerusan; Petugas Instansi → 403).

## Amandemen 2026-11-26 (status Laporan Ditutup, UC-13)

- Penanganan Selesai (`RESOLVED`) **bukan lagi status akhir**. Setelah Admin Polres menyatakan selesai, Warga pembuat laporan utama menutup laporan (`CLOSED`) atau menolak penutupan (kembali `IN_PROGRESS`); tanpa tanggapan, Sistem menutup otomatis 3 × 24 jam kemudian. Lihat `specs/013-uc13-close-report/spec.md`.
- `resolve` MUST mengisi `Report.resolvedAt` (dasar `autoCloseAt`).
- Notifikasi ke Warga berubah menjadi "Penanganan selesai. Tutup laporan bila api sudah padam, atau pilih Api Belum Padam. Laporan tertutup otomatis dalam 3 hari"; Notifikasi ke Operator Polsek dan Petugas Instansi tetap "api sudah padam".
- FR-004 dibaca: status selain Penanganan Berlangsung 409; Laporan Penanganan Selesai hanya dapat diubah lewat UC-13.
- Uji ulang: UJ-12.01 (isi Notifikasi Warga, `resolvedAt`), UJ-12.05 (pesan 409 tetap, alasan berbeda).
