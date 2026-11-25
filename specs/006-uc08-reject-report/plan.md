# Implementation Plan: UC-08 Menolak Laporan

**Branch**: `006-uc08-reject-report` · **Date**: 2026-11-25 · **Spec**: [spec.md](spec.md)

## Summary

Tabel Alasan Penolakan, endpoint daftar alasan dan penolakan Kejadian (menutup tiket), serta Dialog Tolak Laporan di web. Memakai kembali kunci Kejadian dan pesan 409 dari UC-07.

## Technical Context

**Language/Version**: TypeScript, Bun 1.4.4 · **Primary Dependencies**: ElysiaJS 1.4, SvelteKit 3.4 + Svelte 5 · **Storage**: PostgreSQL 16, migrasi `007_rejection_reasons.sql` · **Testing**: `bun test` + Playwright 1.63

## Constitution Check

| Prinsip | Status |
|---|---|
| I. Satu UC = satu fitur | Ya |
| II. Spec dulu | Ya |
| III. Konvensi bahasa | `RejectionService.reject`, kode alasan Inggris (`PRANK`, `OTHER`), label Indonesia |
| V. Kontrak API bersama | Endpoint baru; detail menambah `rejection` |
| VI. Black Box sebagai bukti | UJ-08.01–UJ-08.10 |
| IX/NFR-09 Data tidak dihapus | Ya, penolakan hanya mengubah status |

## Design

- `services/rejection-service.ts`: `RejectionReasons.list/find`, `RejectionService.reject`, penambah detail `rejection`.
- `routes/verification.ts`: `GET /api/rejection-reasons`, `POST /api/reports/:id/reject` (Admin).
- Web `routes/reports/[id]`: load mengambil alasan untuk Admin pada Laporan Diterima; aksi `?/reject`; dialog tetap terbuka pada 422.
