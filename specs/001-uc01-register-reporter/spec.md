# Feature Specification: UC-01 Mendaftar Akun Pelapor

**Feature Branch**: `001-uc01-register-reporter`

**Created**: 2026-11-24

**Status**: Lolos Requirements Review dan Preliminary Design Review (2026-11-24)

**Input**: Teks UC-01 dari `use-case-sementara.md` versi 4, FR-01, NFR-02, NFR-05, NFR-08, dan domain model (Pengguna, Peran).

**Use case ICONIX**: UC-01 · **Aktor utama**: Pelapor · **Lapis**: API (dipanggil dari Layar Daftar aplikasi Android)

## Teks use case (sumber)

**Prasyarat:** Pelapor belum punya akun. **Hasil akhir:** Pengguna baru dengan peran Pelapor tersimpan dan bisa masuk.

Basic course:
1. Pelapor membuka Layar Daftar pada aplikasi Android dan mengisi nama, nomor HP, email, dan kata sandi.
2. Pelapor menekan tombol Daftar.
3. Sistem memeriksa kelengkapan dan format data, serta memastikan nomor HP dan email belum terdaftar.
4. Sistem menyimpan Pengguna baru dengan peran Pelapor dan kata sandi yang sudah di-*hash*.
5. Sistem mengirim tanggapan berhasil, lalu aplikasi Android menampilkan Layar Masuk.

Alternate course:
- **3a.** Data tidak lengkap atau formatnya salah: Sistem menolak dan mengembalikan pesan per kolom yang salah.
- **3b.** Nomor HP atau email sudah terdaftar: Sistem menolak dengan pesan "Nomor HP/email sudah terdaftar".

## Clarifications

### Session 2026-11-24

- Q: Format nomor HP yang sah? → A: Nomor seluler Indonesia, diawali `08` atau `+628`/`628`, berisi 10–15 digit setelah dinormalisasi. Disimpan dalam bentuk `08…` agar `+62812…` dan `0812…` dianggap nomor yang sama. *(keputusan kerja, perlu dikonfirmasi Gilang)*
- Q: Apakah email wajib? → A: Ya, sesuai teks use case (nama, nomor HP, email, kata sandi semuanya wajib). Email dibandingkan tanpa membedakan huruf besar/kecil.
- Q: Batas panjang nama? → A: 2–100 karakter setelah spasi di tepi dibuang.
- Q: Kode status untuk 3a dan 3b? → A: 3a = 422 dengan pesan per kolom; 3b = 409 (NFR-05). [SEPAKATI dengan Android]
- Q: Apakah pendaftaran langsung memberi token (otomatis masuk)? → A: Tidak. Langkah 5 mengarahkan ke Layar Masuk, jadi token baru diberikan di UC-02.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pelapor membuat akun (Priority: P1)

Warga yang belum punya akun mendaftar dari aplikasi Android agar dapat masuk dan mengirim laporan karhutla.

**Why this priority**: Pelapor wajib punya akun sebelum melapor (ASUMSI-4), jadi semua use case Pelapor bergantung pada fitur ini.

**Independent Test**: Kirim `POST /api/auth/register` dengan data valid, lalu periksa tanggapan 201 dan bahwa akun dapat dipakai masuk (setelah UC-02 ada) atau bahwa pendaftaran ulang dengan nomor yang sama ditolak 409.

**Acceptance Scenarios** (basic course):

1. **Given** nomor HP dan email belum terdaftar, **When** Pelapor mengirim nama, nomor HP, email, dan kata sandi yang valid, **Then** sistem menjawab 201 berisi data pengguna dengan peran `REPORTER` tanpa kata sandi, dan kata sandi tersimpan dalam bentuk *hash*.
2. **Given** kata sandi tepat 8 karakter dan data lain valid, **When** Pelapor mendaftar, **Then** sistem menjawab 201.

---

### User Story 2 - Data tidak lengkap atau salah format (Priority: P1) — alternate 3a

**Acceptance Scenarios**:

1. **Given** kata sandi 7 karakter, **When** Pelapor mendaftar, **Then** sistem menjawab 422 dengan pesan pada kolom `password` dan pengguna tidak tersimpan.
2. **Given** nomor HP berisi huruf, **When** Pelapor mendaftar, **Then** sistem menjawab 422 dengan pesan pada kolom `phoneNumber`.
3. **Given** email tidak berformat email, **When** Pelapor mendaftar, **Then** sistem menjawab 422 dengan pesan pada kolom `email`.
4. **Given** satu atau lebih kolom wajib kosong, **When** Pelapor mendaftar, **Then** sistem menjawab 422 dan setiap kolom yang kosong mendapat pesannya sendiri.

---

### User Story 3 - Nomor HP atau email sudah terdaftar (Priority: P1) — alternate 3b

**Acceptance Scenarios**:

1. **Given** nomor HP sudah dipakai pengguna lain, **When** Pelapor mendaftar dengan nomor itu, **Then** sistem menjawab 409 "Nomor HP/email sudah terdaftar" dan tidak membuat pengguna baru.
2. **Given** email sudah dipakai pengguna lain, **When** Pelapor mendaftar dengan email itu (huruf besar/kecil berbeda), **Then** sistem menjawab 409 dengan pesan yang sama.

### Edge Cases

- Nomor `+6281234567890` dan `081234567890` dianggap sama (normalisasi), sehingga yang kedua ditolak 409.
- Peran tidak dapat dipilih pengirim: kolom `role` pada permintaan diabaikan, peran selalu `REPORTER`.
- Format salah diperiksa lebih dulu daripada keunikan (urutan langkah 3 → 3a sebelum 3b).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** (FR-01): Sistem MUST menerima pendaftaran Pelapor dengan nama, nomor HP, email, dan kata sandi.
- **FR-002** (FR-01, 3a): Sistem MUST menolak data yang tidak lengkap atau salah format dengan 422 dan pesan bahasa Indonesia per kolom.
- **FR-003** (FR-01, 3b): Sistem MUST menolak nomor HP atau email yang sudah terdaftar dengan 409 "Nomor HP/email sudah terdaftar".
- **FR-004** (NFR-02): Sistem MUST menyimpan kata sandi sebagai *hash* dan mensyaratkan paling sedikit 8 karakter.
- **FR-005**: Sistem MUST memberi peran `REPORTER` dan status aktif pada akun yang dibuat lewat pendaftaran.
- **FR-006** (NFR-05): Tanggapan berhasil MUST tidak memuat kata sandi atau *hash*-nya.

### Key Entities

- **User (Pengguna)**: nama, nomor HP (unik), email (unik), *hash* kata sandi, peran, status aktif, waktu dibuat.
- **Role (Peran)**: `REPORTER`, `ADMIN`, `SECTOR_OPERATOR`, `AGENCY_OFFICER`.

## Success Criteria *(mandatory)*

- **SC-001**: Semua kasus uji UJ-01.01 sampai UJ-01.09 lulus.
- **SC-002**: Tidak ada tanggapan API yang memuat kata sandi atau *hash*-nya.

## Assumptions

- Verifikasi nomor HP lewat OTP tidak termasuk lingkup.
- Aplikasi Android yang menampilkan Layar Masuk setelah 201; API tidak mengarahkan.
