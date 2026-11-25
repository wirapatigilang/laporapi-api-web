# Hasil Black Box Testing: UC-01 Mendaftar Akun Warga

Tanggal: 2026-11-24 · Lingkungan: Bun 1.4.4, ElysiaJS 1.4.32, PostgreSQL 16.15 (basis data uji `lapor_api_test`) · Alat: `bun test` mengirim permintaan HTTP ke API (`tests/blackbox/uc01-register.test.ts`).

| Kode | Skenario (spec) | Teknik | Masukan | Hasil yang diharapkan | Hasil aktual | Status |
|---|---|---|---|---|---|---|
| UJ-01.01 | US1-1 | UC | Data lengkap dan valid | 201; peran `CITIZEN`; kata sandi ter-*hash* (Argon2id), tidak ada di tanggapan | Sesuai | Lulus |
| UJ-01.02 | US2-1 | BVA | Kata sandi 7 karakter | 422, pesan di `password`, tidak tersimpan | Sesuai | Lulus |
| UJ-01.03 | US1-2 | BVA | Kata sandi 8 karakter | 201 | Sesuai | Lulus |
| UJ-01.04 | US2-2 | EP | Nomor HP berisi huruf | 422, pesan di `phoneNumber` | Sesuai | Lulus |
| UJ-01.05 | US3-1 | EP | Nomor HP sudah terdaftar | 409 "Nomor HP sudah terdaftar" | Sesuai | Lulus |
| UJ-01.06 | US3-2 | EP | `+62…` untuk nomor yang sudah terdaftar sebagai `08…` | 409 | Sesuai | Lulus |
| UJ-01.07 | US2-3 | BVA | Nomor HP 9 digit | 422, pesan di `phoneNumber` | Sesuai | Lulus |
| UJ-01.08 | US2-3 | BVA | Nomor HP 10 digit | 201 | Sesuai | Lulus |
| UJ-01.09 | US2-3 | EP | Diawali selain 08/62/+62 (`0215551234`) | 422, pesan di `phoneNumber` | Sesuai | Lulus |
| UJ-01.10 | US2-4 | EP | Semua kolom kosong | 422, pesan di ketiga kolom | Sesuai | Lulus |

**Ringkasan putaran pertama (sebelum revisi):** 9 dari 9 kasus uji lulus.

**Setelah revisi email dihapus (2026-11-24):** kasus uji email (UJ-01.06 email terdaftar, UJ-01.07 email salah format) dihapus; nomor disusun ulang sesuai Tabel 4.9 Bab 4. **10 dari 10 lulus.** Seluruh rangkaian 54/54 lulus (UC-01 10, UC-02 16, UC-04 28).

## Converge

`/speckit.converge` (mengikuti `templates/commands/converge.md`): semua FR-001–FR-006 punya kode dan kasus uji; tidak ada tugas yang ditambahkan. Hasil: **converged**.

## Uji ulang 25 November 2026 (aktor Pelapor menjadi Warga, peran `CITIZEN`)

Seluruh uji Black Box dijalankan ulang setelah migrasi `005_rename_reporter_role.sql`: 54 dari 54 lulus (UC-01, UC-02 API dan web, UC-04).

## Uji tambahan 25 November 2026 (alamat Warga)

| Kode | Hasil |
|---|---|
| UJ-01.11 alamat diisi → 201 dan tersimpan; 201 karakter → 422 `address` | Lulus |

Seluruh rangkaian dijalankan ulang: 133/133 lulus.
