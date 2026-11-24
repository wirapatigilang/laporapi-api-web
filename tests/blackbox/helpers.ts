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
export const uniqueEmail = () => `uji${Date.now()}${++counter}@contoh.id`;

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
