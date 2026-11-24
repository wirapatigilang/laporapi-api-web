# Implementation Plan: UC-02 Masuk ke Sistem

**Branch**: `002-uc02-sign-in` | **Date**: 2026-11-24 | **Spec**: [spec.md](spec.md)

## Summary

`POST /api/auth/login` dan `GET /api/auth/me` di API, plugin `authGuard` untuk semua *endpoint* terlindungi berikutnya, data awal Polsek/Instansi/akun petugas, serta aplikasi web SvelteKit pertama: Halaman Masuk (`/login`), kerangka Dasbor Laporan (`/dashboard`), dan Keluar.

## Technical Context

**Language/Version**: TypeScript, Bun 1.4.4 · **Primary Dependencies**: ElysiaJS 1.4.32, @elysiajs/jwt 1.4.2; SvelteKit 2, Svelte 5, adapter-node · **Storage**: PostgreSQL 16 · **Testing**: `bun test` (HTTP) + Playwright (peramban) · **Project Type**: web-service + web-app

## Detailed Design (ICONIX)

- Sequence diagram: [`iconix/uc02-sequence.png`](iconix/uc02-sequence.png) dipakai tanpa perubahan; ditambah pesan `GET /api/auth/me` untuk "kapan saja" (lihat CDR).
- Class diagram iterasi 2: `User` (+`policeSectorId`, `agencyId`, `canSignInFrom`), `PoliceSector`, `Agency`, `AuthService` (+`login`, `issueToken`, `verifyToken`). Lihat [data-model.md](data-model.md).
- Kontrak: [contracts/openapi.yaml](contracts/openapi.yaml).

## Constitution Check

I ✅ · II ✅ · III ✅ (`/login`, `LoginPage`, pesan Indonesia) · IV ✅ (SvelteKit) · V ✅ (401/403/422) · VI ✅ (12 kasus uji, termasuk web) · VII ✅ (token di cookie httpOnly, rahasia dari env)

## Project Structure

```text
apps/api/migrations/002_sectors_agencies.sql
apps/api/src/db/seed.ts
apps/api/src/plugins/auth-guard.ts
apps/api/src/services/auth-service.ts (+login)
apps/api/src/routes/auth.ts (+login, me)
apps/web/                       # SvelteKit
├── src/hooks.server.ts         # baca cookie sesi → locals.user
├── src/lib/server/api.ts       # pemanggil API dari server
├── src/routes/login/+page.svelte, +page.server.ts     # LoginPage
├── src/routes/dashboard/+page.svelte, +page.server.ts # DashboardPage (kerangka)
└── src/routes/logout/+server.ts
tests/blackbox/uc02-sign-in.test.ts, tests/blackbox/web/uc02-login.test.ts
```

## Complexity Tracking

Tidak ada pelanggaran.
