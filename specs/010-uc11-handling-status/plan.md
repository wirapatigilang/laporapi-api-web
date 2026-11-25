# Implementation Plan: UC-11 Memperbarui Status Penanganan

**Branch**: `010-uc11-handling-status` · **Date**: 2026-11-25 · **Spec**: [spec.md](spec.md)

## Summary

Satu endpoint status/kegiatan untuk Petugas Instansi dan Operator Polsek, kegiatan konfirmasi dan keberangkatan, perubahan ke Penanganan Berlangsung, serta panel Petugas Instansi dan tombol keberangkatan Operator di web.

## Technical Context

TypeScript, Bun 1.4.4, ElysiaJS 1.4, SvelteKit 3.4 + Svelte 5, PostgreSQL 16 (migrasi `010_activity_handling.sql`) · Uji: `bun test` + Playwright 1.63.

## Constitution Check

| Prinsip | Status |
|---|---|
| I. Satu UC = satu fitur | Ya |
| III. Konvensi bahasa | `HandlingService`, `DISPATCH_CONFIRMED`, `TEAM_DEPARTED`, `SECTOR_PERSONNEL_DEPARTED` |
| V. Kontrak API bersama | Endpoint baru `POST /api/reports/:id/status` (dipakai juga Android bila diperlukan) |
| VI. Black Box sebagai bukti | UJ-11.01–UJ-11.11 |
| VII. Keamanan data | Petugas Instansi tidak melihat nomor HP Warga |

## Design

- `services/handling-service.ts`: `update` (validasi isian), `changeStatus`, `recordActivity`, `confirmDispatch`; `registerResolver` untuk UC-12; penambah detail `myDispatch`.
- `routes/handling.ts`: `POST /api/reports/:id/status`.
- Web `routes/reports/[id]`: aksi `?/handling` (`kind` = CONFIRMED, DEPARTED, IN_PROGRESS), panel Petugas Instansi, tombol Catat Keberangkatan Personel di panel Operator.
