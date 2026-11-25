# Data Model: UC-10

Migrasi `009_dispatches.sql`:

| Perubahan | Wujud |
|---|---|
| Tabel `dispatches` | `id`, `report_id` (laporan utama), `agency_id`, `dispatched_by`, `dispatched_at`, `note`, `confirmed_by`, `confirmed_at`; UNIQUE (`report_id`, `agency_id`) |
| Enum `activity_kind` | nilai baru `AGENCY_ADDED` ("Instansi ditambahkan") |

| Kelas | Atribut / operasi | Wujud |
|---|---|---|
| `Agency` | `list()` | `Agencies.list` |
| `Dispatch` | `dispatchedAt`, `confirmedAt`, `note`; `save()`, `isOverdue` (tingkat Kejadian) | tabel + `DispatchQueries` |
| `DispatchService` | `dispatch(admin, reportId, agencyIds, note?)` | `dispatch-service.ts` |
| Konstanta | `RESPONSE_LIMIT_MIN = 60` | `dispatch-service.ts` |
