---
description: "Task list UC-04 Mengirim Laporan Karhutla"
---

# Tasks: UC-04 Mengirim Laporan Karhutla

**Tests**: Wajib (constitution VI).

## Phase 1: Setup
- [x] T001 Salin 7 berkas batas kecamatan ke `apps/api/data/districts/`
- [x] T002 Tambah `UPLOAD_DIR` dan `MAX_PHOTO_BYTES` di `apps/api/src/config.ts`

## Phase 2: Foundational
- [x] T003 Migrasi `apps/api/migrations/003_reports.sql` (districts, report_status, incidents, reports, status_histories, notifications, report_number_seq)
- [x] T004 Seed Kecamatan + pemetaan Polsek di `apps/api/src/db/seed.ts`
- [x] T005 [P] `GeoService` (`haversine`, `isWithinRadius`, `pointInPolygon`, `findDistrict`) di `apps/api/src/services/geo.ts`
- [x] T006 [P] `ExifService.readCoordinates` di `apps/api/src/services/exif-service.ts`
- [x] T007 [P] Deteksi tipe gambar `apps/api/src/lib/image.ts`
- [x] T008 [P] Pembuat foto uji ber-EXIF dan titik berjarak tertentu `tests/blackbox/fixtures.ts`

## Phase 3: US1 + US8 Laporan baru dan hak akses (P1) 🎯
- [x] T009 [US1] Repository Laporan/Kejadian/Riwayat Status `apps/api/src/repositories/report-repository.ts`
- [x] T010 [US1] `ReportNumberService` `apps/api/src/services/report-number.ts`
- [x] T011 [US1] `NotificationService` + repository; `GET /api/notifications`
- [x] T012 [US1] `ReportService.submit` (alur utama) `apps/api/src/services/report-service.ts`
- [x] T013 [US1] Route `POST /api/reports` `apps/api/src/routes/reports.ts`
- [x] T014 [US1] Uji UJ-04.01, .04, .23, .24

## Phase 4: US2 Validasi (4a, 4c)
- [x] T015 [US2] Uji UJ-04.02, .03, .05, .25, .26, .27

## Phase 5: US3 + US4 Koordinat foto dan lokasi
- [x] T016 [US3] Uji UJ-04.07–.11 · [US4] UJ-04.12, .13

## Phase 6: US5 Wilayah
- [x] T017 [US5] Uji UJ-04.06, .14

## Phase 7: US6 Laporan ganda
- [x] T018 [US6] `DuplicateDetectionService` + kunci transaksi `apps/api/src/services/duplicate-detection.ts`
- [x] T019 [US6] Uji UJ-04.15–.21

## Phase 8: US7 Kirim ulang
- [x] T020 [US7] Uji UJ-04.22

## Phase 9: Polish
- [x] T021 Regresi UC-01, UC-02; `test-results.md`; converge
