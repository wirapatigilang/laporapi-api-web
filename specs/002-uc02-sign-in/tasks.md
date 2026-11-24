---
description: "Task list UC-02 Masuk ke Sistem"
---

# Tasks: UC-02 Masuk ke Sistem

**Tests**: Wajib (constitution VI).

## Phase 1: Setup
- [x] T001 Pasang `@elysiajs/jwt` di `apps/api`
- [x] T002 Buat aplikasi SvelteKit di `apps/web` (Svelte 5, TypeScript, adapter-node)
- [x] T003 [P] Pasang Playwright di `tests/blackbox`

## Phase 2: Foundational
- [x] T004 Migrasi `apps/api/migrations/002_sectors_agencies.sql`
- [x] T005 Data awal `apps/api/src/db/seed.ts` (7 Polsek, 5 Instansi, akun Admin/Operator/Petugas)
- [x] T006 Plugin `apps/api/src/plugins/auth-guard.ts` (`verifyToken`, `requireRole`)

## Phase 3: US2 Pelapor masuk lewat API (P1)
- [x] T007 [US2] `AuthService.login`, `issueToken` di `apps/api/src/services/auth-service.ts`
- [x] T008 [US2] `POST /api/auth/login`, `GET /api/auth/me` di `apps/api/src/routes/auth.ts`
- [x] T009 [US2] Uji UJ-02.03 di `tests/blackbox/uc02-sign-in.test.ts`

## Phase 4: US3 Kegagalan masuk
- [x] T010 [US3] Uji API UJ-02.10 (kanal kosong)

## Phase 5: US4 Token kedaluwarsa
- [x] T011 [US4] Uji UJ-02.08, UJ-02.11

## Phase 6: US1 Petugas masuk lewat web
- [x] T012 [US1] `hooks.server.ts`, `lib/server/api.ts`
- [x] T013 [US1] LoginPage `/login` (form action, pesan galat, pengalihan)
- [x] T014 [US1] DashboardPage `/dashboard` kerangka (nama, peran, Polsek/Instansi) + Keluar
- [x] T015 [US1] Uji web UJ-02.01, 02, 04, 05, 06, 07, 09, 12 di `tests/blackbox/web/uc02-login.test.ts`

## Phase 7: Polish
- [x] T016 Regresi UC-01, catat `test-results.md`, converge

## Phase 8: Perbaikan setelah pemeriksaan (ditambahkan converge)
- [x] T017 Pesan galat per kolom tampil di Halaman Masuk (sebelumnya hanya "Data tidak valid")
- [x] T018 Isian nomor HP/email tidak hilang bila diketik sebelum halaman selesai dimuat (`defaultValue`), uji UJ-02.15
- [x] T019 Gaya huruf global dipindah ke `+layout.svelte`
