// Uji Black Box UC-08 Menolak Laporan (spec: specs/006-uc08-reject-report/spec.md)
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { api, db, newCitizen, SEED, SEED_PASSWORD } from "../helpers";
import { freshPoint, north } from "../fixtures";
import { closeOpenIncidents, historyOf, incidentWithDuplicates, notificationsFor, statusOf, submitReport, tokens, type Citizen } from "../scenario";
import { startFirmsMock, stopFirmsMock } from "../firms-mock";
import { closeBrowser, openPage, signIn, WEB_URL } from "./browser";

let citizen: Citizen;
let adminToken: string;
let operatorToken: string;
let reasons: Record<string, string>;

beforeAll(async () => {
  startFirmsMock();
  await closeOpenIncidents();
  citizen = await newCitizen();
  adminToken = await tokens.admin();
  operatorToken = await tokens.operator();
  reasons = Object.fromEntries((await db`SELECT code, id FROM rejection_reasons`).map((r: any) => [r.code, r.id]));
});
afterAll(async () => {
  stopFirmsMock();
  await closeBrowser();
});

async function openRejectDialog(reportId: string) {
  const page = await openPage();
  await signIn(page, SEED.admin, SEED_PASSWORD);
  await page.goto(`${WEB_URL}/reports/${reportId}`);
  await page.waitForSelector('[data-testid="detail-map"][data-ready="true"]');
  await page.getByTestId("reject-button").click();
  await page.getByTestId("reject-dialog").waitFor();
  return page;
}
const incidentOpen = async (incidentId: string) => (await db`SELECT is_open FROM incidents WHERE id = ${incidentId}`)[0].is_open as boolean;

describe("UC-08 menolak laporan", () => {
  test("UJ-08.01 Admin menolak dengan alasan 'Laporan iseng' → Ditolak, alasan tersimpan, tiket ditutup, notifikasi berisi alasan", async () => {
    const report = await submitReport(citizen);
    const page = await openRejectDialog(report.id);
    expect(await page.getByTestId("reason-option").count()).toBe(5);
    await page.getByLabel("Laporan iseng").check();
    await page.getByTestId("reject-submit").click();
    await page.waitForSelector('[data-testid="report-status"] [data-status="REJECTED"]');
    expect(await page.getByTestId("action-result").innerText()).toBe("Laporan ditolak");
    expect(await page.getByTestId("rejection-reason").innerText()).toBe("Laporan iseng");
    expect(await page.getByTestId("reject-button").isDisabled()).toBe(true);
    expect(await page.getByTestId("verify-button").isDisabled()).toBe(true);

    expect(await statusOf(report.id)).toBe("REJECTED");
    const [row] = await db`SELECT rejection_reason_id FROM reports WHERE id = ${report.id}`;
    expect(row.rejection_reason_id).toBe(reasons.PRANK);
    expect(await incidentOpen(report.incidentId)).toBe(false);
    expect((await historyOf(report.id)).at(-1)).toMatchObject({ type: "STATUS", status: "REJECTED" });
    const mine = await notificationsFor(citizen.token, report.id);
    expect(mine.some((n) => n.title.includes("ditolak") && n.body.includes("Laporan iseng"))).toBe(true);
    expect((await notificationsFor(operatorToken, report.id)).some((n) => n.title.includes("ditolak"))).toBe(true);
  });

  test("UJ-08.02 tidak memilih alasan → penolakan tidak diproses, diminta memilih alasan, status tetap", async () => {
    const report = await submitReport(citizen);
    const page = await openRejectDialog(report.id);
    await page.getByTestId("reject-submit").click();
    await page.getByTestId("reason-error").waitFor();
    expect(await page.getByTestId("reason-error").innerText()).toBe("Pilih alasan penolakan");
    expect(await page.getByTestId("reject-dialog").isVisible()).toBe(true);
    expect(await statusOf(report.id)).toBe("RECEIVED");
  });

  test("UJ-08.03 alasan 'Lainnya' tanpa catatan → diminta mengisi catatan, status tetap", async () => {
    const report = await submitReport(citizen);
    const page = await openRejectDialog(report.id);
    await page.getByLabel("Lainnya", { exact: true }).check();
    await page.getByTestId("reject-submit").click();
    await page.getByTestId("reject-note-error").waitFor();
    expect(await page.getByTestId("reject-note-error").innerText()).toBe("Catatan wajib diisi untuk alasan Lainnya");
    expect(await page.getByLabel("Lainnya", { exact: true }).isChecked()).toBe(true); // pilihan dipertahankan
    expect(await statusOf(report.id)).toBe("RECEIVED");
  });

  test("UJ-08.04 alasan 'Lainnya' dengan catatan → berhasil, catatan tersimpan", async () => {
    const report = await submitReport(citizen);
    const page = await openRejectDialog(report.id);
    await page.getByLabel("Lainnya", { exact: true }).check();
    await page.fill("#reject-note", "Asap berasal dari cerobong pabrik");
    await page.getByTestId("reject-submit").click();
    await page.waitForSelector('[data-testid="report-status"] [data-status="REJECTED"]');
    expect(await page.getByTestId("rejection-reason").innerText()).toBe("Lainnya: Asap berasal dari cerobong pabrik");
    const [row] = await db`SELECT rejection_reason_id, rejection_note FROM reports WHERE id = ${report.id}`;
    expect(row).toEqual({ rejection_reason_id: reasons.OTHER, rejection_note: "Asap berasal dari cerobong pabrik" });
  });

  test("UJ-08.05 Admin membatalkan dialog → dialog tertutup tanpa perubahan", async () => {
    const report = await submitReport(citizen);
    const page = await openRejectDialog(report.id);
    await page.getByLabel("Lokasi tidak sesuai").check();
    await page.getByTestId("reject-cancel").click();
    expect(await page.getByTestId("reject-dialog").count()).toBe(0);
    expect(await statusOf(report.id)).toBe("RECEIVED");
    expect((await historyOf(report.id)).length).toBe(1);
  });

  test("UJ-08.06 Kejadian dengan laporan ganda → semua laporan ganda ditolak dengan alasan yang sama, tiap warga diberi notifikasi", async () => {
    const { primary, dups, dupOwners, owner } = await incidentWithDuplicates(2);
    const page = await openRejectDialog(dups[0].id); // dari laporan ganda pun berlaku untuk seluruh Kejadian
    await page.getByLabel("Pembakaran sampah atau terkendali").check();
    await page.getByTestId("reject-submit").click();
    await page.waitForSelector('[data-testid="report-status"] [data-status="REJECTED"]');
    for (const [r, c] of [[primary, owner], [dups[0], dupOwners[0]], [dups[1], dupOwners[1]]] as const) {
      expect(await statusOf(r.id)).toBe("REJECTED");
      const [row] = await db`SELECT rejection_reason_id FROM reports WHERE id = ${r.id}`;
      expect(row.rejection_reason_id).toBe(reasons.CONTROLLED_BURNING);
      expect((await notificationsFor(c.token, r.id)).some((n) => n.body.includes("Pembakaran sampah atau terkendali"))).toBe(true);
    }
  });

  test("UJ-08.07 laporan yang sudah ditolak dicari lewat saringan status → tetap tampil dan dapat dibuka", async () => {
    const report = await submitReport(citizen);
    expect((await api("POST", `/api/reports/${report.id}/reject`, { reasonId: reasons.UNCLEAR_PHOTO }, adminToken)).status).toBe(200);
    const page = await openPage();
    await signIn(page, SEED.admin, SEED_PASSWORD);
    await page.goto(`${WEB_URL}/dashboard?status=REJECTED`);
    const row = page.locator(`[data-testid="incident-row"][data-report-number="${report.reportNumber}"]`);
    await row.waitFor();
    await Promise.all([page.waitForURL(`**/reports/${report.id}`), row.getByRole("link", { name: report.reportNumber }).click()]);
    expect(await page.getByTestId("rejection-reason").innerText()).toBe("Foto tidak jelas atau bukan kebakaran");
  });

  test("UJ-08.08 menolak laporan yang masih aktif (Laporan Diverifikasi) → Laporan Ditolak; laporan berstatus akhir → 409", async () => {
    const report = await submitReport(citizen);
    expect((await api("POST", `/api/reports/${report.id}/verify`, {}, adminToken)).status).toBe(200);
    const res = await api("POST", `/api/reports/${report.id}/reject`, { reasonId: reasons.PRANK }, adminToken);
    expect(res.status).toBe(200);
    expect(await statusOf(report.id)).toBe("REJECTED");
    const again = await api("POST", `/api/reports/${report.id}/reject`, { reasonId: reasons.PRANK }, adminToken);
    expect(again.status).toBe(409);
    expect(again.body.error.message).toMatch(/^Laporan sudah diproses oleh .+ pada .+ WIB$/);
    expect(await statusOf(report.id)).toBe("REJECTED");
  });

  test("UJ-08.09 laporan baru 30 m dari laporan yang sudah ditolak → Kejadian baru dibuat", async () => {
    const at = freshPoint();
    const first = await submitReport(citizen, { at });
    expect((await api("POST", `/api/reports/${first.id}/reject`, { reasonId: reasons.PRANK }, adminToken)).status).toBe(200);
    const other = await newCitizen();
    const second = await submitReport(other, { at: north(at, 30) });
    expect(second.isDuplicate).toBe(false);
    expect(second.incidentId).not.toBe(first.incidentId);
  });

  test("UJ-08.10 Operator Polsek menolak, atau alasan tidak dikenal → 403 / 422, status tetap", async () => {
    const report = await submitReport(citizen);
    expect((await api("POST", `/api/reports/${report.id}/reject`, { reasonId: reasons.PRANK }, operatorToken)).status).toBe(403);
    const bad = await api("POST", `/api/reports/${report.id}/reject`, { reasonId: "00000000-0000-0000-0000-000000000000" }, adminToken);
    expect(bad.status).toBe(422);
    expect(bad.body.error.fields.reasonId).toBe("Alasan penolakan tidak dikenal");
    expect(await statusOf(report.id)).toBe("RECEIVED");
  });
});
