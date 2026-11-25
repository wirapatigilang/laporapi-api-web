---
description: "Task list UC-09 Menyiagakan Personel Polsek"
---

# Tasks: UC-09 Menyiagakan Personel Polsek

**Tests**: Wajib (constitution VI).

## Phase 1: Setup
- [x] T001 Migrasi `008_activity_sector_standby.sql`; label di `lib/activity.ts`

## Phase 2: US1 + US2 Penyiagaan (P1) 🎯
- [x] T002 [US1] `StandbyService.standby` + penambah daftar/detail; route `POST /api/reports/:id/standby`
- [x] T003 [US1] Halaman Daftar Notifikasi web dan menu Notifikasi
- [x] T004 [US1] Panel Operator (catatan, Siagakan Personel), tanda "Polsek sudah siaga", pesan 2a
- [x] T005 [US1/US2] Uji UJ-09.01–09.05
