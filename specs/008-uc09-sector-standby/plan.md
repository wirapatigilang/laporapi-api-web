# Implementation Plan: UC-09 Menyiagakan Personel Polsek

**Branch**: `008-uc09-sector-standby` · **Date**: 2026-11-25 · **Spec**: [spec.md](spec.md)

## Summary

Kegiatan `SECTOR_STANDBY` pada Riwayat Status, tanda siaga pada daftar Kejadian dan detail, Daftar Notifikasi web, dan panel Operator di Halaman Detail Laporan.

## Technical Context

TypeScript, Bun 1.4.4, ElysiaJS 1.4, SvelteKit 3.4 + Svelte 5, PostgreSQL 16 (migrasi `008_activity_sector_standby.sql`) · Uji: `bun test` + Playwright 1.63.

## Constitution Check

| Prinsip | Status |
|---|---|
| I. Satu UC = satu fitur | Ya |
| III. Konvensi bahasa | `StandbyService.standby`, `SECTOR_STANDBY`; teks UI Indonesia |
| V. Kontrak API bersama | Endpoint baru; `sectorStandby` ditambahkan pada daftar dan detail |
| VI. Black Box sebagai bukti | UJ-09.01–UJ-09.05 |

## Design

- `services/standby-service.ts`: `standby`, penambah daftar (`registerIncidentEnricher`) dan detail (`registerDetailExtender`).
- `routes/standby.ts`: `POST /api/reports/:id/standby`.
- Web: `routes/notifications` (daftar + aksi `?/open`), menu Notifikasi di `AppHeader`, panel Operator dan tanda siaga di `routes/reports/[id]`. Tanda di dasbor sudah disiapkan sejak UC-06 (`flag-standby`).
