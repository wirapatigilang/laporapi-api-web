---
description: "Task list UC-06 Melihat Daftar dan Peta Laporan"
---

# Tasks: UC-06 Melihat Daftar dan Peta Laporan

**Tests**: Wajib (constitution VI).

## Phase 1: Setup
- [x] T001 Pasang `leaflet@1.9.4` di `apps/web`
- [x] T002 [P] Layanan FIRMS tiruan `tests/blackbox/firms-mock.ts` dan penyiap skenario `tests/blackbox/scenario.ts`

## Phase 2: Foundational
- [x] T003 Cakupan per peran `apps/api/src/services/access.ts`
- [x] T004 [P] `IncidentQueries.list` `apps/api/src/repositories/incident-repository.ts`
- [x] T005 [P] `FirmsClient` `apps/api/src/services/firms-client.ts`
- [x] T006 [P] `DashboardStream` `apps/api/src/services/dashboard-stream.ts`

## Phase 3: US1 + US2 Daftar, peta, cakupan (P1) 🎯
- [x] T007 [US1] `listIncidents`, `parseIncidentFilter` `apps/api/src/services/report-view.ts`; route `GET /api/incidents`, `/api/districts`, `/api/police-sectors`
- [x] T008 [US1] Komponen `LeafletMap`, `StatusBadge`, `AppHeader`; halaman `routes/dashboard`
- [x] T009 [US1/US2] Uji UJ-06.01–UJ-06.04, UJ-06.11, UJ-06.12

## Phase 4: US4 Detail dan titik panas (P1)
- [x] T010 [US4] `getDetail`, `getPhoto`; route `GET /api/reports/:id`, `/photo`
- [x] T011 [US4] Halaman `routes/reports/[id]` dan penerus foto
- [x] T012 [US4] Uji UJ-06.06–UJ-06.10

## Phase 5: US3 Siaran Laporan baru (P2)
- [x] T013 [US3] `GET /api/stream`, siaran dari `ReportService.submit`, penerus `routes/dashboard/stream`, `EventSource` di dasbor
- [x] T014 [US3] Uji UJ-06.05
