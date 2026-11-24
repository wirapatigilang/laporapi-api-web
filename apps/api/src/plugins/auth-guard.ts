import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { config } from "../config";
import { ApiError } from "../lib/errors";
import type { Role } from "../repositories/user-repository";

export interface AuthUser {
  id: string;
  role: Role;
}

export const jwtPlugin = jwt({ name: "jwt", secret: config.jwtSecret, alg: "HS256" });

/** Membaca token Bearer → `authUser` (atau null). */
export const authContext = new Elysia({ name: "auth-context" })
  .use(jwtPlugin)
  .derive({ as: "global" }, async ({ headers, jwt }) => {
    const header = headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return { authUser: null as AuthUser | null, authError: "UNAUTHENTICATED" as const };
    // Pemeriksaan kedaluwarsa dipisah agar pesannya bisa meminta masuk ulang.
    const payload = await jwt.verify(token);
    if (!payload) {
      const expired = isExpired(token);
      return { authUser: null, authError: expired ? ("TOKEN_EXPIRED" as const) : ("INVALID_TOKEN" as const) };
    }
    return { authUser: { id: String(payload.sub), role: payload.role as Role }, authError: null };
  });

function isExpired(token: string): boolean {
  try {
    const body = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return typeof body.exp === "number" && body.exp * 1000 < Date.now();
  } catch {
    return false;
  }
}

/** Memastikan pengguna sudah masuk dan (bila diberikan) berperan sesuai. */
export function requireRole(authUser: AuthUser | null, authError: string | null, ...roles: Role[]): AuthUser {
  if (!authUser) {
    if (authError === "TOKEN_EXPIRED") throw new ApiError(401, "TOKEN_EXPIRED", "Sesi berakhir, silakan masuk kembali");
    throw new ApiError(401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu");
  }
  if (roles.length > 0 && !roles.includes(authUser.role)) {
    throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses untuk tindakan ini");
  }
  return authUser;
}
