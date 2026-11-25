# Implementation Plan: UC-10 Meneruskan Laporan ke Instansi

**Branch**: `009-uc10-dispatch` · **Date**: 2026-11-25 · **Spec**: [spec.md](spec.md)

## Summary

Tabel Penerusan, endpoint daftar Instansi dan Penerusan, penanda "belum direspons", cakupan Petugas Instansi, Instansi penerima pada detail (petugas dan Warga), serta Dialog Teruskan ke Instansi di web.

## Technical Context

TypeScript, Bun 1.4.4, ElysiaJS 1.4, SvelteKit 3.4 + Svelte 5, PostgreSQL 16 (migrasi `009_dispatches.sql`) · Uji: `bun test` + Playwright 1.63.

## Constitution Check

| Prinsip | Status |
|---|---|
| I. Satu UC = satu fitur | Ya |
| III. Konvensi bahasa | `DispatchService.dispatch`, `Dispatch`, `AGENCY_ADDED`, `RESPONSE_LIMIT_MIN`; teks UI Indonesia |
| V. Kontrak API bersama | Endpoint baru; `isOverdue`, `dispatches`, `handlingAgencies` ditambahkan |
| VI. Black Box sebagai bukti | UJ-10.01–UJ-10.09 |
| VII. Keamanan data | Petugas Instansi hanya melihat Laporan yang diteruskan ke Instansinya, tanpa nomor HP Warga |

## Design

- `services/dispatch-service.ts`: `Agencies.list`, `DispatchQueries.forIncident`, `overdueIncidents`, `DispatchService.dispatch`, penambah daftar/detail/detail Warga.
- `repositories/incident-repository.ts`: cakupan `agencyId`, `agencyIdsOf` (siaran SSE).
- `services/access.ts`: `isDispatchedToAgency` aktif. `services/report-view.ts`: `scopeFor` Petugas Instansi.
- `routes/dispatch.ts`: `GET /api/agencies`, `POST /api/reports/:id/dispatches`.
- Web `routes/reports/[id]`: Dialog Teruskan ke Instansi (kotak centang, tanda "sudah diteruskan"), aksi `?/dispatch`, kartu Instansi penerima.
- Uji: `scenario.ts` menambah `agencyId`, `newOfficer`, `verifiedReport`, `dispatchTo`.
