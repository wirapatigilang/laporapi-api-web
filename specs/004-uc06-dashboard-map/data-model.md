# Data Model: UC-06

Tidak ada tabel baru. Iterasi ini membaca `incidents`, `reports`, `status_histories`, `users`, `districts`, `police_sectors`.

| Kelas | Atribut / operasi baru | Wujud |
|---|---|---|
| `Hotspot` (data luar) | `latitude`, `longitude`, `detectedAt`, `satellite`, `confidence` | antarmuka TypeScript di `firms-client.ts`, tidak disimpan |
| `User` | relasi ke `PoliceSector` dan `Agency` dipakai untuk cakupan | kolom `police_sector_id`, `agency_id` (sudah ada sejak iterasi 2) |
| `ReportService` | `listIncidents(session, filter)`, `getDetail(session, id)` | `report-view.ts` |
| `FirmsClient` | `fetchHotspots(bbox, days)` | `firms-client.ts` |
| `DashboardStream` | `broadcast(event, report)` | `dashboard-stream.ts` |

Bentuk butir daftar Kejadian: `incidentId, isOpen, reportId, reportNumber, reportedAt, receivedAt, status, statusLabel, latitude, longitude, district, policeSector, duplicateCount, hasLocationMismatch`.
