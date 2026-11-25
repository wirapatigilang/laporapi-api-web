# Feature Specification: UC-01 Mendaftar Akun Warga

**Feature Branch**: `001-uc01-register-reporter`

**Created**: 2026-11-24

**Status**: Lolos Requirements Review dan Preliminary Design Review (2026-11-24); direvisi 2026-11-24: email dihapus dari requirement

**Input**: Teks UC-01 dari `use-case-sementara.md` versi 4, FR-01, NFR-02, NFR-05, NFR-08, dan domain model (Pengguna, Peran).

**Use case ICONIX**: UC-01 · **Aktor utama**: Warga · **Lapis**: API (dipanggil dari Layar Daftar aplikasi Android)

## Teks use case (sumber)

**Prasyarat:** Warga belum punya akun. **Hasil akhir:** Pengguna baru dengan peran Warga tersimpan dan bisa masuk.

Basic course:
1. Warga membuka Layar Daftar pada aplikasi Android dan mengisi nama, nomor HP, dan kata sandi.
2. Warga menekan tombol Daftar.
3. Sistem memeriksa kelengkapan dan format data, serta memastikan nomor HP belum terdaftar.
4. Sistem menyimpan Pengguna baru dengan peran Warga dan kata sandi yang sudah di-*hash*.
5. Sistem mengirim tanggapan berhasil, lalu aplikasi Android menampilkan Layar Masuk.

Alternate course:
- **3a.** Data tidak lengkap atau formatnya salah: Sistem menolak dan mengembalikan pesan per kolom yang salah.
- **3b.** Nomor HP sudah terdaftar: Sistem menolak dengan pesan "Nomor HP sudah terdaftar".

## Clarifications

### Session 2026-11-24

- Q: Format nomor HP yang sah? → A: Boleh diketik `08…`, `62…`, atau `+62…`; spasi dan tanda hubung diabaikan. Setelah dinormalisasi harus berbentuk `08` diikuti 8–13 angka (10–15 digit) dan disimpan dalam bentuk `08…`, sehingga `+62812…` dan `0812…` dianggap nomor yang sama. Keunikan diperiksa setelah normalisasi.
- ~~Q: Apakah email wajib? → A: Ya.~~ Diganti oleh keputusan Gilang di bawah.
- Q: Batas panjang nama? → A: 2–100 karakter setelah spasi di tepi dibuang.
- Q: Kode status untuk 3a dan 3b? → A: 3a = 422 dengan pesan per kolom; 3b = 409 (NFR-05). [SEPAKATI dengan Android]
- Q: Apakah pendaftaran langsung memberi token (otomatis masuk)? → A: Tidak. Langkah 5 mengarahkan ke Layar Masuk, jadi token baru diberikan di UC-02.

### Perubahan requirement 2026-11-24

- Keputusan Gilang: masuk memakai nomor HP dan kata sandi, **email tidak dipakai lagi** di seluruh sistem (pendaftaran Warga, masuk web dan Android, akun petugas). Akibatnya pada UC-01: kolom email dihapus dari pendaftaran, 3b hanya memeriksa nomor HP dengan pesan "Nomor HP sudah terdaftar", kolom `email` yang tetap dikirim aplikasi lama diabaikan. Kasus uji email (UJ-01.06 dan UJ-01.07 lama) diganti kasus uji batas panjang dan awalan nomor HP.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Warga membuat akun (Priority: P1)

Warga yang belum punya akun mendaftar dari aplikasi Android agar dapat masuk dan mengirim laporan karhutla.

**Why this priority**: Warga wajib punya akun sebelum melapor (ASUMSI-4), jadi semua use case Warga bergantung pada fitur ini.

**Independent Test**: Kirim `POST /api/auth/register` dengan data valid, lalu periksa tanggapan 201 dan bahwa akun dapat dipakai masuk (setelah UC-02 ada) atau bahwa pendaftaran ulang dengan nomor yang sama ditolak 409.

**Acceptance Scenarios** (basic course):

1. **Given** nomor HP belum terdaftar, **When** Warga mengirim nama, nomor HP, dan kata sandi yang valid, **Then** sistem menjawab 201 berisi data pengguna dengan peran `CITIZEN` tanpa kata sandi, dan kata sandi tersimpan dalam bentuk *hash*.
2. **Given** kata sandi tepat 8 karakter dan data lain valid, **When** Warga mendaftar, **Then** sistem menjawab 201.

---

### User Story 2 - Data tidak lengkap atau salah format (Priority: P1) — alternate 3a

**Acceptance Scenarios**:

1. **Given** kata sandi 7 karakter, **When** Warga mendaftar, **Then** sistem menjawab 422 dengan pesan pada kolom `password` dan pengguna tidak tersimpan.
2. **Given** nomor HP berisi huruf, **When** Warga mendaftar, **Then** sistem menjawab 422 dengan pesan pada kolom `phoneNumber`.
3. **Given** nomor HP 9 digit atau diawali selain `08`/`62`/`+62` (misalnya `0215551234`), **When** Warga mendaftar, **Then** sistem menjawab 422 dengan pesan pada kolom `phoneNumber`; nomor 10 digit diterima.
4. **Given** satu atau lebih kolom wajib kosong, **When** Warga mendaftar, **Then** sistem menjawab 422 dan setiap kolom yang kosong mendapat pesannya sendiri.

---

### User Story 3 - Nomor HP sudah terdaftar (Priority: P1) — alternate 3b

**Acceptance Scenarios**:

1. **Given** nomor HP sudah dipakai pengguna lain, **When** Warga mendaftar dengan nomor itu, **Then** sistem menjawab 409 "Nomor HP sudah terdaftar" dan tidak membuat pengguna baru.
2. **Given** nomor `08…` sudah terdaftar, **When** Warga mendaftar dengan nomor yang sama berawalan `+62…`, **Then** sistem menjawab 409 dengan pesan yang sama.

### Edge Cases

- Nomor `+6281234567890` dan `081234567890` dianggap sama (normalisasi), sehingga yang kedua ditolak 409.
- Kolom `email` yang tetap dikirim diabaikan dan tidak disimpan.
- Peran tidak dapat dipilih pengirim: kolom `role` pada permintaan diabaikan, peran selalu `CITIZEN`.
- Format salah diperiksa lebih dulu daripada keunikan (urutan langkah 3 → 3a sebelum 3b).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** (FR-01): Sistem MUST menerima pendaftaran Warga dengan nama, nomor HP, dan kata sandi.
- **FR-002** (FR-01, 3a): Sistem MUST menolak data yang tidak lengkap atau salah format dengan 422 dan pesan bahasa Indonesia per kolom.
- **FR-003** (FR-01, 3b): Sistem MUST menolak nomor HP yang sudah terdaftar (setelah normalisasi) dengan 409 "Nomor HP sudah terdaftar".
- **FR-004** (NFR-02): Sistem MUST menyimpan kata sandi sebagai *hash* dan mensyaratkan paling sedikit 8 dan paling banyak 200 karakter.
- **FR-005**: Sistem MUST memberi peran `CITIZEN` dan status aktif pada akun yang dibuat lewat pendaftaran.
- **FR-006** (NFR-05): Tanggapan berhasil MUST tidak memuat kata sandi atau *hash*-nya.

### Key Entities

- **User (Pengguna)**: nama, nomor HP (unik), *hash* kata sandi, peran, status aktif, waktu dibuat.
- **Role (Peran)**: `CITIZEN`, `ADMIN`, `SECTOR_OPERATOR`, `AGENCY_OFFICER`.

## Success Criteria *(mandatory)*

- **SC-001**: Semua kasus uji UJ-01.01 sampai UJ-01.10 lulus.
- **SC-002**: Tidak ada tanggapan API yang memuat kata sandi atau *hash*-nya.

## Assumptions

- Verifikasi nomor HP lewat OTP tidak termasuk lingkup.
- Aplikasi Android yang menampilkan Layar Masuk setelah 201; API tidak mengarahkan.
