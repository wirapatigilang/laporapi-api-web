---
description: "Task list UC-05 Memantau Status Laporan"
---

# Tasks: UC-05 Memantau Status Laporan

**Tests**: Wajib (constitution VI).

## Phase 1: US1 Daftar (P1) 🎯
- [x] T001 [US1] `listMine` di `apps/api/src/services/citizen-view.ts`; route `GET /api/reports/mine`
- [x] T002 [US1] Uji UJ-05.01–05.03

## Phase 2: US2 Detail (P1)
- [x] T003 [US2] `citizenDetail`, pengalihan Warga di `getDetail`
- [x] T004 [US2] Uji UJ-05.04–05.07

## Phase 3: US3 Notifikasi (P2)
- [x] T005 [US3] `NotificationService.markRead`, route `POST /api/notifications/:id/read`; Notifikasi verifikasi menyebut nama Admin
- [x] T006 [US3] Uji UJ-05.08
