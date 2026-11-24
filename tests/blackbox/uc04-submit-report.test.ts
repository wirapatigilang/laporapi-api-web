// Uji Black Box UC-04 Mengirim Laporan Karhutla (spec: specs/003-uc04-submit-report/spec.md)
import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { api, db, loginAs, newReporter, SEED } from "./helpers";
import { freshPoint, jpegWithGps, jpegWithoutGps, NANGA_MAHAP, north, PONTIANAK, reportForm } from "./fixtures";

let reporter: Awaited<ReturnType<typeof newReporter>>;
let adminToken: string;
let operatorToken: string; // Operator Polsek Sekadau Hilir

const submit = (form: FormData, token = reporter.token) => api("POST", "/api/reports", form, token);
const countReports = async () => Number((await db`SELECT count(*)::int AS n FROM reports`)[0].n);
const notifiedFor = async (token: string, reportId: string) =>
  (await api("GET", "/api/notifications", undefined, token)).body.notifications.filter((n: any) => n.reportId === reportId).length;

beforeAll(async () => {
  reporter = await newReporter();
  adminToken = await loginAs(SEED.admin);
  operatorToken = await loginAs(SEED.operator);
});

// Kondisi awal setiap uji: tidak ada Kejadian terbuka (kecuali disiapkan oleh uji itu sendiri).
beforeEach(async () => {
  await db`UPDATE incidents SET is_open = false, closed_at = now() WHERE is_open`;
});

describe("UC-04 alur utama dan hak akses", () => {
  test("UJ-04.01 data lengkap, EXIF 20 m → 201 RECEIVED, Kejadian baru, Riwayat Status, Notifikasi Admin + Operator wilayah", async () => {
    const p = freshPoint();
    const exif = north(p, 20);
    const res = await submit(reportForm({ photo: jpegWithGps(exif.latitude, exif.longitude), device: p, description: "Asap tebal di kebun sawit" }));
    expect(res.status).toBe(201);
    const r = res.body.report;
    expect(r.reportNumber).toMatch(/^LA-\d{4,}$/);
    expect(r.status).toBe("RECEIVED");
    expect(r.isDuplicate).toBe(false);
    expect(r.locationSource).toBe("DEVICE");
    expect(r.hasLocationMismatch).toBe(false);
    expect(r.locationMismatchMeters).toBeCloseTo(20, 0);
    expect(r.district.name).toBe("Sekadau Hilir");
    expect(r.policeSector.name).toBe("Polsek Sekadau Hilir");
    expect(res.body.message).toBe(`Laporan ${r.reportNumber} terkirim, sedang diverifikasi`);
    const [inc] = await db`SELECT primary_report_id, is_open FROM incidents WHERE id = ${r.incidentId}`;
    expect(inc.primary_report_id).toBe(r.id);
    expect(inc.is_open).toBe(true);
    const hist = await db`SELECT type, status FROM status_histories WHERE report_id = ${r.id}`;
    expect(hist).toEqual([{ type: "STATUS", status: "RECEIVED" }]);
    expect(await notifiedFor(adminToken, r.id)).toBe(1);
    expect(await notifiedFor(operatorToken, r.id)).toBe(1);
    const otherOperators = await db`SELECT count(*)::int AS n FROM notifications n JOIN users u ON u.id = n.recipient_id
      WHERE n.report_id = ${r.id} AND u.role = 'SECTOR_OPERATOR' AND u.police_sector_id <> (SELECT police_sector_id FROM users WHERE email = ${SEED.operator})`;
    expect(otherOperators[0].n).toBe(0);
  });

  test("UJ-04.04 keterangan tepat 300 karakter → 201", async () => {
    const res = await submit(reportForm({ device: freshPoint(), description: "a".repeat(300) }));
    expect(res.status).toBe(201);
    expect(res.body.report.description.length).toBe(300);
  });

  test("UJ-04.24 keterangan kosong → 201 (opsional)", async () => {
    const res = await submit(reportForm({ device: freshPoint() }));
    expect(res.status).toBe(201);
    expect(res.body.report.description).toBeNull();
  });

  test("UJ-04.23 tanpa token → 401; token Admin Polres → 403", async () => {
    const before = await countReports();
    expect((await submit(reportForm({ device: freshPoint() }), "")).status).toBe(401);
    expect((await submit(reportForm({ device: freshPoint() }), adminToken)).status).toBe(403);
    expect(await countReports()).toBe(before);
  });
});

describe("UC-04 validasi foto dan keterangan (4a, 4c)", () => {
  test("UJ-04.02 tanpa foto → 422 'Foto wajib dilampirkan', tidak tersimpan", async () => {
    const before = await countReports();
    const res = await submit(reportForm({ photo: null, device: freshPoint() }));
    expect(res.status).toBe(422);
    expect(res.body.error.fields.photo).toBe("Foto wajib dilampirkan");
    expect(await countReports()).toBe(before);
  });

  test("UJ-04.03 berkas bukan gambar (teks bernama .jpg) → 422, tidak tersimpan", async () => {
    const before = await countReports();
    const res = await submit(reportForm({ photo: new Blob(["ini bukan gambar"], { type: "image/jpeg" }), device: freshPoint() }));
    expect(res.status).toBe(422);
    expect(res.body.error.fields.photo).toBeDefined();
    expect(await countReports()).toBe(before);
  });

  test("UJ-04.05 keterangan 301 karakter → 422 batas karakter", async () => {
    const res = await submit(reportForm({ device: freshPoint(), description: "a".repeat(301) }));
    expect(res.status).toBe(422);
    expect(res.body.error.fields.description).toBe("Keterangan maksimal 300 karakter");
  });

  test("UJ-04.25 foto lebih dari 10 MB → 422", async () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    big.set([0xff, 0xd8, 0xff], 0);
    const res = await submit(reportForm({ photo: new Blob([big], { type: "image/jpeg" }), device: freshPoint() }));
    expect(res.status).toBe(422);
    expect(res.body.error.fields.photo).toBe("Ukuran foto maksimal 10 MB");
  });

  test("UJ-04.26 reportedAt salah format → 422", async () => {
    const res = await submit(reportForm({ device: freshPoint(), reportedAt: "kemarin sore" }));
    expect(res.status).toBe(422);
    expect(res.body.error.fields.reportedAt).toBeDefined();
  });

  test("UJ-04.27 lintang perangkat 91 → 422", async () => {
    const res = await submit(reportForm({ device: { latitude: 91, longitude: 110.9 } }));
    expect(res.status).toBe(422);
    expect(res.body.error.fields.deviceLat).toBeDefined();
  });
});

describe("UC-04 koordinat foto (5, 5a–5d)", () => {
  const withExifAt = async (meters: number) => {
    const p = freshPoint();
    const e = north(p, meters);
    return submit(reportForm({ photo: jpegWithGps(e.latitude, e.longitude), device: p }));
  };

  test("UJ-04.07 EXIF 49 m → 201, koordinat foto tersimpan, tanpa tanda selisih", async () => {
    const res = await withExifAt(49);
    expect(res.status).toBe(201);
    expect(res.body.report.photoCoordinate).not.toBeNull();
    expect(res.body.report.hasLocationMismatch).toBe(false);
  });

  test("UJ-04.08 EXIF tepat 50 m → 201, tanpa tanda selisih", async () => {
    const res = await withExifAt(50);
    expect(res.status).toBe(201);
    expect(res.body.report.hasLocationMismatch).toBe(false);
    expect(res.body.report.locationMismatchMeters).toBe(50);
  });

  test("UJ-04.09 EXIF 51 m → 201, tanda selisih beserta jaraknya", async () => {
    const res = await withExifAt(51);
    expect(res.status).toBe(201);
    expect(res.body.report.hasLocationMismatch).toBe(true);
    expect(res.body.report.locationMismatchMeters).toBe(51);
    expect(res.body.report.locationSource).toBe("DEVICE");
  });

  test("UJ-04.10 foto tanpa tag GPS EXIF → 201, 'Koordinat foto tidak tersedia'", async () => {
    const res = await submit(reportForm({ photo: jpegWithoutGps(), device: freshPoint() }));
    expect(res.status).toBe(201);
    expect(res.body.report.photoCoordinate).toBeNull();
    expect(res.body.report.photoCoordinateNote).toBe("Koordinat foto tidak tersedia");
  });

  test("UJ-04.11 EXIF bernilai 0,0 → diperlakukan seperti tanpa EXIF", async () => {
    const res = await submit(reportForm({ photo: jpegWithGps(0, 0), device: freshPoint() }));
    expect(res.status).toBe(201);
    expect(res.body.report.photoCoordinate).toBeNull();
    expect(res.body.report.photoCoordinateNote).toBe("Koordinat foto tidak tersedia");
    expect(res.body.report.hasLocationMismatch).toBe(false);
  });

  test("UJ-04.12 koordinat perangkat tidak dikirim, EXIF di Sekadau → 201, sumber lokasi PHOTO", async () => {
    const e = freshPoint();
    const res = await submit(reportForm({ photo: jpegWithGps(e.latitude, e.longitude), device: null }));
    expect(res.status).toBe(201);
    expect(res.body.report.locationSource).toBe("PHOTO");
    expect(res.body.report.latitude).toBeCloseTo(e.latitude, 6);
    expect(res.body.report.district.name).toBe("Sekadau Hilir");
  });

  test("UJ-04.13 tanpa koordinat perangkat dan tanpa EXIF → 422 'Lokasi tidak terdeteksi…'", async () => {
    const before = await countReports();
    const res = await submit(reportForm({ photo: jpegWithoutGps(), device: null }));
    expect(res.status).toBe(422);
    expect(res.body.error.message).toBe("Lokasi tidak terdeteksi, aktifkan GPS lalu kirim ulang");
    expect(await countReports()).toBe(before);
  });
});

describe("UC-04 wilayah dan Polsek (6, 6a, 6b)", () => {
  test("UJ-04.06 koordinat di luar Kabupaten Sekadau → 422 dengan nomor 110, tidak tersimpan", async () => {
    const before = await countReports();
    const res = await submit(reportForm({ device: PONTIANAK }));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("OUTSIDE_SERVICE_AREA");
    expect(res.body.error.message).toBe("Lokasi di luar wilayah layanan Polres Sekadau, silakan hubungi 110");
    expect(res.body.error.emergencyNumber).toBe("110");
    expect(await countReports()).toBe(before);
  });

  test("UJ-04.14 Kecamatan belum terpetakan ke Polsek → 201, 'Polsek belum ditentukan', Notifikasi hanya ke Admin", async () => {
    const [d] = await db`SELECT id, police_sector_id FROM districts WHERE name = 'Nanga Mahap'`;
    await db`UPDATE districts SET police_sector_id = NULL WHERE id = ${d.id}`;
    try {
      const res = await submit(reportForm({ device: freshPoint(NANGA_MAHAP) }));
      expect(res.status).toBe(201);
      expect(res.body.report.district.name).toBe("Nanga Mahap");
      expect(res.body.report.policeSector).toBeNull();
      expect(res.body.report.policeSectorNote).toBe("Polsek belum ditentukan");
      const roles = await db`SELECT DISTINCT u.role FROM notifications n JOIN users u ON u.id = n.recipient_id WHERE n.report_id = ${res.body.report.id}`;
      expect(roles.map((r: any) => r.role)).toEqual(["ADMIN"]);
    } finally {
      await db`UPDATE districts SET police_sector_id = ${d.police_sector_id} WHERE id = ${d.id}`;
    }
  });
});

describe("UC-04 laporan ganda (7, 7a, 3a) — tabel keputusan R1–R4", () => {
  const primaryAt = async (p: { latitude: number; longitude: number }) => {
    const res = await submit(reportForm({ device: p }));
    expect(res.status).toBe(201);
    return res.body.report;
  };

  test("UJ-04.15 R1: 50 m dari laporan utama, tiket terbuka → laporan ganda, tanpa Notifikasi baru", async () => {
    const p = freshPoint();
    const primary = await primaryAt(p);
    const other = await newReporter();
    const res = await submit(reportForm({ device: north(p, 50) }), other.token);
    expect(res.status).toBe(201);
    expect(res.body.report.isDuplicate).toBe(true);
    expect(res.body.report.primaryReportNumber).toBe(primary.reportNumber);
    expect(res.body.report.incidentId).toBe(primary.incidentId);
    expect(res.body.report.status).toBe(primary.status);
    expect(res.body.message).toBe("Laporan Anda tergabung dengan laporan lain di lokasi yang sama");
    expect(await notifiedFor(adminToken, res.body.report.id)).toBe(0);
    expect(await notifiedFor(operatorToken, res.body.report.id)).toBe(0);
  });

  test("UJ-04.16 R2: 30 m, tiket tertutup → Kejadian baru", async () => {
    const p = freshPoint();
    const primary = await primaryAt(p);
    await db`UPDATE incidents SET is_open = false, closed_at = now() WHERE id = ${primary.incidentId}`;
    const res = await submit(reportForm({ device: north(p, 30) }));
    expect(res.status).toBe(201);
    expect(res.body.report.isDuplicate).toBe(false);
    expect(res.body.report.incidentId).not.toBe(primary.incidentId);
  });

  test("UJ-04.17 R3: 51 m, tiket terbuka → Kejadian baru", async () => {
    const p = freshPoint();
    const primary = await primaryAt(p);
    const res = await submit(reportForm({ device: north(p, 51) }));
    expect(res.body.report.isDuplicate).toBe(false);
    expect(res.body.report.incidentId).not.toBe(primary.incidentId);
  });

  test("UJ-04.18 R4: 51 m, tiket tertutup → Kejadian baru", async () => {
    const p = freshPoint();
    const primary = await primaryAt(p);
    await db`UPDATE incidents SET is_open = false, closed_at = now() WHERE id = ${primary.incidentId}`;
    const res = await submit(reportForm({ device: north(p, 51) }));
    expect(res.body.report.isDuplicate).toBe(false);
    expect(res.body.report.incidentId).not.toBe(primary.incidentId);
  });

  test("UJ-04.19 49 m, tiket terbuka → laporan ganda", async () => {
    const p = freshPoint();
    const primary = await primaryAt(p);
    const res = await submit(reportForm({ device: north(p, 49) }));
    expect(res.body.report.isDuplicate).toBe(true);
    expect(res.body.report.incidentId).toBe(primary.incidentId);
  });

  test("UJ-04.20 Pelapor yang sama mengirim lagi 20 m dari laporan pertamanya → digabung, tidak ditolak", async () => {
    const p = freshPoint();
    const primary = await primaryAt(p);
    const res = await submit(reportForm({ device: north(p, 20) }));
    expect(res.status).toBe(201);
    expect(res.body.report.isDuplicate).toBe(true);
    expect(res.body.report.primaryReportNumber).toBe(primary.reportNumber);
  });

  test("UJ-04.21 Kejadian terbuka berumur 3 hari, laporan baru 20 m → tetap digabung", async () => {
    const p = freshPoint();
    const primary = await primaryAt(p);
    await db`UPDATE incidents SET opened_at = now() - interval '3 days' WHERE id = ${primary.incidentId}`;
    const res = await submit(reportForm({ device: north(p, 20) }));
    expect(res.body.report.isDuplicate).toBe(true);
    expect(res.body.report.incidentId).toBe(primary.incidentId);
  });
});

describe("UC-04 laporan bersamaan (RR-3.7)", () => {
  test("UJ-04.28 lima laporan di titik yang sama dikirim bersamaan → satu Kejadian, satu laporan utama", async () => {
    const p = freshPoint();
    const results = await Promise.all(Array.from({ length: 5 }, (_, i) => submit(reportForm({ device: north(p, i * 5) }))));
    expect(results.every((r) => r.status === 201)).toBe(true);
    const incidents = new Set(results.map((r) => r.body.report.incidentId));
    expect(incidents.size).toBe(1);
    expect(results.filter((r) => !r.body.report.isDuplicate).length).toBe(1);
  });
});

describe("UC-04 kirim ulang dari draf (3b)", () => {
  test("UJ-04.22 clientId yang sama dikirim dua kali → 200 Laporan pertama, tidak ada Laporan baru", async () => {
    const clientId = `draf-${crypto.randomUUID()}`;
    const reportedAt = new Date(Date.now() - 15 * 60_000).toISOString();
    const first = await submit(reportForm({ device: freshPoint(), clientId, reportedAt }));
    expect(first.status).toBe(201);
    const before = await countReports();
    const second = await submit(reportForm({ device: freshPoint(), clientId, reportedAt }));
    expect(second.status).toBe(200);
    expect(second.body.report.id).toBe(first.body.report.id);
    expect(second.body.report.reportNumber).toBe(first.body.report.reportNumber);
    expect(await countReports()).toBe(before);
    expect(new Date(second.body.report.reportedAt).toISOString()).toBe(reportedAt);
  });
});
