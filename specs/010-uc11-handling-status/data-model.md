# Data Model: UC-11

Migrasi `010_activity_handling.sql`: nilai enum `activity_kind` baru.

| Kode | Label |
|---|---|
| `DISPATCH_CONFIRMED` | Instansi mengonfirmasi tugas |
| `TEAM_DEPARTED` | Tim instansi berangkat |
| `SECTOR_PERSONNEL_DEPARTED` | Personel Polsek berangkat |

| Kelas | Atribut / operasi | Wujud |
|---|---|---|
| `Dispatch` | `confirm(officer)` → `confirmed_at`, `confirmed_by` | kolom sejak migrasi 009 |
| `HandlingService` | `update(user, reportId, nextStatus \| activity, note?)` | `handling-service.ts` |
| Detail (Petugas Instansi) | `myDispatch {id, confirmed, confirmedAt}` | penambah detail |
