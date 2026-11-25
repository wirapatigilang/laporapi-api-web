/**
 * Helper uji Black Box: hanya memakai HTTP ke API dan (untuk menyiapkan/memeriksa
 * kondisi data) basis data uji. Tidak mengimpor kode aplikasi.
 */
import { SQL } from "bun";

export const API_URL = process.env.API_URL ?? "http://localhost:3000";
export const db = new SQL(process.env.TEST_DATABASE_URL ?? "postgres://lapor:lapor@localhost:5432/lapor_api_test");

let counter = 0;
/** Nomor HP unik per uji (08 + 11 digit). */
export function uniquePhone(): string {
  counter += 1;
  const tail = `${Date.now() % 1e7}`.padStart(7, "0") + `${counter % 1e4}`.padStart(4, "0");
  return `08${tail}`.slice(0, 13);
}

export async function api(method: string, path: string, body?: unknown, token?: string) {
  const headers: Record<string, string> = {};
  if (body !== undefined && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(API_URL + path, {
    method,
    headers,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

export const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "LaporApi#2026";
export const SEED = {
  admin: "081100000001",
  operator: "081100000002",
  officer: "081100000003",
};

/** Mendaftarkan Warga baru lewat API lalu masuk (kanal android); mengembalikan token. */
export async function newCitizen() {
  const data = { name: "Warga Uji", phoneNumber: uniquePhone(), password: "rahasia123" };
  await api("POST", "/api/auth/register", data);
  const res = await api("POST", "/api/auth/login", { phoneNumber: data.phoneNumber, password: data.password, channel: "android" });
  return { ...data, token: res.body.token as string, id: res.body.user?.id as string };
}

export async function loginAs(phoneNumber: string, channel = "web") {
  const res = await api("POST", "/api/auth/login", { phoneNumber, password: SEED_PASSWORD, channel });
  return res.body.token as string;
}

/** Membuat JWT HS256 dengan rahasia uji (untuk menyiapkan kondisi token kedaluwarsa). */
export async function signTestToken(payload: Record<string, unknown>) {
  const secret = process.env.JWT_SECRET ?? "dev-only-secret-change-me";
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const data = `${enc({ alg: "HS256", typ: "JWT" })}.${enc(payload)}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data))).toString("base64url");
  return `${data}.${sig}`;
}
