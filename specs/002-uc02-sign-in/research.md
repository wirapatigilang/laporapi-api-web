# Research: UC-02 Masuk ke Sistem

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Token | JWT HS256 via `@elysiajs/jwt`, masa berlaku 12 jam | Stateless, mudah dipakai Android; satu rahasia `JWT_SECRET` |
| Pemeriksa token | Plugin Elysia `authGuard` dengan `requireRole(...roles)` | Dipakai ulang semua *endpoint* berikutnya (NFR-01) |
| Aplikasi web | SvelteKit 2 + Svelte 5, `@sveltejs/adapter-node` | Sesuai stack; *form action* di server sehingga token disimpan di cookie `httpOnly` |
| Pemanggilan API dari web | Server SvelteKit memanggil API (`API_URL`) | Token tidak terpapar ke JavaScript peramban |
| Uji web | Playwright (sudah tersedia di lingkungan) di `tests/blackbox` | Black Box lewat peramban, sesuai Bab 3 |
| Data awal | `apps/api/src/db/seed.ts` idempoten | Akun petugas sebelum UC-03 |
