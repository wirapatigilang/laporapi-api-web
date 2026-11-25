// Uji Black Box UC-11 Memperbarui Status Penanganan (spec: specs/010-uc11-handling-status/spec.md)
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { api, db, newCitizen, SEED, SEED_PASSWORD } from "../helpers";
import { freshPoint, NANGA_MAHAP } from "../fixtures";
import { closeOpenIncidents, dispatchTo, historyOf, newOfficer, notificationsFor, statusOf, submitReport, tokens, verifiedReport, type Citizen } from "../scenario";
import { startFirmsMock, stopFirmsMock } from "../firms-mock";
import { closeBrowser, openPage, signIn, WEB_URL } from "./browser";

let citizen: Citizen;
let adminToken: string;
let operatorToken: string;
let bpbdToken: string;
let bpbdId: string;
let reasonId: string;

beforeAll(async () => {
  startFirmsMock();
  await closeOpenIncidents();
  citizen = await newCitizen();
  adminToken = await tokens.admin();
  operatorToken = await tokens.operator();
  bpbdToken = await tokens.officer();
  [{ id: bpbdId }] = await db`SELECT id FROM users WHERE phone_number = ${SEED.officer}`;
  [{ id: reasonId }] = await db`SELECT id FROM rejection_reasons WHERE code = 'PRANK'`;
});
afterAll(async () => {
  stopFirmsMock();
  await closeBrowser();
});

async function assignedTo(agencies: string[]) {
  const report = await verifiedReport(citizen, adminToken);
  expect((await dispatchTo(report.id, agencies, adminToken)).status).toBe(201);
  return report;
}
async function detailAs(phone: string, reportId: string, panel: string) {
  const page = await openPage();
  await signIn(page, phone, SEED_PASSWORD);
  await page.goto(`${WEB_URL}/reports/${reportId}`);
  await page.waitForSelector('[data-testid="detail-map"][data-ready="true"]');
  await page.getByTestId(panel).waitFor();
  return page;
}
const status = (reportId: string, body: unknown, token: string) => api("POST", `/api/reports/${reportId}/status`, body, token);
const confirmedAt = async (reportId: string, agencyPart: string) =>
  (await db`SELECT d.confirmed_at FROM dispatches d JOIN agencies a ON a.id = d.agency_id WHERE d.report_id = ${reportId} AND a.name ILIKE ${"%" + agencyPart + "%"}`)[0].confirmed_at;

describe("UC-11 memperbarui status penanganan", () => {
  test("UJ-11.01 Petugas BPBD mengonfirmasi penugasan → kegiatan, status tetap, 'belum direspons' hilang, notifikasi Warga memuat nama petugas", async () => {
    const report = await assignedTo(["BPBD"]);
    await db`UPDATE dispatches SET dispatched_at = now() - interval '61 minutes' WHERE report_id = ${report.id}`;
    const before = await api("GET", "/api/incidents", undefined, adminToken);
    expect(before.body.incidents.find((i: any) => i.reportId === report.id).isOverdue).toBe(true);

    const page = await detailAs(SEED.officer, report.id, "officer-actions");
    await page.getByTestId("confirm-dispatch-button").click();
    await page.waitForSelector('[data-testid="history-item"][data-activity="DISPATCH_CONFIRMED"]');
    expect(await page.getByTestId("action-result").innerText()).toBe("Penugasan dikonfirmasi");
    expect(await page.getByTestId("confirm-dispatch-button").innerText()).toBe("Tugas sudah dikonfirmasi");
    expect(await page.getByTestId("dispatch-state").innerText()).toBe("sudah dikonfirmasi");
    expect(await page.getByTestId("reporter-phone").count()).toBe(0); // NFR-03
    expect(await statusOf(report.id)).toBe("ASSIGNED");
    expect(await confirmedAt(report.id, "BPBD")).not.toBeNull();
    expect((await historyOf(report.id)).at(-1)).toMatchObject({ type: "ACTIVITY", activity: "DISPATCH_CONFIRMED", actor_id: bpbdId, note: "BPBD Kabupaten Sekadau" });
    const after = await api("GET", "/api/incidents", undefined, adminToken);
    expect(after.body.incidents.find((i: any) => i.reportId === report.id).isOverdue).toBe(false);
    const n = (await notificationsFor(citizen.token, report.id)).find((x) => x.title.includes("menerima tugas"));
    expect(n.body).toContain("Petugas BPBD");
    expect(n.body.toLowerCase()).not.toContain("posisi");
    const d = (await api("GET", `/api/reports/${report.id}`, undefined, citizen.token)).body.report;
    expect(d.handlingAgencies).toEqual([{ name: "BPBD Kabupaten Sekadau", confirmed: true }]);
  });

  test("UJ-11.02 Petugas Damkar mengonfirmasi setelah BPBD → kegiatan tercatat, status tetap", async () => {
    const damkar = await newOfficer("Pemadam");
    const report = await assignedTo(["BPBD", "Pemadam"]);
    expect((await status(report.id, { activity: "CONFIRMED" }, bpbdToken)).status).toBe(200);
    const page = await detailAs(damkar.phoneNumber, report.id, "officer-actions");
    await page.getByTestId("confirm-dispatch-button").click();
    await page.waitForSelector('[data-testid="dispatch-item"][data-state="CONFIRMED"] >> nth=1');
    expect(await statusOf(report.id)).toBe("ASSIGNED");
    const confirms = (await historyOf(report.id)).filter((h: any) => h.activity === "DISPATCH_CONFIRMED");
    expect(confirms.map((h: any) => h.note)).toEqual(["BPBD Kabupaten Sekadau", "Dinas Pemadam Kebakaran"]);
    expect((await status(report.id, { activity: "CONFIRMED" }, bpbdToken)).status).toBe(409); // tidak dua kali
  });

  test("UJ-11.03 Petugas mencatat keberangkatan tim → kegiatan tercatat, status tetap", async () => {
    const report = await assignedTo(["BPBD"]);
    const page = await detailAs(SEED.officer, report.id, "officer-actions");
    await page.fill("#handling-note", "Satu regu, dua mobil tangki");
    await page.getByTestId("depart-button").click();
    await page.waitForSelector('[data-testid="history-item"][data-activity="TEAM_DEPARTED"]');
    expect(await page.locator('[data-testid="history-item"][data-activity="TEAM_DEPARTED"]').innerText()).toContain("Satu regu, dua mobil tangki");
    expect(await statusOf(report.id)).toBe("ASSIGNED");
  });

  test("UJ-11.04 Petugas menekan Mulai Penanganan → Penanganan Berlangsung, Warga dan Admin menerima notifikasi", async () => {
    const report = await assignedTo(["BPBD"]);
    expect((await status(report.id, { activity: "CONFIRMED" }, bpbdToken)).status).toBe(200);
    const page = await detailAs(SEED.officer, report.id, "officer-actions");
    await page.getByTestId("start-button").click();
    await page.getByTestId("start-dialog").waitFor();
    await page.getByTestId("start-yes").click();
    await page.waitForSelector('[data-testid="report-status"] [data-status="IN_PROGRESS"]');
    expect(await page.getByTestId("action-result").innerText()).toBe("Status menjadi Penanganan Berlangsung");
    expect(await page.getByTestId("start-button").isDisabled()).toBe(true);
    expect((await historyOf(report.id)).at(-1)).toMatchObject({ type: "STATUS", status: "IN_PROGRESS", actor_id: bpbdId });
    expect((await notificationsFor(citizen.token, report.id)).some((n) => n.title.includes("penanganan berlangsung") && n.body.includes("Petugas BPBD"))).toBe(true);
    expect((await notificationsFor(adminToken, report.id)).some((n) => n.title.includes("penanganan berlangsung"))).toBe(true);
  });

  test("UJ-11.05 Laporan Diverifikasi langsung ke Penanganan Berlangsung → 409, status tetap", async () => {
    const report = await verifiedReport(citizen, adminToken);
    const res = await status(report.id, { nextStatus: "IN_PROGRESS" }, bpbdToken);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("Status hanya boleh maju satu tahap: dari Laporan Diverifikasi ke Petugas Ditugaskan, bukan Penanganan Berlangsung");
    expect(await statusOf(report.id)).toBe("VERIFIED");
  });

  test("UJ-11.06 Penanganan Berlangsung kembali ke Petugas Ditugaskan → 409, status tetap", async () => {
    const report = await assignedTo(["BPBD"]);
    expect((await status(report.id, { nextStatus: "IN_PROGRESS" }, bpbdToken)).status).toBe(200);
    const res = await status(report.id, { nextStatus: "ASSIGNED" }, bpbdToken);
    expect(res.status).toBe(409);
    expect(await statusOf(report.id)).toBe("IN_PROGRESS");
  });

  test("UJ-11.07 Petugas Instansi yang tidak menerima Penerusan mengubah status → 403, status tetap", async () => {
    const report = await assignedTo(["Manggala"]);
    expect((await status(report.id, { nextStatus: "IN_PROGRESS" }, bpbdToken)).status).toBe(403);
    expect((await status(report.id, { activity: "CONFIRMED" }, bpbdToken)).status).toBe(403);
    expect(await statusOf(report.id)).toBe("ASSIGNED");
  });

  test("UJ-11.08 Operator Polsek mencatat keberangkatan personel pada Laporan Diterima → kegiatan tercatat, status tetap", async () => {
    const report = await submitReport(citizen);
    const page = await detailAs(SEED.operator, report.id, "operator-actions");
    await page.getByTestId("sector-depart-button").click();
    await page.waitForSelector('[data-testid="history-item"][data-activity="SECTOR_PERSONNEL_DEPARTED"]');
    expect(await page.getByTestId("action-result").innerText()).toBe("Keberangkatan personel Polsek dicatat");
    expect(await statusOf(report.id)).toBe("RECEIVED");
    // Di luar wilayahnya: 403.
    const far = await submitReport(citizen, { at: freshPoint(NANGA_MAHAP) });
    expect((await status(far.id, { activity: "DEPARTED" }, operatorToken)).status).toBe(403);
  });

  test("UJ-11.09 Operator Polsek mencatat keberangkatan pada Laporan Ditolak → ditolak, tidak ada kegiatan baru", async () => {
    const report = await submitReport(citizen);
    expect((await api("POST", `/api/reports/${report.id}/reject`, { reasonId }, adminToken)).status).toBe(200);
    const res = await status(report.id, { activity: "DEPARTED" }, operatorToken);
    expect(res.status).toBe(409);
    expect((await historyOf(report.id)).some((h: any) => h.type === "ACTIVITY")).toBe(false);
  });

  test("UJ-11.10 Petugas Instansi membuka Dasbor Laporan → hanya Laporan yang diteruskan ke Instansinya", async () => {
    const mine = await assignedTo(["BPBD"]);
    const other = await assignedTo(["Manggala"]);
    const unsent = await verifiedReport(citizen, adminToken);
    const page = await openPage();
    await signIn(page, SEED.officer, SEED_PASSWORD);
    await page.getByTestId("incident-list").waitFor();
    expect(await page.getByTestId("scope-note").innerText()).toBe("Menampilkan laporan yang diteruskan ke BPBD Kabupaten Sekadau.");
    const numbers = await page.getByTestId("incident-row").evaluateAll((rows) => rows.map((r) => r.getAttribute("data-report-number")));
    expect(numbers).toContain(mine.reportNumber);
    expect(numbers).not.toContain(other.reportNumber);
    expect(numbers).not.toContain(unsent.reportNumber);
    const all = (await api("GET", "/api/incidents", undefined, bpbdToken)).body.incidents;
    const sent = await db`SELECT DISTINCT d.report_id FROM dispatches d JOIN agencies a ON a.id = d.agency_id WHERE a.name ILIKE '%BPBD%'`;
    const allowed = new Set(sent.map((r: any) => r.report_id));
    expect(all.every((i: any) => allowed.has(i.reportId))).toBe(true);
  });

  test("UJ-11.11 Petugas Instansi mengubah Laporan Diverifikasi menjadi Petugas Ditugaskan → 403, status tetap", async () => {
    const report = await verifiedReport(citizen, adminToken);
    const res = await status(report.id, { nextStatus: "ASSIGNED" }, bpbdToken);
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe("Status Petugas Ditugaskan hanya diberikan Admin Polres melalui penerusan ke instansi");
    expect((await status(report.id, { nextStatus: "ASSIGNED" }, operatorToken)).status).toBe(403);
    expect(await statusOf(report.id)).toBe("VERIFIED");
  });
});
