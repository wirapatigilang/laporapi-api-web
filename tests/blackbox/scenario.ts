/**
 * Penyiapan kondisi awal uji iterasi 4–12 lewat API (dan basis data uji bila kondisi
 * tidak dapat dibuat lewat API pada iterasi tersebut). Tidak mengimpor kode aplikasi.
 */
import { api, db, loginAs, newCitizen, SEED } from "./helpers";
import { freshPoint, jpegWithGps, jpegWithoutGps, north, reportForm } from "./fixtures";

export type Citizen = Awaited<ReturnType<typeof newCitizen>>;
type Point = { latitude: number; longitude: number };

/** Kondisi awal tiap berkas uji: tidak ada Kejadian terbuka dari uji sebelumnya. */
export async function closeOpenIncidents() {
  await db`UPDATE incidents SET is_open = false, closed_at = now() WHERE is_open`;
}

/** Warga mengirim Laporan (UC-04) dan mengembalikan isi `report` dari tanggapan. */
export async function submitReport(citizen: Citizen, opts: { at?: Point; exifAt?: Point | null; reportedAt?: string; description?: string } = {}) {
  const at = opts.at ?? freshPoint();
  const photo = opts.exifAt ? jpegWithGps(opts.exifAt.latitude, opts.exifAt.longitude) : jpegWithoutGps();
  const res = await api("POST", "/api/reports", reportForm({ photo, device: at, reportedAt: opts.reportedAt, description: opts.description }), citizen.token);
  if (res.status !== 201) throw new Error(`Gagal mengirim laporan uji: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.report as { id: string; reportNumber: string; incidentId: string; isDuplicate: boolean; latitude: number; longitude: number; status: string };
}

/** Kejadian dengan laporan utama dan `duplicates` laporan ganda (20 m ke utara, Warga berbeda). */
export async function incidentWithDuplicates(duplicates: number, at: Point = freshPoint()) {
  const owner = await newCitizen();
  const primary = await submitReport(owner, { at });
  const dups = [];
  const dupOwners = [];
  for (let i = 0; i < duplicates; i++) {
    const c = await newCitizen();
    dupOwners.push(c);
    dups.push(await submitReport(c, { at: north(at, 10 + i * 5) }));
  }
  return { owner, primary, dups, dupOwners, at };
}

export const tokens = {
  admin: () => loginAs(SEED.admin),
  operator: () => loginAs(SEED.operator),
  officer: () => loginAs(SEED.officer),
};

/** Notifikasi milik pemegang token untuk Laporan tertentu. */
export async function notificationsFor(token: string, reportId: string) {
  const res = await api("GET", "/api/notifications", undefined, token);
  return (res.body.notifications as any[]).filter((n) => n.reportId === reportId);
}

export const statusOf = async (reportId: string) => (await db`SELECT current_status FROM reports WHERE id = ${reportId}`)[0].current_status as string;
export const historyOf = (reportId: string) =>
  db`SELECT type, status, activity, note, actor_id FROM status_histories WHERE report_id = ${reportId} ORDER BY created_at, id`;
