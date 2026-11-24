import { sql } from "../db/client";

export type Role = "REPORTER" | "ADMIN" | "SECTOR_OPERATOR" | "AGENCY_OFFICER";

export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
}

export type PublicUser = Omit<User, "passwordHash">;

const columns = sql`id, name, phone_number AS "phoneNumber", email, password_hash AS "passwordHash",
  role, is_active AS "isActive", created_at AS "createdAt"`;

export const UserRepository = {
  async findByPhoneOrEmail(phoneNumber: string, email: string): Promise<User | null> {
    const rows = await sql`SELECT ${columns} FROM users
      WHERE phone_number = ${phoneNumber} OR email = ${email} LIMIT 1`;
    return rows[0] ?? null;
  },

  async create(input: Omit<User, "id" | "isActive" | "createdAt">): Promise<User> {
    const [row] = await sql`INSERT INTO users (name, phone_number, email, password_hash, role)
      VALUES (${input.name}, ${input.phoneNumber}, ${input.email}, ${input.passwordHash}, ${input.role})
      RETURNING ${columns}`;
    return row;
  },
};

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _omit, ...rest } = user;
  return rest;
}
