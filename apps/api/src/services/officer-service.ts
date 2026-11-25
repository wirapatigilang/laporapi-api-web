/**
 * OfficerAccountService: UC-03 Mengelola Akun Petugas (Operator Polsek dan Petugas Instansi).
 */
import { sql } from "../db/client";
import { ApiError, validationError, type FieldErrors } from "../lib/errors";
import { normalizePhoneNumber } from "../lib/phone";
import { AuthService } from "./auth-service";
import { isUuid } from "./report-view";

const OFFICER_ROLES = ["SECTOR_OPERATOR", "AGENCY_OFFICER"] as const;
type OfficerRole = (typeof OFFICER_ROLES)[number];
/** Huruf dan angka yang tidak mudah tertukar saat dibacakan (tanpa 0/O, 1/l/I). */
const PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const PASSWORD_LENGTH = 10;

export const ROLE_LABELS: Record<OfficerRole, string> = { SECTOR_OPERATOR: "Operator Polsek", AGENCY_OFFICER: "Petugas Instansi" };

interface OfficerInput {
  name: string;
  phoneNumber: string;
  role: OfficerRole;
  policeSectorId: string | null;
  agencyId: string | null;
}

/** Kata sandi awal acak (langkah 5), ditampilkan sekali kepada Admin Polres. */
export function generateInitialPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(PASSWORD_LENGTH * 2));
  let out = "";
  for (const b of bytes) {
    if (b >= 256 - (256 % PASSWORD_ALPHABET.length)) continue; // tanpa bias modulo
    out += PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length];
    if (out.length === PASSWORD_LENGTH) break;
  }
  return out.length === PASSWORD_LENGTH ? out : generateInitialPassword();
}

const selectOfficers = sql`SELECT u.id, u.name, u.phone_number AS "phoneNumber", u.role, u.is_active AS "isActive",
    u.created_at AS "createdAt",
    CASE WHEN ps.id IS NULL THEN NULL ELSE json_build_object('id', ps.id, 'name', ps.name) END AS "policeSector",
    CASE WHEN ag.id IS NULL THEN NULL ELSE json_build_object('id', ag.id, 'name', ag.name) END AS "agency"
  FROM users u
  LEFT JOIN police_sectors ps ON ps.id = u.police_sector_id
  LEFT JOIN agencies ag ON ag.id = u.agency_id
  WHERE u.role IN ('SECTOR_OPERATOR', 'AGENCY_OFFICER')`;

const withLabel = (o: any) => ({ ...o, roleLabel: ROLE_LABELS[o.role as OfficerRole], statusLabel: o.isActive ? "Aktif" : "Tidak aktif" });

async function findOfficer(id: string) {
  if (!isUuid(id)) return null;
  const rows = await sql`${selectOfficers} AND u.id = ${id}`;
  return rows[0] ? withLabel(rows[0]) : null;
}
const officerNotFound = () => new ApiError(404, "NOT_FOUND", "Akun petugas tidak ditemukan");

/** Langkah 4 dan alternate 4a, 2c: kelengkapan, Polsek/Instansi sesuai peran, nomor HP unik. */
async function validate(body: Record<string, unknown>, excludeId: string | null): Promise<OfficerInput> {
  const errors: FieldErrors = {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const rawPhone = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
  const role = body.role;
  if (!name) errors.name = "Nama wajib diisi";
  else if (name.length < 2 || name.length > 100) errors.name = "Nama harus 2–100 karakter";
  const phoneNumber = rawPhone ? normalizePhoneNumber(rawPhone) : null;
  if (!rawPhone) errors.phoneNumber = "Nomor HP wajib diisi";
  else if (!phoneNumber) errors.phoneNumber = "Nomor HP harus berupa nomor seluler yang valid, misalnya 081234567890";
  let policeSectorId: string | null = null;
  let agencyId: string | null = null;
  if (!(OFFICER_ROLES as readonly unknown[]).includes(role)) errors.role = "Pilih peran Operator Polsek atau Petugas Instansi";
  else if (role === "SECTOR_OPERATOR") {
    const id = isUuid(body.policeSectorId) ? body.policeSectorId : null;
    const [row] = id ? await sql`SELECT id FROM police_sectors WHERE id = ${id}` : [];
    if (!row) errors.policeSectorId = "Pilih Polsek untuk Operator Polsek";
    else policeSectorId = row.id;
  } else {
    const id = isUuid(body.agencyId) ? body.agencyId : null;
    const [row] = id ? await sql`SELECT id FROM agencies WHERE id = ${id}` : [];
    if (!row) errors.agencyId = "Pilih Instansi untuk Petugas Instansi";
    else agencyId = row.id;
  }
  if (Object.keys(errors).length) throw validationError(errors);
  const [taken] = await sql`SELECT id FROM users WHERE phone_number = ${phoneNumber} AND (${excludeId}::uuid IS NULL OR id <> ${excludeId}::uuid)`;
  if (taken) throw new ApiError(409, "PHONE_TAKEN", "Nomor HP sudah dipakai", { phoneNumber: "Nomor HP sudah dipakai" });
  return { name, phoneNumber: phoneNumber!, role: role as OfficerRole, policeSectorId, agencyId };
}

export const OfficerAccountService = {
  /** Langkah 1. */
  async list() {
    const rows = await sql`${selectOfficers} ORDER BY u.is_active DESC, u.role, u.name`;
    return { officers: rows.map(withLabel) };
  },

  /** Langkah 2–5. */
  async create(body: Record<string, unknown>) {
    const input = await validate(body, null);
    const initialPassword = generateInitialPassword();
    const hash = await AuthService.hashPassword(initialPassword);
    try {
      const [row] = await sql`INSERT INTO users (name, phone_number, password_hash, role, police_sector_id, agency_id)
        VALUES (${input.name}, ${input.phoneNumber}, ${hash}, ${input.role}, ${input.policeSectorId}, ${input.agencyId}) RETURNING id`;
      return { message: "Akun petugas ditambahkan", officer: await findOfficer(row.id), initialPassword };
    } catch (e: any) {
      // Dua Admin menyimpan nomor yang sama bersamaan: UNIQUE di basis data.
      if (e?.errno === "23505") throw new ApiError(409, "PHONE_TAKEN", "Nomor HP sudah dipakai", { phoneNumber: "Nomor HP sudah dipakai" });
      throw e;
    }
  },

  /** Alternate 2a. Kata sandi tidak berubah. */
  async update(id: string, body: Record<string, unknown>) {
    const current = await findOfficer(id);
    if (!current) throw officerNotFound();
    const input = await validate(body, current.id);
    try {
      await sql`UPDATE users SET name = ${input.name}, phone_number = ${input.phoneNumber}, role = ${input.role},
          police_sector_id = ${input.policeSectorId}, agency_id = ${input.agencyId}
        WHERE id = ${current.id}`;
    } catch (e: any) {
      if (e?.errno === "23505") throw new ApiError(409, "PHONE_TAKEN", "Nomor HP sudah dipakai", { phoneNumber: "Nomor HP sudah dipakai" });
      throw e;
    }
    return { message: "Akun petugas diperbarui", officer: await findOfficer(current.id) };
  },

  /** Alternate 2b: akun tidak dapat masuk dan token lamanya tidak berlaku lagi. */
  async deactivate(id: string) {
    const current = await findOfficer(id);
    if (!current) throw officerNotFound();
    if (!current.isActive) throw new ApiError(409, "ALREADY_INACTIVE", "Akun sudah tidak aktif");
    await sql`UPDATE users SET is_active = false WHERE id = ${current.id}`;
    return { message: "Akun petugas dinonaktifkan", officer: await findOfficer(current.id) };
  },
};
