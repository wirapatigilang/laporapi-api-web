---
description: "Task list UC-10 Meneruskan Laporan ke Instansi"
---

# Tasks: UC-10 Meneruskan Laporan ke Instansi

**Tests**: Wajib (constitution VI).

## Phase 1: Setup
- [x] T001 Migrasi `009_dispatches.sql`; label `AGENCY_ADDED`

## Phase 2: Foundational
- [x] T002 Cakupan Petugas Instansi (`scopeFor`, `IncidentQueries.list`, `isDispatchedToAgency`, `agencyIdsOf` untuk SSE)
- [x] T003 [P] Penyiap uji `agencyId`, `newOfficer`, `verifiedReport`, `dispatchTo` di `tests/blackbox/scenario.ts`

## Phase 3: US1 + US2 + US4 Penerusan (P1) 🎯
- [x] T004 [US1] `DispatchService.dispatch`, `Agencies.list`, `DispatchQueries.forIncident`; route `GET /api/agencies`, `POST /api/reports/:id/dispatches`
- [x] T005 [US1] Dialog Teruskan ke Instansi, aksi `?/dispatch`, kartu Instansi penerima
- [x] T006 [US1/US2/US4] Uji UJ-10.01–10.04, 10.07–10.09

## Phase 4: US3 Belum direspons (P2)
- [x] T007 [US3] `overdueIncidents` + penambah daftar/detail (Admin)
- [x] T008 [US3] Uji UJ-10.05, 10.06

## Phase 5: Uji ulang
- [x] T009 UJ-05.04 memakai Penerusan sungguhan dan memeriksa `handlingAgencies`
