// Uji Black Box UC-06 Melihat Daftar dan Peta Laporan (spec: specs/004-uc06-dashboard-map/spec.md)
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { api, db, newCitizen, SEED, SEED_PASSWORD } from "../helpers";
import { freshPoint, NANGA_MAHAP, north } from "../fixtures";
import { closeOpenIncidents, incidentWithDuplicates, submitReport, tokens, type Citizen } from "../scenario";
import { setFirmsMode, startFirmsMock, stopFirmsMock } from "../firms-mock";
import { closeBrowser, openPage, signIn, WEB_URL } from "./browser";

const COLORS = { RECEIVED: "#e5341a", VERIFIED: "#f08c00" };
let citizen: Citizen;
let adminToken: string;
let operatorToken: string;

beforeAll(async () => {
  startFirmsMock();
  await closeOpenIncidents();
  citizen = await newCitizen();
  adminToken = await tokens.admin();
  operatorToken = await tokens.operator();
});
afterAll(async () => {
  stopFirmsMock();
  await closeBrowser();
});

const row = (page: any, number: string) => page.locator(`[data-testid="incident-row"][data-report-number="${number}"]`);

describe("UC-06 daftar dan peta", () => {
  test("UJ-06.01 Admin membuka Dasbor → Kejadian tampil di daftar dan peta, warna sesuai status, jumlah laporan ganda", async () => {
    const a = await incidentWithDuplicates(1);
    const b = await submitReport(citizen);
    // Kondisi awal: Kejadian B sudah berstatus Laporan Diverifikasi (UC-07 belum ada pada iterasi ini).
    await db`UPDATE reports SET current_status = 'VERIFIED' WHERE incident_id = ${b.incidentId}`;

    const page = await openPage();
    await signIn(page, SEED.admin, SEED_PASSWORD);
    await page.waitForSelector('[data-testid="incident-map"][data-ready="true"]');
    expect(await row(page, a.primary.reportNumber).count()).toBe(1);
    expect(await row(page, a.dups[0].reportNumber).count()).toBe(0); // laporan ganda tidak menjadi baris sendiri
    expect(await row(page, a.primary.reportNumber).getByTestId("duplicate-count").innerText()).toBe("1");
    expect(await row(page, a.primary.reportNumber).locator("[data-status]").getAttribute("data-status")).toBe("RECEIVED");
    expect(await row(page, b.reportNumber).getByTestId("duplicate-count").innerText()).toBe("0");
    expect(await row(page, b.reportNumber).locator("[data-status]").getAttribute("data-status")).toBe("VERIFIED");
    // Peta: satu penanda per Kejadian, warna sesuai status.
    const rows = await page.getByTestId("incident-row").count();
    expect(await page.locator("path.map-marker").count()).toBe(rows);
    expect(await page.locator("path.marker-RECEIVED").first().getAttribute("fill")).toBe(COLORS.RECEIVED);
    expect(await page.locator("path.marker-VERIFIED").first().getAttribute("fill")).toBe(COLORS.VERIFIED);
  });

  test("UJ-06.02 saringan status, kecamatan atau Polsek, dan rentang tanggal → hanya Kejadian yang sesuai", async () => {
    const day = "2026-03-10";
    const c = await submitReport(citizen, { at: freshPoint(NANGA_MAHAP), reportedAt: `${day}T09:00:00+07:00` });
    const d = await submitReport(citizen, { at: freshPoint(), reportedAt: `${day}T09:00:00+07:00` });
    const e = await submitReport(citizen, { at: freshPoint(NANGA_MAHAP), reportedAt: "2026-03-12T09:00:00+07:00" });

    const page = await openPage();
    await signIn(page, SEED.admin, SEED_PASSWORD);
    await page.selectOption('select[name="status"]', "RECEIVED");
    await page.selectOption('select[name="districtId"]', { label: "Nanga Mahap" });
    await page.fill('input[name="from"]', day);
    await page.fill('input[name="to"]', day);
    await Promise.all([page.waitForURL(/status=RECEIVED/), page.getByRole("button", { name: "Terapkan" }).click()]);
    await page.waitForSelector('[data-testid="incident-map"][data-ready="true"]');
    expect(await row(page, c.reportNumber).count()).toBe(1);
    expect(await row(page, d.reportNumber).count()).toBe(0);
    expect(await row(page, e.reportNumber).count()).toBe(0);
    const texts = await page.getByTestId("incident-row").allInnerTexts();
    for (const t of texts) {
      expect(t).toContain("Nanga Mahap");
      expect(t).toContain("10 Mar 2026");
      expect(t).toContain("Laporan Diterima");
    }
    expect(await page.locator("path.map-marker").count()).toBe(texts.length);

    // Saringan Polsek (API yang sama dengan dasbor).
    const [sector] = await db`SELECT id FROM police_sectors WHERE name = 'Polsek Nanga Mahap'`;
    const res = await api("GET", `/api/incidents?policeSectorId=${sector.id}&from=${day}&to=${day}`, undefined, adminToken);
    expect(res.status).toBe(200);
    expect(res.body.incidents.some((i: any) => i.reportNumber === c.reportNumber)).toBe(true);
    expect(res.body.incidents.every((i: any) => i.policeSector?.name === "Polsek Nanga Mahap")).toBe(true);
  });

  test("UJ-06.03 saringan tanpa hasil → 'Tidak ada laporan'", async () => {
    const page = await openPage();
    await signIn(page, SEED.admin, SEED_PASSWORD);
    await page.goto(`${WEB_URL}/dashboard?status=RESOLVED&from=2000-01-01&to=2000-01-02`);
    expect(await page.getByTestId("empty-state").innerText()).toBe("Tidak ada laporan");
    expect(await page.getByTestId("incident-row").count()).toBe(0);
  });

  test("UJ-06.04 Operator Polsek membuka dasbor → hanya laporan di wilayah Polseknya", async () => {
    const own = await submitReport(citizen, { at: freshPoint() }); // Sekadau Hilir
    const other = await submitReport(citizen, { at: freshPoint(NANGA_MAHAP) });
    const res = await api("GET", "/api/incidents", undefined, operatorToken);
    expect(res.status).toBe(200);
    expect(res.body.incidents.length).toBeGreaterThan(0);
    expect(res.body.incidents.every((i: any) => i.policeSector?.name === "Polsek Sekadau Hilir")).toBe(true);
    expect(res.body.incidents.some((i: any) => i.reportNumber === other.reportNumber)).toBe(false);

    const page = await openPage();
    await signIn(page, SEED.operator, SEED_PASSWORD);
    expect(await row(page, own.reportNumber).count()).toBe(1);
    expect(await row(page, other.reportNumber).count()).toBe(0);
  });

  test("UJ-06.05 Laporan baru saat dasbor terbuka → muncul dengan penanda 'baru' tanpa memuat ulang", async () => {
    const page = await openPage();
    await signIn(page, SEED.admin, SEED_PASSWORD);
    await page.waitForSelector('[data-testid="live-indicator"][data-live="true"]');
    await page.evaluate(() => ((window as any).__belumDimuatUlang = true));
    const fresh = await submitReport(citizen);
    await page.waitForSelector(`[data-testid="incident-row"][data-report-number="${fresh.reportNumber}"] [data-testid="new-tag"]`, { timeout: 10000 });
    expect(await page.evaluate(() => (window as any).__belumDimuatUlang)).toBe(true);
    const first = await page.getByTestId("incident-row").first().getAttribute("data-report-number");
    expect(first).toBe(fresh.reportNumber);
    expect(await page.locator("path.marker-new").count()).toBe(1);
  });
});

describe("UC-06 detail laporan", () => {
  test("UJ-06.06 Admin membuka detail laporan bertanda selisih lokasi dan punya laporan ganda → semua data langkah 4 tampil", async () => {
    setFirmsMode("ok");
    const at = freshPoint();
    const owner = await newCitizen();
    const primary = await submitReport(owner, { at, exifAt: north(at, 80), description: "Api di lahan gambut" });
    const dupOwner = await newCitizen();
    const dup = await submitReport(dupOwner, { at: north(at, 15) });

    const page = await openPage();
    await signIn(page, SEED.admin, SEED_PASSWORD);
    await page.goto(`${WEB_URL}/reports/${primary.id}`);
    await page.waitForSelector('[data-testid="detail-map"][data-ready="true"]');
    expect(await page.getByTestId("report-number").innerText()).toBe(primary.reportNumber);
    expect(await page.getByTestId("report-photo").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    expect(await page.getByTestId("coordinate").innerText()).toContain(at.latitude.toFixed(6));
    expect(await page.getByTestId("gps-accuracy").innerText()).toContain("8 m");
    expect(await page.getByTestId("photo-coordinate").innerText()).toContain(north(at, 80).latitude.toFixed(6));
    expect(await page.getByTestId("mismatch-flag").innerText()).toMatch(/Selisih lokasi foto: 80(,0)? m/);
    expect(await page.getByTestId("reported-at").innerText()).toContain("WIB");
    expect(await page.getByTestId("description").innerText()).toBe("Api di lahan gambut");
    expect(await page.getByTestId("reporter-name").innerText()).toBe(owner.name);
    expect(await page.getByTestId("reporter-phone").innerText()).toBe(owner.phoneNumber);
    expect(await page.getByTestId("duplicate-item").allInnerTexts()).toEqual([expect.stringContaining(dup.reportNumber)]);
    expect(await page.getByTestId("history-item").first().innerText()).toContain("Laporan Diterima");
    // Peta detail: titik laporan dan titik foto.
    expect(await page.locator("path.map-marker").count()).toBeGreaterThanOrEqual(2);
  });

  test("UJ-06.07 Operator Polsek membuka detail laporan di wilayahnya → nomor HP Warga tampil utuh", async () => {
    const r = await submitReport(citizen, { at: freshPoint() });
    const page = await openPage();
    await signIn(page, SEED.operator, SEED_PASSWORD);
    await page.goto(`${WEB_URL}/reports/${r.id}`);
    expect(await page.getByTestId("reporter-phone").innerText()).toBe(citizen.phoneNumber);
  });

  test("UJ-06.08 titik panas tiruan 800 m dari laporan → jumlah dan jarak terdekat tampil sebagai petunjuk", async () => {
    setFirmsMode("ok");
    const r = await submitReport(citizen, { at: freshPoint() });
    const res = await api("GET", `/api/reports/${r.id}`, undefined, adminToken);
    expect(res.status).toBe(200);
    expect(res.body.hotspots.available).toBe(true);
    expect(res.body.hotspots.count).toBe(1); // titik di sudut kotak (> 5 km) tidak dihitung
    expect(res.body.hotspots.nearestMeters).toBeGreaterThanOrEqual(795);
    expect(res.body.hotspots.nearestMeters).toBeLessThanOrEqual(805);
    expect(res.body.report.status).toBe("RECEIVED"); // petunjuk tidak mengubah status

    const page = await openPage();
    await signIn(page, SEED.admin, SEED_PASSWORD);
    await page.goto(`${WEB_URL}/reports/${r.id}`);
    expect(await page.getByTestId("hotspot-count").innerText()).toBe("1");
    expect(await page.getByTestId("hotspot-nearest").innerText()).toMatch(/^(79[5-9]|80[0-5]) m$/);
  });

  test("UJ-06.09 layanan FIRMS tidak dapat dihubungi → detail tetap tampil dengan keterangan data titik panas tidak tersedia", async () => {
    setFirmsMode("fail");
    const r = await submitReport(citizen, { at: freshPoint() });
    const page = await openPage();
    await signIn(page, SEED.admin, SEED_PASSWORD);
    await page.goto(`${WEB_URL}/reports/${r.id}`);
    expect(await page.getByTestId("report-number").innerText()).toBe(r.reportNumber);
    expect(await page.getByTestId("hotspot-unavailable").innerText()).toBe("Data titik panas tidak tersedia");
    expect(await page.getByTestId("history-item").count()).toBeGreaterThan(0);
    setFirmsMode("ok");
  });

  test("UJ-06.10 Operator Polsek meminta detail laporan di luar wilayahnya → 403", async () => {
    const r = await submitReport(citizen, { at: freshPoint(NANGA_MAHAP) });
    const res = await api("GET", `/api/reports/${r.id}`, undefined, operatorToken);
    expect(res.status).toBe(403);
    expect((await api("GET", `/api/reports/${r.id}/photo`, undefined, operatorToken)).status).toBe(403);
  });

  test("UJ-06.11 Warga meminta daftar Kejadian → 403", async () => {
    expect((await api("GET", "/api/incidents", undefined, citizen.token)).status).toBe(403);
  });

  test("UJ-06.12 saringan tidak valid (status tak dikenal, tanggal salah format) → 422 per kolom", async () => {
    const res = await api("GET", "/api/incidents?status=PENDING&from=10-03-2026", undefined, adminToken);
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.fields).sort()).toEqual(["from", "status"]);
  });
});
