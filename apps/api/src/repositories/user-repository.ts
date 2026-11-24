import { sql } from "../db/client";

export type Role = "REPORTER" | "ADMIN" | "SECTOR_OPERATOR" | "AGENCY_OFFICER";

export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  policeSectorId: string | null;
  agencyId: string | null;
  createdAt: Date;
}

export interface SessionUser {
  id: string;
  name: string;
  phoneNumber: string;
  role: Role;
  policeSector: { id: string; name: string } | null;
  agency: { id: string; name: string } | null;
}

export type PublicUser = Omit<User, "passwordHash">;

const columns = sql`id, name, phone_number AS "phoneNumber", password_hash AS "passwordHash",
  role, is_active AS "isActive", police_sector_id AS "policeSectorId", agency_id AS "agencyId",
  created_at AS "createdAt"`;

export const UserRepository = {
  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    const rows = await sql`SELECT ${columns} FROM users WHERE phone_number = ${phoneNumber} LIMIT 1`;
    return rows[0] ?? null;
  },

  async findSessionUser(id: string): Promise<SessionUser | null> {
    const rows = await sql`SELECT u.id, u.name, u.phone_number AS "phoneNumber", u.role,
        CASE WHEN ps.id IS NULL THEN NULL ELSE json_build_object('id', ps.id, 'name', ps.name) END AS "policeSector",
        CASE WHEN ag.id IS NULL THEN NULL ELSE json_build_object('id', ag.id, 'name', ag.name) END AS "agency"
      FROM users u
      LEFT JOIN police_sectors ps ON ps.id = u.police_sector_id
      LEFT JOIN agencies ag ON ag.id = u.agency_id
      WHERE u.id = ${id} AND u.is_active`;
    return rows[0] ?? null;
  },

  async create(input: Pick<User, "name" | "phoneNumber" | "passwordHash" | "role">): Promise<User> {
    const [row] = await sql`INSERT INTO users (name, phone_number, password_hash, role)
      VALUES (${input.name}, ${input.phoneNumber}, ${input.passwordHash}, ${input.role})
      RETURNING ${columns}`;
    return row;
  },
};

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _omit, ...rest } = user;
  return rest;
}
