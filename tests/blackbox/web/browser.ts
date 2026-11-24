import { chromium, type Browser, type Page } from "playwright";

export const WEB_URL = process.env.WEB_URL ?? "http://localhost:5173";
let browser: Browser | null = null;

export async function openPage(): Promise<Page> {
  browser ??= await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  return context.newPage();
}
export async function closeBrowser() {
  await browser?.close();
  browser = null;
}

/** Mengisi Halaman Masuk dan menekan tombol Masuk. */
export async function signIn(page: Page, identifier: string, password: string) {
  await page.goto(WEB_URL + "/login");
  await page.getByLabel("Nomor HP atau email").fill(identifier);
  await page.getByLabel("Kata sandi").fill(password);
  await Promise.all([page.waitForLoadState("networkidle"), page.getByRole("button", { name: "Masuk" }).click()]);
}
