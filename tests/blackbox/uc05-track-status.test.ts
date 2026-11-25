// Uji Black Box UC-05 Memantau Status Laporan (spec: specs/007-uc05-track-status/spec.md)
import { beforeAll, describe, expect, test } from "bun:test";
import { api, db, newCitizen, SEED } from "./helpers";
import { closeOpenIncidents, incidentWithDuplicates, notificationsFor, submitReport, tokens, type Citizen } from "./scenario";

let adminToken: string;
let adminId: string;
let reasons: Record<string, string>;

beforeAll(async () => {
  await closeOpenIncidents();
  adminToken = await tokens.admin();
  [{ id: adminId }] = await db`SELECT id FROM users WHERE phone_number = ${SEED.admin}`;
  reasons = Object.fromEntries((await db`SELECT code, id FROM rejection_reasons`).map((r: any) => [r.code, r.id]));
});

const mine = (c: Citizen, q = "") => api("GET", `/api/reports/mine${q}`, undefined, c.token);
const detail = (c: Citizen, id: string) => api("GET", `/api/reports/${id}`, undefined, c.token);

describe("UC-05 memantau status laporan", () => {
  let citizen: Citizen;
  let sent: Awaited<ReturnType<typeof submitReport>>[];

  test("UJ-05.01 Warga dengan tiga laporan meminta daftar → tiga laporan miliknya, terbaru lebih dulu, berisi nomor, waktu, kecamatan, foto, status", async () => {
    citizen = await newCitizen();
    sent = [];
    for (let i = 0; i < 3; i++) sent.push(await submitReport(citizen));
    await submitReport(await newCitizen()); // laporan Warga lain tidak ikut
    const res = await mine(citizen);
    expect(res.status).toBe(200);
    expect(res.body.reports.map((r: any) => r.reportNumber)).toEqual(sent.map((r) => r.reportNumber).reverse());
    const first = res.body.reports[0];
    expect(first).toMatchObject({ id: sent[2].id, status: "RECEIVED", statusLabel: "Laporan Diterima", district: { name: "Sekadau Hilir" }, photoUrl: `/api/reports/${sent[2].id}/photo` });
    expect(typeof first.reportedAt).toBe("string");
    expect((await api("GET", first.photoUrl, undefined, citizen.token)).status).toBe(200);
  });

  test("UJ-05.02 daftar disaring Laporan Diverifikasi → hanya laporan berstatus tersebut", async () => {
    expect((await api("POST", `/api/reports/${sent[1].id}/verify`, {}, adminToken)).status).toBe(200);
    const res = await mine(citizen, "?status=VERIFIED");
    expect(res.body.reports.map((r: any) => r.id)).toEqual([sent[1].id]);
    expect((await mine(citizen, "?status=ALL")).body.reports.length).toBe(3);
    const bad = await mine(citizen, "?status=DONE");
    expect(bad.status).toBe(422);
    expect(bad.body.error.fields.status).toBe("Status tidak dikenal");
  });

  test("UJ-05.03 Warga yang belum pernah melapor → daftar kosong", async () => {
    const res = await mine(await newCitizen());
    expect(res.status).toBe(200);
    expect(res.body.reports).toEqual([]);
  });

  test("UJ-05.04 detail laporan berstatus Petugas Ditugaskan → status, riwayat bertanggal, nama petugas; tanpa posisi tim", async () => {
    // Kondisi awal: Petugas Ditugaskan disiapkan di basis data uji (UC-10 dibangun pada iterasi 9; diuji ulang di sana).
    const r = sent[1];
    await db`UPDATE reports SET current_status = 'ASSIGNED' WHERE id = ${r.id}`;
    await db`INSERT INTO status_histories (report_id, type, status, actor_id) VALUES (${r.id}, 'STATUS', 'ASSIGNED', ${adminId})`;
    const res = await detail(citizen, r.id);
    expect(res.status).toBe(200);
    const d = res.body.report;
    expect(d).toMatchObject({ status: "ASSIGNED", statusLabel: "Petugas Ditugaskan", photoUrl: `/api/reports/${r.id}/photo`, district: { name: "Sekadau Hilir" } });
    expect(d.latitude).toBeCloseTo(r.latitude, 5);
    expect(d.history.map((h: any) => h.statusLabel)).toEqual(["Laporan Diterima", "Laporan Diverifikasi", "Petugas Ditugaskan"]);
    expect(d.history.every((h: any) => typeof h.createdAt === "string")).toBe(true);
    expect(d.history[2].actorName).toBe("Admin Polres Sekadau");
    // Tidak ada data posisi tim, data pelapor lain, atau petunjuk titik panas.
    const text = JSON.stringify(res.body);
    for (const key of ["teamPosition", "duplicates", "reporter", "hasLocationMismatch", "photoCoordinate"]) expect(text).not.toContain(`"${key}"`);
    expect(res.body.hotspots).toBeNull();
  });

  test("UJ-05.05 detail laporan yang ditolak → alasan penolakan tampil", async () => {
    const r = sent[0];
    expect((await api("POST", `/api/reports/${r.id}/reject`, { reasonId: reasons.OTHER, note: "Asap dari dapur warga" }, adminToken)).status).toBe(200);
    const d = (await detail(citizen, r.id)).body.report;
    expect(d.status).toBe("REJECTED");
    expect(d.rejection).toEqual({ code: "OTHER", reason: "Lainnya", note: "Asap dari dapur warga" });
  });

  test("UJ-05.06 detail laporan ganda → keterangan tergabung dengan nomor laporan utama, status mengikuti laporan utama", async () => {
    const { primary, dups, dupOwners } = await incidentWithDuplicates(1);
    expect((await api("POST", `/api/reports/${primary.id}/verify`, {}, adminToken)).status).toBe(200);
    const d = (await detail(dupOwners[0], dups[0].id)).body.report;
    expect(d.isDuplicate).toBe(true);
    expect(d.primaryReportNumber).toBe(primary.reportNumber);
    expect(d.duplicateNote).toBe(`Tergabung dengan laporan #${primary.reportNumber}`);
    expect(d.status).toBe("VERIFIED");
    const list = (await mine(dupOwners[0])).body.reports;
    expect(list[0]).toMatchObject({ isDuplicate: true, primaryReportNumber: primary.reportNumber, status: "VERIFIED" });
  });

  test("UJ-05.07 Warga meminta detail laporan milik warga lain → 403", async () => {
    const other = await newCitizen();
    const res = await detail(other, sent[2].id);
    expect(res.status).toBe(403);
    expect((await api("GET", `/api/reports/${sent[2].id}/photo`, undefined, other.token)).status).toBe(403);
  });

  test("UJ-05.08 status diubah Admin menjadi Laporan Diverifikasi → Notifikasi baru tersimpan dan dapat dibuka menuju detail", async () => {
    const r = await submitReport(citizen);
    expect((await api("POST", `/api/reports/${r.id}/verify`, {}, adminToken)).status).toBe(200);
    const notes = await notificationsFor(citizen.token, r.id);
    const n = notes.find((x) => x.title === `Laporan ${r.reportNumber} diverifikasi`);
    expect(n).toBeDefined();
    expect(n.isRead).toBe(false);
    expect(n.body).toContain("Admin Polres Sekadau"); // menyebut nama petugas
    const opened = await api("POST", `/api/notifications/${n.id}/read`, {}, citizen.token);
    expect(opened.status).toBe(200);
    expect(opened.body.notification).toMatchObject({ isRead: true, reportId: r.id });
    const d = await detail(citizen, opened.body.notification.reportId);
    expect(d.body.report.status).toBe("VERIFIED");
    // Notifikasi milik orang lain tidak dapat dibuka.
    expect((await api("POST", `/api/notifications/${n.id}/read`, {}, (await newCitizen()).token)).status).toBe(404);
  });
});
