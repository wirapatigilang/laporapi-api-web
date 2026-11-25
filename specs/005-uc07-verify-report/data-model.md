# Data Model: UC-07

Migrasi `apps/api/migrations/006_status_history_activity.sql`:

| Perubahan | Wujud |
|---|---|
| Enum `activity_kind` | `FIELD_CHECK_REQUESTED` (iterasi berikutnya menambah nilai dengan `ALTER TYPE … ADD VALUE`) |
| `status_histories.activity` | kolom `activity_kind`, wajib untuk `type = 'ACTIVITY'`, kosong untuk `type = 'STATUS'` (CHECK) |
| `status_histories.created_at`, `notifications.created_at` | default `clock_timestamp()` (A-5.2) |
| Indeks `status_histories (report_id, created_at)` | pembacaan riwayat per Laporan |

| Kelas | Atribut / operasi baru | Wujud |
|---|---|---|
| `StatusHistory` | `activity` | kolom baru; `record(..., activity)` |
| `Incident` | `applyStatus(status, actor)`, `close()` | `IncidentCommands` |
| `VerificationService` | `verify(admin, reportId)`, `requestFieldCheck(admin, reportId, note)` | `verification-service.ts` |
| `NotificationService` | `send(recipients, title, body, report)` | `notification-service.ts` |

Entri riwayat pada detail Laporan: `id, type, status, statusLabel, activity, activityLabel, note, actorName, actorRole, createdAt`.
