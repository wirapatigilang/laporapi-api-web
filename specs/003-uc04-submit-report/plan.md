# Implementation Plan: UC-04 Mengirim Laporan Karhutla

**Branch**: `003-uc04-submit-report` | **Date**: 2026-11-24 | **Spec**: [spec.md](spec.md)

## Summary

`POST /api/reports` (multipart) untuk Warga dan `GET /api/notifications`. Alur: periksa token → `clientId` (3b) → validasi foto/keterangan/koordinat (4a, 4c) → baca EXIF dan tentukan lokasi (5, 5a–5d) → cari Kecamatan dengan *point-in-polygon* dan Polsek (6, 6a, 6b) → dalam satu transaksi berkunci: cari Kejadian terbuka ≤ 50 m (7, 7a), buat nomor, simpan Laporan/Kejadian/Riwayat Status (8) → Notifikasi (9) → tanggapan (10).

## Technical Context

**Language/Version**: TypeScript, Bun 1.4.4 · **Primary Dependencies**: ElysiaJS 1.4.32, exifr 7.1.3 · **Storage**: PostgreSQL 16 (tanpa PostGIS) + berkas foto di `UPLOAD_DIR` · **Testing**: `bun test` Black Box HTTP, foto uji dibuat dengan piexifjs · **Constraints**: Haversine dan *point-in-polygon* di API; jarak dibandingkan pada ketelitian 1 mm

## Detailed Design (ICONIX)

- Sequence diagram final: [`iconix/uc04-sequence.png`](iconix/uc04-sequence.png) (diperbarui: pemeriksaan token, 6a, kunci transaksi, bentuk tanggapan).
- Class diagram iterasi 3: + `District`, `Report`, `Incident`, `ReportStatus`, `StatusHistory`, `Notification`; layanan `ReportService`, `ExifService`, `GeoService`, `DuplicateDetectionService`, `ReportNumberService`, `NotificationService` ([data-model.md](data-model.md)).
- Kontrak: [contracts/openapi.yaml](contracts/openapi.yaml).

## Constitution Check

I ✅ · II ✅ (12 klarifikasi tercatat sebelum plan) · III ✅ · IV ✅ (Haversine & PIP di `services/geo.ts`, tanpa PostGIS) · V ✅ (kontrak OpenAPI, 200/201/401/403/422) · VI ✅ (27 kasus uji) · VII ✅ (Laporan tidak dihapus; foto disimpan di luar repo)

## Project Structure

```text
apps/api/
├── data/districts/61.09.0[1-7].geojson   # batas kecamatan Kabupaten Sekadau
├── migrations/003_reports.sql
├── src/db/seed.ts                        # + Kecamatan ↔ Polsek
├── src/lib/image.ts                      # deteksi tipe gambar (magic bytes)
├── src/repositories/{district,report,notification}-repository.ts
├── src/services/geo.ts                   # GeoService: haversine, isWithinRadius, findDistrict
├── src/services/exif-service.ts
├── src/services/duplicate-detection.ts
├── src/services/report-number.ts
├── src/services/notification-service.ts
├── src/services/report-service.ts
└── src/routes/{reports,notifications}.ts
tests/blackbox/
├── fixtures.ts                            # pembuat foto ber-EXIF, titik pada jarak tertentu
└── uc04-submit-report.test.ts
```

## Complexity Tracking

| Pelanggaran | Alasan | Alternatif lebih sederhana ditolak karena |
|---|---|---|
| Kunci *advisory* global saat menyimpan Laporan | Mencegah dua Kejadian untuk titik sama (RR-3.7) | Tanpa kunci, uji bersamaan dapat membuat Kejadian ganda |
