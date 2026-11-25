# Catatan Tinjauan Iterasi 12: UC-03 Mengelola Akun Petugas

## 1. Requirements Review (2026-11-25)

Diperiksa: teks UC-03 v5, FR-03, FR-04, NFR-02, ASUMSI-5, storyboard Halaman Kelola Akun dan Formulir Akun.

| No | Temuan | Tindakan |
|---|---|---|
| RR-12.1 | Langkah 5 masih [PUTUSKAN] tentang ganti kata sandi pertama | Tidak wajib (keputusan kerja, konfirmasi Gilang) |
| RR-12.2 | "Tidak bisa masuk lagi" hanya menyebut masuk ulang, bukan sesi yang sedang berjalan (token berlaku 12 jam) | Token akun tidak aktif ditolak 401 di setiap permintaan |
| RR-12.3 | Tidak jelas apakah Admin dapat membuat Admin lain | Tidak; hanya Operator Polsek dan Petugas Instansi |
| RR-12.4 | Mengaktifkan kembali tidak disebut | Di luar UC-03 |

Hasil: **lolos**.

## 2. Preliminary Design Review (2026-11-25)

Robustness diagram: `iconix/uc03-robustness.png` (tanpa perubahan).

| Langkah / alternate | Objek robustness | Cocok? |
|---|---|---|
| 1 | Halaman Kelola Akun; "Tampilkan daftar akun petugas" ↔ User, PoliceSector, Agency | Ya |
| 2–4, 4a, 2c | Formulir Akun; "Periksa kelengkapan data", "Periksa Polsek/Instansi sesuai peran", "Periksa nomor HP belum dipakai", "Tampilkan pesan pada kolom yang salah" | Ya |
| 5 | "Buat kata sandi awal dan simpan Pengguna", "Tampilkan kata sandi awal satu kali" | Ya |
| 2a | "Perbarui data Pengguna" | Ya |
| 2b | Dialog Konfirmasi Nonaktif; "Ubah status akun menjadi tidak aktif" | Ya |
| Hak akses | — | **Kurang**: pemeriksaan peran Admin (UJ-03.07) tidak tergambar; dicatat |

Hasil: **lolos** dengan satu catatan diagram.

## 3. Critical Design Review (2026-11-25)

| Pemeriksaan | Hasil |
|---|---|
| Langkah ↔ pesan sequence | Cocok (`listOfficers`, `validate`, `exists`, `findByPhoneNumber(normalize)`, `generateInitialPassword`, `save`, `update`, `deactivate`) |
| Pesan ↔ operasi class | `OfficerAccountService.list/create/update/deactivate` |
| Skenario ↔ kontrak | 200, 201, 403, 404, 409, 422 |
| Requirement ↔ uji | FR-001–FR-007 punya kasus uji |

Temuan analyze:
- **A-12.1 (sedang)**: Sequence tidak memeriksa status aktif pada permintaan berikutnya (RR-12.2). Pemeriksaan ditambahkan di `authContext` (satu kueri per permintaan bertoken).
- **A-12.2 (rendah)**: Pemeriksaan nomor HP lalu INSERT dapat bertabrakan bila dua Admin menyimpan bersamaan; UNIQUE `users.phone_number` menjadi pengaman terakhir dan galatnya diterjemahkan menjadi 409 yang sama.

Hasil: **lolos**.
