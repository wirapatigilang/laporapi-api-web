# Implementation Plan: UC-07 Memverifikasi Laporan

**Branch**: `005-uc07-verify-report` · **Date**: 2026-11-25 · **Spec**: [spec.md](spec.md)

## Summary

API menambah verifikasi Kejadian (seluruh Laporan di dalamnya) dan permintaan cek lapangan, dengan kunci baris agar dua Admin tidak memproses bersamaan. Riwayat Status diberi jenis kegiatan. Web menambah panel tindakan Admin di Halaman Detail Laporan.

## Technical Context

**Language/Version**: TypeScript, Bun 1.4.4 · **Primary Dependencies**: ElysiaJS 1.4, SvelteKit 3.4 + Svelte 5 (form action + `use:enhance`) · **Storage**: PostgreSQL 16, migrasi `006_status_history_activity.sql` · **Testing**: `bun test` + Playwright 1.63

## Constitution Check

| Prinsip | Status |
|---|---|
| I. Satu UC = satu fitur | Ya (`005-uc07-verify-report`) |
| II. Spec dulu | Ya |
| III. Konvensi bahasa | `VerificationService.verify`, `FIELD_CHECK_REQUESTED`; teks UI Indonesia |
| IV. Stack | Tetap |
| V. Kontrak API bersama | Endpoint baru; `GET /api/reports/:id` menambah `history[].activity`/`activityLabel` (tambahan, tidak mengubah kolom lama) |
| VI. Black Box sebagai bukti | UJ-07.01–UJ-07.09 |
| VII. Keamanan data | Nomor HP hanya untuk Admin/Operator (tetap) |

## Design

- `lib/status.ts`: `ReportStatusRules` (`next`, `canTransitionTo`, `isFinal`) sebagai satu sumber aturan urutan status untuk UC-07–UC-12.
- `lib/activity.ts`: jenis kegiatan dan labelnya.
- `repositories/incident-repository.ts`: `IncidentCommands.lockByReport` (`FOR UPDATE OF i`), `members`, `applyStatus`, `close`, `lastStatusChange`.
- `services/notification-service.ts`: `send(tx, recipients, title, body, reportId)`, `admins`, `sectorOperators`.
- `services/verification-service.ts`: `verify`, `requestFieldCheck`; galat 409 bersama `alreadyProcessed` dipakai juga oleh UC-08.
- `routes/verification.ts`: `POST /api/reports/:id/verify`, `POST /api/reports/:id/notes` (Admin).
- Web `routes/reports/[id]`: aksi `?/verify`, `?/fieldCheck`; panel tindakan, dialog konfirmasi, pesan hasil/galat.

## Project Structure

```text
apps/api/migrations/006_status_history_activity.sql
apps/api/src/{lib/status.ts, lib/activity.ts, repositories/incident-repository.ts, repositories/report-repository.ts,
              services/notification-service.ts, services/verification-service.ts, services/report-view.ts, routes/verification.ts, app.ts}
apps/web/src/routes/reports/[id]/{+page.server.ts, +page.svelte}
tests/blackbox/web/uc07-verify.test.ts
```
