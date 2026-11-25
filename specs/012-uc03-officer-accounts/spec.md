# Feature Specification: UC-03 Mengelola Akun Petugas

**Feature Branch**: `012-uc03-officer-accounts`

**Created**: 2026-11-25

**Status**: Lolos Requirements Review, Preliminary Design Review, dan Critical Design Review (2026-11-25)

**Input**: Teks UC-03 dari `use-case-sementara.md` versi 5, FR-03, FR-04, NFR-02, NFR-05, ASUMSI-5, keputusan 24 Nov 2026 (masuk memakai nomor HP, normalisasi 08…), domain model (Pengguna, Polsek, Instansi).

**Use case ICONIX**: UC-03 · **Aktor utama**: Admin Polres · **Lapis**: web (Halaman Kelola Akun) dan API

## Teks use case (sumber)

**Prasyarat:** Admin Polres sudah masuk. **Hasil akhir:** Akun Operator Polsek atau Petugas Instansi tersimpan, berubah, atau dinonaktifkan.

Basic course:
1. Admin Polres membuka Halaman Kelola Akun. Sistem menampilkan daftar Pengguna petugas beserta Peran, Polsek atau Instansi, dan status aktif.
2. Admin Polres menekan Tambah Akun, mengisi nama, nomor HP, Peran, dan Polsek (Operator Polsek) atau Instansi (Petugas Instansi).
3. Admin Polres menekan Simpan.
4. Sistem memeriksa kelengkapan data dan memastikan nomor HP (setelah dinormalisasi) belum dipakai.
5. Sistem menyimpan Pengguna baru dengan kata sandi awal, menampilkan kata sandi awal satu kali kepada Admin Polres, lalu menampilkan akun baru di daftar.

Alternate course:
- **2a.** Mengubah akun: Ubah → Simpan; Sistem memperbarui Pengguna.
- **2b.** Menonaktifkan akun: Nonaktifkan → konfirmasi; akun tidak bisa masuk lagi (UC-02 alternate 3b).
- **4a.** Data tidak lengkap atau nomor HP sudah dipakai ("Nomor HP sudah dipakai"): pesan di kolom yang salah.
- **2c.** Operator Polsek tanpa Polsek, atau Petugas Instansi tanpa Instansi: diminta memilih.

## Clarifications

### Session 2026-11-25

- Q: [PUTUSKAN] Wajib ganti kata sandi saat masuk pertama? → A: Tidak pada versi ini; belum ada use case ganti kata sandi. Kata sandi awal acak 10 karakter (huruf dan angka yang tidak mudah tertukar), di-*hash* argon2id (NFR-02), ditampilkan sekali di tanggapan pembuatan dan tidak dapat diambil lagi. *(keputusan kerja, perlu dikonfirmasi Gilang)*
- Q: Akun apa saja yang dikelola? → A: Hanya Operator Polsek dan Petugas Instansi. Akun Admin Polres dan Warga tidak tampil dan tidak dapat dibuat di sini.
- Q: Kode jawaban? → A: 201 dibuat; 422 isian tidak lengkap (`fields.name`, `phoneNumber`, `role`, `policeSectorId`, `agencyId`); 409 `PHONE_TAKEN` dengan `fields.phoneNumber` "Nomor HP sudah dipakai"; 403 selain Admin.
- Q: Apa yang terjadi pada token akun yang dinonaktifkan? → A: Tidak berlaku lagi: setiap permintaan dengan token akun tidak aktif dijawab 401 `ACCOUNT_INACTIVE` "Akun Anda tidak aktif, hubungi Admin Polres", sehingga aplikasi web mengeluarkan pengguna.
- Q: Bolehkah mengubah peran dan nomor HP? → A: Boleh, dengan aturan yang sama dengan pembuatan (relasi mengikuti peran, nomor HP unik). Kata sandi tidak berubah saat diubah.
- Q: Mengaktifkan kembali? → A: Tidak termasuk UC-03 (tidak ada di teks use case); menonaktifkan akun yang sudah tidak aktif 409.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Menambah akun petugas (Priority: P1)

**Acceptance Scenarios**:
1. **Given** Admin di Halaman Kelola Akun, **When** menambah Operator Polsek dengan Polsek terpilih, **Then** akun tersimpan, tampil di daftar, dan kata sandi awal tampil satu kali.
2. **Given** Petugas Instansi tanpa Instansi, **When** Simpan, **Then** ditolak dan diminta memilih Instansi.
3. **Given** nomor HP milik akun lain, **When** Simpan, **Then** "Nomor HP sudah dipakai" pada kolom nomor HP dan akun tidak tersimpan.
4. **Given** nama kosong, **When** Simpan, **Then** pesan pada kolom nama dan akun tidak tersimpan.

### User Story 2 - Mengubah dan menonaktifkan (Priority: P1) — 2a, 2b

**Acceptance Scenarios**:
1. **Given** Petugas BPBD, **When** Admin mengubah Instansinya ke Manggala Agni, **Then** data akun berubah.
2. **Given** akun aktif, **When** Admin menonaktifkan dan mengonfirmasi, **Then** akun tidak aktif, tidak dapat masuk, dan token lamanya ditolak.

### User Story 3 - Hak akses (Priority: P1)

**Acceptance Scenarios**:
1. **Given** Operator Polsek, **When** membuka daftar akun, **Then** 403 dan menu Kelola Akun tidak tampil.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001** (FR-04): `GET /api/officers` MUST mengembalikan akun Operator Polsek dan Petugas Instansi beserta peran, Polsek/Instansi, dan status aktif.
- **FR-002** (FR-04, NFR-02): `POST /api/officers` MUST menyimpan akun dengan kata sandi awal acak yang di-*hash* dan mengembalikannya sekali.
- **FR-003** (FR-04): Polsek wajib untuk Operator Polsek dan Instansi wajib untuk Petugas Instansi (422).
- **FR-004** (FR-04): Nomor HP dinormalisasi dan unik (409 dengan pesan kolom).
- **FR-005** (FR-04): `PATCH /api/officers/:id` MUST memperbarui akun dengan aturan yang sama.
- **FR-006** (FR-03, FR-04): `POST /api/officers/:id/deactivate` MUST menonaktifkan akun; akun tidak dapat masuk dan tokennya ditolak.
- **FR-007**: Hanya Admin Polres (403 untuk peran lain). Web MUST menyediakan Halaman Kelola Akun, Formulir Akun, dan Dialog Konfirmasi Nonaktif.

## Success Criteria *(mandatory)*
- **SC-001**: UJ-03.01–UJ-03.07 lulus.
- **SC-002**: Seluruh uji iterasi 1–11 tetap lulus; UJ-02.06 diuji ulang lewat penonaktifan sungguhan (UJ-03.06).
