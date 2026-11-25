# Feature Specification: UC-02 Masuk ke Sistem

**Feature Branch**: `002-uc02-sign-in`

**Created**: 2026-11-24

**Status**: Lolos Requirements Review dan Preliminary Design Review (2026-11-24)

**Input**: Teks UC-02 (use case v4), FR-02, FR-03, NFR-01, NFR-05, NFR-08.

**Use case ICONIX**: UC-02 · **Aktor utama**: Warga (lewat Android), Admin Polres, Operator Polsek, dan Petugas Instansi (lewat web), tanpa aktor umum (generalisasi) · **Lapis**: Web + API

## Teks use case (sumber)

**Prasyarat:** Pengguna sudah punya akun yang aktif. **Hasil akhir:** Pengguna mendapat sesi/token dan diarahkan ke halaman sesuai Peran.

Basic course:
1. Pengguna membuka Halaman Masuk (atau Layar Masuk di Android) dan mengisi nomor HP serta kata sandi. Aplikasi menyertakan penanda kanal, yaitu `web` dari Halaman Masuk dan `android` dari aplikasi Android.
2. Pengguna menekan tombol Masuk.
3. Sistem mencocokkan data dengan Pengguna yang tersimpan.
4. Sistem membuat token sesi yang memuat Peran pengguna.
5. Sistem mengarahkan pengguna sesuai Peran: Warga ke Layar Home, Admin Polres dan Operator Polsek ke Dasbor Laporan, Petugas Instansi ke Dasbor Laporan yang hanya berisi Laporan yang diteruskan ke Instansi-nya.

Alternate course:
- **3a.** Nomor HP atau kata sandi salah: "Nomor HP atau kata sandi salah" tanpa menyebut bagian mana yang salah.
- **3b.** Akun dinonaktifkan: "Akun Anda tidak aktif, hubungi Admin Polres".
- **3c.** Warga mencoba masuk ke aplikasi web (kanal `web`): "Akun warga hanya dapat dipakai di aplikasi Android".
- **Kapan saja.** Token kedaluwarsa: Sistem menolak permintaan berikutnya dan meminta pengguna masuk ulang.

## Clarifications

### Session 2026-11-24

- Q: Bentuk token? → A: JWT (HS256) di header `Authorization: Bearer`, berisi `sub` (id pengguna) dan `role`. Masa berlaku 12 jam (`TOKEN_TTL_SECONDS`). *(keputusan kerja)* [SEPAKATI dengan Android]
- Q: Bagaimana akun petugas tersedia sebelum UC-03? → A: Disiapkan sebagai data awal (*seed*) sesuai Bab 4 subbab 4.2.3: satu Admin Polres, satu Operator Polsek per Polsek contoh, satu Petugas Instansi.
- Q: Kode status 3a/3b/3c dan token kedaluwarsa? → A: 3a = 401, 3b = 403, 3c = 403, token kedaluwarsa/tidak sah = 401 (sesuai sequence diagram draf). [SEPAKATI]
- Q: Urutan pemeriksaan bila akun nonaktif dan kata sandi salah? → A: Kata sandi diperiksa lebih dulu; akun nonaktif dengan kata sandi salah tetap mendapat pesan 3a agar status akun tidak bocor.
- Q: Penanda kanal tidak dikirim atau bernilai lain? → A: 422 dengan pesan pada kolom `channel`.
- Q: Langkah 5 untuk Petugas Instansi (dasbor tersaring)? → A: UC-02 hanya mengarahkan ke Dasbor Laporan dan menampilkan nama Instansi pengguna; penyaringan isi dasbor adalah bagian UC-06 dan diuji di sana.
- Q: Masuk dengan email? → A: Tidak. Keputusan Gilang 2026-11-24: masuk hanya dengan nomor HP dan kata sandi; kolom permintaan `identifier` diganti `phoneNumber`. Isian berupa email dijawab 401 dengan pesan 3a.
- Q: Di mana token disimpan pada aplikasi web? → A: Cookie `httpOnly` yang dipasang server SvelteKit; peramban tidak memegang token di JavaScript.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Petugas masuk lewat web (Priority: P1)

**Independent Test**: Buka Halaman Masuk, isi data akun *seed*, tekan Masuk, lihat Dasbor Laporan.

**Acceptance Scenarios**:
1. **Given** akun Admin Polres aktif, **When** masuk di Halaman Masuk dengan data benar, **Then** diarahkan ke Dasbor Laporan.
2. **Given** akun Petugas Instansi aktif, **When** masuk dengan data benar, **Then** diarahkan ke Dasbor Laporan yang menampilkan nama Instansi-nya.
3. **Given** akun Operator Polsek aktif, **When** masuk dengan nomor HP berawalan `+62…` untuk akun yang tersimpan `08…`, **Then** diarahkan ke Dasbor Laporan.

### User Story 2 - Warga masuk lewat Android (Priority: P1)

**Acceptance Scenarios**:
1. **Given** akun Warga aktif, **When** `POST /api/auth/login` dengan kanal `android`, **Then** 200 berisi token berperan `CITIZEN` dan data pengguna tanpa kata sandi.

### User Story 3 - Kegagalan masuk (Priority: P1) — 3a, 3b, 3c

**Acceptance Scenarios**:
1. **Given** kata sandi salah, **When** masuk di web, **Then** tampil "Nomor HP atau kata sandi salah" (API 401).
2. **Given** nomor HP tidak terdaftar, **When** masuk, **Then** pesan sama dengan skenario 1.
3. **Given** akun nonaktif dengan kata sandi benar, **When** masuk, **Then** tampil "Akun Anda tidak aktif, hubungi Admin Polres" (API 403).
4. **Given** akun Warga, **When** masuk di Halaman Masuk web (kanal `web`), **Then** ditolak dengan "Akun warga hanya dapat dipakai di aplikasi Android" (API 403).
5. **Given** penanda kanal tidak dikirim, **When** `POST /api/auth/login`, **Then** 422 dengan pesan pada `channel`.

### User Story 4 - Token kedaluwarsa (Priority: P2) — "Kapan saja"

**Acceptance Scenarios**:
1. **Given** token yang masa berlakunya sudah lewat, **When** memanggil `GET /api/auth/me`, **Then** 401 dengan pesan meminta masuk ulang.
2. **Given** tanpa token, **When** memanggil `GET /api/auth/me`, **Then** 401.
3. **Given** sesi web dengan token kedaluwarsa, **When** membuka Dasbor Laporan, **Then** diarahkan ke Halaman Masuk dengan pesan "Sesi berakhir, silakan masuk kembali".

### Edge Cases
- Nomor HP ditulis `+62…` saat masuk tetap cocok dengan akun `08…` (normalisasi sama dengan UC-01).
- Isian berupa email (format lama) dijawab 401 dengan pesan 3a.
- Pengguna yang sudah masuk membuka Halaman Masuk langsung diarahkan ke Dasbor.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001** (FR-02): Sistem MUST menerima masuk dengan nomor HP, kata sandi, dan penanda kanal.
- **FR-002** (FR-02): Sistem MUST mengembalikan token yang memuat id dan Peran, dan aplikasi web MUST mengarahkan petugas ke Dasbor Laporan.
- **FR-003** (FR-03, 3a): Data salah MUST dijawab 401 dengan pesan yang tidak menyebut bagian yang salah.
- **FR-004** (FR-03, 3b): Akun nonaktif MUST ditolak 403 dengan pesannya.
- **FR-005** (FR-03, 3c): Akun Warga dengan kanal `web` MUST ditolak 403.
- **FR-006** (FR-03): Token kedaluwarsa atau tidak sah MUST ditolak 401 pada setiap *endpoint* terlindungi.
- **FR-007** (NFR-01): Sistem MUST menyediakan pemeriksa token dan peran yang dipakai ulang oleh *endpoint* berikutnya.
- **FR-008**: Aplikasi web MUST menyediakan tombol Keluar yang menghapus sesi.

### Key Entities
- **User**: + `policeSectorId?` (Operator Polsek), `agencyId?` (Petugas Instansi).
- **PoliceSector (Polsek)**, **Agency (Instansi)**: data awal, dibutuhkan akun *seed*.

## Success Criteria *(mandatory)*
- **SC-001**: Semua kasus uji UJ-02.01–UJ-02.16 lulus.
- **SC-002**: Kasus uji UC-01 tetap lulus (regresi, karena tabel `users` berubah).

## Assumptions
- Lupa kata sandi di luar lingkup.
- Dasbor Laporan pada iterasi ini masih kerangka; isinya dibangun di UC-06.
