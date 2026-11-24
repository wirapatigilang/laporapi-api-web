# Lapor Api — Layanan API dan Aplikasi Web

Skripsi: Rancang Bangun Aplikasi Lapor Api Berbasis Web (ICONIX Process + Spec-Driven Development).

## Prasyarat

- [Bun](https://bun.sh) 1.4 atau lebih baru
- PostgreSQL 14+ (tanpa PostGIS)

## Menjalankan di komputer sendiri

```bash
# 1. Ambil kode dan pasang dependensi
git clone https://github.com/wirapatigilang/laporapi-api-web.git
cd laporapi-api-web
bun install

# 2. Buat pengguna dan basis data PostgreSQL (sekali saja)
psql -U postgres -c "CREATE ROLE lapor LOGIN PASSWORD 'lapor';"
psql -U postgres -c "CREATE DATABASE lapor_api OWNER lapor;"

# 3. Buat tabel dan data awal (Polsek, Instansi, 7 kecamatan, akun petugas)
bun run db:migrate
bun run db:seed

# 4. Jalankan API (terminal 1) → http://localhost:3000
bun run dev:api

# 5. Jalankan aplikasi web (terminal 2) → http://localhost:5173
bun run dev:web
```

Nilai bawaan sudah cocok dengan langkah di atas. Untuk mengubahnya, atur variabel lingkungan
(lihat `.env.example`): `DATABASE_URL`, `PORT`, `JWT_SECRET`, `UPLOAD_DIR`; untuk web `API_URL`.

### Akun data awal (hanya untuk pengembangan)

Kata sandi semua akun: `LaporApi#2026`

| Peran | Email |
|---|---|
| Admin Polres | admin@polres-sekadau.test |
| Operator Polsek Sekadau Hilir | operator.sekadauhilir@polres-sekadau.test |
| Petugas Instansi (BPBD) | petugas.bpbd@polres-sekadau.test |

Akun Pelapor dibuat lewat `POST /api/auth/register` (aplikasi Android), dan Pelapor tidak bisa masuk ke web.

## Menjalankan uji Black Box

```bash
psql -U postgres -c "CREATE DATABASE lapor_api_test OWNER lapor;"
DATABASE_URL=postgres://lapor:lapor@localhost:5432/lapor_api_test bun run db:migrate
DATABASE_URL=postgres://lapor:lapor@localhost:5432/lapor_api_test bun run db:seed

# terminal 1: API memakai basis data uji
DATABASE_URL=postgres://lapor:lapor@localhost:5432/lapor_api_test bun run dev:api
# terminal 2: web
bun run dev:web
# terminal 3: uji (uji web butuh Playwright: bunx playwright install chromium)
API_URL=http://localhost:3000 WEB_URL=http://localhost:5173 bun run test:blackbox
```

## Struktur

- `apps/api` — ElysiaJS (Bun), PostgreSQL via `Bun.sql`
- `apps/web` — SvelteKit
- `tests/blackbox` — uji Black Box lewat HTTP dan peramban
- `specs/` — dokumen Spec Kit per use case (spec, tinjauan, plan, kontrak API, tasks, hasil uji)
- `.specify/memory/constitution.md`, `docs/glossary.md` — prinsip proyek dan glosarium
