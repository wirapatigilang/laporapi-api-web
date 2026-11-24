import { ApiError, validationError, type FieldErrors } from "../lib/errors";
import { normalizePhoneNumber } from "../lib/phone";
import { UserRepository, toPublicUser, type PublicUser, type SessionUser, type User } from "../repositories/user-repository";
import { tokenTtlSeconds } from "../config";

export type Channel = "web" | "android";

/** Penanda kanal: Pelapor hanya boleh masuk dari aplikasi Android (UC-02 3c). */
export function canSignInFrom(user: Pick<User, "role">, channel: Channel): boolean {
  return !(user.role === "REPORTER" && channel === "web");
}

type SignToken = (payload: Record<string, string | number>) => Promise<string>;

export interface RegistrationInput {
  name: string;
  phoneNumber: string;
  password: string;
}

const asText = (v: unknown) => (typeof v === "string" ? v : "");

export const AuthService = {
  /** UC-01 langkah 3 (format) dan alternate 3a. */
  validateRegistration(body: Record<string, unknown>): { input: RegistrationInput; errors: FieldErrors } {
    const errors: FieldErrors = {};
    const name = asText(body.name).trim();
    const rawPhone = asText(body.phoneNumber).trim();
    const password = asText(body.password);

    if (!name) errors.name = "Nama wajib diisi";
    else if (name.length < 2 || name.length > 100) errors.name = "Nama harus 2–100 karakter";

    let phoneNumber = rawPhone;
    if (!rawPhone) errors.phoneNumber = "Nomor HP wajib diisi";
    else {
      const normalized = normalizePhoneNumber(rawPhone);
      if (!normalized) errors.phoneNumber = "Nomor HP harus berupa nomor seluler yang valid, misalnya 081234567890";
      else phoneNumber = normalized;
    }

    if (!password) errors.password = "Kata sandi wajib diisi";
    else if (password.length < 8) errors.password = "Kata sandi minimal 8 karakter";
    else if (password.length > 200) errors.password = "Kata sandi maksimal 200 karakter";

    return { input: { name, phoneNumber, password }, errors };
  },

  hashPassword(password: string): Promise<string> {
    return Bun.password.hash(password, { algorithm: "argon2id" });
  },

  /** UC-01 Mendaftar Akun Pelapor. */
  async register(body: Record<string, unknown>): Promise<PublicUser> {
    const { input, errors } = this.validateRegistration(body);
    if (Object.keys(errors).length > 0) throw validationError(errors); // 3a

    const existing = await UserRepository.findByPhoneNumber(input.phoneNumber);
    if (existing) throw new ApiError(409, "ALREADY_REGISTERED", "Nomor HP sudah terdaftar"); // 3b

    const user = await UserRepository.create({
      name: input.name,
      phoneNumber: input.phoneNumber,
      passwordHash: await this.hashPassword(input.password),
      role: "REPORTER",
    });
    return toPublicUser(user);
  },

  verifyPassword(user: User, password: string): Promise<boolean> {
    return Bun.password.verify(password, user.passwordHash);
  },

  async issueToken(sign: SignToken, user: User) {
    const exp = Math.floor(Date.now() / 1000) + tokenTtlSeconds;
    const token = await sign({ sub: user.id, role: user.role, exp });
    return { token, expiresAt: new Date(exp * 1000).toISOString() };
  },

  /** UC-02 Masuk ke Sistem. */
  async login(body: Record<string, unknown>, sign: SignToken): Promise<{ token: string; expiresAt: string; user: SessionUser }> {
    const rawPhone = asText(body.phoneNumber).trim();
    const password = asText(body.password);
    const channel = asText(body.channel);
    const errors: FieldErrors = {};
    if (!rawPhone) errors.phoneNumber = "Nomor HP wajib diisi";
    if (!password) errors.password = "Kata sandi wajib diisi";
    if (channel !== "web" && channel !== "android") errors.channel = "Penanda kanal harus web atau android";
    if (Object.keys(errors).length > 0) throw validationError(errors);

    // Langkah 3: nomor HP dinormalisasi seperti UC-01 (+62… = 08…).
    const phoneNumber = normalizePhoneNumber(rawPhone) ?? rawPhone;
    const user = await UserRepository.findByPhoneNumber(phoneNumber);
    const invalid = new ApiError(401, "INVALID_CREDENTIALS", "Nomor HP atau kata sandi salah");
    if (!user || !(await this.verifyPassword(user, password))) throw invalid; // 3a
    if (!user.isActive) throw new ApiError(403, "ACCOUNT_INACTIVE", "Akun Anda tidak aktif, hubungi Admin Polres"); // 3b
    if (!canSignInFrom(user, channel as Channel)) {
      throw new ApiError(403, "CHANNEL_NOT_ALLOWED", "Akun pelapor hanya dapat dipakai di aplikasi Android"); // 3c
    }

    const { token, expiresAt } = await this.issueToken(sign, user); // langkah 4
    const sessionUser = (await UserRepository.findSessionUser(user.id))!;
    return { token, expiresAt, user: sessionUser };
  },
};
