# Implementation Plan: UC-01 Mendaftar Akun Pelapor

**Branch**: `001-uc01-register-reporter` | **Date**: 2026-11-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-uc01-register-reporter/spec.md`

## Summary

Endpoint publik `POST /api/auth/register` untuk Pelapor. `AuthService` memvalidasi format (3a), memeriksa keunikan nomor HP (3b), meng-*hash* kata sandi, dan menyimpan `User` berperan `REPORTER`. Iterasi ini juga membangun fondasi bersama: aplikasi ElysiaJS, koneksi PostgreSQL, migrasi, format galat, dan kerangka uji Black Box.

## Technical Context

**Language/Version**: TypeScript di Bun 1.4.4

**Primary Dependencies**: ElysiaJS 1.4.32, @elysiajs/cors

**Storage**: PostgreSQL 16 (tanpa PostGIS), via `Bun.sql`

**Testing**: Uji Black Box HTTP dengan `bun test` di `tests/blackbox/` (tidak mengimpor kode aplikasi)

**Target Platform**: Server Linux; klien Android (Khoirul) dan aplikasi web

**Project Type**: web-service + web-app (monorepo)

**Performance Goals**: tidak ada target khusus (skala satu kabupaten)

**Constraints**: pesan galat bahasa Indonesia, identifier bahasa Inggris

**Scale/Scope**: ratusan pengguna

## Detailed Design (ICONIX)

- Sequence diagram: [`iconix/uc01-sequence.png`](iconix/uc01-sequence.png) (draf `skripsi/iconix/`, dipakai tanpa perubahan pesan).
- Class diagram iterasi 1: `User`, `Role`, `AuthService`, `UserRepository` (lihat [data-model.md](data-model.md)).
- Kontrak API: [contracts/openapi.yaml](contracts/openapi.yaml).

## Constitution Check

| Prinsip | Status |
|---|---|
| I. Satu UC = satu fitur | ✅ hanya UC-01 |
| II. Spec dulu | ✅ spec lolos RR & PDR sebelum plan |
| III. Konvensi bahasa | ✅ `User`, `phoneNumber`, `/api/auth/register`; pesan Indonesia |
| IV. Stack | ✅ Bun, ElysiaJS, PostgreSQL via Bun.sql |
| V. Kontrak API | ✅ OpenAPI ditulis; 201/409/422 |
| VI. Black Box | ✅ 9 kasus uji UJ-01.01–09 dari skenario |
| VII. Keamanan | ✅ Argon2id, kata sandi tak pernah dikembalikan |

## Project Structure

### Documentation (this feature)

```text
specs/001-uc01-register-reporter/
├── spec.md, reviews.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/openapi.yaml
├── iconix/ (robustness + sequence UC-01)
├── tasks.md
└── test-results.md
```

### Source Code (repository root)

```text
apps/api/
├── migrations/001_users.sql
└── src/
    ├── index.ts            # menjalankan server
    ├── app.ts              # createApp(): rakit route + penanganan galat
    ├── config.ts
    ├── db/client.ts, db/migrate.ts
    ├── lib/errors.ts       # ApiError, bentuk galat
    ├── lib/phone.ts        # normalisasi nomor HP
    ├── repositories/user-repository.ts
    ├── services/auth-service.ts
    └── routes/auth.ts
tests/blackbox/
├── helpers.ts
└── uc01-register.test.ts
```

**Structure Decision**: monorepo Bun workspaces (`apps/api`, `apps/web`, `tests/blackbox`). Aplikasi web baru dibuat pada iterasi UC-02 karena UC-01 hanya lapis API.

## Complexity Tracking

Tidak ada pelanggaran constitution.
