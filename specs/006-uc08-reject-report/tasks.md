---
description: "Task list UC-08 Menolak Laporan"
---

# Tasks: UC-08 Menolak Laporan

**Tests**: Wajib (constitution VI).

## Phase 1: Setup
- [x] T001 Migrasi `007_rejection_reasons.sql` (tabel, lima alasan, kolom alasan pada `reports`, CHECK)

## Phase 2: US1 + US4 Penolakan (P1) 🎯
- [x] T002 [US1] `RejectionService.reject`, `RejectionReasons`, penambah detail `rejection` di `apps/api/src/services/rejection-service.ts`
- [x] T003 [US1] Route `GET /api/rejection-reasons`, `POST /api/reports/:id/reject`
- [x] T004 [US1] Tombol Tolak, Dialog Tolak Laporan, aksi `?/reject`, alasan di detail
- [x] T005 [US1/US4] Uji UJ-08.01, 08.04, 08.06, 08.08, 08.10

## Phase 3: US2 Validasi dialog (P1)
- [x] T006 [US2] Dialog tetap terbuka pada 422, pilihan dipertahankan, pesan per isian
- [x] T007 [US2] Uji UJ-08.02, 08.03, 08.05

## Phase 4: US3 Tetap tersimpan (P2)
- [x] T008 [US3] Uji UJ-08.07, 08.09

## Phase 5: Uji ulang iterasi sebelumnya
- [x] T009 UJ-07.03 memeriksa tombol Tolak; UJ-07.07 menyiapkan Laporan Ditolak lewat API penolakan
