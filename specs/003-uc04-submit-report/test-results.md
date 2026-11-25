# Hasil Black Box Testing: UC-04 Mengirim Laporan Karhutla

Tanggal: 2026-11-24 · Lingkungan: Bun 1.4.4, ElysiaJS 1.4.32, exifr 7.1.3, PostgreSQL 16.15 · Alat: `bun test` mengirim `multipart/form-data` ke `POST /api/reports`; foto uji dibuat dengan piexifjs 1.0.6 (GPS EXIF, detik berpenyebut 1.000.000); titik uji dihitung sepanjang meridian dengan R = 6.371.000 m. Kondisi awal setiap uji: semua Kejadian terbuka ditutup lebih dulu.

Titik dasar: Kecamatan Sekadau Hilir (0,17643; 110,92919) digeser ±1,5 km per uji; Nanga Mahap (−0,47475; 110,76568); di luar wilayah: Pontianak (−0,0263; 109,3425).

| Kode | Skenario | Teknik | Masukan / kondisi | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|
| UJ-04.01 | US1-1 | UC | Data lengkap, Sekadau Hilir, EXIF 20 m, tanpa Kejadian terbuka | 201 `RECEIVED`, `LA-xxxx`, Kejadian baru, 1 Riwayat Status, Notifikasi Admin + Operator Sekadau Hilir saja | Lulus |
| UJ-04.02 | US2-1 | EP | Tanpa foto | 422 "Foto wajib dilampirkan", tidak tersimpan | Lulus |
| UJ-04.03 | US2-2 | EP | Berkas teks bernama `.jpg` | 422, tidak tersimpan | Lulus |
| UJ-04.04 | US1-2 | BVA | Keterangan 300 karakter | 201 | Lulus |
| UJ-04.05 | US2-3 | BVA | Keterangan 301 karakter | 422 "Keterangan maksimal 300 karakter" | Lulus |
| UJ-04.06 | US5-1 | EP | Koordinat Pontianak | 422 `OUTSIDE_SERVICE_AREA`, pesan + `emergencyNumber` 110, tidak tersimpan | Lulus |
| UJ-04.07 | US3-1 | BVA | EXIF 49 m | 201, koordinat foto tersimpan, tanpa tanda | Lulus |
| UJ-04.08 | US3-2 | BVA | EXIF 50 m | 201, tanpa tanda, jarak 50,0 m | Lulus |
| UJ-04.09 | US3-3 | BVA | EXIF 51 m | 201, tanda selisih, jarak 51,0 m, sumber `DEVICE` | Lulus |
| UJ-04.10 | US3-4 | EP | Foto tanpa GPS EXIF | 201, "Koordinat foto tidak tersedia" | Lulus |
| UJ-04.11 | US3-5 | EP | EXIF 0,0 | Seperti UJ-04.10 | Lulus |
| UJ-04.12 | US4-1 | EP | Tanpa koordinat perangkat, EXIF di Sekadau | 201, sumber `PHOTO`, Kecamatan dari EXIF | Lulus |
| UJ-04.13 | US4-2 | EP | Tanpa koordinat perangkat dan EXIF | 422 "Lokasi tidak terdeteksi, aktifkan GPS lalu kirim ulang" | Lulus |
| UJ-04.14 | US5-2 | EP | Nanga Mahap tanpa Polsek | 201, "Polsek belum ditentukan", Notifikasi hanya Admin | Lulus |
| UJ-04.15 | US6-1 (R1) | DT, BVA | 50 m, tiket terbuka, warga lain | 201 laporan ganda, `primaryReportNumber`, tanpa Notifikasi | Lulus |
| UJ-04.16 | US6-2 (R2) | DT | 30 m, tiket tertutup | Kejadian baru | Lulus |
| UJ-04.17 | US6-3 (R3) | DT, BVA | 51 m, tiket terbuka | Kejadian baru | Lulus |
| UJ-04.18 | US6-4 (R4) | DT | 51 m, tiket tertutup | Kejadian baru | Lulus |
| UJ-04.19 | US6-5 | BVA | 49 m, tiket terbuka | Laporan ganda | Lulus |
| UJ-04.20 | US6-6 (3a) | EP | Warga sama, 20 m | Digabung, tidak ditolak | Lulus |
| UJ-04.21 | US6-7 | EP | Kejadian terbuka berumur 3 hari, 20 m | Tetap digabung | Lulus |
| UJ-04.22 | US7-1 (3b) | EP | `clientId` sama dua kali | 200 Laporan pertama, jumlah Laporan tetap, waktu lapor asli | Lulus |
| UJ-04.23 | US8 | EP | Tanpa token / token Admin | 401 / 403, tidak tersimpan | Lulus |
| UJ-04.24 | US1-3 | EP | Keterangan kosong | 201 | Lulus |
| UJ-04.25 | Edge | BVA | Foto 10 MB + 1 bait | 422 "Ukuran foto maksimal 10 MB" | Lulus |
| UJ-04.26 | Edge | EP | `reportedAt` "kemarin sore" | 422 | Lulus |
| UJ-04.27 | Edge | BVA | Lintang 91 | 422 | Lulus |
| UJ-04.28 | RR-3.7 | EP | 5 laporan dalam radius 20 m dikirim bersamaan | 1 Kejadian, 1 laporan utama | Lulus |

**Regresi:** UC-01 (9) dan UC-02 (15) lulus. Seluruh rangkaian: **52 dari 52 lulus**.

**Ringkasan:** 28 dari 28 kasus uji UC-04 lulus pada putaran pertama setelah implementasi.

## Bukti bahwa kasus uji sensitif terhadap cacat

Karena semua kasus lulus pada putaran pertama, dua keputusan rancangan diuji dengan sengaja merusak kode sementara (lalu dikembalikan):

| Perubahan sementara | Kasus uji | Hasil |
|---|---|---|
| Pembandingan jarak langsung `d <= 50` tanpa pembulatan milimeter (RR-3.1) | UJ-04.08 (EXIF tepat 50 m) | **Gagal 3 dari 3 kali**: titik 50 m terhitung sedikit di atas 50 m dan diberi tanda selisih |
| Kunci *advisory* dihapus (RR-3.7) | UJ-04.28 (5 laporan bersamaan) | **Gagal 3 dari 3 kali**: lebih dari satu Kejadian dibuat |

Dengan kode akhir, kedua kasus lulus. Ini menunjukkan klarifikasi pada tahap *Requirements* (RR-3.1) dan *Detailed Design* (RR-3.7) mencegah cacat yang nyata.

## Keterbatasan pengujian

- Foto uji dibuat dari JPEG sintetis; foto HEIC asli dari ponsel belum diuji (perlu contoh dari perangkat Android Khoirul).
- Notifikasi diperiksa lewat `GET /api/notifications`; push FCM dan siaran dasbor belum dibangun.

## Converge

FR-001–FR-012 punya kode dan kasus uji; UJ-04.28 ditambahkan sebagai bukti RR-3.7. Hasil: **converged**.

## Uji ulang 25 November 2026 (aktor Pelapor menjadi Warga, peran `CITIZEN`)

Seluruh uji Black Box dijalankan ulang setelah migrasi `005_rename_reporter_role.sql`: 54 dari 54 lulus (UC-01, UC-02 API dan web, UC-04).
