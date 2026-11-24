import { ApiError, validationError, type FieldErrors } from "../lib/errors";
import { normalizePhoneNumber } from "../lib/phone";
import { UserRepository, toPublicUser, type PublicUser } from "../repositories/user-repository";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RegistrationInput {
  name: string;
  phoneNumber: string;
  email: string;
  password: string;
}

const asText = (v: unknown) => (typeof v === "string" ? v : "");

export const AuthService = {
  /** UC-01 langkah 3 (format) dan alternate 3a. */
  validateRegistration(body: Record<string, unknown>): { input: RegistrationInput; errors: FieldErrors } {
    const errors: FieldErrors = {};
    const name = asText(body.name).trim();
    const rawPhone = asText(body.phoneNumber).trim();
    const email = asText(body.email).trim().toLowerCase();
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

    if (!email) errors.email = "Email wajib diisi";
    else if (!EMAIL_PATTERN.test(email) || email.length > 254) errors.email = "Format email tidak valid";

    if (!password) errors.password = "Kata sandi wajib diisi";
    else if (password.length < 8) errors.password = "Kata sandi minimal 8 karakter";
    else if (password.length > 200) errors.password = "Kata sandi maksimal 200 karakter";

    return { input: { name, phoneNumber, email, password }, errors };
  },

  hashPassword(password: string): Promise<string> {
    return Bun.password.hash(password, { algorithm: "argon2id" });
  },

  /** UC-01 Mendaftar Akun Pelapor. */
  async register(body: Record<string, unknown>): Promise<PublicUser> {
    const { input, errors } = this.validateRegistration(body);
    if (Object.keys(errors).length > 0) throw validationError(errors); // 3a

    const existing = await UserRepository.findByPhoneOrEmail(input.phoneNumber, input.email);
    if (existing) throw new ApiError(409, "ALREADY_REGISTERED", "Nomor HP/email sudah terdaftar"); // 3b

    const user = await UserRepository.create({
      name: input.name,
      phoneNumber: input.phoneNumber,
      email: input.email,
      passwordHash: await this.hashPassword(input.password),
      role: "REPORTER",
    });
    return toPublicUser(user);
  },
};
