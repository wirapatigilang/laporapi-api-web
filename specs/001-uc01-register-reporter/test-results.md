# Hasil Black Box Testing: UC-01 Mendaftar Akun Pelapor

Tanggal: 2026-11-24 · Lingkungan: Bun 1.4.4, ElysiaJS 1.4.32, PostgreSQL 16.15 (basis data uji `lapor_api_test`) · Alat: `bun test` mengirim permintaan HTTP ke API (`tests/blackbox/uc01-register.test.ts`).

| Kode | Skenario (spec) | Teknik | Masukan | Hasil yang diharapkan | Hasil aktual | Status |
|---|---|---|---|---|---|---|
| UJ-01.01 | US1-1 | UC | Data lengkap dan valid | 201; peran `REPORTER`; kata sandi ter-*hash* (Argon2id), tidak ada di tanggapan | Sesuai | Lulus |
| UJ-01.02 | US2-1 | BVA | Kata sandi 7 karakter | 422, pesan di `password`, tidak tersimpan | Sesuai | Lulus |
| UJ-01.03 | US1-2 | BVA | Kata sandi 8 karakter | 201 | Sesuai | Lulus |
| UJ-01.04 | US2-2 | EP | Nomor HP berisi huruf | 422, pesan di `phoneNumber` | Sesuai | Lulus |
| UJ-01.05 | US3-1 | EP | Nomor HP sudah terdaftar | 409 "Nomor HP/email sudah terdaftar" | Sesuai | Lulus |
| UJ-01.06 | US3-2 | EP | Email sudah terdaftar (huruf besar) | 409, pesan sama | Sesuai | Lulus |
| UJ-01.07 | US2-3 | EP | Email salah format | 422, pesan di `email` | Sesuai | Lulus |
| UJ-01.08 | US2-4 | EP | Semua kolom kosong | 422, pesan di keempat kolom | Sesuai | Lulus |
| UJ-01.09 | Edge case | EP | `+62…` untuk nomor yang sudah terdaftar sebagai `08…` | 409 | Sesuai | Lulus |

**Ringkasan:** 9 dari 9 kasus uji lulus pada putaran pertama (100%). Tidak ada perbaikan kode atau spec setelah pengujian.

## Converge

`/speckit.converge` (mengikuti `templates/commands/converge.md`): semua FR-001–FR-006 punya kode dan kasus uji; tidak ada tugas yang ditambahkan. Hasil: **converged**.
