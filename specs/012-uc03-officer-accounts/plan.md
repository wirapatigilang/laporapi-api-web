# Implementation Plan: UC-03 Mengelola Akun Petugas

**Branch**: `012-uc03-officer-accounts` · **Date**: 2026-11-25 · **Spec**: [spec.md](spec.md)

## Summary

CRUD akun petugas (tanpa hapus) untuk Admin Polres, kata sandi awal sekali tampil, penolakan token akun tidak aktif, dan Halaman Kelola Akun di web. Tanpa migrasi (kolom `is_active`, `police_sector_id`, `agency_id` sudah ada sejak iterasi 2).

## Constitution Check

| Prinsip | Status |
|---|---|
| I. Satu UC = satu fitur | Ya |
| III. Konvensi bahasa | `OfficerAccountService`, `generateInitialPassword`; teks UI Indonesia |
| V. Kontrak API bersama | Endpoint baru; token akun tidak aktif kini 401 `ACCOUNT_INACTIVE` (perubahan perilaku, diuji ulang seluruh rangkaian) |
| VI. Black Box sebagai bukti | UJ-03.01–UJ-03.07 |
| VII. Keamanan data | Kata sandi di-*hash* argon2id, kata sandi awal tidak disimpan dalam bentuk asli |

## Design

- `services/officer-service.ts`: `list`, `create`, `update`, `deactivate`, `validate`, `generateInitialPassword`.
- `routes/officers.ts`: `GET/POST /api/officers`, `PATCH /api/officers/:id`, `POST /api/officers/:id/deactivate`.
- `plugins/auth-guard.ts`: token akun tidak aktif → `ACCOUNT_INACTIVE`.
- Web `routes/officers`: daftar, Formulir Akun (tambah/ubah, isian Polsek/Instansi mengikuti peran), kotak kata sandi awal, Dialog Konfirmasi Nonaktif; menu "Kelola Akun" khusus Admin.
