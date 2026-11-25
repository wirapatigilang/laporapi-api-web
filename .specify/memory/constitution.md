<!--
Sync Impact Report
- Versi: 1.0.0 → 1.0.1 (PATCH, 2026-11-25): nama peran REPORTER diganti CITIZEN karena aktor Pelapor diganti nama menjadi Warga; isi prinsip tidak berubah.
- Versi: (template) → 1.0.0
- Prinsip baru: I–VII (semua baru, proyek baru)
- Template yang diperiksa: plan-template.md ✅ (Constitution Check memakai prinsip ini), spec-template.md ✅, tasks-template.md ✅ (tugas uji Black Box wajib, bukan opsional)
- TODO lanjutan: kode status, format nomor laporan, dan bentuk tanggapan API masih [SEPAKATI] dengan aplikasi Android
-->

# Constitution Lapor Api (Aplikasi Web dan Layanan API)

Lapor Api adalah aplikasi pelaporan titik kebakaran hutan dan lahan (karhutla) oleh masyarakat di Kabupaten Sekadau. Repositori ini memuat **layanan API** (dipakai bersama aplikasi Android) dan **aplikasi web** untuk Admin Polres, Operator Polsek, dan Petugas Instansi. Proyek ini adalah bagian dari skripsi yang memadukan ICONIX Process dengan Spec-Driven Development (GitHub Spec Kit).

## Core Principles

### I. Satu use case ICONIX = satu fitur Spec Kit

Setiap fitur di `specs/NNN-ucXX-.../` berasal dari tepat satu use case ICONIX (UC-01 sampai UC-12). Teks use case (basic course dan alternate course) dituangkan ke `spec.md` sebagai skenario penerimaan; satu alternate course menjadi sekurang-kurangnya satu skenario. Urutan pengerjaan mengikuti ketergantungan antar-use case (Tabel 4.8 skripsi). Satu putaran berisi: specify → clarify → Requirements Review → robustness diagram + Preliminary Design Review → plan (sequence diagram, class diagram, kontrak API) + analyze → Critical Design Review → tasks → implement/converge → Black Box Testing.

### II. Spesifikasi lebih dahulu, kode menyusul

Perubahan perilaku dimulai dari `spec.md`, lalu rancangan (`plan.md`, `data-model.md`, `contracts/`), lalu kode. `implement` hanya dijalankan untuk fitur yang lolos Critical Design Review. Bila pengujian menunjukkan perilaku yang salah dimaknai, perbaiki spec dulu; bila kesalahan hanya pada kode, kembalikan kode agar sesuai spec. Hal yang belum disepakati tidak diputuskan diam-diam, tetapi ditandai `[NEEDS CLARIFICATION]` atau `[SEPAKATI]` dan dicatat di bagian Clarifications.

### III. Konvensi bahasa (TIDAK BOLEH DILANGGAR)

- **Bahasa Inggris** untuk semua identifier kode dan desain: nama kelas, atribut, method, enum, kolom dan tabel basis data, *endpoint* API, nama file kode, nama halaman/komponen.
- **Bahasa Indonesia** untuk dokumen spesifikasi, teks use case, teks antarmuka (label, tombol), dan pesan galat yang dibaca pengguna.
- Istilah domain wajib memakai padanan di `docs/glossary.md`. Istilah "triase" tidak dipakai; gunakan "verifikasi".

### IV. Stack tetap

- Runtime **Bun** (versi terbaru yang tersedia), layanan API **ElysiaJS**, bahasa TypeScript.
- Aplikasi web **Svelte 5 + SvelteKit**.
- Basis data **PostgreSQL tanpa PostGIS** (akses melalui `Bun.sql`, migrasi SQL biasa).
- Peta **Leaflet** dengan peta dasar **OpenStreetMap**.
- Perhitungan jarak (Haversine) dan uji titik di dalam poligon kecamatan dikerjakan **di layanan API**, bukan di basis data. Jarak dibandingkan dengan batas 50 meter **sebelum** dibulatkan.
- Pustaka tambahan hanya bila perlu dan dicatat di `research.md` fitur yang memakainya.

### V. Kontrak API bersama

Layanan API dipakai juga oleh aplikasi Android (skripsi rekan). Karena itu:
- Setiap *endpoint* didokumentasikan di `contracts/` fitur (OpenAPI 3.1) sebelum diimplementasikan.
- Format JSON; kode status konsisten: 200/201 berhasil, 401 belum masuk atau token tidak sah, 403 peran tidak diizinkan, 409 bentrok status atau data sudah ada, 422 data tidak valid.
- Galat berbentuk `{ "error": { "code": "...", "message": "<pesan bahasa Indonesia>", "fields"?: { "<kolom>": "<pesan>" } } }`.
- Kode status laporan: `RECEIVED`, `VERIFIED`, `REJECTED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`. Status hanya maju satu tahap; `REJECTED` dan `RESOLVED` adalah status akhir.
- Perubahan kontrak yang sudah dipakai fitur sebelumnya dicatat sebagai perubahan spec dan memicu uji ulang (regresi) fitur terdahulu.

### VI. Black Box Testing sebagai bukti penerimaan

Evaluasi hanya dengan Black Box Testing. Setiap skenario penerimaan di `spec.md` wajib punya sekurang-kurangnya satu kasus uji (kode `UJ-<uc>.<nomor>`) yang menguji lewat antarmuka luar saja: permintaan HTTP ke *endpoint* atau halaman web, tanpa memanggil fungsi internal. Teknik: *equivalence partitioning*, *boundary value analysis* (batas 50 m, 300 karakter, 8 karakter), *decision table*, *state transition*. Data uji boleh disiapkan langsung di basis data uji sebagai kondisi awal. Fitur dinyatakan selesai bila semua kasus ujinya lulus; hasil dicatat di `specs/<fitur>/test-results.md`. Tidak ada keharusan unit test.

### VII. Keamanan dan data

- Kata sandi disimpan sebagai *hash* (Argon2id melalui `Bun.password`), minimal 8 karakter.
- Setiap *endpoint* non-publik memeriksa token dan peran (`CITIZEN`, `ADMIN`, `SECTOR_OPERATOR`, `AGENCY_OFFICER`).
- Laporan (termasuk yang ditolak) dan riwayat status tidak pernah dihapus.
- Rahasia (kunci JWT, kunci FIRMS, kata sandi basis data) hanya dari variabel lingkungan, tidak di-*commit*.

## Batasan Lingkup

Tidak dibangun: pelacakan posisi petugas *real-time*, laporan otomatis dari titik panas satelit (FIRMS hanya petunjuk verifikasi), inventaris sarana prasarana, dan antarmuka Android.

## Alur Kerja dan Tinjauan

- Tiap putaran menghasilkan catatan tinjauan di `specs/<fitur>/reviews.md`: Requirements Review, Preliminary Design Review, Critical Design Review, dan ringkasan pengujian.
- Artefak ICONIX (robustness, sequence, class diagram) per putaran disimpan atau dirujuk dari `specs/<fitur>/iconix/`.
- Asisten AI menyusun draf dan kode; penulis (pengembang) meninjau setiap tahap sebelum lanjut.
- Commit kecil per tahap dengan pesan yang menyebut fitur dan tahap (mis. `uc04: plan + CDR`).

## Governance

Constitution ini mengalahkan kebiasaan lain di repositori. Perubahan prinsip dilakukan dengan mengubah file ini, menaikkan versi (MAJOR: prinsip dihapus/diubah maknanya; MINOR: prinsip baru; PATCH: perbaikan kalimat), dan mencatat alasannya di Sync Impact Report. Setiap `plan.md` wajib memuat Constitution Check terhadap prinsip I–VII.

**Version**: 1.0.1 | **Ratified**: 2026-11-24 | **Last Amended**: 2026-11-25
