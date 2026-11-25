// Uji Black Box UC-01 Mendaftar Akun Warga (spec: specs/001-uc01-register-reporter/spec.md)
import { describe, expect, test } from "bun:test";
import { api, db, uniquePhone } from "./helpers";

const valid = () => ({ name: "Budi Santoso", phoneNumber: uniquePhone(), password: "rahasia123" });
const countByPhone = async (p: string) => Number((await db`SELECT count(*)::int AS n FROM users WHERE phone_number = ${p}`)[0].n);

describe("UC-01 Mendaftar Akun Warga", () => {
  test("UJ-01.01 data lengkap dan valid → 201, peran CITIZEN, kata sandi ter-hash", async () => {
    const data = valid();
    const res = await api("POST", "/api/auth/register", data);
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("CITIZEN");
    expect(res.body.user.phoneNumber).toBe(data.phoneNumber);
    expect(res.body.user.email).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain("rahasia123");
    expect(res.body.user.passwordHash).toBeUndefined();
    const [row] = await db`SELECT password_hash FROM users WHERE phone_number = ${data.phoneNumber}`;
    expect(row.password_hash).not.toBe("rahasia123");
    expect(row.password_hash.startsWith("$argon2id$")).toBe(true);
  });

  test("UJ-01.02 kata sandi 7 karakter → 422 pada kolom password, tidak tersimpan", async () => {
    const data = { ...valid(), password: "1234567" };
    const res = await api("POST", "/api/auth/register", data);
    expect(res.status).toBe(422);
    expect(res.body.error.fields.password).toBeDefined();
    expect(await countByPhone(data.phoneNumber)).toBe(0);
  });

  test("UJ-01.03 kata sandi 8 karakter → 201", async () => {
    const res = await api("POST", "/api/auth/register", { ...valid(), password: "12345678" });
    expect(res.status).toBe(201);
  });

  test("UJ-01.04 nomor HP berisi huruf → 422 pada kolom phoneNumber", async () => {
    const res = await api("POST", "/api/auth/register", { ...valid(), phoneNumber: "08123abc456" });
    expect(res.status).toBe(422);
    expect(res.body.error.fields.phoneNumber).toBeDefined();
  });

  test("UJ-01.05 nomor HP sudah terdaftar → 409", async () => {
    const first = valid();
    expect((await api("POST", "/api/auth/register", first)).status).toBe(201);
    const res = await api("POST", "/api/auth/register", { ...valid(), phoneNumber: first.phoneNumber });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("Nomor HP sudah terdaftar");
    expect(await countByPhone(first.phoneNumber)).toBe(1);
  });

  test("UJ-01.06 +62… setara dengan 08… yang terdaftar → 409", async () => {
    const first = valid();
    expect((await api("POST", "/api/auth/register", first)).status).toBe(201);
    const res = await api("POST", "/api/auth/register", { ...valid(), phoneNumber: "+62" + first.phoneNumber.slice(1) });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("Nomor HP sudah terdaftar");
  });

  test("UJ-01.07 nomor HP 9 digit → 422 pada kolom phoneNumber", async () => {
    const res = await api("POST", "/api/auth/register", { ...valid(), phoneNumber: uniquePhone().slice(0, 9) });
    expect(res.status).toBe(422);
    expect(res.body.error.fields.phoneNumber).toBeDefined();
  });

  test("UJ-01.08 nomor HP 10 digit → 201", async () => {
    const res = await api("POST", "/api/auth/register", { ...valid(), phoneNumber: uniquePhone().slice(0, 10) });
    expect(res.status).toBe(201);
  });

  test("UJ-01.09 nomor diawali selain 08/62/+62 (0215551234) → 422 pada kolom phoneNumber", async () => {
    const res = await api("POST", "/api/auth/register", { ...valid(), phoneNumber: "0215551234" });
    expect(res.status).toBe(422);
    expect(res.body.error.fields.phoneNumber).toBeDefined();
  });

  test("UJ-01.10 semua kolom kosong → 422 dengan pesan untuk setiap kolom", async () => {
    const res = await api("POST", "/api/auth/register", {});
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.fields).sort()).toEqual(["name", "password", "phoneNumber"]);
  });

  test("UJ-01.11 alamat diisi → 201 dan tersimpan; alamat 201 karakter → 422 pada kolom address", async () => {
    const data = { ...valid(), address: "Dusun Sungai Ringin RT 02, Sekadau Hilir" };
    const res = await api("POST", "/api/auth/register", data);
    expect(res.status).toBe(201);
    expect(res.body.user.address).toBe(data.address);
    const long = await api("POST", "/api/auth/register", { ...valid(), address: "a".repeat(201) });
    expect(long.status).toBe(422);
    expect(long.body.error.fields.address).toBe("Alamat maksimal 200 karakter");
  });
});
