# Data Model: UC-04 Mengirim Laporan Karhutla (iterasi 3)

Migrasi `003_reports.sql`. Class diagram iterasi 3 = iterasi 2 + kelas di bawah.

### District (`districts`)
| Atribut | Kolom | Tipe / aturan |
|---|---|---|
| `id` | `id` | UUID PK |
| `code` | `code` | varchar(20) UNIQUE (kode wilayah, mis. `61.09.01`) |
| `name` | `name` | varchar(100) |
| `policeSectorId` | `police_sector_id` | UUID FK → police_sectors, boleh kosong (6a) |
| `boundary` | `boundary` | jsonb (GeoJSON Polygon/MultiPolygon) |
| | operasi | `contains(lat, lng): boolean` (di `GeoService`) |

### ReportStatus (enum `report_status`)
`RECEIVED`, `VERIFIED`, `REJECTED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`.

### Incident (`incidents`)
| Atribut | Kolom | Tipe |
|---|---|---|
| `id` | `id` | UUID PK |
| `primaryReportId` | `primary_report_id` | UUID FK → reports (DEFERRABLE, diisi dalam transaksi yang sama) |
| `isOpen` | `is_open` | boolean default true |
| `openedAt` / `closedAt` | `opened_at` / `closed_at` | timestamptz |

### Report (`reports`)
| Atribut | Kolom | Tipe / aturan |
|---|---|---|
| `id` | `id` | UUID PK |
| `reportNumber` | `report_number` | varchar(20) UNIQUE |
| `clientId` | `client_id` | varchar(100)?, UNIQUE (reporter_id, client_id) |
| `reporterId` | `reporter_id` | UUID FK → users |
| `incidentId` | `incident_id` | UUID FK → incidents |
| `photoPath` | `photo_path` | text |
| `deviceLat`, `deviceLng` | `device_lat`, `device_lng` | double precision? |
| `gpsAccuracy` | `gps_accuracy` | double precision? (meter) |
| `photoLat`, `photoLng` | `photo_lat`, `photo_lng` | double precision? |
| `locationSource` | `location_source` | `DEVICE` / `PHOTO` |
| `latitude`, `longitude` | `latitude`, `longitude` | double precision (lokasi Laporan terpakai) |
| `locationMismatchMeters` | `location_mismatch_meters` | double precision? |
| `hasLocationMismatch` | `has_location_mismatch` | boolean |
| `districtId`, `policeSectorId` | `district_id`, `police_sector_id` | UUID FK (Polsek boleh kosong) |
| `reportedAt`, `receivedAt` | `reported_at`, `received_at` | timestamptz |
| `description` | `description` | varchar(300)? |
| `currentStatus` | `current_status` | report_status |

Catatan: `latitude`/`longitude` ditambahkan (tidak ada di class diagram draf) agar pemeriksaan laporan ganda tidak perlu menghitung ulang sumber lokasi; `location()` pada class diagram diwujudkan sebagai dua kolom ini.

### StatusHistory (`status_histories`)
`id`, `report_id`, `type` (`STATUS`/`ACTIVITY`), `status`?, `actor_id`?, `note`?, `created_at`.

### Notification (`notifications`)
`id`, `recipient_id`, `report_id`?, `title`, `body`, `is_read`, `created_at`.

## Operasi baru (dari sequence diagram UC-04)

| Kelas | Operasi | Pesan sequence |
|---|---|---|
| `ReportService` | `submit(reporter, form): SubmitResult` | `POST /api/reports` |
| `ReportRepository` | `findByClientId(reporterId, clientId)` | `findByClientId(clientId)` |
| `ReportService` | `validate(photo, description, coords)` | `validate(photo, description)` |
| `ExifService` | `readCoordinates(photo): Coordinate?` | `readCoordinates(photo)` |
| `ReportService` | `resolveLocation(deviceGps, photoCoordinate)` | `resolveLocation(...)` |
| `GeoService` | `haversine(a, b)`, `isWithinRadius(d, 50)` | `haversine(...)` |
| `GeoService` | `findDistrict(coordinate): District?` | `findDistrict(location)` |
| `DuplicateDetectionService` | `findOpenIncidentNearby(coordinate)` | `findOpenIncidentNearby(location)` |
| `ReportNumberService` | `generate()` | `generate()` |
| `ReportRepository` / `IncidentRepository` | `create`, `createIncident`, `addDuplicate` | `save`, `create`, `addDuplicate` |
| `StatusHistoryRepository` | `record(STATUS, RECEIVED)` | `record(STATUS, RECEIVED)` |
| `NotificationService` | `notifyNewReport(report)` | `send(admins + sector operators)` |
