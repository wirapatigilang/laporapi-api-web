/**
 * Data awal (idempoten): Polsek, Instansi, dan akun petugas untuk pengujian
 * sebelum UC-03 Mengelola Akun Petugas selesai (Bab 4 subbab 4.2.3).
 * Daftar Polsek mengikuti tujuh kecamatan Kabupaten Sekadau (perlu dikonfirmasi ke Polres).
 */
import { sql } from "./client";

const password = process.env.SEED_PASSWORD ?? "LaporApi#2026";

export const POLICE_SECTORS = [
  "Polsek Sekadau Hilir", "Polsek Sekadau Hulu", "Polsek Nanga Taman", "Polsek Nanga Mahap",
  "Polsek Belitang Hilir", "Polsek Belitang Hulu", "Polsek Belitang",
];
export const AGENCIES: [string, string][] = [
  ["Dinas Pemadam Kebakaran", "FIRE_DEPARTMENT"],
  ["BPBD Kabupaten Sekadau", "BPBD"],
  ["Manggala Agni", "MANGGALA_AGNI"],
  ["Dinas Lingkungan Hidup", "ENVIRONMENT_AGENCY"],
  ["TNI (Kodim 1204/Sanggau)", "MILITARY"],
];

for (const name of POLICE_SECTORS) {
  await sql`INSERT INTO police_sectors (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
}
for (const [name, type] of AGENCIES) {
  await sql`INSERT INTO agencies (name, type) VALUES (${name}, ${type}) ON CONFLICT (name) DO NOTHING`;
}

const hash = await Bun.password.hash(password, { algorithm: "argon2id" });
const [sekadauHilir] = await sql`SELECT id FROM police_sectors WHERE name = 'Polsek Sekadau Hilir'`;
const [bpbd] = await sql`SELECT id FROM agencies WHERE type = 'BPBD'`;

const accounts = [
  { name: "Admin Polres Sekadau", phone: "081100000001", email: "admin@polres-sekadau.test", role: "ADMIN", sector: null, agency: null },
  { name: "Operator Polsek Sekadau Hilir", phone: "081100000002", email: "operator.sekadauhilir@polres-sekadau.test", role: "SECTOR_OPERATOR", sector: sekadauHilir.id, agency: null },
  { name: "Petugas BPBD", phone: "081100000003", email: "petugas.bpbd@polres-sekadau.test", role: "AGENCY_OFFICER", sector: null, agency: bpbd.id },
];
for (const a of accounts) {
  await sql`INSERT INTO users (name, phone_number, email, password_hash, role, police_sector_id, agency_id)
    VALUES (${a.name}, ${a.phone}, ${a.email}, ${hash}, ${a.role}, ${a.sector}, ${a.agency})
    ON CONFLICT (phone_number) DO NOTHING`;
}
console.log(`seed selesai (kata sandi akun petugas: SEED_PASSWORD, bawaan ${password})`);
await sql.close();
