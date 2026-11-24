// Uji Black Box UC-02 Masuk ke Sistem, lapis API (spec: specs/002-uc02-sign-in/spec.md)
import { describe, expect, test } from "bun:test";
import { api, db, newReporter, signTestToken } from "./helpers";

describe("UC-02 Masuk ke Sistem (API)", () => {
  test("UJ-02.03 Pelapor masuk dengan kanal android → 200, token berperan REPORTER", async () => {
    const r = await newReporter();
    const res = await api("POST", "/api/auth/login", { identifier: r.phoneNumber, password: r.password, channel: "android" });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user.role).toBe("REPORTER");
    const payload = JSON.parse(Buffer.from(res.body.token.split(".")[1], "base64url").toString());
    expect(payload.role).toBe("REPORTER");
    expect(JSON.stringify(res.body)).not.toContain(r.password);
    const me = await api("GET", "/api/auth/me", undefined, res.body.token);
    expect(me.status).toBe(200);
    expect(me.body.user.phoneNumber).toBe(r.phoneNumber);
  });

  test("UJ-02.08 token kedaluwarsa → 401 dan diminta masuk ulang", async () => {
    const r = await newReporter();
    const expired = await signTestToken({ sub: r.id, role: "REPORTER", exp: Math.floor(Date.now() / 1000) - 60 });
    const res = await api("GET", "/api/auth/me", undefined, expired);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("TOKEN_EXPIRED");
    expect(res.body.error.message).toBe("Sesi berakhir, silakan masuk kembali");
  });

  test("UJ-02.10 penanda kanal tidak dikirim → 422 pada kolom channel", async () => {
    const r = await newReporter();
    const res = await api("POST", "/api/auth/login", { identifier: r.phoneNumber, password: r.password });
    expect(res.status).toBe(422);
    expect(res.body.error.fields.channel).toBeDefined();
  });

  test("UJ-02.11 tanpa token → 401", async () => {
    const res = await api("GET", "/api/auth/me");
    expect(res.status).toBe(401);
  });

  test("UJ-02.13 akun nonaktif dengan kata sandi salah → pesan 3a (status akun tidak bocor)", async () => {
    const r = await newReporter();
    await db`UPDATE users SET is_active = false WHERE phone_number = ${r.phoneNumber}`;
    const wrong = await api("POST", "/api/auth/login", { identifier: r.phoneNumber, password: "salahsalah", channel: "android" });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.message).toBe("Nomor HP/email atau kata sandi salah");
    const right = await api("POST", "/api/auth/login", { identifier: r.phoneNumber, password: r.password, channel: "android" });
    expect(right.status).toBe(403);
    expect(right.body.error.message).toBe("Akun Anda tidak aktif, hubungi Admin Polres");
  });
});
