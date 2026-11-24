# Catatan Tinjauan Iterasi 2: UC-02 Masuk ke Sistem

## 1. Requirements Review (2026-11-24)

| No | Temuan | Tindakan |
|---|---|---|
| RR-2.1 | Teks use case tidak menyebut cara pemeriksaan token pada "Kapan saja"; butuh *endpoint* terlindungi untuk diuji | Ditambah `GET /api/auth/me` (data pengguna yang sedang masuk); berguna juga untuk Android |
| RR-2.2 | Penanda kanal yang kosong/tidak dikenal belum diatur | 422 pada kolom `channel` (US3-5) |
| RR-2.3 | Akun petugas belum bisa dibuat sebelum UC-03 (iterasi 12) | Data awal (*seed*) akun petugas, sesuai Bab 4 4.2.3 |
| RR-2.4 | Langkah 5 Petugas Instansi menyebut dasbor tersaring, padahal isi dasbor milik UC-06 | Di UC-02 hanya pengalihan + nama Instansi; penyaringan diuji di UC-06 (UJ-02.02 Bab 4 perlu disesuaikan) |
| RR-2.5 | Tambahan kasus uji: masuk dengan email (US1-3), kanal kosong (US3-5), tanpa token (US4-2), sesi web kedaluwarsa (US4-3) | Ditambah UJ-02.09–UJ-02.12 |

Hasil: **lolos**.

## 2. Preliminary Design Review (2026-11-24)

Robustness: `iconix/uc02-robustness.png`. Semua langkah 1–5, 3a, 3b, 3c, dan "kapan saja" terwakili (Cari Pengguna, Cocokkan kata sandi, Periksa akun aktif, Periksa kanal, Buat token, Arahkan, Periksa token).

Temuan:
- PDR-2.1: entity PoliceSector dan Agency belum muncul di diagram walau akun petugas terkait ke keduanya (untuk menampilkan nama Instansi di langkah 5). Domain model sudah memuatnya; atribut `policeSectorId`/`agencyId` pada User diimplementasikan di iterasi ini. Diagram tidak diubah karena relasi ini milik UC-03/UC-06.

Hasil: **lolos**.

## 3. Critical Design Review (2026-11-24)

| Pemeriksaan | Hasil |
|---|---|
| Langkah 1–5, 3a–3c ↔ pesan sequence | Cocok |
| "Kapan saja" ↔ pesan sequence | Draf hanya berupa catatan; ditambah pesan `GET /api/auth/me` → `verifyToken` → 401 (A-2.1) |
| Pesan ↔ operasi class | `verifyPassword` dipindah dari entitas `User` ke `AuthService` (konsisten dengan A-1 iterasi 1) |
| Skenario ↔ kontrak | Semua kode status (200/401/403/422) ada di kontrak |
| Regresi | Tabel `users` berubah → kasus uji UC-01 wajib dijalankan ulang |

Hasil: **lolos**.


## Perubahan requirement (2026-11-24): masuk hanya dengan nomor HP

| No | Dampak | Tindakan |
|---|---|---|
| CR-2.1 | Teks UC-02 langkah 1 dan 3a menyebut email | Spec diperbarui; pesan 3a "Nomor HP atau kata sandi salah" |
| CR-2.2 | Kontrak `POST /api/auth/login` memakai `identifier` (nomor HP atau email) | Diganti `phoneNumber`; perlu disampaikan ke pengembang Android |
| CR-2.3 | Robustness dan sequence menyebut email/`findByPhoneOrEmail` | Label dan pesan diubah menjadi nomor HP/`findByPhoneNumber` |
| CR-2.4 | UJ-02.09 (masuk dengan email) kehilangan dasar | Diganti masuk dengan `+62…`; ditambah UJ-02.16 |
