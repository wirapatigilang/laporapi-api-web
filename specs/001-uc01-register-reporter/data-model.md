# Data Model: UC-01 Mendaftar Akun Pelapor

Class diagram tumbuh per iterasi. Iterasi 1 hanya mengimplementasikan entitas yang disentuh UC-01.

## Entitas yang diimplementasikan

### User (`users`)

| Atribut (kode) | Kolom | Tipe | Aturan |
|---|---|---|---|
| `id` | `id` | UUID, PK | `gen_random_uuid()` |
| `name` | `name` | varchar(100) | wajib, 2–100 karakter |
| `phoneNumber` | `phone_number` | varchar(20), UNIQUE | wajib, dinormalisasi `08…` |
| `passwordHash` | `password_hash` | text | Argon2id |
| `role` | `role` | enum `user_role` | `REPORTER`, `ADMIN`, `SECTOR_OPERATOR`, `AGENCY_OFFICER`; pendaftaran selalu `REPORTER` |
| `isActive` | `is_active` | boolean | default `true` |
| `createdAt` | `created_at` | timestamptz | default `now()` |

Atribut `policeSectorId` dan `agencyId` pada class diagram belum dibuat; ditambahkan pada iterasi yang pertama kali membutuhkannya (UC-02 untuk data awal petugas).

## Operasi (dari sequence diagram UC-01)

| Kelas | Operasi | Pesan sequence |
|---|---|---|
| `AuthService` | `register(input): PublicUser` | `POST /api/auth/register` |
| `AuthService` | `validateRegistration(input): FieldErrors` | `validateFormat(data)` |
| `UserRepository` | `findByPhoneNumber(phone): User?` | `findByPhoneNumber(phone)` |
| `AuthService` | `hashPassword(password): string` | `hashPassword(password)` |
| `UserRepository` | `create(user): User` | `save(role = REPORTER)` |

Catatan: pada class diagram draf, operasi akses data ditulis pada entitas `User`; di implementasi dipisah ke `UserRepository` agar entitas tetap data murni. Perbedaan ini dicatat di CDR.


> Revisi 2026-11-24: kolom `email` dihapus (migrasi `004_remove_user_email.sql`) karena masuk hanya memakai nomor HP.
