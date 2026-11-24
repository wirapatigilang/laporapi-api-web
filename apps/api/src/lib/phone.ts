/**
 * Menormalkan nomor seluler Indonesia ke bentuk 08…
 * Mengembalikan null bila formatnya tidak sah.
 */
export function normalizePhoneNumber(raw: string): string | null {
  const compact = raw.replace(/[\s-]/g, "");
  let local = compact;
  if (local.startsWith("+62")) local = "0" + local.slice(3);
  else if (local.startsWith("62")) local = "0" + local.slice(2);
  return /^08[0-9]{8,13}$/.test(local) ? local : null;
}
