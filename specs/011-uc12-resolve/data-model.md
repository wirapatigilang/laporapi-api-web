# Data Model: UC-12

Tidak ada tabel baru.

| Kelas | Operasi | Wujud |
|---|---|---|
| `ResolutionService` | `markResolved(officer, reportId)` | `resolution-service.ts` |
| `Incident` | `applyStatus(RESOLVED)`, `close()` | `IncidentCommands` |
