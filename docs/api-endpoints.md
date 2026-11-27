# Dokumentasi Endpoint API Lapor Api

Versi: 27 November 2026, disusun dari kode di cabang `main` repo `laporapi-api-web` (commit `1be3831`).
API ini dipakai bersama oleh aplikasi web (Admin Polres, Operator Polsek, Petugas Instansi) dan aplikasi Android (Warga).

> Status `CLOSED` (Laporan Ditutup, UC-13) dan pembatalan laporan oleh Warga **belum ada di kode**. Keduanya baru ada di spesifikasi, jadi belum tercantum di sini.

---

## 1. Ketentuan umum

| Hal | Ketentuan |
|---|---|
| Alamat dasar | `http://<host>:3000` (pengembangan). Semua endpoint diawali `/api`. |
| Format | JSON (`Content-Type: application/json`), kecuali kirim laporan (`multipart/form-data`), foto (berkas gambar) dan aliran SSE. |
| Autentikasi | Header `Authorization: Bearer <token>`. Token didapat dari `POST /api/auth/login`, berlaku 12 jam (`expiresAt`). |
| Waktu | ISO 8601 UTC, misalnya `2026-11-27T05:30:00.000Z`. Saringan tanggal memakai `YYYY-MM-DD` menurut WIB. |
| ID | UUID. Nomor laporan berbentuk `LA-0001`. |
| CORS | Terbuka untuk semua origin. |
| Nomor HP | Dinormalkan ke bentuk `08…` (`+62812…`, `62812…`, `0812-…` diterima). Pola akhir: `^08[0-9]{8,13}$`. |

### 1.1 Peran (`role`)

| Nilai | Aktor | Kanal |
|---|---|---|
| `CITIZEN` | Warga | Android saja |
| `ADMIN` | Admin Polres | Web |
| `SECTOR_OPERATOR` | Operator Polsek | Web |
| `AGENCY_OFFICER` | Petugas Instansi | Web |

### 1.2 Status laporan (`status`)

| Nilai | Label | Keterangan |
|---|---|---|
| `RECEIVED` | Laporan Diterima | status awal |
| `VERIFIED` | Laporan Diverifikasi | oleh Admin Polres |
| `ASSIGNED` | Petugas Ditugaskan | otomatis saat Admin meneruskan ke instansi |
| `IN_PROGRESS` | Penanganan Berlangsung | oleh Petugas Instansi |
| `RESOLVED` | Penanganan Selesai | oleh Admin Polres, status akhir |
| `REJECTED` | Laporan Ditolak | oleh Admin Polres dari status mana pun yang belum akhir, status akhir |

Urutan utama hanya boleh maju satu tahap: `RECEIVED → VERIFIED → ASSIGNED → IN_PROGRESS → RESOLVED`. Setiap respons yang memuat `status` juga memuat `statusLabel` (teks Indonesia siap tampil).

### 1.3 Laporan ganda dan Kejadian

Laporan baru yang berjarak ≤ 50 m (Haversine) dari Kejadian yang masih terbuka digabung ke Kejadian itu (`isDuplicate: true`). Status selalu mengikuti laporan utama Kejadian. Aksi status (verifikasi, tolak, teruskan, dst.) boleh dikirim dengan ID laporan mana pun di Kejadian; yang berubah adalah semua laporan di Kejadian tersebut.

### 1.4 Bentuk galat

Semua galat memakai bentuk yang sama:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data tidak valid",
    "fields": { "phoneNumber": "Nomor HP wajib diisi" }
  }
}
```

`fields` hanya ada pada galat validasi. Beberapa galat menambah kunci lain (misalnya `currentStatus`, `emergencyNumber`, `skippedAgencies`).

| HTTP | `code` | Arti |
|---|---|---|
| 401 | `UNAUTHENTICATED` | Tanpa token atau token tidak sah |
| 401 | `TOKEN_EXPIRED` | Token kedaluwarsa, minta pengguna masuk lagi |
| 401 | `ACCOUNT_INACTIVE` | Akun dinonaktifkan Admin (token lama ikut tidak berlaku) |
| 403 | `FORBIDDEN` | Peran atau wilayah tidak berhak |
| 404 | `NOT_FOUND` | Data atau alamat tidak ditemukan |
| 409 | (lihat tiap endpoint) | Bentrok status atau data sudah ada |
| 422 | `VALIDATION_ERROR` | Isi permintaan tidak valid (lihat `fields`) |
| 500 | `INTERNAL_ERROR` | Kesalahan server |

---

## 2. Ringkasan endpoint

| Method | Path | Peran | UC |
|---|---|---|---|
| GET | `/api/health` | publik | – |
| POST | `/api/auth/register` | publik | UC-01 |
| POST | `/api/auth/login` | publik | UC-02 |
| GET | `/api/auth/me` | semua yang masuk | UC-02 |
| POST | `/api/reports` | CITIZEN | UC-04 |
| GET | `/api/reports/mine` | CITIZEN | UC-05 |
| GET | `/api/reports/:id` | semua (sesuai cakupan) | UC-05, UC-06 |
| GET | `/api/reports/:id/photo` | semua (sesuai cakupan) | UC-05, UC-06 |
| GET | `/api/notifications` | semua yang masuk | UC-05 |
| POST | `/api/notifications/:id/read` | semua yang masuk | UC-05 |
| GET | `/api/incidents` | ADMIN, SECTOR_OPERATOR, AGENCY_OFFICER | UC-06 |
| GET | `/api/stream` (SSE) | ADMIN, SECTOR_OPERATOR, AGENCY_OFFICER | UC-06 |
| GET | `/api/districts` | ADMIN, SECTOR_OPERATOR, AGENCY_OFFICER | UC-06 |
| GET | `/api/police-sectors` | ADMIN, SECTOR_OPERATOR, AGENCY_OFFICER | UC-06 |
| POST | `/api/reports/:id/verify` | ADMIN | UC-07 |
| POST | `/api/reports/:id/notes` | ADMIN | UC-07 |
| GET | `/api/rejection-reasons` | ADMIN | UC-08 |
| POST | `/api/reports/:id/reject` | ADMIN | UC-08 |
| POST | `/api/reports/:id/standby` | SECTOR_OPERATOR | UC-09 |
| GET | `/api/agencies` | ADMIN | UC-10 |
| POST | `/api/reports/:id/dispatches` | ADMIN | UC-10 |
| POST | `/api/reports/:id/status` | AGENCY_OFFICER, SECTOR_OPERATOR, (ADMIN untuk `RESOLVED`) | UC-11 |
| POST | `/api/reports/:id/resolve` | ADMIN | UC-12 |
| GET | `/api/officers` | ADMIN | UC-03 |
| POST | `/api/officers` | ADMIN | UC-03 |
| PATCH | `/api/officers/:id` | ADMIN | UC-03 |
| POST | `/api/officers/:id/deactivate` | ADMIN | UC-03 |

Endpoint yang dipakai aplikasi Android (Warga): `register`, `login`, `me`, `POST /api/reports`, `GET /api/reports/mine`, `GET /api/reports/:id`, `GET /api/reports/:id/photo`, `GET /api/notifications`, `POST /api/notifications/:id/read`.

---

## 3. Akun dan sesi

### `POST /api/auth/register` — Mendaftar akun Warga (UC-01)

Publik. Akun yang dibuat selalu berperan `CITIZEN`.

Request:

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `name` | string | ya | 2–100 karakter |
| `phoneNumber` | string | ya | nomor seluler Indonesia, dinormalkan ke `08…` |
| `password` | string | ya | 8–200 karakter |
| `address` | string/null | tidak | maks. 200 karakter |

```json
{ "name": "Budi", "phoneNumber": "+6281234567890", "password": "rahasia123", "address": "Desa Mungguk" }
```

Respons `201`:

```json
{
  "user": {
    "id": "uuid", "name": "Budi", "phoneNumber": "081234567890", "address": "Desa Mungguk",
    "role": "CITIZEN", "isActive": true, "policeSectorId": null, "agencyId": null,
    "createdAt": "2026-11-27T05:30:00.000Z"
  }
}
```

Galat: `422 VALIDATION_ERROR`, `409 ALREADY_REGISTERED` ("Nomor HP sudah terdaftar").

### `POST /api/auth/login` — Masuk (UC-02)

Publik.

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `phoneNumber` | string | ya | dinormalkan seperti saat mendaftar |
| `password` | string | ya | |
| `channel` | string | ya | `"android"` atau `"web"` |

```json
{ "phoneNumber": "081234567890", "password": "rahasia123", "channel": "android" }
```

Respons `200`:

```json
{
  "token": "eyJhbGciOi...",
  "expiresAt": "2026-11-27T17:30:00.000Z",
  "user": {
    "id": "uuid", "name": "Budi", "phoneNumber": "081234567890", "address": "Desa Mungguk",
    "role": "CITIZEN", "policeSector": null, "agency": null
  }
}
```

`policeSector` (`{id, name}`) terisi untuk Operator Polsek, `agency` (`{id, name}`) untuk Petugas Instansi.

Galat: `422 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS` ("Nomor HP atau kata sandi salah"), `403 ACCOUNT_INACTIVE`, `403 CHANNEL_NOT_ALLOWED` (Warga masuk dengan `channel: "web"`).

### `GET /api/auth/me` — Pengguna yang sedang masuk

Respons `200`: `{ "user": { ...sama seperti user pada login } }`. Galat: `401`.

---

## 4. Laporan (Warga)

### `POST /api/reports` — Mengirim laporan karhutla (UC-04)

Peran: `CITIZEN`. Body `multipart/form-data`.

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `photo` | berkas | ya | JPEG, PNG, WebP atau HEIC (dicek dari isi berkas), maks. 10 MB |
| `deviceLat` | angka (teks) | tidak* | -90 s.d. 90, harus berpasangan dengan `deviceLng` |
| `deviceLng` | angka (teks) | tidak* | -180 s.d. 180 |
| `gpsAccuracy` | angka (teks) | tidak | meter, ≥ 0 |
| `reportedAt` | string | tidak | ISO 8601; bila kosong dipakai waktu server |
| `description` | string | tidak | maks. 300 karakter |
| `clientId` | string | tidak | maks. 100 karakter; ID unik buatan aplikasi untuk mencegah laporan terkirim dua kali |

\* Lokasi diambil dari GPS perangkat. Bila GPS tidak dikirim, API memakai koordinat EXIF foto. Bila keduanya tidak ada, laporan ditolak (`LOCATION_UNAVAILABLE`). Bila keduanya ada dan selisihnya > 50 m, laporan tetap diterima dengan tanda `hasLocationMismatch: true`.

Contoh (curl):

```bash
curl -X POST http://localhost:3000/api/reports \
  -H "Authorization: Bearer $TOKEN" \
  -F photo=@api.jpg -F deviceLat=-0.0345 -F deviceLng=110.9512 \
  -F gpsAccuracy=8 -F description="Asap tebal di belakang kebun" \
  -F clientId=7f1c2a90-android-001
```

Respons `201` (laporan baru) atau `200` (dikirim ulang dengan `clientId` yang sama, laporan lama dikembalikan):

```json
{
  "message": "Laporan LA-0012 terkirim, sedang diverifikasi",
  "report": {
    "id": "uuid", "reportNumber": "LA-0012",
    "status": "RECEIVED", "statusLabel": "Laporan Diterima",
    "incidentId": "uuid", "isDuplicate": false, "primaryReportNumber": null,
    "latitude": -0.0345, "longitude": 110.9512, "locationSource": "DEVICE",
    "gpsAccuracy": 8,
    "photoCoordinate": null, "photoCoordinateNote": "Koordinat foto tidak tersedia",
    "hasLocationMismatch": false, "locationMismatchMeters": null,
    "district": { "id": "uuid", "name": "Sekadau Hilir" },
    "policeSector": { "id": "uuid", "name": "Polsek Sekadau Hilir" }, "policeSectorNote": null,
    "description": "Asap tebal di belakang kebun",
    "reportedAt": "2026-11-27T05:30:00.000Z", "receivedAt": "2026-11-27T05:30:02.000Z"
  }
}
```

- `locationSource`: `DEVICE` atau `PHOTO`.
- Laporan ganda: `isDuplicate: true`, `primaryReportNumber` berisi nomor laporan utama, `status` mengikuti laporan utama, dan `message` = "Laporan Anda tergabung dengan laporan lain di lokasi yang sama".

Galat: `422 VALIDATION_ERROR`, `422 LOCATION_UNAVAILABLE` ("Lokasi tidak terdeteksi, aktifkan GPS lalu kirim ulang"), `422 OUTSIDE_SERVICE_AREA` (di luar Kabupaten Sekadau, ada `emergencyNumber: "110"`), `403` bila bukan Warga.

### `GET /api/reports/mine` — Riwayat laporan Warga (UC-05)

Peran: `CITIZEN`. Query opsional `status` (salah satu status, atau `ALL`).

Respons `200` (terbaru lebih dulu):

```json
{
  "reports": [
    {
      "id": "uuid", "reportNumber": "LA-0012",
      "reportedAt": "...", "receivedAt": "...",
      "district": { "name": "Sekadau Hilir" },
      "photoUrl": "/api/reports/uuid/photo",
      "status": "VERIFIED", "statusLabel": "Laporan Diverifikasi",
      "isDuplicate": false, "primaryReportNumber": null
    }
  ]
}
```

Galat: `422` bila `status` tidak dikenal.

### `GET /api/reports/:id` — Detail laporan

Semua peran yang masuk, dengan cakupan:

| Peran | Boleh melihat |
|---|---|
| CITIZEN | laporan miliknya sendiri |
| ADMIN | semua laporan |
| SECTOR_OPERATOR | laporan di wilayah Polsek-nya |
| AGENCY_OFFICER | laporan yang Kejadiannya sudah diteruskan ke instansinya |

Bentuk respons berbeda untuk Warga dan petugas.

**Bentuk Warga (Android):**

```json
{
  "report": {
    "id": "uuid", "reportNumber": "LA-0012",
    "status": "ASSIGNED", "statusLabel": "Petugas Ditugaskan",
    "photoUrl": "/api/reports/uuid/photo",
    "latitude": -0.0345, "longitude": 110.9512,
    "district": { "name": "Sekadau Hilir" },
    "policeSector": { "name": "Polsek Sekadau Hilir" },
    "reportedAt": "...", "receivedAt": "...",
    "description": "Asap tebal di belakang kebun",
    "isDuplicate": false, "primaryReportNumber": null, "duplicateNote": null,
    "rejection": null,
    "history": [
      { "status": "RECEIVED", "statusLabel": "Laporan Diterima", "actorName": "Budi", "note": null, "createdAt": "..." },
      { "status": "VERIFIED", "statusLabel": "Laporan Diverifikasi", "actorName": "Admin Polres Sekadau", "note": null, "createdAt": "..." }
    ],
    "handlingAgencies": [ { "name": "BPBD Kabupaten Sekadau", "confirmed": true } ]
  },
  "hotspots": null
}
```

- `rejection` terisi bila ditolak: `{ "code": "PRANK", "reason": "Laporan iseng", "note": null }`.
- `history` hanya berisi perubahan status (tanpa kegiatan internal petugas).

**Bentuk petugas (web):** semua isi di atas, ditambah:

| Field | Keterangan |
|---|---|
| `locationSource`, `deviceCoordinate`, `gpsAccuracy`, `photoCoordinate`, `photoCoordinateNote` | sumber dan nilai koordinat |
| `hasLocationMismatch`, `locationMismatchMeters`, `locationMismatchNote` | selisih GPS dan EXIF |
| `district`/`policeSector` | dengan `id`; `policeSectorNote` bila Polsek belum ditentukan |
| `reporter` | `{ name, phoneNumber }`; `phoneNumber` `null` untuk Petugas Instansi |
| `incident` | `{ id, isOpen, openedAt, closedAt }` |
| `isDuplicate`, `primaryReport` | `{ id, reportNumber }` bila laporan ini laporan ganda |
| `duplicates` | daftar laporan lain di Kejadian yang sama |
| `history` | status dan kegiatan: `{ id, type: "STATUS"/"ACTIVITY", status, statusLabel, activity, activityLabel, note, actorName, actorRole, createdAt }` |
| `rejection` | seperti bentuk Warga |
| `sectorStandby` | `{ at, by, note }` bila Polsek sudah siaga, selain itu `null` |
| `dispatches` | daftar penerusan: `{ id, agency: {id, name}, dispatchedAt, dispatchedBy, note, confirmedAt, confirmedBy, state: "WAITING"/"CONFIRMED", stateLabel }` |
| `isOverdue` | `true` bila belum ada instansi yang mengonfirmasi ≥ 60 menit (hanya untuk Admin) |
| `myDispatch` | hanya Petugas Instansi: `{ id, confirmed, confirmedAt }` |

`hotspots` (petugas) berisi petunjuk titik panas NASA FIRMS dalam radius 5 km selama 2 hari terakhir:

```json
{
  "available": true, "note": null, "radiusKm": 5, "dayRange": 2, "count": 1, "nearestMeters": 820,
  "hotspots": [ { "latitude": -0.03, "longitude": 110.95, "detectedAt": "...", "satellite": "VIIRS_SNPP_NRT", "confidence": "n", "distanceMeters": 820 } ]
}
```

Bila layanan FIRMS tidak bisa dihubungi: `available: false`, `note: "Data titik panas tidak tersedia"`.

Nilai `activity` di riwayat: `FIELD_CHECK_REQUESTED`, `SECTOR_STANDBY`, `AGENCY_ADDED`, `DISPATCH_CONFIRMED`, `TEAM_DEPARTED`, `SECTOR_PERSONNEL_DEPARTED`.

Galat: `404 NOT_FOUND` (ID tidak ada atau bukan UUID), `403 FORBIDDEN` (di luar cakupan).

### `GET /api/reports/:id/photo` — Foto laporan

Cakupan sama dengan detail. Respons `200` berupa berkas gambar (header `Cache-Control: private, max-age=3600`). Karena butuh header `Authorization`, aplikasi perlu mengunduh foto dengan token (misalnya interceptor pada Glide/Coil), bukan URL polos.

---

## 5. Notifikasi

### `GET /api/notifications`

Semua peran. Respons `200`, maks. 100 terbaru:

```json
{
  "notifications": [
    { "id": "uuid", "reportId": "uuid", "title": "Laporan LA-0012 diverifikasi",
      "body": "Laporan Anda sudah diverifikasi oleh ...", "isRead": false, "createdAt": "..." }
  ]
}
```

Notifikasi disimpan di basis data. Push (FCM) ke Android belum dibuat, jadi aplikasi perlu mengambil daftar ini secara berkala atau saat dibuka.

### `POST /api/notifications/:id/read`

Menandai sudah dibaca. Respons `200`: `{ "notification": { ...sama seperti di atas, isRead: true } }`. Galat: `404` bila bukan milik pengguna.

---

## 6. Dasbor petugas (web)

### `GET /api/incidents` — Daftar Kejadian untuk peta (UC-06)

Peran: ADMIN (semua), SECTOR_OPERATOR (wilayah Polsek-nya), AGENCY_OFFICER (yang diteruskan ke instansinya).

Query opsional: `status`, `districtId`, `policeSectorId`, `from` dan `to` (`YYYY-MM-DD`, WIB, menurut waktu lapor). Maks. 500 Kejadian.

```json
{
  "incidents": [
    {
      "incidentId": "uuid", "isOpen": true,
      "reportId": "uuid", "reportNumber": "LA-0012",
      "reportedAt": "...", "receivedAt": "...",
      "status": "RECEIVED", "statusLabel": "Laporan Diterima",
      "latitude": -0.0345, "longitude": 110.9512,
      "district": { "id": "uuid", "name": "Sekadau Hilir" },
      "policeSector": { "id": "uuid", "name": "Polsek Sekadau Hilir" },
      "duplicateCount": 2, "hasLocationMismatch": false,
      "sectorStandby": false, "isOverdue": false
    }
  ]
}
```

Galat: `422` bila saringan tidak valid.

### `GET /api/stream` — Pembaruan langsung (Server-Sent Events)

Peran petugas. Respons `text/event-stream`. Peristiwa hanya dikirim bila masuk cakupan pengguna:

```
event: report-created
data: {"incidentId":"uuid","reportId":"uuid"}

event: incident-updated
data: {"incidentId":"uuid","reportId":"uuid"}
```

Ada denyut (`: denyut`) tiap 15 detik. Setelah menerima peristiwa, klien memuat ulang `GET /api/incidents` atau detail laporan. Catatan: `EventSource` di peramban tidak bisa mengirim header, jadi web meneruskan aliran ini lewat server SvelteKit (`/dashboard/stream`) yang menambahkan header `Authorization`.

### `GET /api/districts` dan `GET /api/police-sectors`

Pilihan saringan.

```json
{ "districts": [ { "id": "uuid", "code": "61.09.01", "name": "Sekadau Hilir", "policeSectorId": "uuid", "policeSectorName": "Polsek Sekadau Hilir" } ] }
```

```json
{ "policeSectors": [ { "id": "uuid", "name": "Polsek Sekadau Hilir" } ] }
```

---

## 7. Verifikasi dan penolakan (Admin Polres)

### `POST /api/reports/:id/verify` — Memverifikasi laporan (UC-07)

Tanpa body. Hanya dari `RECEIVED`.

Respons `200`:

```json
{ "message": "Laporan diverifikasi", "report": { "id": "uuid", "reportNumber": "LA-0012", "status": "VERIFIED", "statusLabel": "Laporan Diverifikasi" } }
```

Galat: `404`, `409 ALREADY_PROCESSED` ("Laporan sudah diproses oleh <nama> pada <waktu>", ada `currentStatus`, `currentStatusLabel`).

### `POST /api/reports/:id/notes` — Minta cek lapangan ke Polsek (UC-07)

Body: `{ "note": "Mohon cek asap di Desa X" }` (wajib, maks. 500). Hanya saat `RECEIVED`, status tidak berubah.

Respons `201`: `{ "message": "Permintaan cek lapangan dikirim ke Operator Polsek", "notifiedOperators": 1 }`.

Galat: `422`, `404`, `409 ALREADY_PROCESSED`.

### `GET /api/rejection-reasons` — Pilihan alasan penolakan

```json
{ "reasons": [ { "id": "uuid", "code": "CONTROLLED_BURNING", "label": "Pembakaran sampah atau terkendali", "requiresNote": false } ] }
```

Kode yang tersedia: `CONTROLLED_BURNING`, `LOCATION_MISMATCH`, `UNCLEAR_PHOTO`, `PRANK`, `OTHER` (`OTHER` wajib catatan).

### `POST /api/reports/:id/reject` — Menolak laporan (UC-08)

Boleh dari semua status yang belum akhir (`RECEIVED` sampai `IN_PROGRESS`).

Body: `{ "reasonId": "uuid", "note": "opsional, wajib untuk OTHER, maks. 500" }`

Respons `200`:

```json
{
  "message": "Laporan ditolak",
  "report": { "id": "uuid", "reportNumber": "LA-0012", "status": "REJECTED", "statusLabel": "Laporan Ditolak",
              "rejection": { "reason": "Laporan iseng", "note": null } }
}
```

Galat: `422` (`reasonId`, `note`), `404`, `409 ALREADY_PROCESSED` (sudah `REJECTED`/`RESOLVED`).

---

## 8. Penyiagaan Polsek (Operator Polsek)

### `POST /api/reports/:id/standby` — Menyiagakan personel (UC-09)

Body: `{ "note": "opsional, maks. 500" }`. Tidak mengubah status. Hanya laporan di wilayah Polsek operator.

Respons `201`: `{ "message": "Personel Polsek disiagakan", "sectorStandby": true }`.

Galat: `404`, `403` (di luar wilayah), `409 REPORT_REJECTED`, `409 REPORT_RESOLVED`.

---

## 9. Penerusan ke instansi (Admin Polres)

### `GET /api/agencies`

```json
{ "agencies": [ { "id": "uuid", "name": "BPBD Kabupaten Sekadau", "type": "BPBD" } ] }
```

`type`: `FIRE_DEPARTMENT`, `BPBD`, `MANGGALA_AGNI`, `ENVIRONMENT_AGENCY`, `MILITARY`.

### `POST /api/reports/:id/dispatches` — Meneruskan laporan (UC-10)

Boleh saat `VERIFIED`, `ASSIGNED`, atau `IN_PROGRESS`. Dari `VERIFIED` status otomatis menjadi `ASSIGNED`. Pada status lain, instansi hanya ditambahkan.

Body:

```json
{ "agencyIds": ["uuid-bpbd", "uuid-manggala"], "note": "opsional, maks. 500" }
```

Respons `201`:

```json
{
  "message": "Laporan diteruskan ke BPBD Kabupaten Sekadau, Manggala Agni",
  "report": { "id": "uuid", "status": "ASSIGNED", "statusLabel": "Petugas Ditugaskan" },
  "addedAgencies": ["BPBD Kabupaten Sekadau", "Manggala Agni"],
  "skippedAgencies": [],
  "dispatches": [ { "id": "uuid", "agency": { "id": "uuid", "name": "BPBD Kabupaten Sekadau" }, "dispatchedAt": "...", "dispatchedBy": "Admin Polres Sekadau", "note": null, "confirmedAt": null, "confirmedBy": null, "state": "WAITING", "stateLabel": "menunggu konfirmasi" } ]
}
```

Instansi yang sudah pernah diteruskan dilewati (masuk `skippedAgencies`).

Galat: `422` (`agencyIds` kosong atau tidak dikenal), `404`, `409 INVALID_STATUS` (belum diverifikasi atau sudah akhir), `409 ALREADY_DISPATCHED` (semua instansi sudah pernah diteruskan).

---

## 10. Penanganan dan penyelesaian

### `POST /api/reports/:id/status` — Memperbarui status penanganan (UC-11)

Isi **salah satu**: `nextStatus` (ganti status) atau `activity` (catat kegiatan tanpa ganti status). `note` opsional, maks. 500.

| Siapa | Body | Syarat | Hasil |
|---|---|---|---|
| AGENCY_OFFICER | `{ "activity": "CONFIRMED" }` | instansinya menerima penerusan, status `ASSIGNED`/`IN_PROGRESS` | penugasan dikonfirmasi |
| AGENCY_OFFICER | `{ "activity": "DEPARTED" }` | sama | kegiatan "Tim instansi berangkat" |
| AGENCY_OFFICER | `{ "nextStatus": "IN_PROGRESS" }` | status `ASSIGNED` | status Penanganan Berlangsung (sekaligus konfirmasi bila belum) |
| SECTOR_OPERATOR | `{ "activity": "DEPARTED" }` | wilayah Polsek-nya, status belum akhir | kegiatan "Personel Polsek berangkat" |
| ADMIN | `{ "nextStatus": "RESOLVED" }` | status `IN_PROGRESS` | sama dengan `/resolve` |

Respons `200`:

```json
{ "message": "Status menjadi Penanganan Berlangsung", "report": { "id": "uuid", "status": "IN_PROGRESS", "statusLabel": "Penanganan Berlangsung" } }
```

Galat: `422` (keduanya diisi atau kosong, nilai tidak dikenal), `403` (peran atau instansi tidak berhak; `nextStatus: "ASSIGNED"` selalu 403 karena hanya lewat penerusan), `404`, `409 INVALID_TRANSITION` (tidak maju satu tahap), `409 ALREADY_CONFIRMED`, `409 FINAL_STATUS`.

### `POST /api/reports/:id/resolve` — Menyatakan penanganan selesai (UC-12)

Peran: ADMIN. Tanpa body. Hanya dari `IN_PROGRESS`. Kejadian ditutup.

Respons `200`: `{ "message": "Penanganan selesai", "report": { "id": "uuid", "status": "RESOLVED", "statusLabel": "Penanganan Selesai" } }`.

Galat: `403` (bukan Admin), `404`, `409 INVALID_TRANSITION`.

---

## 11. Akun petugas (Admin Polres, UC-03)

### `GET /api/officers`

```json
{
  "officers": [
    { "id": "uuid", "name": "Petugas BPBD", "phoneNumber": "081100000003",
      "role": "AGENCY_OFFICER", "roleLabel": "Petugas Instansi",
      "isActive": true, "statusLabel": "Aktif", "createdAt": "...",
      "policeSector": null, "agency": { "id": "uuid", "name": "BPBD Kabupaten Sekadau" } }
  ]
}
```

### `POST /api/officers` — Menambah akun

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `name` | string | ya | 2–100 karakter |
| `phoneNumber` | string | ya | unik, dinormalkan |
| `role` | string | ya | `SECTOR_OPERATOR` atau `AGENCY_OFFICER` |
| `policeSectorId` | uuid | bila `SECTOR_OPERATOR` | |
| `agencyId` | uuid | bila `AGENCY_OFFICER` | |

Respons `201`: `{ "message": "Akun petugas ditambahkan", "officer": {...}, "initialPassword": "Ab3dEf7hJk" }`. Kata sandi awal (10 karakter) hanya muncul sekali di respons ini.

Galat: `422`, `409 PHONE_TAKEN`.

### `PATCH /api/officers/:id` — Mengubah akun

Body sama dengan tambah (semua field dikirim lagi). Kata sandi tidak berubah. Respons `200`: `{ "message": "Akun petugas diperbarui", "officer": {...} }`. Galat: `404`, `422`, `409 PHONE_TAKEN`.

### `POST /api/officers/:id/deactivate` — Menonaktifkan akun

Respons `200`: `{ "message": "Akun petugas dinonaktifkan", "officer": {...} }`. Akun tidak bisa masuk dan token lamanya langsung ditolak (`401 ACCOUNT_INACTIVE`). Galat: `404`, `409 ALREADY_INACTIVE`.

---

## 12. Akun uji (lingkungan pengembangan saja)

Dibuat oleh `bun run db:migrate` (seed). Kata sandi semua akun: `LaporApi#2026` (bisa diganti lewat `SEED_PASSWORD`).

| Peran | Nomor HP |
|---|---|
| Admin Polres | `081100000001` |
| Operator Polsek Sekadau Hilir | `081100000002` |
| Petugas BPBD | `081100000003` |

Akun Warga dibuat sendiri lewat `POST /api/auth/register`.

---

## 13. Hal yang belum ada di API

- Status `CLOSED` (Laporan Ditutup) dan UC-13: baru di spesifikasi.
- Pembatalan laporan oleh Warga: baru di spesifikasi.
- Push notification (FCM) ke Android: notifikasi baru tersimpan di basis data.
- Swagger/OpenAPI otomatis dari Elysia: belum dipasang. Kontrak per use case ada di `specs/<fitur>/contracts/openapi.yaml`.
