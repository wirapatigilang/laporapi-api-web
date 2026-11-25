# Implementation Plan: UC-06 Melihat Daftar dan Peta Laporan

**Branch**: `004-uc06-dashboard-map` · **Date**: 2026-11-25 · **Spec**: [spec.md](spec.md)

## Summary

API menambah daftar Kejadian bersaringan dan bercakupan peran, detail Laporan beserta foto, siaran SSE untuk Laporan baru, dan petunjuk titik panas NASA FIRMS. Web menambah Dasbor Laporan (tabel + peta Leaflet/OSM) dan Halaman Detail Laporan.

## Technical Context

**Language/Version**: TypeScript, Bun 1.4.4 · **Primary Dependencies**: ElysiaJS 1.4, SvelteKit 3.4 + Svelte 5, Leaflet 1.9.4 · **Storage**: PostgreSQL 16 (tanpa perubahan skema) · **Testing**: `bun test` (API) dan Playwright 1.63 (web), layanan FIRMS tiruan di port 3199 · **Constraints**: token tetap di cookie `httpOnly`; Haversine di API

## Constitution Check

| Prinsip | Status |
|---|---|
| I. Satu UC = satu fitur | Ya (`004-uc06-dashboard-map`) |
| II. Spec dulu | Ya, spec lolos RR dan PDR sebelum plan |
| III. Konvensi bahasa | Identifier Inggris (`listIncidents`, `FirmsClient`), teks UI Indonesia |
| IV. Stack | Leaflet + OSM, Haversine di `geo.ts` |
| V. Kontrak API bersama | Endpoint baru ditambahkan, endpoint lama tidak berubah |
| VI. Black Box sebagai bukti | UJ-06.01–UJ-06.12 |
| VII. Keamanan data | Nomor HP Warga hanya untuk Admin dan Operator (NFR-03) |

## Design

- `services/access.ts`: `loadViewer`, `canView` (cakupan per peran).
- `repositories/incident-repository.ts`: `IncidentQueries.list(filter, scope)`.
- `services/report-view.ts`: `listIncidents`, `getDetail`, `getPhoto`; titik perluasan untuk iterasi berikutnya (`registerIncidentEnricher`, `registerDetailExtender`) agar UC-08–UC-11 dapat menambah tanda tanpa mengubah fungsi inti.
- `services/firms-client.ts`: `fetchHotspots(bbox, days)`, `hintFor(location)`; `HOTSPOT_RADIUS_KM = 5`, `HOTSPOT_DAY_RANGE = 2`.
- `services/dashboard-stream.ts`: `open(viewer)`, `broadcast(event)`; dipanggil `ReportService.submit` setelah transaksi selesai.
- Web: `routes/dashboard` (saringan GET, tabel, peta, `EventSource`), `routes/reports/[id]` (detail), `routes/dashboard/stream` dan `routes/reports/[id]/photo` (penerus).

## Project Structure

```text
apps/api/src/{services/access.ts, services/report-view.ts, services/firms-client.ts, services/dashboard-stream.ts,
              repositories/incident-repository.ts, routes/dashboard.ts, routes/reports.ts, lib/time.ts}
apps/web/src/{lib/components/{AppHeader,LeafletMap,StatusBadge}.svelte, lib/status.ts,
              routes/dashboard/{+page.server.ts,+page.svelte,stream/+server.ts}, routes/reports/[id]/...}
tests/blackbox/{scenario.ts, firms-mock.ts, web/uc06-dashboard.test.ts}
```
