# Feature Specification: UC-13 Menutup Laporan

**Feature Branch**: `013-uc13-close-report`

**Created**: 2026-11-26

**Status**: Draf (specify + clarify). Menunggu Requirements Review oleh penulis sebelum plan dan implementasi.

**Input**: Keputusan Gilang 26 November 2026 (KEPUTUSAN-3): status ketujuh Laporan Ditutup (`CLOSED`). Teks UC-13 dari `use-case-sementara.md` versi 7, FR-29, FR-31, FR-33, FR-34, FR-35 (`daftar-requirement.md` draft 1d), aturan bisnis 25 dan 26, domain model (Laporan, Kejadian, Riwayat Status, Notifikasi).

**Use case ICONIX**: UC-13 · **Aktor utama**: Warga (pembuat laporan utama) · **Aktor pendukung**: Waktu (penjadwal penutupan otomatis) · **Lapis**: API (tombol dibuat di aplikasi Android oleh Khoirul); web hanya menampilkan status dan riwayat.

## Teks use case (sumber)

**Prasyarat:** Laporan milik Warga berstatus Penanganan Selesai (UC-12) dan Warga sudah masuk. **Hasil akhir:** Status Laporan dan laporan gandanya menjadi Laporan Ditutup, Riwayat Status tercatat, dan Admin Polres menerima Notifikasi; atau, bila Warga menolak penutupan, status kembali ke Penanganan Berlangsung dan petugas menerima Notifikasi.

Basic course:
1. Warga membuka Notifikasi "Penanganan selesai" atau memilih Laporan di Layar Riwayat. Sistem mengembalikan Detail Laporan berstatus Penanganan Selesai beserta batas waktu penutupan otomatis.
2. Warga menekan Tutup Laporan. Android menampilkan dialog konfirmasi (Penanganan Selesai → Laporan Ditutup).
3. Warga menekan Ya, tutup laporan.
4. Sistem memeriksa bahwa Laporan milik Warga, Laporan itu adalah laporan utama Kejadian, dan statusnya Penanganan Selesai.
5. Sistem mengubah status Laporan dan semua laporan gandanya menjadi Laporan Ditutup dan mencatat Riwayat Status dengan Warga sebagai pengubah.
6. Sistem mengirim Notifikasi "Laporan ditutup oleh Warga" ke Admin Polres dan mengembalikan Detail Laporan berstatus Laporan Ditutup.

Alternate course:
- **2a.** Warga menekan Api Belum Padam dan mengisi alasan (1–300 karakter): status Laporan dan laporan gandanya kembali ke Penanganan Berlangsung, tiket Kejadian dibuka kembali, Riwayat Status mencatat alasan, dan Admin Polres, Operator Polsek wilayah, serta Petugas Instansi penerima Penerusan menerima Notifikasi berisi alasan. Admin Polres dapat kembali menyatakan selesai (UC-12) dan batas 3 hari dihitung ulang.
- **2b.** Alasan kosong atau > 300 karakter: "Alasan wajib diisi, paling banyak 300 karakter"; status tetap.
- **2c.** Warga membatalkan dialog: tanpa perubahan (hanya di Android).
- **3a.** Warga tidak menanggapi dalam 3 × 24 jam sejak Penanganan Selesai: Sistem menutup otomatis, pengubah "Sistem", catatan "Ditutup otomatis setelah 3 hari", Notifikasi ke Warga dan Admin Polres.
- **4a.** Laporan bukan milik Warga: "tidak diizinkan".
- **4b.** Laporan ganda: "Status laporan ganda mengikuti laporan utama".
- **4c.** Status bukan Penanganan Selesai: "Laporan belum dinyatakan selesai" atau "Laporan sudah ditutup".
- **4d.** Pengguna selain Warga: "tidak diizinkan".

## Clarifications

### Session 2026-11-26

- Q: Endpoint? → A: `POST /api/reports/:id/close` tanpa isi, dan `POST /api/reports/:id/reject-closure` dengan isi `{ "note": string }`. Keduanya hanya untuk peran `CITIZEN`. **[SEPAKATI dengan Android]**
- Q: Urutan pemeriksaan? → A: Token (401) → peran `CITIZEN` (403) → Laporan ada (404) → milik Warga (403) → laporan utama (409) → status Penanganan Selesai (409) → (khusus `reject-closure`) alasan (422). Sejalan dengan UC-11 dan UC-12.
- Q: Pesan 409? → A: `DUPLICATE_FOLLOWS_PRIMARY` "Status laporan ganda mengikuti laporan utama"; `NOT_RESOLVED` "Laporan belum dinyatakan selesai" (status aktif); `ALREADY_CLOSED` "Laporan sudah ditutup"; `ALREADY_PROCESSED` "Laporan sudah diproses" (Laporan Ditolak).
- Q: Dasar batas 3 hari? → A: Atribut baru `Report.resolvedAt` diisi saat UC-12 mengubah status menjadi `RESOLVED` dan dikosongkan saat penutupan ditolak. Batas `autoCloseAt = resolvedAt + 72 jam`; Laporan ditutup otomatis bila `now >= autoCloseAt` (tepat 72 jam sudah ditutup).
- Q: Bagaimana penutupan otomatis berjalan tanpa layanan penjadwal luar? → A: `AutoCloseJob` di proses API berjalan setiap 1 menit, dan `ClosureService.autoCloseExpired(now)` juga dipanggil sebelum Laporan dibaca (`GET /api/reports/:id`, `GET /api/reports/mine`, `GET /api/incidents`) atau diubah. Dengan begitu batas dapat diuji Black Box lewat HTTP dengan menyiapkan `resolvedAt` di basis data uji.
- Q: Kejadian saat penutupan ditolak? → A: Tiket Kejadian tetap ditutup saat Penanganan Selesai (perilaku UC-12 tidak berubah) dan dibuka kembali (`Incident.reopen()`) saat penutupan ditolak. Bila sementara itu sudah ada Kejadian baru dalam 50 m, keduanya terbuka dan deteksi laporan ganda memilih Kejadian terdekat.
- Q: Isi tanggapan detail untuk Warga? → A: `GET /api/reports/:id` dan `GET /api/reports/mine` menambah `autoCloseAt` (ISO 8601, hanya bila status `RESOLVED`) dan `canClose` (boolean: Warga pemilik laporan utama dan status `RESOLVED`).
- Q: Riwayat Status? → A: Satu entri `STATUS` per Laporan dalam Kejadian. Penutupan: `CLOSED`, pengubah Warga. Penolakan penutupan: `IN_PROGRESS`, pengubah Warga, catatan = alasan. Otomatis: `CLOSED`, `actorId` kosong (ditampilkan "Sistem"), catatan "Ditutup otomatis setelah 3 hari".
- Q: Ketetapan kerja yang belum dikonfirmasi? → A: (1) hanya pembuat laporan utama yang menutup; (2) alasan 1–300 karakter (setelah dipangkas spasi); (3) penolakan penutupan tidak dibatasi jumlahnya. *(keputusan kerja, perlu dikonfirmasi Gilang)*

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Warga menutup Laporan (Priority: P1) — langkah 1–6

**Acceptance Scenarios**:
1. **Given** Kejadian berstatus Penanganan Selesai dengan satu laporan ganda, **When** Warga pembuat laporan utama memanggil `close`, **Then** 200; Laporan dan laporan gandanya Laporan Ditutup; riwayat mencatat Warga sebagai pengubah; Admin Polres menerima Notifikasi; pembuat laporan ganda menerima Notifikasi perubahan status. (UJ-13.01)
2. **Given** Laporan Penanganan Selesai, **When** Warga membuka detail, **Then** `canClose = true` dan `autoCloseAt` = waktu penyelesaian + 72 jam.

### User Story 2 - Warga menolak penutupan (Priority: P1) — 2a, 2b

**Acceptance Scenarios**:
1. **Given** Laporan Penanganan Selesai, **When** Warga memanggil `reject-closure` dengan alasan "Api masih menyala di sisi utara", **Then** 200; status Penanganan Berlangsung; Kejadian terbuka lagi; alasan tercatat di riwayat; Admin Polres, Operator Polsek wilayah, dan Petugas Instansi penerima Penerusan menerima Notifikasi berisi alasan. (UJ-13.02)
2. **Given** Laporan Penanganan Selesai, **When** alasan 0 atau 301 karakter, **Then** 422 dan status tetap; **When** alasan 1 atau 300 karakter, **Then** diterima. (UJ-13.03)
3. **Given** penutupan sudah ditolak, **When** Admin Polres kembali menyatakan selesai (UC-12), **Then** status Penanganan Selesai dan `autoCloseAt` dihitung dari penyelesaian kedua. (UJ-13.05)

### User Story 3 - Penutupan otomatis (Priority: P1) — 3a

**Acceptance Scenarios**:
1. **Given** `resolvedAt` = sekarang − (72 jam − 1 menit), **When** detail dibaca, **Then** status tetap Penanganan Selesai. (UJ-13.04)
2. **Given** `resolvedAt` = sekarang − 72 jam, **When** detail dibaca, **Then** status Laporan Ditutup, riwayat berpengubah "Sistem" dengan catatan "Ditutup otomatis setelah 3 hari", Warga dan Admin Polres menerima Notifikasi. (UJ-13.04)

### User Story 4 - Penutupan yang ditolak (Priority: P1) — 4a–4d, FR-29

**Acceptance Scenarios**:
1. **Given** Laporan milik Warga lain, **When** Warga memanggil `close`, **Then** 403. (UJ-13.06)
2. **Given** laporan ganda, **When** pembuatnya memanggil `close` atau `reject-closure`, **Then** 409 "Status laporan ganda mengikuti laporan utama". (UJ-13.07)
3. **Given** Laporan Penanganan Berlangsung, **When** `close`, **Then** 409 "Laporan belum dinyatakan selesai"; **Given** Laporan Ditutup, **When** `close` atau `reject-closure`, **Then** 409 "Laporan sudah ditutup"; **Given** Laporan Ditutup, **When** Admin menolak (UC-08), **Then** 409. (UJ-13.08)
4. **Given** Laporan Penanganan Selesai, **When** Admin Polres atau Petugas Instansi memanggil `close`, **Then** 403. (UJ-13.09)

### User Story 5 - Tampilan web (Priority: P2)

**Acceptance Scenarios**:
1. **Given** Laporan Ditutup, **When** Admin Polres membuka Dasbor Laporan dan Halaman Detail Laporan, **Then** status Laporan Ditutup tampil di daftar, filter, dan peta (warna tersendiri); riwayat menampilkan pengubah Warga atau "Sistem"; tidak ada tombol perubahan status. (UJ-13.10)
2. **Given** Laporan Penanganan Selesai, **When** dibuka di web, **Then** tampil keterangan "Menunggu Warga menutup laporan, otomatis ditutup [tanggal jam]".

### Edge Cases

- Warga menutup tepat saat penjadwal juga menutup otomatis: hanya satu perubahan yang berhasil (pemeriksaan status di dalam transaksi); permintaan kedua 409 "Laporan sudah ditutup".
- Warga menolak penutupan berkali-kali: diizinkan, setiap penolakan tercatat di riwayat.
- Akun Warga dinonaktifkan (tidak mungkin dari UC-03, tetapi data uji): token ditolak 401, laporan tetap ditutup otomatis.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** (FR-33): `POST /api/reports/:id/close` MUST mengubah semua Laporan dalam Kejadian dari Penanganan Selesai menjadi Laporan Ditutup, mencatat riwayat dengan Warga sebagai pengubah, dan mengirim Notifikasi ke Admin Polres.
- **FR-002** (FR-34): `POST /api/reports/:id/reject-closure` MUST memvalidasi alasan 1–300 karakter, mengembalikan semua Laporan dalam Kejadian ke Penanganan Berlangsung, membuka kembali Kejadian, mengosongkan `resolvedAt`, mencatat riwayat beserta alasan, dan mengirim Notifikasi berisi alasan ke Admin Polres, Operator Polsek wilayah, dan Petugas Instansi penerima Penerusan.
- **FR-003** (FR-35): Sistem MUST menutup otomatis Laporan dengan `now >= resolvedAt + 72 jam` (penjadwal tiap menit dan sebelum Laporan dibaca atau diubah), mencatat riwayat berpengubah Sistem, dan mengirim Notifikasi ke Warga dan Admin Polres.
- **FR-004** (FR-33, FR-34): Hanya peran `CITIZEN` pemilik laporan utama; peran lain dan Warga lain 403; pembuat laporan ganda 409.
- **FR-005** (FR-29): `ReportStatus` MUST memuat `CLOSED`; transisi yang sah ditambah `RESOLVED → CLOSED` dan `RESOLVED → IN_PROGRESS` (hanya lewat UC-13). Status akhir: `REJECTED` dan `CLOSED`. `RESOLVED` tidak dapat ditolak (UC-08) dan tidak dapat diubah lewat `POST /api/reports/:id/status`.
- **FR-006** (FR-16): Detail dan daftar Laporan milik Warga MUST memuat `autoCloseAt` dan `canClose`.
- **FR-007** (FR-17, FR-19): Web MUST menampilkan label, warna peta, dan filter Laporan Ditutup, serta keterangan batas penutupan otomatis untuk Penanganan Selesai.

### Key Entities

- **Report**: tambah `resolvedAt: timestamp?`; `currentStatus` dapat bernilai `CLOSED`.
- **Incident**: tambah operasi `reopen()` (isOpen = true, closedAt dikosongkan).
- **ReportStatus**: tambah `CLOSED`; `canTransitionTo` memuat dua transisi baru.
- **StatusHistory**: `actorId` kosong untuk perubahan oleh Sistem.

## Success Criteria *(mandatory)*

- **SC-001**: UJ-13.01–UJ-13.10 lulus.
- **SC-002**: Uji iterasi 1–12 tetap lulus; khususnya UC-05 (filter status), UC-08 (penolakan Laporan Penanganan Selesai tetap 409), UC-11 (keberangkatan ditolak untuk Laporan Ditutup), dan UC-12 (notifikasi Warga berisi ajakan menutup, `resolvedAt` terisi).

## Dampak ke fitur terdahulu (kontrak API bersama)

| Fitur | Perubahan | Uji ulang |
|---|---|---|
| 003-uc04 | Enum status di kontrak bertambah `CLOSED`; Kejadian yang dibuka kembali ikut deteksi laporan ganda | UJ-04 deteksi ganda |
| 006-uc08 | Laporan Ditutup tidak dapat ditolak (409 "Laporan sudah diproses") | UJ-08 status akhir |
| 007-uc05 | Filter `status=CLOSED`; tanggapan menambah `autoCloseAt`, `canClose` | UJ-05.02 |
| 010-uc11 | Keberangkatan personel ditolak untuk Laporan Ditutup; `POST /status` tidak menerima `CLOSED` | UJ-11 status akhir |
| 011-uc12 | `RESOLVED` bukan lagi status akhir; `resolvedAt` diisi; Notifikasi ke Warga berisi ajakan menutup laporan | UJ-12.01, UJ-12.05 |
| apps/web | Label, warna peta, filter, dan dialog status mengenal `CLOSED` | UJ-06 filter |
