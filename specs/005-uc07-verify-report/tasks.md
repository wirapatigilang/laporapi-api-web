---
description: "Task list UC-07 Memverifikasi Laporan"
---

# Tasks: UC-07 Memverifikasi Laporan

**Tests**: Wajib (constitution VI).

## Phase 1: Setup
- [x] T001 Migrasi `006_status_history_activity.sql` (enum `activity_kind`, kolom `activity`, `clock_timestamp()`)

## Phase 2: Foundational
- [x] T002 `ReportStatusRules` di `apps/api/src/lib/status.ts`; `lib/activity.ts`
- [x] T003 [P] `IncidentCommands` di `apps/api/src/repositories/incident-repository.ts`; `StatusHistoryRepository.record(activity)`
- [x] T004 [P] `NotificationService.send`, `admins`, `sectorOperators`

## Phase 3: US1 + US4 Verifikasi (P1) 🎯
- [x] T005 [US1] `VerificationService.verify`, route `POST /api/reports/:id/verify`, siaran `incident-updated`
- [x] T006 [US1] Panel tindakan Admin, dialog konfirmasi, aksi `?/verify` di `routes/reports/[id]`
- [x] T007 [US1/US4] Uji UJ-07.01, 07.02, 07.06, 07.07, 07.08

## Phase 4: US2 Bahan pertimbangan (P1)
- [x] T008 [US2] Uji UJ-07.03, 07.04 (tampilan dari UC-06, tombol Verifikasi tetap aktif)

## Phase 5: US3 Bukti belum cukup (P2)
- [x] T009 [US3] `requestFieldCheck`, route `POST /api/reports/:id/notes`; `historyOf` membaca `activity`
- [x] T010 [US3] Tombol Hubungi Warga, formulir cek lapangan, aksi `?/fieldCheck`
- [x] T011 [US3] Uji UJ-07.05, 07.09
