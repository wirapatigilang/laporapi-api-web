# Feature Specification: UC-08 Menolak Laporan

**Feature Branch**: `006-uc08-reject-report`

**Created**: 2026-11-25

**Status**: Lolos Requirements Review, Preliminary Design Review, dan Critical Design Review (2026-11-25)

**Input**: Teks UC-08 dari `use-case-sementara.md` versi 5, FR-23, FR-29, FR-31, NFR-05, NFR-09, ASUMSI-14, ASUMSI-15, aturan R2 deteksi laporan ganda (Kejadian terbuka), domain model (Alasan Penolakan, Laporan, Kejadian, Riwayat Status, Notifikasi).

**Use case ICONIX**: UC-08 · **Aktor utama**: Admin Polres · **Lapis**: web (Dialog Tolak Laporan) dan API

## Teks use case (sumber)

**Prasyarat:** Laporan berstatus Laporan Diterima dan Halaman Detail Laporan terbuka. **Hasil akhir:** Status Laporan menjadi Laporan Ditolak dengan Alasan Penolakan, dan Warga menerima Notifikasi berisi alasan tersebut.

Basic course:
1. Admin Polres menekan tombol Tolak di Halaman Detail Laporan.
2. Sistem membuka Dialog Tolak Laporan berisi pilihan Alasan Penolakan dan kolom catatan tambahan.
3. Admin Polres memilih alasan, boleh menambah catatan, lalu menekan Kirim Penolakan.
4. Sistem mengubah status Laporan menjadi Laporan Ditolak, menyimpan Alasan Penolakan, mencatat Riwayat Status, dan menutup tiket Kejadian.
5. Sistem mengirim Notifikasi ke Warga berisi alasan penolakan, dan ke Operator Polsek wilayah agar penyiagaan dihentikan.
6. Sistem menampilkan status baru di Halaman Detail Laporan. Laporan tetap tersimpan dan bisa dilihat lagi lewat saringan status.

Alternate course:
- **3a.** Tidak memilih alasan: Sistem menolak dan meminta alasan dipilih.
- **3b.** Alasan "Lainnya" tanpa catatan: Sistem meminta catatan diisi.
- **3c.** Membatalkan dialog: dialog tertutup tanpa perubahan.
- **4a.** Kejadian punya laporan ganda: semua laporan ganda ikut ditolak dengan alasan yang sama dan setiap pelapornya menerima Notifikasi.

## Clarifications

### Session 2026-11-25

- Q: Di mana daftar Alasan Penolakan disimpan? → A: Tabel `rejection_reasons` (kode, label, `requires_note`, urutan) berisi lima alasan ASUMSI-14: Pembakaran sampah atau terkendali, Lokasi tidak sesuai, Foto tidak jelas atau bukan kebakaran, Laporan iseng, Lainnya (wajib catatan). Diambil lewat `GET /api/rejection-reasons`.
- Q: Bagaimana sistem "meminta" alasan/catatan (3a, 3b)? → A: API menjawab 422 dengan `fields.reasonId` "Pilih alasan penolakan" atau `fields.note` "Catatan wajib diisi untuk alasan Lainnya"; dialog tetap terbuka, pilihan dipertahankan, dan pesan tampil di bawah isian.
- Q: Panjang catatan? → A: Maksimal 500 karakter (sama dengan cek lapangan).
- Q: Isi Notifikasi ke Warga? → A: Judul "Laporan LA-xxxx ditolak", isi "Alasan: [label] ([catatan])".
- Q: Bagaimana bila Laporan sudah diverifikasi atau ditolak Admin lain? → A: Sama dengan UC-07 4a: 409 "Laporan sudah diproses oleh [nama] pada [waktu WIB]".
- Q: Apa arti "menutup tiket Kejadian"? → A: `incidents.is_open = false` dan `closed_at` diisi. Laporan baru di sekitar lokasi (≤ 50 m) setelahnya membuat Kejadian baru, karena deteksi laporan ganda hanya mencari Kejadian terbuka (aturan R2, UC-04).
- Q: Apakah Laporan Ditolak dihapus? → A: Tidak (NFR-09, ASUMSI-15). Tetap tampil di Dasbor dengan saringan status Laporan Ditolak dan detailnya memuat alasan penolakan.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin menolak Laporan dengan alasan (Priority: P1)

**Independent Test**: Admin membuka detail Laporan Diterima, menekan Tolak, memilih alasan, mengirim, lalu memeriksa status, alasan, tiket, dan Notifikasi.

**Acceptance Scenarios**:
1. **Given** Laporan Diterima, **When** Admin memilih "Laporan iseng" dan menekan Kirim Penolakan, **Then** status menjadi Laporan Ditolak, alasan tersimpan, tiket Kejadian ditutup, Warga menerima Notifikasi berisi alasan, dan Operator Polsek menerima Notifikasi.
2. **Given** Kejadian dengan laporan ganda, **When** Admin menolak, **Then** semua laporan ganda ditolak dengan alasan yang sama dan setiap pelapornya menerima Notifikasi.
3. **Given** alasan "Lainnya" dengan catatan, **When** dikirim, **Then** penolakan berhasil dan catatan tersimpan.

### User Story 2 - Isian dialog divalidasi (Priority: P1) — 3a, 3b, 3c

**Acceptance Scenarios**:
1. **Given** dialog terbuka tanpa alasan dipilih, **When** Kirim Penolakan, **Then** tampil "Pilih alasan penolakan" dan status tetap.
2. **Given** alasan "Lainnya" tanpa catatan, **When** Kirim Penolakan, **Then** tampil "Catatan wajib diisi untuk alasan Lainnya" dan status tetap.
3. **Given** dialog terbuka, **When** Admin menekan Batal, **Then** dialog tertutup tanpa perubahan.

### User Story 3 - Laporan Ditolak tetap tersimpan (Priority: P2) — langkah 6

**Acceptance Scenarios**:
1. **Given** Laporan sudah ditolak, **When** Admin menyaring dasbor dengan status Laporan Ditolak, **Then** Laporan tampil dan detailnya dapat dibuka beserta alasan.
2. **Given** Laporan sudah ditolak, **When** Warga lain mengirim Laporan 30 m dari lokasinya, **Then** Kejadian baru dibuat.

### User Story 4 - Perubahan yang ditolak (Priority: P1) — FR-29

**Acceptance Scenarios**:
1. **Given** Laporan Diverifikasi (atau Petugas Ditugaskan, Penanganan Berlangsung), **When** Admin menolak, **Then** Laporan Ditolak; Petugas Instansi penerima Penerusan diberi Notifikasi. **Given** Laporan Ditolak atau Penanganan Selesai, **When** Admin menolak, **Then** 409 dan status tetap.
2. **Given** Operator Polsek, **When** memanggil penolakan, **Then** 403; alasan yang tidak dikenal 422.

### Edge Cases
- Penolakan dari ID laporan ganda berlaku untuk seluruh Kejadian.
- Status Laporan Ditolak tanpa alasan dicegah di basis data (CHECK `reports_rejection_check`).

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001** (FR-23): `GET /api/rejection-reasons` MUST mengembalikan lima alasan baku sesuai urutan, beserta penanda wajib catatan.
- **FR-002** (FR-23): `POST /api/reports/:id/reject {reasonId, note?}` MUST mengubah semua Laporan dalam Kejadian menjadi Laporan Ditolak, menyimpan alasan dan catatan, mencatat Riwayat Status per Laporan, dan menutup Kejadian dalam satu transaksi.
- **FR-003** (FR-23 3a, 3b): Alasan kosong atau tidak dikenal, atau "Lainnya" tanpa catatan, MUST menghasilkan 422 tanpa perubahan.
- **FR-004** (FR-23): Sistem MUST menyimpan Notifikasi berisi alasan untuk setiap pelapor dan Notifikasi untuk Operator Polsek wilayah.
- **FR-005** (FR-29, amandemen 2026-11-25): Penolakan MUST diterima selama Laporan masih aktif (status bukan Laporan Ditolak atau Penanganan Selesai); status akhir menghasilkan 409; peran selain Admin 403.
- **FR-006** (NFR-09): Laporan Ditolak MUST tetap tersimpan, tampil lewat saringan status, dan detailnya memuat `rejection {code, reason, note}`.
- **FR-007**: Halaman Detail Laporan MUST menampilkan tombol Tolak (aktif selama Laporan masih aktif) dan Dialog Tolak Laporan dengan tombol Batal dan Kirim Penolakan.

### Key Entities
- **RejectionReason (Alasan Penolakan)**: baru — `code`, `label`, `requiresNote`.
- **Report**: atribut baru `rejectionReason`, `rejectionNote`.

## Success Criteria *(mandatory)*
- **SC-001**: UJ-08.01–UJ-08.10 lulus.
- **SC-002**: Uji iterasi 1–5 tetap lulus; UJ-07.03 (tombol Tolak) dan UJ-07.07 (Laporan Ditolak lewat API) diuji ulang.

## Amandemen 2026-11-25 (masukan dosen pembimbing)

- Admin Polres boleh menolak (membatalkan) Laporan kapan saja selama Laporan masih aktif: Laporan Diterima, Laporan Diverifikasi, Petugas Ditugaskan, atau Penanganan Berlangsung. Tidak ada status baru; hasilnya tetap Laporan Ditolak (keputusan Gilang, 25 November 2026).
- Bila Laporan sudah diteruskan, Petugas Instansi penerima Penerusan menerima Notifikasi "Laporan ditolak Admin Polres (alasan: …). Penanganan dihentikan."
- Dialog Tolak menampilkan perubahan status (status sekarang → Laporan Ditolak) dan akibatnya sebelum Admin menekan "Ya, tolak laporan".
- Kasus uji UJ-08.08 diubah: menolak Laporan Diverifikasi → 200 Laporan Ditolak; menolak lagi Laporan yang sudah Ditolak → 409.

## Amandemen 2026-11-26 (status Laporan Ditutup, UC-13)

- Alternate 1b dibaca: Laporan Penanganan Selesai, Laporan Ditutup, atau Laporan Ditolak tidak dapat ditolak (409 "Laporan sudah diproses"). Laporan yang kembali ke Penanganan Berlangsung karena Warga menolak penutupan kembali aktif dan dapat ditolak.
- Uji ulang: kasus status akhir UC-08 dengan Laporan Ditutup.
