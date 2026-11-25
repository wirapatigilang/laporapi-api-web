# Feature Specification: UC-09 Menyiagakan Personel Polsek

**Feature Branch**: `008-uc09-sector-standby`

**Created**: 2026-11-25

**Status**: Lolos Requirements Review, Preliminary Design Review, dan Critical Design Review (2026-11-25)

**Input**: Teks UC-09 dari `use-case-sementara.md` versi 5, FR-24, FR-29, FR-31, NFR-01, ASUMSI-16, domain model (Notifikasi, Laporan, Riwayat Status).

**Use case ICONIX**: UC-09 · **Aktor utama**: Operator Polsek · **Lapis**: web (Daftar Notifikasi, Halaman Detail Laporan, Dasbor Laporan) dan API

## Teks use case (sumber)

**Prasyarat:** Operator Polsek menerima Notifikasi Laporan baru di wilayahnya (UC-04 langkah 9). **Hasil akhir:** Riwayat Status mencatat bahwa Polsek sudah menyiagakan personel, tanpa menunggu verifikasi Admin Polres.

Basic course:
1. Operator Polsek membuka Notifikasi, Sistem membuka Halaman Detail Laporan.
2. Operator Polsek menekan tombol Siagakan Personel dan boleh menulis catatan (mis. jumlah personel).
3. Sistem mencatat kegiatan "Personel Polsek disiagakan" di Riwayat Status beserta waktu dan nama Operator, tanpa mengubah status Laporan.
4. Sistem menampilkan tanda "Polsek sudah siaga" di Halaman Detail Laporan dan Dasbor Laporan milik Admin Polres.

Alternate course:
- **2a.** Laporan sudah ditolak: "Laporan sudah ditolak" dan tombol tidak aktif.
- **2b.** Laporan bukan wilayah Polsek tersebut: ditolak "tidak diizinkan".

## Clarifications

### Session 2026-11-25

- Q: Endpoint? → A: `POST /api/reports/:id/standby {note?}` khusus Operator Polsek; 201 bila tercatat.
- Q: Apakah penyiagaan boleh setelah verifikasi atau penerusan? → A: Boleh selama Laporan belum ditolak dan penanganan belum selesai (FR-24 hanya menolak Laporan Ditolak; Penanganan Selesai juga ditolak karena tiket sudah ditutup, 409 "Penanganan sudah selesai").
- Q: Boleh dicatat lebih dari sekali? → A: Boleh (mis. tambahan personel); tanda siaga cukup satu dan menampilkan penyiagaan terakhir.
- Q: Kegiatan dicatat pada Laporan mana bila Operator membuka laporan ganda? → A: Pada laporan utama Kejadian; tanda siaga berlaku untuk Kejadian.
- Q: Di mana Daftar Notifikasi web? → A: Halaman `/notifications` untuk semua petugas web, dengan menu "Notifikasi"; memilih Notifikasi menandainya dibaca lalu membuka Halaman Detail Laporan.
- Q: Catatan? → A: Opsional, maksimal 500 karakter.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operator menyiagakan personel (Priority: P1)

**Acceptance Scenarios**:
1. **Given** Laporan Diterima di wilayahnya dan Notifikasi Laporan baru, **When** Operator membuka Notifikasi lalu menekan Siagakan Personel, **Then** kegiatan tercatat dengan waktu dan nama Operator, status tetap Laporan Diterima, dan tanda "Polsek sudah siaga" tampil di detail dan Dasbor Admin.
2. **Given** Operator menulis catatan jumlah personel, **When** menyiagakan, **Then** catatan tersimpan pada kegiatan.
3. **Given** penyiagaan sebelum verifikasi, **When** Admin kemudian memverifikasi, **Then** riwayat memuat Diterima, kegiatan siaga, lalu Diverifikasi.

### User Story 2 - Penyiagaan yang ditolak (Priority: P1) — 2a, 2b

**Acceptance Scenarios**:
1. **Given** Laporan sudah ditolak, **When** Operator membuka detail, **Then** tampil "Laporan sudah ditolak", tombol tidak aktif, dan API menjawab 409 tanpa kegiatan baru.
2. **Given** Laporan di wilayah Polsek lain, **When** Operator memanggil penyiagaan, **Then** 403.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001** (FR-24, ASUMSI-16): `POST /api/reports/:id/standby` MUST mencatat kegiatan `SECTOR_STANDBY` beserta catatan, waktu, dan Operator tanpa mengubah status.
- **FR-002** (FR-24 2b, NFR-01): Laporan di luar Polsek Operator, atau peran selain Operator Polsek, MUST mendapat 403.
- **FR-003** (FR-24 2a): Laporan Ditolak MUST mendapat 409 "Laporan sudah ditolak"; Penanganan Selesai 409 "Penanganan sudah selesai".
- **FR-004**: `GET /api/incidents` MUST memuat `sectorStandby` (boolean) dan detail MUST memuat `sectorStandby {at, by, note}`; perubahan disiarkan ke dasbor.
- **FR-005**: Web MUST menyediakan Daftar Notifikasi yang membuka Halaman Detail Laporan, tombol Siagakan Personel dengan catatan, dan tanda "Polsek sudah siaga".

## Success Criteria *(mandatory)*
- **SC-001**: UJ-09.01–UJ-09.05 lulus.
- **SC-002**: Uji iterasi 1–7 tetap lulus.
