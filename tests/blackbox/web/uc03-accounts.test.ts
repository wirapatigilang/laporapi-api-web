// Uji Black Box UC-03 Mengelola Akun Petugas (spec: specs/012-uc03-officer-accounts/spec.md)
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { api, db, loginAs, SEED, SEED_PASSWORD, uniquePhone } from "../helpers";
import { tokens } from "../scenario";
import { closeBrowser, openPage, signIn, WEB_URL } from "./browser";

let adminToken: string;
let operatorToken: string;

beforeAll(async () => {
  adminToken = await tokens.admin();
  operatorToken = await tokens.operator();
});
afterAll(closeBrowser);

async function accountsPage() {
  const page = await openPage();
  await signIn(page, SEED.admin, SEED_PASSWORD);
  await page.getByTestId("nav-accounts").click();
  await page.getByTestId("account-list").waitFor();
  await page.waitForLoadState("networkidle");
  return page;
}
async function fillForm(page: any, v: { name?: string; phone?: string; role?: string; sector?: string; agency?: string }) {
  if (v.name !== undefined) await page.locator('[data-testid="account-form"] input[name="name"]').fill(v.name);
  if (v.phone !== undefined) await page.locator('[data-testid="account-form"] input[name="phoneNumber"]').fill(v.phone);
  if (v.role) await page.locator('[data-testid="account-form"] select[name="role"]').selectOption(v.role);
  if (v.sector) await page.locator('select[name="policeSectorId"]').selectOption({ label: v.sector });
  if (v.agency) await page.locator('select[name="agencyId"]').selectOption({ label: v.agency });
}
const row = (page: any, phone: string) => page.locator(`[data-testid="account-row"][data-phone="${phone}"]`);
const countByPhone = async (phone: string) => (await db`SELECT count(*)::int AS n FROM users WHERE phone_number = ${phone}`)[0].n as number;

describe("UC-03 mengelola akun petugas", () => {
  test("UJ-03.01 Admin menambah Operator Polsek dengan Polsek terpilih → akun tampil di daftar, kata sandi awal tampil satu kali", async () => {
    const phone = uniquePhone();
    const page = await accountsPage();
    await page.getByTestId("add-account").click();
    await fillForm(page, { name: "Operator Nanga Taman", phone: "+62" + phone.slice(1), role: "SECTOR_OPERATOR", sector: "Polsek Nanga Taman" });
    await page.getByTestId("save-account").click();
    await page.getByTestId("initial-password").waitFor();
    expect(await page.getByTestId("account-result").innerText()).toBe("Akun petugas ditambahkan");
    const password = await page.getByTestId("initial-password").innerText();
    expect(password).toMatch(/^[A-Za-z2-9]{10}$/);
    const r = row(page, phone); // nomor dinormalisasi ke 08…
    expect(await r.innerText()).toContain("Operator Nanga Taman");
    expect(await r.innerText()).toContain("Operator Polsek");
    expect(await r.getByTestId("account-unit").innerText()).toBe("Polsek Nanga Taman");
    expect(await r.getByTestId("account-status").innerText()).toBe("Aktif");
    // Hanya sekali: setelah dimuat ulang kata sandi tidak tampil lagi dan tidak ada di daftar API.
    await page.reload();
    expect(await page.getByTestId("initial-password").count()).toBe(0);
    expect(JSON.stringify((await api("GET", "/api/officers", undefined, adminToken)).body)).not.toContain(password);
    // Kata sandi awal dapat dipakai masuk.
    const login = await api("POST", "/api/auth/login", { phoneNumber: phone, password, channel: "web" });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe("SECTOR_OPERATOR");
  });

  test("UJ-03.02 Petugas Instansi tanpa Instansi → ditolak, diminta memilih Instansi", async () => {
    const phone = uniquePhone();
    const page = await accountsPage();
    await page.getByTestId("add-account").click();
    await fillForm(page, { name: "Petugas Baru", phone, role: "AGENCY_OFFICER" });
    await page.getByTestId("save-account").click();
    await page.getByTestId("error-agencyId").waitFor();
    expect(await page.getByTestId("error-agencyId").innerText()).toBe("Pilih Instansi untuk Petugas Instansi");
    expect(await countByPhone(phone)).toBe(0);
    const res = await api("POST", "/api/officers", { name: "X Operator", phoneNumber: uniquePhone(), role: "SECTOR_OPERATOR" }, adminToken);
    expect(res.status).toBe(422);
    expect(res.body.error.fields.policeSectorId).toBe("Pilih Polsek untuk Operator Polsek");
  });

  test("UJ-03.03 nomor HP sudah dipakai akun lain → pesan pada kolom nomor HP, akun tidak tersimpan", async () => {
    const page = await accountsPage();
    await page.getByTestId("add-account").click();
    await fillForm(page, { name: "Operator Ganda", phone: "0811-0000-0002", role: "SECTOR_OPERATOR", sector: "Polsek Sekadau Hulu" });
    await page.getByTestId("save-account").click();
    await page.getByTestId("error-phoneNumber").waitFor();
    expect(await page.getByTestId("error-phoneNumber").innerText()).toBe("Nomor HP sudah dipakai");
    expect((await db`SELECT count(*)::int AS n FROM users WHERE name = 'Operator Ganda'`)[0].n).toBe(0);
    const res = await api("POST", "/api/officers", { name: "Operator Ganda", phoneNumber: SEED.operator, role: "SECTOR_OPERATOR", policeSectorId: (await db`SELECT id FROM police_sectors LIMIT 1`)[0].id }, adminToken);
    expect(res.status).toBe(409);
    expect(res.body.error.fields.phoneNumber).toBe("Nomor HP sudah dipakai");
  });

  test("UJ-03.04 nama tidak diisi → pesan pada kolom nama, akun tidak tersimpan", async () => {
    const phone = uniquePhone();
    const page = await accountsPage();
    await page.getByTestId("add-account").click();
    await fillForm(page, { name: "", phone, role: "AGENCY_OFFICER", agency: "Manggala Agni" });
    await page.getByTestId("save-account").click();
    await page.getByTestId("error-name").waitFor();
    expect(await page.getByTestId("error-name").innerText()).toBe("Nama wajib diisi");
    expect(await countByPhone(phone)).toBe(0);
  });

  test("UJ-03.05 mengubah Instansi seorang Petugas → data akun berubah", async () => {
    const phone = uniquePhone();
    const agencies = Object.fromEntries((await db`SELECT name, id FROM agencies`).map((a: any) => [a.name, a.id]));
    const created = await api("POST", "/api/officers", { name: "Petugas Pindah", phoneNumber: phone, role: "AGENCY_OFFICER", agencyId: agencies["BPBD Kabupaten Sekadau"] }, adminToken);
    expect(created.status).toBe(201);
    const page = await accountsPage();
    await row(page, phone).getByTestId("edit-account").click();
    await page.getByTestId("account-form").waitFor();
    expect(await page.locator('[data-testid="account-form"] input[name="name"]').inputValue()).toBe("Petugas Pindah");
    await fillForm(page, { agency: "Manggala Agni" });
    await page.getByTestId("save-account").click();
    await page.getByText("Akun petugas diperbarui").waitFor();
    expect(await row(page, phone).getByTestId("account-unit").innerText()).toBe("Manggala Agni");
    const [u] = await db`SELECT agency_id FROM users WHERE phone_number = ${phone}`;
    expect(u.agency_id).toBe(agencies["Manggala Agni"]);
  });

  test("UJ-03.06 menonaktifkan akun lalu akun mencoba masuk → setelah konfirmasi tidak aktif dan tidak dapat masuk (uji ulang UJ-02.06)", async () => {
    const phone = uniquePhone();
    const sector = (await db`SELECT id FROM police_sectors WHERE name = 'Polsek Belitang'`)[0].id;
    const created = await api("POST", "/api/officers", { name: "Operator Pensiun", phoneNumber: phone, role: "SECTOR_OPERATOR", policeSectorId: sector }, adminToken);
    const password = created.body.initialPassword as string;
    const oldToken = (await api("POST", "/api/auth/login", { phoneNumber: phone, password, channel: "web" })).body.token as string;

    const page = await accountsPage();
    await row(page, phone).getByTestId("deactivate-account").click();
    await page.getByTestId("deactivate-dialog").waitFor();
    await page.getByTestId("deactivate-yes").click();
    await page.getByText("Akun petugas dinonaktifkan").waitFor();
    expect(await row(page, phone).getByTestId("account-status").innerText()).toBe("Tidak aktif");
    expect(await row(page, phone).getByTestId("deactivate-account").isDisabled()).toBe(true);

    const login = await openPage();
    await login.goto(`${WEB_URL}/login`);
    await login.getByLabel("Nomor HP").fill(phone);
    await login.getByLabel("Kata sandi").fill(password);
    await login.getByRole("button", { name: "Masuk" }).click();
    expect(await login.getByTestId("login-error").innerText()).toBe("Akun Anda tidak aktif, hubungi Admin Polres");
    // Token yang terbit sebelum dinonaktifkan tidak berlaku lagi.
    const old = await api("GET", "/api/incidents", undefined, oldToken);
    expect(old.status).toBe(401);
    expect(old.body.error.code).toBe("ACCOUNT_INACTIVE");
  });

  test("UJ-03.07 Operator Polsek membuka daftar akun petugas → 403", async () => {
    expect((await api("GET", "/api/officers", undefined, operatorToken)).status).toBe(403);
    expect((await api("POST", "/api/officers", { name: "X" }, operatorToken)).status).toBe(403);
    expect((await api("GET", "/api/officers", undefined, await loginAs(SEED.officer))).status).toBe(403);
    const page = await openPage();
    await signIn(page, SEED.operator, SEED_PASSWORD);
    expect(await page.getByTestId("nav-accounts").count()).toBe(0);
    const res = await page.goto(`${WEB_URL}/officers`);
    expect(res?.status()).toBe(403);
  });
});
