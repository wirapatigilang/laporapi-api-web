// Uji Black Box UC-12 Menyatakan Penanganan Selesai (spec: specs/011-uc12-resolve/spec.md)
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { api, db, newCitizen, SEED, SEED_PASSWORD } from "../helpers";
import { freshPoint, north } from "../fixtures";
import { closeOpenIncidents, dispatchTo, newOfficer, historyOf, incidentWithDuplicates, notificationsFor, statusOf, submitReport, tokens, verifiedReport, type Citizen } from "../scenario";
import { startFirmsMock, stopFirmsMock } from "../firms-mock";
import { closeBrowser, openPage, signIn, WEB_URL } from "./browser";

let citizen: Citizen;
let adminToken: string;
let operatorToken: string;
let bpbdToken: string;

beforeAll(async () => {
  startFirmsMock();
  await closeOpenIncidents();
  citizen = await newCitizen();
  adminToken = await tokens.admin();
  operatorToken = await tokens.operator();
  bpbdToken = await tokens.officer();
});
afterAll(async () => {
  stopFirmsMock();
  await closeBrowser();
});

const status = (id: string, body: unknown, token: string) => api("POST", `/api/reports/${id}/status`, body, token);
const resolve = (id: string, token: string) => api("POST", `/api/reports/${id}/resolve`, {}, token);
async function inProgress(reportId: string) {
  expect((await api("POST", `/api/reports/${reportId}/verify`, {}, adminToken)).status).toBe(200);
  expect((await dispatchTo(reportId, ["BPBD"], adminToken)).status).toBe(201);
  expect((await status(reportId, { nextStatus: "IN_PROGRESS" }, bpbdToken)).status).toBe(200);
}
async function adminDetail(reportId: string) {
  const page = await openPage();
  await signIn(page, SEED.admin, SEED_PASSWORD);
  await page.goto(`${WEB_URL}/reports/${reportId}`);
  await page.waitForSelector('[data-testid="detail-map"][data-ready="true"]');
  return page;
}
const isOpen = async (incidentId: string) => (await db`SELECT is_open FROM incidents WHERE id = ${incidentId}`)[0].is_open as boolean;

describe("UC-12 menyatakan penanganan selesai", () => {
  test("UJ-12.01 Admin Polres menyatakan selesai (ada laporan ganda) setelah modal konfirmasi → semua Penanganan Selesai, tiket ditutup, notifikasi", async () => {
    const { primary, dups, dupOwners, owner } = await incidentWithDuplicates(1);
    await inProgress(primary.id);
    const page = await adminDetail(primary.id);
    await page.getByTestId("resolve-button").click();
    const dialog = page.getByTestId("resolve-dialog");
    await dialog.waitFor();
    expect(await dialog.getByTestId("status-transition").innerText()).toContain("Penanganan Selesai");
    expect(await dialog.locator("textarea, input[type=text]").count()).toBe(0); // ASUMSI-20
    await page.getByTestId("resolve-yes").click();
    await page.waitForSelector('[data-testid="report-status"] [data-status="RESOLVED"]');
    expect(await page.getByTestId("action-result").innerText()).toBe("Penanganan selesai");
    expect(await page.getByTestId("resolve-button").isDisabled()).toBe(true);

    for (const r of [primary, dups[0]]) {
      expect(await statusOf(r.id)).toBe("RESOLVED");
      expect((await historyOf(r.id)).at(-1)).toMatchObject({ type: "STATUS", status: "RESOLVED" });
    }
    expect(await isOpen(primary.incidentId)).toBe(false);
    const done = (n: any) => n.title.endsWith("selesai, api sudah padam");
    expect((await notificationsFor(owner.token, primary.id)).some(done)).toBe(true);
    expect((await notificationsFor(dupOwners[0].token, dups[0].id)).some(done)).toBe(true);
    expect((await notificationsFor(bpbdToken, primary.id)).some(done)).toBe(true);
    expect((await notificationsFor(operatorToken, primary.id)).some(done)).toBe(true);
  });

  test("UJ-12.02 Laporan Petugas Ditugaskan → tombol Admin tidak aktif, API 409", async () => {
    const report = await verifiedReport(citizen, adminToken);
    expect((await dispatchTo(report.id, ["BPBD"], adminToken)).status).toBe(201);
    const page = await adminDetail(report.id);
    expect(await page.getByTestId("resolve-button").isDisabled()).toBe(true);
    const res = await resolve(report.id, adminToken);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("Laporan berstatus Petugas Ditugaskan; penanganan belum berlangsung");
    expect(await statusOf(report.id)).toBe("ASSIGNED");
  });

  test("UJ-12.03 Operator Polsek menyatakan selesai → 403, status tetap", async () => {
    const report = await submitReport(citizen);
    await inProgress(report.id);
    expect((await resolve(report.id, operatorToken)).status).toBe(403);
    expect((await status(report.id, { nextStatus: "RESOLVED" }, operatorToken)).status).toBe(403);
    expect(await statusOf(report.id)).toBe("IN_PROGRESS");
  });

  test("UJ-12.04 Petugas Instansi menyatakan selesai → 403, status tetap, tombol tidak tersedia", async () => {
    const report = await submitReport(citizen);
    await inProgress(report.id);
    expect((await resolve(report.id, bpbdToken)).status).toBe(403);
    expect((await status(report.id, { nextStatus: "RESOLVED" }, bpbdToken)).status).toBe(403);
    expect(await statusOf(report.id)).toBe("IN_PROGRESS");
    const page = await openPage();
    await signIn(page, SEED.officer, SEED_PASSWORD);
    await page.goto(`${WEB_URL}/reports/${report.id}`);
    await page.waitForSelector('[data-testid="detail-map"][data-ready="true"]');
    expect(await page.getByTestId("resolve-button").count()).toBe(0);
  });

  test("UJ-12.05 mengubah status Laporan yang sudah Penanganan Selesai → 409, tetap status akhir", async () => {
    const report = await submitReport(citizen);
    await inProgress(report.id);
    // Lewat endpoint status UC-11 dengan nextStatus RESOLVED oleh Admin (aturan sama).
    expect((await status(report.id, { nextStatus: "RESOLVED" }, adminToken)).status).toBe(200);
    const again = await resolve(report.id, adminToken);
    expect(again.status).toBe(409);
    expect(again.body.error.message).toBe("Penanganan sudah selesai");
    const back = await status(report.id, { nextStatus: "IN_PROGRESS" }, bpbdToken);
    expect(back.status).toBe(409);
    expect(back.body.error.message).toBe("Laporan sudah berstatus akhir (Penanganan Selesai)");
    expect((await status(report.id, { activity: "DEPARTED" }, operatorToken)).status).toBe(409);
    expect((await api("POST", `/api/reports/${report.id}/reject`, { reasonId: (await db`SELECT id FROM rejection_reasons LIMIT 1`)[0].id }, adminToken)).status).toBe(409);
    expect(await statusOf(report.id)).toBe("RESOLVED");
  });

  test("UJ-12.06 Laporan baru 30 m dari Kejadian yang sudah selesai → Kejadian baru", async () => {
    const at = freshPoint();
    const first = await submitReport(citizen, { at });
    await inProgress(first.id);
    expect((await resolve(first.id, adminToken)).status).toBe(200);
    const second = await submitReport(await newCitizen(), { at: north(at, 30) });
    expect(second.isDuplicate).toBe(false);
    expect(second.incidentId).not.toBe(first.incidentId);
  });

  test("UJ-12.07 Admin Polres menyatakan selesai tanpa harus menerima Penerusan → 200; Petugas Instansi penerima Penerusan mendapat notifikasi", async () => {
    const report = await submitReport(citizen);
    expect((await api("POST", `/api/reports/${report.id}/verify`, {}, adminToken)).status).toBe(200);
    expect((await dispatchTo(report.id, ["Manggala"], adminToken)).status).toBe(201);
    const manggala = await newOfficer("Manggala");
    expect((await status(report.id, { nextStatus: "IN_PROGRESS" }, manggala.token)).status).toBe(200);
    expect((await resolve(report.id, manggala.token)).status).toBe(403);
    expect((await resolve(report.id, adminToken)).status).toBe(200);
    expect(await statusOf(report.id)).toBe("RESOLVED");
    expect((await notificationsFor(manggala.token, report.id)).some((n: any) => n.title.endsWith("selesai, api sudah padam"))).toBe(true);
  });
});
