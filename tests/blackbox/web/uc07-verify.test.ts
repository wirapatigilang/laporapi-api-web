// Uji Black Box UC-07 Memverifikasi Laporan (spec: specs/005-uc07-verify-report/spec.md)
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { api, db, newCitizen, SEED, SEED_PASSWORD, uniquePhone } from "../helpers";
import { freshPoint, north } from "../fixtures";
import { closeOpenIncidents, historyOf, incidentWithDuplicates, notificationsFor, statusOf, submitReport, tokens, type Citizen } from "../scenario";
import { startFirmsMock, stopFirmsMock, setFirmsMode } from "../firms-mock";
import { closeBrowser, openPage, signIn } from "./browser";
import { WEB_URL } from "./browser";

let citizen: Citizen;
let adminToken: string;
let operatorToken: string;
let adminId: string;
let operatorId: string;

beforeAll(async () => {
  startFirmsMock();
  setFirmsMode("ok");
  await closeOpenIncidents();
  citizen = await newCitizen();
  adminToken = await tokens.admin();
  operatorToken = await tokens.operator();
  [{ id: adminId }] = await db`SELECT id FROM users WHERE phone_number = ${SEED.admin}`;
  [{ id: operatorId }] = await db`SELECT id FROM users WHERE phone_number = ${SEED.operator}`;
});
afterAll(async () => {
  stopFirmsMock();
  await closeBrowser();
});

async function openDetailAsAdmin(reportId: string) {
  const page = await openPage();
  await signIn(page, SEED.admin, SEED_PASSWORD);
  await page.goto(`${WEB_URL}/reports/${reportId}`);
  await page.waitForSelector('[data-testid="detail-map"][data-ready="true"]');
  return page;
}

describe("UC-07 memverifikasi laporan", () => {
  test("UJ-07.01 Admin memverifikasi laporan Laporan Diterima → status, riwayat, notifikasi, tombol Teruskan aktif", async () => {
    const report = await submitReport(citizen);
    const page = await openDetailAsAdmin(report.id);
    expect(await page.getByTestId("dispatch-button").isDisabled()).toBe(true);
    await page.getByTestId("verify-button").click();
    await page.getByTestId("confirm-dialog").waitFor();
    await page.getByTestId("confirm-yes").click();
    await page.waitForSelector('[data-testid="report-status"] [data-status="VERIFIED"]');
    expect(await page.getByTestId("action-result").innerText()).toBe("Laporan diverifikasi");
    expect(await page.getByTestId("dispatch-button").isEnabled()).toBe(true);
    expect(await page.getByTestId("verify-button").isDisabled()).toBe(true);
    const last = page.getByTestId("history-item").last();
    expect(await last.innerText()).toContain("Laporan Diverifikasi");
    expect(await last.innerText()).toContain("Admin");
    expect(await last.innerText()).toMatch(/\d{2}\.\d{2} WIB/);

    expect(await statusOf(report.id)).toBe("VERIFIED");
    const history = await historyOf(report.id);
    expect(history.at(-1)).toMatchObject({ type: "STATUS", status: "VERIFIED", actor_id: adminId });
    expect((await notificationsFor(citizen.token, report.id)).some((n) => n.title.includes("diverifikasi"))).toBe(true);
    expect((await notificationsFor(operatorToken, report.id)).some((n) => n.title.includes("diverifikasi"))).toBe(true);
  });

  test("UJ-07.02 Kejadian dengan dua laporan ganda diverifikasi → laporan ganda ikut berubah dan pelapornya diberi notifikasi", async () => {
    const { primary, dups, dupOwners } = await incidentWithDuplicates(2);
    const page = await openDetailAsAdmin(primary.id);
    await page.getByTestId("verify-button").click();
    await page.getByTestId("confirm-yes").click();
    await page.waitForSelector('[data-testid="report-status"] [data-status="VERIFIED"]');
    for (const [i, d] of dups.entries()) {
      expect(await statusOf(d.id)).toBe("VERIFIED");
      const h = await historyOf(d.id);
      expect(h.filter((e: any) => e.status === "VERIFIED").length).toBe(1);
      expect((await notificationsFor(dupOwners[i].token, d.id)).some((n) => n.title.includes("diverifikasi"))).toBe(true);
    }
  });

  test("UJ-07.03 laporan bertanda selisih lokasi → titik perangkat, titik foto, dan jarak tampil; tombol Verifikasi aktif", async () => {
    const at = freshPoint();
    const far = await submitReport(citizen, { at, exifAt: north(at, 120) });
    const page = await openDetailAsAdmin(far.id);
    expect(await page.getByTestId("mismatch-flag").innerText()).toMatch(/Selisih lokasi foto: 120(,0)? m/);
    expect(await page.locator("path.marker-photo").count()).toBe(1);
    expect(await page.locator("path.map-marker").count()).toBeGreaterThanOrEqual(2);
    expect(await page.getByTestId("verify-button").isEnabled()).toBe(true);
    expect(await page.getByTestId("reject-button").isEnabled()).toBe(true); // ditambah pada iterasi 6 (UC-08)
  });

  test("UJ-07.04 titik panas tiruan di sekitar laporan → petunjuk tampil, status tidak berubah sebelum Admin memutuskan", async () => {
    const report = await submitReport(citizen);
    const page = await openDetailAsAdmin(report.id);
    expect(await page.getByTestId("hotspot-count").innerText()).toBe("1");
    expect(await statusOf(report.id)).toBe("RECEIVED");
    expect(await page.locator('[data-testid="report-status"] [data-status="RECEIVED"]').count()).toBe(1);
  });

  test("UJ-07.05 Admin meminta cek lapangan dengan catatan → tercatat sebagai kegiatan, status tetap, Operator diberi notifikasi", async () => {
    const report = await submitReport(citizen);
    const page = await openDetailAsAdmin(report.id);
    await page.getByTestId("contact-button").click();
    expect(await page.getByTestId("contact-phone").innerText()).toBe(citizen.phoneNumber);
    await page.getByTestId("field-check-button").click();
    const note = "Mohon pastikan asap berasal dari lahan terbakar";
    await page.fill("#fc-note", note);
    await page.getByRole("button", { name: "Kirim permintaan" }).click();
    await page.waitForSelector('[data-testid="history-item"][data-activity="FIELD_CHECK_REQUESTED"]');
    expect(await page.getByTestId("action-result").innerText()).toBe("Permintaan cek lapangan dikirim ke Operator Polsek");
    expect(await page.locator('[data-testid="history-item"][data-activity="FIELD_CHECK_REQUESTED"]').innerText()).toContain(note);
    expect(await statusOf(report.id)).toBe("RECEIVED");
    const h = await historyOf(report.id);
    expect(h.at(-1)).toMatchObject({ type: "ACTIVITY", status: null, activity: "FIELD_CHECK_REQUESTED", note, actor_id: adminId });
    const notes = await notificationsFor(operatorToken, report.id);
    expect(notes.some((n) => n.title.startsWith("Mohon cek lapangan") && n.body === note)).toBe(true);
  });

  test("UJ-07.06 laporan sudah diverifikasi Admin lain → 409 dengan nama dan waktu Admin yang memproses", async () => {
    const phone = uniquePhone();
    const hash = await Bun.password.hash(SEED_PASSWORD);
    await db`INSERT INTO users (name, phone_number, password_hash, role) VALUES ('Admin Kedua', ${phone}, ${hash}, 'ADMIN')`;
    const res0 = await api("POST", "/api/auth/login", { phoneNumber: phone, password: SEED_PASSWORD, channel: "web" });
    const secondAdmin = res0.body.token as string;
    const report = await submitReport(citizen);
    const first = await api("POST", `/api/reports/${report.id}/verify`, {}, secondAdmin);
    expect(first.status).toBe(200);
    const res = await api("POST", `/api/reports/${report.id}/verify`, {}, adminToken);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ALREADY_PROCESSED");
    expect(res.body.error.message).toMatch(/^Laporan sudah diproses oleh Admin Kedua pada \d{1,2} \w+ \d{4} \d{2}\.\d{2} WIB$/);
    expect((await historyOf(report.id)).filter((e: any) => e.status === "VERIFIED").length).toBe(1);
  });

  test("UJ-07.07 verifikasi laporan berstatus Laporan Ditolak → 409, status tetap", async () => {
    const report = await submitReport(citizen);
    // Kondisi awal: Laporan ditolak lewat UC-08 (iterasi 6; sebelumnya disiapkan langsung di basis data uji).
    const [reason] = await db`SELECT id FROM rejection_reasons WHERE code = 'PRANK'`;
    expect((await api("POST", `/api/reports/${report.id}/reject`, { reasonId: reason.id }, adminToken)).status).toBe(200);
    const res = await api("POST", `/api/reports/${report.id}/verify`, {}, adminToken);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain("Laporan sudah diproses oleh");
    expect(await statusOf(report.id)).toBe("REJECTED");
  });

  test("UJ-07.08 Operator Polsek mencoba memverifikasi → 403, status tetap", async () => {
    const report = await submitReport(citizen);
    const res = await api("POST", `/api/reports/${report.id}/verify`, {}, operatorToken);
    expect(res.status).toBe(403);
    expect(await statusOf(report.id)).toBe("RECEIVED");
    const notes = await api("POST", `/api/reports/${report.id}/notes`, { note: "cek" }, operatorToken);
    expect(notes.status).toBe(403);
  });

  test("UJ-07.09 permintaan cek lapangan tanpa catatan → 422 pada isian catatan, tidak ada kegiatan tercatat", async () => {
    const report = await submitReport(citizen);
    const res = await api("POST", `/api/reports/${report.id}/notes`, { note: "   " }, adminToken);
    expect(res.status).toBe(422);
    expect(res.body.error.fields.note).toBe("Catatan cek lapangan wajib diisi");
    expect((await historyOf(report.id)).some((e: any) => e.type === "ACTIVITY")).toBe(false);
  });
});
