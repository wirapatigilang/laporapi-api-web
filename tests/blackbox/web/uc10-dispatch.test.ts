// Uji Black Box UC-10 Meneruskan Laporan ke Instansi (spec: specs/009-uc10-dispatch/spec.md)
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { api, db, newCitizen, SEED, SEED_PASSWORD } from "../helpers";
import { agencyId, closeOpenIncidents, dispatchTo, historyOf, newOfficer, notificationsFor, statusOf, submitReport, tokens, verifiedReport, type Citizen } from "../scenario";
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
  bpbdToken = await tokens.officer(); // Petugas BPBD dari data awal
});
afterAll(async () => {
  stopFirmsMock();
  await closeBrowser();
});

async function openDispatchDialog(reportId: string) {
  const page = await openPage();
  await signIn(page, SEED.admin, SEED_PASSWORD);
  await page.goto(`${WEB_URL}/reports/${reportId}`);
  await page.waitForSelector('[data-testid="detail-map"][data-ready="true"]'); // halaman sudah aktif (hidrasi selesai)
  await page.getByTestId("dispatch-button").click();
  await page.getByTestId("dispatch-dialog").waitFor();
  return page;
}
const dispatchCount = async (reportId: string) => (await db`SELECT count(*)::int AS n FROM dispatches WHERE report_id = ${reportId}`)[0].n as number;
const row = (page: any, n: string) => page.locator(`[data-testid="incident-row"][data-report-number="${n}"]`);

describe("UC-10 meneruskan laporan ke instansi", () => {
  test("UJ-10.01 Admin meneruskan Laporan Diverifikasi ke BPBD → Penerusan, Petugas Ditugaskan di riwayat, notifikasi, 'menunggu konfirmasi'", async () => {
    const report = await verifiedReport(citizen, adminToken);
    const page = await openDispatchDialog(report.id);
    expect(await page.getByTestId("agency-option").count()).toBe(5);
    await page.getByLabel("BPBD Kabupaten Sekadau").check();
    await page.getByTestId("dispatch-submit").click();
    await page.waitForSelector('[data-testid="report-status"] [data-status="ASSIGNED"]');
    expect(await page.getByTestId("action-result").innerText()).toBe("Laporan diteruskan ke BPBD Kabupaten Sekadau");
    const item = page.getByTestId("dispatch-item");
    expect(await item.count()).toBe(1);
    expect(await item.innerText()).toContain("BPBD Kabupaten Sekadau");
    expect(await item.getByTestId("dispatch-state").innerText()).toBe("menunggu konfirmasi");
    const last = page.getByTestId("history-item").last();
    expect(await last.innerText()).toContain("Petugas Ditugaskan");
    expect(await last.innerText()).toContain("Diteruskan ke BPBD Kabupaten Sekadau");

    expect(await statusOf(report.id)).toBe("ASSIGNED");
    expect(await dispatchCount(report.id)).toBe(1);
    expect((await historyOf(report.id)).at(-1)).toMatchObject({ type: "STATUS", status: "ASSIGNED" });
    expect((await notificationsFor(bpbdToken, report.id)).some((n) => n.title === `Penugasan baru: laporan ${report.reportNumber}`)).toBe(true);
    const mine = await notificationsFor(citizen.token, report.id);
    expect(mine.some((n) => n.title.includes("petugas ditugaskan") && n.body.includes("BPBD Kabupaten Sekadau"))).toBe(true);
    // Petugas BPBD kini dapat melihat Laporan di dasbor dan detailnya (cakupan Instansi).
    const inc = await api("GET", "/api/incidents", undefined, bpbdToken);
    expect(inc.body.incidents.some((i: any) => i.reportId === report.id)).toBe(true);
    expect((await api("GET", `/api/reports/${report.id}`, undefined, bpbdToken)).status).toBe(200);
  });

  test("UJ-10.02 diteruskan ke Damkar dan Dinas Lingkungan Hidup sekaligus → dua Penerusan, petugas kedua Instansi menerima notifikasi", async () => {
    const damkar = await newOfficer("Pemadam");
    const dlh = await newOfficer("Lingkungan");
    const report = await verifiedReport(citizen, adminToken);
    const page = await openDispatchDialog(report.id);
    await page.getByLabel("Dinas Pemadam Kebakaran").check();
    await page.getByLabel("Dinas Lingkungan Hidup").check();
    await page.getByTestId("dispatch-submit").click();
    await page.waitForSelector('[data-testid="report-status"] [data-status="ASSIGNED"]');
    expect(await page.getByTestId("dispatch-item").count()).toBe(2);
    expect(await dispatchCount(report.id)).toBe(2);
    for (const o of [damkar, dlh]) expect((await notificationsFor(o.token, report.id)).length).toBe(1);
    expect((await notificationsFor(bpbdToken, report.id)).length).toBe(0);
    expect((await historyOf(report.id)).filter((h: any) => h.status === "ASSIGNED").length).toBe(1);
  });

  test("UJ-10.03 tidak ada Instansi yang dipilih → diminta minimal satu Instansi, tidak ada Penerusan", async () => {
    const report = await verifiedReport(citizen, adminToken);
    const page = await openDispatchDialog(report.id);
    await page.getByTestId("dispatch-submit").click();
    await page.getByTestId("agency-error").waitFor();
    expect(await page.getByTestId("agency-error").innerText()).toBe("Pilih minimal satu instansi");
    expect(await page.getByTestId("dispatch-dialog").isVisible()).toBe(true);
    expect(await dispatchCount(report.id)).toBe(0);
    expect(await statusOf(report.id)).toBe("VERIFIED");
  });

  test("UJ-10.04 BPBD sudah menerima Penerusan → tidak bisa dipilih lagi, TNI ditambahkan sebagai kegiatan, status tetap", async () => {
    const tni = await newOfficer("TNI");
    const report = await verifiedReport(citizen, adminToken);
    expect((await dispatchTo(report.id, ["BPBD"], adminToken)).status).toBe(201);
    const page = await openDispatchDialog(report.id);
    expect(await page.getByTestId("already-dispatched").count()).toBe(1);
    expect(await page.getByLabel("BPBD Kabupaten Sekadau").isDisabled()).toBe(true);
    await page.getByLabel("TNI (Kodim 1204/Sanggau)").check();
    await page.getByTestId("dispatch-submit").click();
    await page.waitForSelector('[data-testid="history-item"][data-activity="AGENCY_ADDED"]');
    expect(await page.getByTestId("action-result").innerText()).toBe("Laporan diteruskan ke TNI (Kodim 1204/Sanggau)");
    // Lewat API, Instansi yang sudah menerima Penerusan tetap ditolak.
    const again = await dispatchTo(report.id, ["BPBD"], adminToken);
    expect(again.status).toBe(409);
    expect(again.body.error.message).toBe("Semua instansi yang dipilih sudah menerima penerusan");
    expect(await page.getByTestId("dispatch-item").count()).toBe(2);
    expect(await dispatchCount(report.id)).toBe(2);
    expect(await statusOf(report.id)).toBe("ASSIGNED");
    const h = await historyOf(report.id);
    expect(h.filter((e: any) => e.status === "ASSIGNED").length).toBe(1);
    expect(h.at(-1)).toMatchObject({ type: "ACTIVITY", activity: "AGENCY_ADDED", note: "Instansi ditambahkan: TNI (Kodim 1204/Sanggau)" });
    expect((await notificationsFor(tni.token, report.id)).length).toBe(1);
    expect((await notificationsFor(bpbdToken, report.id)).length).toBe(1); // tidak mendapat notifikasi kedua
  });

  test("UJ-10.05 Penerusan tanpa konfirmasi selama 59 menit → tanpa penanda 'belum direspons'", async () => {
    const report = await verifiedReport(citizen, adminToken);
    expect((await dispatchTo(report.id, ["Manggala"], adminToken)).status).toBe(201);
    await db`UPDATE dispatches SET dispatched_at = now() - interval '59 minutes' WHERE report_id = ${report.id}`;
    const page = await openPage();
    await signIn(page, SEED.admin, SEED_PASSWORD);
    await row(page, report.reportNumber).waitFor();
    expect(await row(page, report.reportNumber).getByTestId("flag-overdue").count()).toBe(0);
  });

  test("UJ-10.06 Penerusan tanpa konfirmasi selama 60 menit → penanda 'belum direspons' di dasbor Admin", async () => {
    const report = await verifiedReport(citizen, adminToken);
    expect((await dispatchTo(report.id, ["Manggala"], adminToken)).status).toBe(201);
    await db`UPDATE dispatches SET dispatched_at = now() - interval '60 minutes' WHERE report_id = ${report.id}`;
    const page = await openPage();
    await signIn(page, SEED.admin, SEED_PASSWORD);
    expect(await row(page, report.reportNumber).getByTestId("flag-overdue").innerText()).toBe("belum direspons");
    await page.goto(`${WEB_URL}/reports/${report.id}`);
    expect(await page.getByTestId("detail-overdue").innerText()).toBe("belum direspons");
    // Bila satu Instansi sudah mengonfirmasi, penanda hilang (FR-26).
    await db`UPDATE dispatches SET confirmed_at = now() WHERE report_id = ${report.id}`;
    const inc = await api("GET", "/api/incidents", undefined, adminToken);
    expect(inc.body.incidents.find((i: any) => i.reportId === report.id).isOverdue).toBe(false);
  });

  test("UJ-10.07 meneruskan Laporan Diterima → 409, tidak ada Penerusan", async () => {
    const report = await submitReport(citizen);
    const res = await dispatchTo(report.id, ["BPBD"], adminToken);
    expect(res.status).toBe(409);
    expect(await dispatchCount(report.id)).toBe(0);
    expect(await statusOf(report.id)).toBe("RECEIVED");
  });

  test("UJ-10.08 Petugas Instansi atau Operator Polsek meneruskan Laporan Diverifikasi → 403, status tetap", async () => {
    const report = await verifiedReport(citizen, adminToken);
    expect((await dispatchTo(report.id, ["BPBD"], bpbdToken)).status).toBe(403);
    expect((await dispatchTo(report.id, ["BPBD"], operatorToken)).status).toBe(403);
    expect(await dispatchCount(report.id)).toBe(0);
    expect(await statusOf(report.id)).toBe("VERIFIED");
  });

  test("UJ-10.09 Petugas Instansi lain tidak melihat Laporan yang tidak diteruskan ke Instansinya", async () => {
    const report = await verifiedReport(citizen, adminToken);
    expect((await dispatchTo(report.id, ["Manggala"], adminToken)).status).toBe(201);
    expect((await api("GET", `/api/reports/${report.id}`, undefined, bpbdToken)).status).toBe(403);
    const inc = await api("GET", "/api/incidents", undefined, bpbdToken);
    expect(inc.body.incidents.some((i: any) => i.reportId === report.id)).toBe(false);
    const bad = await api("POST", `/api/reports/${report.id}/dispatches`, { agencyIds: ["00000000-0000-0000-0000-000000000000"] }, adminToken);
    expect(bad.status).toBe(422);
    expect(bad.body.error.fields.agencyIds).toBe("Instansi tidak dikenal");
    expect(await agencyId("Manggala")).toBeTruthy();
  });

  test("UJ-10.10 Admin menekan Pilih semua → semua Instansi terpilih dan Laporan diteruskan ke semuanya", async () => {
    const report = await verifiedReport(citizen, adminToken);
    const total = Number((await db`SELECT count(*)::int AS n FROM agencies`)[0].n);
    const page = await openDispatchDialog(report.id);
    await page.getByTestId("select-all-agencies").click();
    expect(await page.getByTestId("agency-selected-count").innerText()).toBe(`${total} dari ${total} dipilih`);
    expect(await page.getByTestId("select-all-agencies").innerText()).toBe("Batalkan semua");
    await page.getByTestId("select-all-agencies").click();
    expect(await page.getByTestId("agency-selected-count").innerText()).toBe(`0 dari ${total} dipilih`);
    await page.getByTestId("select-all-agencies").click();
    expect(await page.getByTestId("dispatch-submit").innerText()).toBe(`Teruskan ke ${total} instansi`);
    await page.getByTestId("dispatch-submit").click();
    await page.waitForSelector('[data-testid="report-status"] [data-status="ASSIGNED"]');
    expect(await dispatchCount(report.id)).toBe(total);
  });
});
