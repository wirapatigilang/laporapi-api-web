# Data Model: UC-08

Migrasi `apps/api/migrations/007_rejection_reasons.sql`:

| Perubahan | Wujud |
|---|---|
| Tabel `rejection_reasons` | `id`, `code` (unik), `label`, `requires_note`, `sort_order`; diisi lima alasan ASUMSI-14 |
| `reports.rejection_reason_id`, `reports.rejection_note` | alasan dan catatan penolakan |
| CHECK `reports_rejection_check` | Laporan berstatus `REJECTED` wajib punya alasan (berlaku untuk perubahan baru) |

| Kode | Label | Wajib catatan |
|---|---|---|
| `CONTROLLED_BURNING` | Pembakaran sampah atau terkendali | Tidak |
| `LOCATION_MISMATCH` | Lokasi tidak sesuai | Tidak |
| `UNCLEAR_PHOTO` | Foto tidak jelas atau bukan kebakaran | Tidak |
| `PRANK` | Laporan iseng | Tidak |
| `OTHER` | Lainnya | Ya |

| Kelas | Atribut / operasi | Wujud |
|---|---|---|
| `RejectionReason` | `code`, `label`, `requiresNote`; `list()` | tabel + `RejectionReasons` |
| `Report` | `rejectionReason`, `rejectionNote` | kolom baru |
| `RejectionService` | `reject(admin, reportId, reasonId, note)` | `rejection-service.ts` |
| `Incident` | `close()` | `IncidentCommands.close` |
