---
description: "Task list UC-01 Mendaftar Akun Pelapor"
---

# Tasks: UC-01 Mendaftar Akun Pelapor

**Input**: Design documents from `/specs/001-uc01-register-reporter/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Wajib menurut constitution VI (Black Box per skenario penerimaan).

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Buat monorepo Bun workspaces (`package.json`, `apps/api`, `tests/blackbox`) dan `.gitignore`
- [x] T002 Pasang dependensi API (elysia, @elysiajs/cors) di `apps/api/package.json`
- [x] T003 [P] Buat `.env.example` dan `apps/api/src/config.ts` (PORT, DATABASE_URL, JWT_SECRET)

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 Koneksi basis data `apps/api/src/db/client.ts` (Bun.sql)
- [x] T005 Runner migrasi `apps/api/src/db/migrate.ts` dengan tabel `schema_migrations`
- [x] T006 [P] Bentuk galat dan penanganan galat global `apps/api/src/lib/errors.ts`
- [x] T007 Rakit aplikasi `apps/api/src/app.ts` dan `apps/api/src/index.ts` (+ `GET /api/health`)
- [x] T008 [P] Helper uji Black Box `tests/blackbox/helpers.ts` (API_URL, pembuat data unik, akses DB uji untuk kondisi awal)

## Phase 3: User Story 1 – Pelapor membuat akun (P1) 🎯 MVP

- [x] T009 [US1] Migrasi `apps/api/migrations/001_users.sql` (enum `user_role`, tabel `users`)
- [x] T010 [P] [US1] Normalisasi nomor HP `apps/api/src/lib/phone.ts`
- [x] T011 [US1] `UserRepository` (`findByPhoneOrEmail`, `create`) di `apps/api/src/repositories/user-repository.ts`
- [x] T012 [US1] `AuthService.register` + `validateRegistration` di `apps/api/src/services/auth-service.ts`
- [x] T013 [US1] Route `POST /api/auth/register` di `apps/api/src/routes/auth.ts`
- [x] T014 [US1] Uji UJ-01.01, UJ-01.03 di `tests/blackbox/uc01-register.test.ts`

## Phase 4: User Story 2 – Data tidak lengkap/salah format (3a)

- [x] T015 [US2] Uji UJ-01.02, UJ-01.04, UJ-01.07, UJ-01.08

## Phase 5: User Story 3 – Sudah terdaftar (3b)

- [x] T016 [US3] Uji UJ-01.05, UJ-01.06, UJ-01.09

## Phase 6: Polish

- [x] T017 Jalankan semua uji, catat di `test-results.md`
- [x] T018 `/speckit.converge`: periksa kode vs spec/plan/tasks

## Dependencies

Setup → Foundational → US1 → (US2, US3 paralel, berbagi endpoint yang sama) → Polish.
