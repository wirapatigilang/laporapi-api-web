# Implementation Plan: UC-05 Memantau Status Laporan

**Branch**: `007-uc05-track-status` · **Date**: 2026-11-25 · **Spec**: [spec.md](spec.md)

## Summary

API untuk aplikasi Android: daftar Laporan milik Warga, Detail Laporan versi Warga, dan penandaan Notifikasi dibaca. Tidak ada perubahan skema dan tidak ada halaman web (Warga memakai Android).

## Technical Context

TypeScript, Bun 1.4.4, ElysiaJS 1.4, PostgreSQL 16 (tanpa migrasi) · Uji: `bun test` lewat HTTP.

## Constitution Check

| Prinsip | Status |
|---|---|
| I. Satu UC = satu fitur | Ya |
| III. Konvensi bahasa | `listMine`, `citizenDetail`, `markRead`; pesan Indonesia |
| V. Kontrak API bersama | Endpoint baru; bentuk detail Warga didokumentasikan untuk Android |
| VI. Black Box sebagai bukti | UJ-05.01–UJ-05.08 |
| VII. Keamanan data | Detail Warga tanpa data pelapor lain (NFR-03) |

## Design

- `services/citizen-view.ts`: `listMine(citizen, query)`, `citizenDetail(report)`, titik perluasan `registerCitizenDetailExtender` (Instansi yang menangani, UC-10).
- `services/report-view.ts`: `getDetail` mengalihkan Warga ke `citizenDetail`.
- `routes/reports.ts`: `GET /api/reports/mine`. `routes/notifications.ts`: `POST /api/notifications/:id/read`.
- Notifikasi verifikasi menyebut nama Admin (FR-16).
