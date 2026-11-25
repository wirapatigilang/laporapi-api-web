# Feature Specification: UC-11 Memperbarui Status Penanganan

**Feature Branch**: `010-uc11-handling-status`

**Created**: 2026-11-25

**Status**: Lolos Requirements Review, Preliminary Design Review, dan Critical Design Review (2026-11-25)

**Input**: Teks UC-11 dari `use-case-sementara.md` versi 5, FR-27, FR-28, FR-29, FR-31, NFR-01, NFR-03, ASUMSI-10, ASUMSI-19, domain model (Penerusan, Laporan, Kejadian, Riwayat Status, Notifikasi).

**Use case ICONIX**: UC-11 · **Aktor utama**: Petugas Instansi, Operator Polsek · **Lapis**: web dan API

## Teks use case (sumber)

**Prasyarat:** Laporan sudah diteruskan ke Instansi petugas dan berstatus Petugas Ditugaskan (UC-10), atau berada di wilayah Polsek operator. **Hasil akhir:** Konfirmasi dan keberangkatan tercatat sebagai kegiatan, status maju ke Penanganan Berlangsung, Riwayat Status tercatat, dan Warga serta Admin Polres menerima Notifikasi.

Basic course:
1. Petugas Instansi membuka Dasbor Laporan dan memilih Laporan yang diteruskan ke Instansinya; Halaman Detail Laporan menampilkan tombol status berikutnya.
2. Petugas Instansi menekan Konfirmasi Terima Tugas.
3. Sistem menandai Penerusan Instansi tersebut dikonfirmasi dan mencatatnya sebagai kegiatan tanpa mengubah status. Penanda "belum direspons" hilang.
4. Saat tim berangkat, Petugas menekan Catat Keberangkatan; kegiatan keberangkatan tercatat tanpa mengubah status.
5. Saat tim mulai memadamkan, Petugas menekan Mulai Penanganan; status menjadi Penanganan Berlangsung.
6. Konfirmasi dikirim sebagai Notifikasi ke Admin Polres dan Warga (menyebut nama petugas). Setiap perubahan status dikirim ke Warga dan Admin Polres.

Alternate course:
- **2a.** Beberapa Instansi: masing-masing mengonfirmasi sendiri; status berubah saat Instansi pertama menekan Mulai Penanganan.
- **2b.** Petugas Instansi atau Operator Polsek mengubah status menjadi Petugas Ditugaskan: "tidak diizinkan".
- **4a.** Operator Polsek menekan Catat Keberangkatan Personel: kegiatan tercatat tanpa mengubah status, termasuk sebelum verifikasi; ditolak bila Laporan Ditolak atau Selesai.
- **Kapan saja.** Melompati atau memundurkan status: ditolak.
- **1a.** Laporan tidak diteruskan ke Instansinya: "tidak diizinkan".

## Clarifications

### Session 2026-11-25

- Q: Endpoint? → A: `POST /api/reports/:id/status` dengan tepat satu dari `nextStatus` (status tujuan) atau `activity` (`CONFIRMED` atau `DEPARTED`), dan `note` opsional (≤ 500 karakter).
- Q: Urutan pemeriksaan bila beberapa aturan dilanggar sekaligus? → A: (1) peran Petugas Instansi/Operator Polsek, selain itu 403; (2) status maju satu tahap, selain itu 409; (3) tujuan Petugas Ditugaskan hanya oleh Admin, 403; (4) hak atas Laporan (Penerusan Instansi atau wilayah Polsek), 403. Urutan ini membuat UJ-11.05/06 menghasilkan 409 dan UJ-11.11 menghasilkan 403 seperti di Tabel 4.18.
- Q: Bolehkah Mulai Penanganan sebelum Konfirmasi Terima Tugas? → A: Boleh; Penerusan Instansi tersebut sekaligus dikonfirmasi dan kegiatan konfirmasi tercatat lebih dulu.
- Q: Konfirmasi dua kali? → A: 409 "Penugasan sudah dikonfirmasi".
- Q: Kapan Petugas Instansi boleh mencatat konfirmasi/keberangkatan? → A: Saat status Petugas Ditugaskan atau Penanganan Berlangsung (Instansi yang ditambahkan belakangan tetap bisa mengonfirmasi).
- Q: Apakah keberangkatan diberi Notifikasi? → A: Tidak (langkah 6 hanya menyebut konfirmasi dan perubahan status).
- Q: Riwayat kegiatan menyebut Instansi? → A: Catatan kegiatan diawali nama Instansi (mis. "BPBD Kabupaten Sekadau. Satu regu …").
- Q: `nextStatus = RESOLVED`? → A: Ditangani UC-12 (iterasi 11) dengan aturan yang sama.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Petugas Instansi menjalankan penanganan (Priority: P1)

**Acceptance Scenarios**:
1. **Given** Laporan Petugas Ditugaskan ke BPBD (≥ 60 menit tanpa konfirmasi), **When** Petugas BPBD menekan Konfirmasi Terima Tugas, **Then** Penerusan terkonfirmasi dan tercatat sebagai kegiatan, status tetap, penanda "belum direspons" hilang, dan Notifikasi Warga memuat nama petugas tanpa posisi tim.
2. **Given** Penerusan ke BPBD dan Damkar, BPBD sudah konfirmasi, **When** Damkar mengonfirmasi, **Then** kegiatan kedua tercatat, status tetap.
3. **Given** Petugas mengisi catatan, **When** menekan Catat Keberangkatan, **Then** kegiatan keberangkatan tercatat, status tetap.
4. **Given** Petugas Ditugaskan, **When** Petugas menekan Mulai Penanganan, **Then** status Penanganan Berlangsung dan Warga serta Admin menerima Notifikasi.

### User Story 2 - Operator Polsek mencatat keberangkatan personel (Priority: P2) — 4a

**Acceptance Scenarios**:
1. **Given** Laporan Diterima di wilayahnya, **When** Operator menekan Catat Keberangkatan Personel, **Then** kegiatan tercatat, status tetap.
2. **Given** Laporan Ditolak, **When** Operator mencatat keberangkatan, **Then** ditolak tanpa kegiatan baru.

### User Story 3 - Cakupan dan aturan status (Priority: P1) — 1, 1a, 2b, "kapan saja"

**Acceptance Scenarios**:
1. **Given** Laporan Diverifikasi, **When** status diubah langsung ke Penanganan Berlangsung, **Then** 409.
2. **Given** Penanganan Berlangsung, **When** diubah kembali ke Petugas Ditugaskan, **Then** 409.
3. **Given** Laporan diteruskan ke Instansi lain, **When** Petugas BPBD mengubah status, **Then** 403.
4. **Given** Petugas BPBD, **When** membuka Dasbor Laporan, **Then** hanya Laporan yang diteruskan ke BPBD.
5. **Given** Laporan Diverifikasi, **When** Petugas Instansi atau Operator mengubahnya ke Petugas Ditugaskan, **Then** 403.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001** (FR-27): `activity: CONFIRMED` MUST menandai Penerusan Instansi petugas dikonfirmasi dan mencatat kegiatan `DISPATCH_CONFIRMED` tanpa mengubah status; Notifikasi ke Warga (nama petugas) dan Admin.
- **FR-002** (FR-27): `activity: DEPARTED` oleh Petugas Instansi MUST mencatat kegiatan `TEAM_DEPARTED` tanpa mengubah status.
- **FR-003** (FR-27, 2a): `nextStatus: IN_PROGRESS` dari Petugas Ditugaskan MUST mengubah semua Laporan dalam Kejadian dan mengirim Notifikasi ke Warga dan Admin.
- **FR-004** (FR-28, ASUMSI-19): `activity: DEPARTED` oleh Operator Polsek MUST mencatat `SECTOR_PERSONNEL_DEPARTED` di wilayahnya selama status belum akhir.
- **FR-005** (FR-29): Lompatan/mundur status 409; Petugas Ditugaskan oleh selain Admin 403; Laporan di luar hak 403.
- **FR-006**: Web MUST menampilkan tombol Konfirmasi Terima Tugas, Catat Keberangkatan, Mulai Penanganan (Petugas Instansi) dan Catat Keberangkatan Personel (Operator).

## Success Criteria *(mandatory)*
- **SC-001**: UJ-11.01–UJ-11.11 lulus.
- **SC-002**: Uji iterasi 1–9 tetap lulus.
