# Glosarium Lapor Api

Padanan istilah domain (skripsi, teks use case, antarmuka) dengan nama dalam kode. Sumber: `use-case-sementara.md` versi 4 dan artefak ICONIX ("Konvensi bahasa"). Nama tampilan di layar tetap bahasa Indonesia.

## Objek domain

| Istilah domain | Identifier kode | Tabel basis data | Catatan |
|---|---|---|---|
| Pengguna | `User` | `users` | |
| Peran | `Role` | kolom `users.role` | `CITIZEN` (Warga), `ADMIN` (Admin Polres), `SECTOR_OPERATOR` (Operator Polsek), `AGENCY_OFFICER` (Petugas Instansi) |
| Warga (masyarakat, sebelum 25 November 2026 bernama Pelapor) | peran `CITIZEN` | `users.role = 'CITIZEN'` | Pada Laporan, Warga pengirimnya tetap disebut `reporterId` (kolom `reports.reporter_id`) karena menyatakan hubungan "yang melaporkan" |
| Polsek | `PoliceSector` | `police_sectors` | |
| Kecamatan | `District` | `districts` | batas wilayah GeoJSON (`boundary`) |
| Instansi | `Agency` | `agencies` | |
| Penerusan | `Dispatch` | `dispatches` | |
| Laporan | `Report` | `reports` | |
| Laporan ganda | duplicate report | `reports.incident_id` ≠ laporan utama | |
| Kejadian | `Incident` | `incidents` | tiket terbuka = `is_open = true` |
| Laporan utama | primary report | `incidents.primary_report_id` | |
| Riwayat Status | `StatusHistory` | `status_histories` | `type`: `STATUS` / `ACTIVITY` (kegiatan); jenis kegiatan di kolom `activity` |
| Notifikasi | `Notification` | `notifications` | |
| Alasan Penolakan | `RejectionReason` | `rejection_reasons` | kode `CONTROLLED_BURNING`, `LOCATION_MISMATCH`, `UNCLEAR_PHOTO`, `PRANK`, `OTHER` (wajib catatan) |
| Penanda "belum direspons" | `isOverdue` | (dihitung) | Petugas Ditugaskan, belum ada konfirmasi Instansi ≥ `RESPONSE_LIMIT_MIN` (60) menit sejak Penerusan pertama |
| Tanda "Polsek sudah siaga" | `sectorStandby` | (dihitung dari kegiatan) | |
| Kata sandi awal | `initialPassword` | (tidak disimpan) | ditampilkan sekali saat akun petugas dibuat |
| Titik Panas | `Hotspot` | (tidak disimpan) | data NASA FIRMS |
| Nomor laporan | `reportNumber` | `reports.report_number` | format `[SEPAKATI]`, lihat Clarifications UC-04 |
| Nomor unik perangkat | `clientId` | `reports.client_id` | kirim ulang draf tanpa duplikat |
| Sumber lokasi | `locationSource` | `reports.location_source` | `DEVICE` (GPS perangkat) / `PHOTO` (EXIF) |
| Tanda selisih lokasi | `hasLocationMismatch`, `locationMismatchMeters` | | selisih EXIF vs GPS > 50 m |
| Penanda kanal | `channel` | | `web` / `android` saat masuk |

## Status laporan (`ReportStatus`)

| Kode | Nama tampilan | Diubah oleh |
|---|---|---|
| `RECEIVED` | Laporan Diterima | Sistem |
| `VERIFIED` | Laporan Diverifikasi | Admin Polres |
| `REJECTED` | Laporan Ditolak | Admin Polres |
| `ASSIGNED` | Petugas Ditugaskan | Admin Polres (keputusan 24 November 2026) |
| `IN_PROGRESS` | Penanganan Berlangsung | Petugas Instansi |
| `RESOLVED` | Penanganan Selesai | Petugas Instansi |

Status Petugas Menuju Lokasi (`EN_ROUTE`) tidak dipakai (keputusan 24 November 2026); keberangkatan tim dicatat sebagai `ACTIVITY`.

## Kegiatan Riwayat Status (`ActivityKind`)

| Kode | Nama tampilan | Dicatat oleh |
|---|---|---|
| `FIELD_CHECK_REQUESTED` | Permintaan cek lapangan | Admin Polres (UC-07 1a) |
| `SECTOR_STANDBY` | Personel Polsek disiagakan | Operator Polsek (UC-09) |
| `AGENCY_ADDED` | Instansi ditambahkan | Admin Polres (UC-10 3b) |
| `DISPATCH_CONFIRMED` | Instansi mengonfirmasi tugas | Petugas Instansi (UC-11) |
| `TEAM_DEPARTED` | Tim instansi berangkat | Petugas Instansi (UC-11) |
| `SECTOR_PERSONNEL_DEPARTED` | Personel Polsek berangkat | Operator Polsek (UC-11 4a) |

## Halaman dan layar (boundary)

| Nama di use case | Identifier |
|---|---|
| Halaman Masuk | `LoginPage` (`/login`) |
| Dasbor Laporan | `DashboardPage` (`/dashboard`) |
| Halaman Detail Laporan | `ReportDetailPage` (`/reports/[id]`) |
| Dialog Tolak Laporan | `RejectReportDialog` |
| Dialog Teruskan ke Instansi | `DispatchDialog` |
| Halaman Kelola Akun | `OfficerManagementPage` (`/officers`) |
| Daftar Notifikasi (web) | `NotificationsPage` (`/notifications`) |
| Dialog Konfirmasi (verifikasi, selesai, nonaktif) | dialog di `/reports/[id]` dan `/officers` |
| Layar Daftar / Masuk / Isi Laporan (Android) | `RegisterScreen` / `LoginScreen` / `ReportFormScreen` |

## Layanan API (control)

`AuthService`, `ReportService`, `ExifService`, `GeoService`, `DuplicateDetectionService`, `NotificationService`, `ReportNumberService`, `FirmsClient`, `DashboardStream`, `VerificationService`, `RejectionService`, `StandbyService`, `DispatchService`, `HandlingService`, `ResolutionService`, `OfficerAccountService`.
