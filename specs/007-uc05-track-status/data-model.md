# Data Model: UC-05

Tidak ada tabel baru.

| Kelas | Operasi baru | Wujud |
|---|---|---|
| `ReportService` | `listMine(citizen, status?)`, `getDetail` versi Warga | `citizen-view.ts` |
| `Notification` | `markRead()` | `NotificationService.markRead` (kolom `is_read` sudah ada) |

Butir daftar: `id, reportNumber, reportedAt, receivedAt, district{name}, photoUrl, status, statusLabel, isDuplicate, primaryReportNumber`.

Detail Warga: `id, reportNumber, status, statusLabel, photoUrl, latitude, longitude, district{name}, policeSector{name}, reportedAt, receivedAt, description, isDuplicate, primaryReportNumber, duplicateNote, rejection{code,reason,note}, history[{status,statusLabel,actorName,note,createdAt}]`.
