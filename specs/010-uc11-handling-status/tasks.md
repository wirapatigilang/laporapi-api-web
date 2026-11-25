---
description: "Task list UC-11 Memperbarui Status Penanganan"
---

# Tasks: UC-11 Memperbarui Status Penanganan

**Tests**: Wajib (constitution VI).

## Phase 1: Setup
- [x] T001 Migrasi `010_activity_handling.sql`; label kegiatan

## Phase 2: US1 + US3 Petugas Instansi (P1) 🎯
- [x] T002 [US1] `HandlingService` (validasi, urutan pemeriksaan, konfirmasi, keberangkatan, Mulai Penanganan); route `POST /api/reports/:id/status`
- [x] T003 [US1] Panel Petugas Instansi, aksi `?/handling`, `myDispatch`
- [x] T004 [US1/US3] Uji UJ-11.01–11.07, 11.10, 11.11

## Phase 3: US2 Operator Polsek (P2)
- [x] T005 [US2] Tombol Catat Keberangkatan Personel
- [x] T006 [US2] Uji UJ-11.08, 11.09
