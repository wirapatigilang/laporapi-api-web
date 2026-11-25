# Data Model: UC-09

Migrasi `008_activity_sector_standby.sql`: nilai enum `activity_kind` baru `SECTOR_STANDBY` (label "Personel Polsek disiagakan").

| Kelas | Atribut / operasi | Wujud |
|---|---|---|
| `StatusHistory` | `activity = SECTOR_STANDBY` | entri `ACTIVITY` pada laporan utama |
| `StandbyService` | `standby(operator, reportId, note?)` | `standby-service.ts` |
| Butir Kejadian | `sectorStandby: boolean` | penambah daftar |
| Detail Laporan | `sectorStandby: {at, by, note} \| null` | penambah detail |
