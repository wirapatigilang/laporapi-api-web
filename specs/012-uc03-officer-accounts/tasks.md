---
description: "Task list UC-03 Mengelola Akun Petugas"
---

# Tasks: UC-03 Mengelola Akun Petugas

**Tests**: Wajib (constitution VI).

## Phase 1: US1 Menambah akun (P1) 🎯
- [x] T001 [US1] `OfficerAccountService.list/create`, `validate`, `generateInitialPassword`; route `GET/POST /api/officers`
- [x] T002 [US1] Halaman Kelola Akun, Formulir Akun, kotak kata sandi awal, menu Kelola Akun
- [x] T003 [US1] Uji UJ-03.01–03.04

## Phase 2: US2 Mengubah dan menonaktifkan (P1)
- [x] T004 [US2] `update`, `deactivate`; route `PATCH /api/officers/:id`, `POST /api/officers/:id/deactivate`
- [x] T005 [US2] Penolakan token akun tidak aktif di `authContext`
- [x] T006 [US2] Tombol Ubah, Dialog Konfirmasi Nonaktif
- [x] T007 [US2] Uji UJ-03.05, 03.06 (uji ulang UJ-02.06)

## Phase 3: US3 Hak akses (P1)
- [x] T008 [US3] Uji UJ-03.07
