# Catatan Tinjauan Iterasi 1: UC-01 Mendaftar Akun Pelapor

## 1. Requirements Review (2026-11-24)

Diperiksa: teks UC-01 (use case v4), FR-01, NFR-02, NFR-05, NFR-08, domain model, storyboard Layar Daftar (Android, hanya konteks).

| No | Temuan | Tindakan |
|---|---|---|
| RR-1.1 | Teks use case tidak menyebut format nomor HP yang sah, padahal 3a mencontohkan "nomor HP bukan angka" | Ditetapkan di Clarifications: nomor seluler Indonesia `08…`/`+628…`, 10–15 digit, disimpan dinormalisasi |
| RR-1.2 | Tidak jelas apakah `+62812…` dan `0812…` dianggap nomor yang sama untuk aturan 3b | Dianggap sama (normalisasi), ditambah sebagai edge case dan kasus uji UJ-01.09 |
| RR-1.3 | Kode status 3a/3b belum tertulis di use case | 422 dan 409 sesuai NFR-05, ditandai [SEPAKATI] |
| RR-1.4 | Bab 4 Tabel 4.9 baru memuat 6 kasus uji; skenario email salah format dan kolom kosong (bagian dari 3a) belum punya kasus uji | Ditambah UJ-01.07 dan UJ-01.08 |

Hasil: **lolos** dengan perbaikan di atas dituangkan ke `spec.md`.

## 2. Preliminary Design Review (2026-11-24)

Robustness diagram: `iconix/uc01-robustness.png` (draf dari `skripsi/iconix/`, dipakai tanpa perubahan).

| Langkah / alternate | Objek robustness | Cocok? |
|---|---|---|
| 1–2 | Boundary Layar Daftar (Android) | Ya |
| 3 (format) | Control "Periksa kelengkapan dan format data" | Ya |
| 3 (unik) | Control "Periksa nomor HP dan email belum terdaftar" ↔ Entity User | Ya |
| 4 | Control "Hash kata sandi dan simpan Pengguna peran Pelapor" → User | Ya |
| 5 | Control "Kirim tanggapan berhasil" → Boundary Layar Masuk | Ya |
| 3a | Control "Kembalikan pesan galat per kolom" | Ya |
| 3b | Control "Tolak: nomor HP/email sudah terdaftar" | Ya |

Temuan: normalisasi nomor HP (RR-1.2) adalah bagian dari control "Periksa kelengkapan dan format data", tidak perlu objek baru. Domain model tidak berubah (User sudah punya atribut yang dibutuhkan).

Hasil: **lolos**, tanpa perubahan diagram.

## 3. Critical Design Review

Lihat bagian 3 setelah `plan.md` selesai.

## 3. Critical Design Review (2026-11-24)

`/speckit.analyze` (dijalankan mengikuti `templates/commands/analyze.md`): memeriksa konsistensi spec ↔ plan ↔ data-model ↔ contracts.

| Pemeriksaan | Hasil |
|---|---|
| Setiap langkah use case punya pesan di sequence diagram | Ya (1–5, 3a, 3b) |
| Setiap pesan sequence punya operasi di class diagram/data-model | Ya; `findByPhoneOrEmail` dan `save` dipindah dari `User` ke `UserRepository` (A-1) |
| Setiap skenario penerimaan punya respons di kontrak | Ya: 201, 422 (fields), 409 |
| Requirement tanpa tugas/uji | Tidak ada |
| Istilah di luar glosarium | Tidak ada |

Temuan analyze:
- **A-1 (rendah)**: class diagram draf menaruh operasi akses data di entitas `User`. Diputuskan memakai `UserRepository`; class diagram iterasi 1 diperbarui mengikuti ini.
- **A-2 (sedang)**: spec tidak menyebut panjang maksimal kata sandi. Ditetapkan batas atas 200 karakter untuk mencegah permintaan berlebihan; spec FR-004 dan kontrak (`maxLength: 200`) diperbarui.

Hasil: **lolos**, `implement` boleh dijalankan.


## 4. Perubahan requirement (2026-11-24): email dihapus

Pemicu: keputusan Gilang, masuk memakai nomor HP dan kata sandi, email tidak diperlukan.

| No | Dampak | Tindakan |
|---|---|---|
| CR-1.1 | Teks UC-01 langkah 1, 3, dan 3b menyebut email | Spec diperbarui; 3b menjadi "Nomor HP sudah terdaftar" |
| CR-1.2 | Robustness: control keunikan dan control 3b menyebut email | Label control diubah; jumlah objek tetap |
| CR-1.3 | Sequence: `findByPhoneOrEmail(phone, email)` | Diganti `findByPhoneNumber(phone)` |
| CR-1.4 | Tabel `users` punya kolom `email` wajib | Migrasi baru `004_remove_user_email.sql` (migrasi lama tidak diubah agar basis data yang sudah berjalan ikut berubah) |
| CR-1.5 | Kasus uji email kehilangan dasar | UJ-01.06/07 lama dihapus; ditambah uji batas nomor HP (9/10 digit, awalan tidak sah) agar aturan format punya bukti |

Regresi: seluruh uji UC-01, UC-02, dan UC-04 dijalankan ulang, 54/54 lulus.
