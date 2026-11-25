# Implementation Plan: UC-12 Menyatakan Penanganan Selesai

**Branch**: `011-uc12-resolve` · **Date**: 2026-11-25 · **Spec**: [spec.md](spec.md)

## Summary

Endpoint penyelesaian yang menutup Kejadian, didaftarkan juga sebagai penyelesai `nextStatus = RESOLVED` pada UC-11, serta tombol Nyatakan Selesai dan dialog konfirmasi di web. Tanpa migrasi.

## Constitution Check

| Prinsip | Status |
|---|---|
| I. Satu UC = satu fitur | Ya |
| III. Konvensi bahasa | `ResolutionService.markResolved`; teks UI Indonesia |
| V. Kontrak API bersama | Endpoint baru `POST /api/reports/:id/resolve` |
| VI. Black Box sebagai bukti | UJ-12.01–UJ-12.07 |

## Design

- `services/resolution-service.ts`: `markResolved`; `registerResolver` ke `HandlingService`.
- `routes/handling.ts`: `POST /api/reports/:id/resolve`.
- Web `routes/reports/[id]`: tombol Nyatakan Selesai, dialog konfirmasi, aksi `?/resolve`.
