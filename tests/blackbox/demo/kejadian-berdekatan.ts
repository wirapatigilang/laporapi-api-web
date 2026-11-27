/**
 * Data contoh: dua Kejadian yang berdekatan di Kecamatan Sekadau Hilir.
 *
 *   Kejadian 1  ← Laporan A (titik P) dan Laporan B (30 m dari P, laporan ganda)
 *   Kejadian 2  ← Laporan C (120 m dari P, di luar radius 50 m, jadi Kejadian baru)
 *
 * Semua dikirim lewat API (POST /api/reports) oleh dua akun Warga contoh, sehingga
 * deteksi laporan ganda (Haversine 50 m) berjalan seperti aslinya. Bukan uji otomatis.
 *
 * Jalankan saat API hidup:  bun run demo:berdekatan   (API_URL bawaan http://localhost:3000)
 */
import { jpegWithGps, jpegWithoutGps, north, reportForm, SEKADAU_HILIR } from "../fixtures";

const API_URL = process.env.API_URL ?? "http://localhost:3000";
const R = 6_371_000;

async function call(method: string, path: string, body?: FormData | object, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) headers["content-type"] = "application/json";
  const res = await fetch(API_URL + path, { method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: (await res.json().catch(() => null)) as any };
}

async function citizen(name: string) {
  const phoneNumber = "0899" + String(Date.now()).slice(-7) + Math.floor(Math.random() * 10);
  const password = "rahasia123";
  const reg = await call("POST", "/api/auth/register", { name, phoneNumber, password });
  if (reg.status !== 201 && reg.status !== 200) throw new Error(`Gagal mendaftarkan ${name}: ${reg.status} ${JSON.stringify(reg.body)}`);
  const login = await call("POST", "/api/auth/login", { phoneNumber, password, channel: "android" });
  if (login.status !== 200) throw new Error(`Gagal masuk sebagai ${name}: ${login.status}`);
  return { name, phoneNumber, token: login.body.token as string };
}

function haversine(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Titik dasar digeser acak (±500 m) agar menjalankan ulang tidak menempel ke Kejadian dari putaran sebelumnya.
const P = {
  latitude: SEKADAU_HILIR.latitude + (Math.random() - 0.5) * 0.009,
  longitude: SEKADAU_HILIR.longitude + (Math.random() - 0.5) * 0.009,
};
const points = { A: P, B: north(P, 30), C: north(P, 120) };

const warga1 = await citizen("Warga Contoh Satu");
const warga2 = await citizen("Warga Contoh Dua");

const plan = [
  { key: "A", who: warga1, at: points.A, photo: jpegWithGps(points.A.latitude, points.A.longitude), description: "Asap tebal dari lahan gambut di belakang kebun sawit" },
  { key: "B", who: warga2, at: points.B, photo: jpegWithoutGps(), description: "Api terlihat dari jalan desa, dekat kebun sawit" },
  { key: "C", who: warga1, at: points.C, photo: jpegWithGps(points.C.latitude, points.C.longitude), description: "Titik api kedua di semak belukar, lebih ke utara" },
] as const;

const results: Record<string, any> = {};
for (const p of plan) {
  const res = await call("POST", "/api/reports", reportForm({ photo: p.photo, device: p.at, description: p.description }), p.who.token);
  if (res.status !== 201) throw new Error(`Laporan ${p.key} gagal: ${res.status} ${JSON.stringify(res.body)}`);
  results[p.key] = res.body.report;
}

const m = (x: number) => `${x.toFixed(1)} m`;
console.log(`\nData contoh dibuat lewat ${API_URL}\n`);
for (const p of plan) {
  const r = results[p.key];
  console.log(`Laporan ${p.key}  ${r.reportNumber}  (${p.at.latitude.toFixed(6)}, ${p.at.longitude.toFixed(6)})  oleh ${p.who.name}`);
}
console.log(`\nA ↔ B  ${m(haversine(points.A, points.B))}  → laporan ganda, satu Kejadian`);
console.log(`A ↔ C  ${m(haversine(points.A, points.C))}  → di luar 50 m, Kejadian terpisah`);
console.log(`\nBuka dasbor web sebagai Admin Polres, lalu detail ${results.A.reportNumber} (Laporan ganda: ${results.B.reportNumber}) dan ${results.C.reportNumber}.`);
