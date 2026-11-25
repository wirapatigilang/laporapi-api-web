# Research: UC-01 Mendaftar Akun Warga

| Keputusan | Pilihan | Alasan | Alternatif yang ditolak |
|---|---|---|---|
| Akses PostgreSQL | `Bun.sql` (bawaan Bun 1.4) | Tanpa dependensi tambahan, *tagged template* aman dari SQL injection | `postgres` (porsager), Prisma/Drizzle (ORM menambah lapisan yang tidak dibutuhkan skripsi) |
| Migrasi | File SQL bernomor di `apps/api/migrations/` + skrip `src/db/migrate.ts` yang mencatat di tabel `schema_migrations` | Sederhana, setiap iterasi menambah file sehingga perkembangan skema terlihat untuk Bab 4 | Alat migrasi ORM |
| Hash kata sandi | `Bun.password.hash` (Argon2id) | Bawaan Bun, sesuai NFR-02 | bcryptjs |
| Validasi masukan | Validasi manual di `AuthService` yang menghasilkan pesan bahasa Indonesia per kolom | Pesan bawaan skema Elysia berbahasa Inggris dan tidak per kolom sesuai 3a | TypeBox `t.Object` dengan pesan kustom (lebih bertele-tele untuk pesan per kolom) |
| Format galat | `{ error: { code, message, fields? } }` | Konsisten untuk Android (constitution V) | |
| Normalisasi nomor HP | Buang spasi/tanda hubung, `+62`/`62` → `0`, cek pola `^08[0-9]{8,13}$` | Satu bentuk simpan untuk aturan unik 3b | Menyimpan apa adanya (membuat `+62…` dan `0…` lolos dua kali) |
