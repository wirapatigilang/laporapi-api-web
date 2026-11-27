# Pedoman proyek Lapor Api

Baca `.specify/memory/constitution.md` lebih dahulu; isinya mengikat.

- Monorepo Bun workspaces: `apps/api` (ElysiaJS), `apps/web` (SvelteKit), `tests/blackbox` (uji Black Box lewat HTTP).
- Spesifikasi per use case di `specs/NNN-ucXX-nama/` (spec, plan, data-model, contracts, tasks, reviews, test-results).
- Istilah domain ↔ identifier: `docs/glossary.md`. Identifier bahasa Inggris, teks UI dan pesan galat bahasa Indonesia.
- Haversine dan point-in-polygon di API (`apps/api/src/services/geo.ts`), tanpa PostGIS.
- Status laporan: `RECEIVED`, `VERIFIED`, `REJECTED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` (Laporan Ditutup oleh Warga atau otomatis 3 hari, UC-13; spec 2026-11-26, kode belum).
- Jangan mengubah kontrak API yang sudah dipakai tanpa memperbarui spec dan menjalankan ulang uji fitur terdahulu.

## Perintah

```bash
bun install
bun run db:migrate        # migrasi + seed (DATABASE_URL)
bun run dev:api           # API di :3000
bun run dev:web           # web di :5173
bun run test:blackbox     # semua uji Black Box (butuh API berjalan pada DB uji)
```
