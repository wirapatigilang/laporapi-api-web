// Uji Black Box UC-09 Menyiagakan Personel Polsek (spec: specs/008-uc09-sector-standby/spec.md)
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { api, db, newCitizen, SEED, SEED_PASSWORD } from "../helpers";
import { freshPoint, NANGA_MAHAP } from "../fixtures";
import { closeOpenIncidents, historyOf, statusOf, submitReport, tokens, type Citizen } from "../scenario";
import { startFirmsMock, stopFirmsMock } from "../firms-mock";
import { closeBrowser, openPage, signIn, WEB_URL } from "./browser";

let citizen: Citizen;
let adminToken: string;
let operatorToken: string;
let operatorId: string;
let reasonId: string;

beforeAll(async () => {
  startFirmsMock();
  await closeOpenIncidents();
  citizen = await newCitizen();
  adminToken = await tokens.admin();
  operatorToken = await tokens.operator();
  [{ id: operatorId }] = await db`SELECT id FROM users WHERE phone_number = ${SEED.operator}`;
  [{ id: reasonId }] = await db`SELECT id FROM rejection_reasons WHERE code = 'PRANK'`;
});
afterAll(async () => {
  stopFirmsMock();
  await closeBrowser();
});

async function operatorDetail(reportId: string) {
  const page = await openPage();
  await signIn(page, SEED.operator, SEED_PASSWORD);
  await page.goto(`${WEB_URL}/reports/${reportId}`);
  await page.getByTestId("operator-actions").waitFor();
  return page;
}

describe("UC-09 menyiagakan personel Polsek", () => {
  test("UJ-09.01 Operator menyiagakan personel (dibuka dari Notifikasi) → kegiatan tercatat, status tetap, tanda siaga di dasbor Admin", async () => {
    const report = await submitReport(citizen);
    const page = await openPage();
    await signIn(page, SEED.operator, SEED_PASSWORD);
    await page.getByTestId("nav-notifications").click();
    const item = page.getByTestId("notification-item").filter({ hasText: `Laporan baru ${report.reportNumber}` });
    await Promise.all([page.waitForURL(`**/reports/${report.id}`), item.getByRole("button").click()]);
    await page.getByTestId("standby-button").click();
    await page.waitForSelector('[data-testid="history-item"][data-activity="SECTOR_STANDBY"]');
    expect(await page.getByTestId("action-result").innerText()).toBe("Personel Polsek disiagakan");
    expect(await page.getByTestId("standby-flag").innerText()).toBe("Polsek sudah siaga");
    const entry = page.locator('[data-testid="history-item"][data-activity="SECTOR_STANDBY"]');
    expect(await entry.innerText()).toContain("Personel Polsek disiagakan");
    expect(await entry.innerText()).toContain("Operator Polsek");
    expect(await statusOf(report.id)).toBe("RECEIVED");
    expect((await historyOf(report.id)).at(-1)).toMatchObject({ type: "ACTIVITY", activity: "SECTOR_STANDBY", status: null, actor_id: operatorId });
    // Notifikasi sudah ditandai dibaca.
    const notes = await api("GET", "/api/notifications", undefined, operatorToken);
    expect(notes.body.notifications.find((n: any) => n.reportId === report.id).isRead).toBe(true);

    const admin = await openPage();
    await signIn(admin, SEED.admin, SEED_PASSWORD);
    const row = admin.locator(`[data-testid="incident-row"][data-report-number="${report.reportNumber}"]`);
    expect(await row.getByTestId("flag-standby").innerText()).toBe("Polsek sudah siaga");
    const inc = await api("GET", "/api/incidents", undefined, adminToken);
    expect(inc.body.incidents.find((i: any) => i.reportId === report.id).sectorStandby).toBe(true);
  });

  test("UJ-09.02 Laporan sudah ditolak → 'Laporan sudah ditolak', tombol tidak aktif, tidak ada kegiatan baru", async () => {
    const report = await submitReport(citizen);
    expect((await api("POST", `/api/reports/${report.id}/reject`, { reasonId }, adminToken)).status).toBe(200);
    const page = await operatorDetail(report.id);
    expect(await page.getByTestId("standby-blocked").innerText()).toBe("Laporan sudah ditolak");
    expect(await page.getByTestId("standby-button").isDisabled()).toBe(true);
    const res = await api("POST", `/api/reports/${report.id}/standby`, {}, operatorToken);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("Laporan sudah ditolak");
    expect((await historyOf(report.id)).some((h: any) => h.type === "ACTIVITY")).toBe(false);
  });

  test("UJ-09.03 Operator Polsek lain (laporan di luar wilayahnya) → 403", async () => {
    const report = await submitReport(citizen, { at: freshPoint(NANGA_MAHAP) });
    const res = await api("POST", `/api/reports/${report.id}/standby`, {}, operatorToken);
    expect(res.status).toBe(403);
    expect((await api("POST", `/api/reports/${report.id}/standby`, {}, adminToken)).status).toBe(403);
    expect((await historyOf(report.id)).some((h: any) => h.type === "ACTIVITY")).toBe(false);
  });

  test("UJ-09.04 penyiagaan dengan catatan jumlah personel → catatan tersimpan pada kegiatan", async () => {
    const report = await submitReport(citizen);
    const page = await operatorDetail(report.id);
    await page.fill("#standby-note", "6 personel disiagakan di Mapolsek");
    await page.getByTestId("standby-button").click();
    const entry = page.locator('[data-testid="history-item"][data-activity="SECTOR_STANDBY"]');
    await entry.waitFor();
    expect(await entry.innerText()).toContain("6 personel disiagakan di Mapolsek");
    expect((await historyOf(report.id)).at(-1).note).toBe("6 personel disiagakan di Mapolsek");
  });

  test("UJ-09.05 penyiagaan sebelum verifikasi tetap tercatat setelah Admin memverifikasi", async () => {
    const report = await submitReport(citizen);
    expect((await api("POST", `/api/reports/${report.id}/standby`, { note: "" }, operatorToken)).status).toBe(201);
    expect((await api("POST", `/api/reports/${report.id}/verify`, {}, adminToken)).status).toBe(200);
    const d = await api("GET", `/api/reports/${report.id}`, undefined, adminToken);
    expect(d.body.report.status).toBe("VERIFIED");
    expect(d.body.report.sectorStandby.by).toBe("Operator Polsek Sekadau Hilir");
    expect(d.body.report.history.map((h: any) => h.activity ?? h.status)).toEqual(["RECEIVED", "SECTOR_STANDBY", "VERIFIED"]);
  });
});
