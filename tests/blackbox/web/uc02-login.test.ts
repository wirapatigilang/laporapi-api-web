// Uji Black Box UC-02 Masuk ke Sistem, lapis web (Halaman Masuk) dengan peramban.
import { afterAll, describe, expect, test } from "bun:test";
import { db, newReporter, SEED, SEED_PASSWORD, signTestToken } from "../helpers";
import { closeBrowser, openPage, signIn, WEB_URL } from "./browser";

afterAll(closeBrowser);

describe("UC-02 Masuk ke Sistem (web)", () => {
  test("UJ-02.01 Admin Polres masuk dengan data benar → Dasbor Laporan", async () => {
    const page = await openPage();
    await signIn(page, SEED.admin, SEED_PASSWORD);
    expect(new URL(page.url()).pathname).toBe("/dashboard");
    expect(await page.getByRole("heading", { name: "Dasbor Laporan" }).isVisible()).toBe(true);
    expect(await page.getByTestId("user-role").innerText()).toContain("Admin Polres");
  });

  test("UJ-02.02 Petugas Instansi masuk → Dasbor Laporan dengan nama Instansi", async () => {
    const page = await openPage();
    await signIn(page, SEED.officer, SEED_PASSWORD);
    expect(new URL(page.url()).pathname).toBe("/dashboard");
    expect(await page.getByTestId("scope-note").innerText()).toContain("BPBD Kabupaten Sekadau");
  });

  test("UJ-02.04 kata sandi salah → pesan umum", async () => {
    const page = await openPage();
    await signIn(page, SEED.admin, "salahsalah");
    expect(new URL(page.url()).pathname).toBe("/login");
    expect(await page.getByTestId("login-error").innerText()).toBe("Nomor HP/email atau kata sandi salah");
  });

  test("UJ-02.05 nomor HP tidak terdaftar → pesan sama dengan UJ-02.04", async () => {
    const page = await openPage();
    await signIn(page, "089999999999", "apapunitu1");
    expect(await page.getByTestId("login-error").innerText()).toBe("Nomor HP/email atau kata sandi salah");
  });

  test("UJ-02.06 akun nonaktif → 'Akun Anda tidak aktif, hubungi Admin Polres'", async () => {
    const r = await newReporter();
    // Kondisi awal: akun petugas nonaktif (dibuat dari Pelapor uji yang diubah perannya menjadi Admin).
    await db`UPDATE users SET role = 'ADMIN', is_active = false WHERE phone_number = ${r.phoneNumber}`;
    const page = await openPage();
    await signIn(page, r.phoneNumber, r.password);
    expect(await page.getByTestId("login-error").innerText()).toBe("Akun Anda tidak aktif, hubungi Admin Polres");
  });

  test("UJ-02.07 akun Pelapor masuk ke aplikasi web → ditolak", async () => {
    const r = await newReporter();
    const page = await openPage();
    await signIn(page, r.email, r.password);
    expect(new URL(page.url()).pathname).toBe("/login");
    expect(await page.getByTestId("login-error").innerText()).toBe("Akun pelapor hanya dapat dipakai di aplikasi Android");
  });

  test("UJ-02.09 Operator Polsek masuk dengan email → Dasbor Laporan wilayahnya", async () => {
    const page = await openPage();
    await signIn(page, SEED.operator, SEED_PASSWORD);
    expect(new URL(page.url()).pathname).toBe("/dashboard");
    expect(await page.getByTestId("scope-note").innerText()).toContain("Polsek Sekadau Hilir");
  });

  test("UJ-02.12 sesi web dengan token kedaluwarsa → kembali ke Halaman Masuk dengan pesan", async () => {
    const [admin] = await db`SELECT id FROM users WHERE email = ${SEED.admin}`;
    const expired = await signTestToken({ sub: admin.id, role: "ADMIN", exp: Math.floor(Date.now() / 1000) - 60 });
    const page = await openPage();
    await page.context().addCookies([{ name: "lapor_session", value: expired, url: WEB_URL }]);
    await page.goto(WEB_URL + "/dashboard");
    expect(new URL(page.url()).pathname).toBe("/login");
    expect(await page.getByRole("status").innerText()).toBe("Sesi berakhir, silakan masuk kembali");
  });

  test("UJ-02.14 Keluar → sesi dihapus, Dasbor tidak bisa dibuka lagi", async () => {
    const page = await openPage();
    await signIn(page, SEED.admin, SEED_PASSWORD);
    await Promise.all([page.waitForURL("**/login"), page.getByRole("button", { name: "Keluar" }).click()]);
    await page.goto(WEB_URL + "/dashboard");
    expect(new URL(page.url()).pathname).toBe("/login");
  });

  test("UJ-02.15 isian yang diketik sebelum halaman selesai dimuat tidak hilang", async () => {
    const page = await openPage();
    await page.goto(WEB_URL + "/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Nomor HP atau email").fill(SEED.admin);
    await page.getByLabel("Kata sandi").fill("salahsalah");
    await page.waitForLoadState("networkidle");
    await Promise.all([page.waitForLoadState("networkidle"), page.getByRole("button", { name: "Masuk" }).click()]);
    expect(await page.getByTestId("login-error").innerText()).toBe("Nomor HP/email atau kata sandi salah");
  });
});
