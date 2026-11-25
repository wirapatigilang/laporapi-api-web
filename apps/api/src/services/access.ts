/**
 * Cakupan data menurut peran (NFR-01): siapa boleh melihat Laporan mana.
 */
import { sql } from "../db/client";
import { ApiError } from "../lib/errors";
import type { AuthUser } from "../plugins/auth-guard";
import type { Role } from "../repositories/user-repository";

export interface Viewer {
  id: string;
  name: string;
  role: Role;
  policeSectorId: string | null;
  agencyId: string | null;
}

export async function loadViewer(user: AuthUser): Promise<Viewer> {
  const [row] = await sql`SELECT id, name, role, police_sector_id AS "policeSectorId", agency_id AS "agencyId"
    FROM users WHERE id = ${user.id}`;
  if (!row) throw new ApiError(401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu");
  return row;
}

export const forbidden = () => new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses untuk tindakan ini");
export const notFound = () => new ApiError(404, "NOT_FOUND", "Laporan tidak ditemukan");

/** Apakah pengguna boleh melihat Laporan (detail, foto). */
export async function canView(viewer: Viewer, report: { id: string; reporterId: string; policeSectorId: string | null; incidentId: string }): Promise<boolean> {
  switch (viewer.role) {
    case "ADMIN":
      return true;
    case "SECTOR_OPERATOR":
      return !!report.policeSectorId && report.policeSectorId === viewer.policeSectorId;
    case "CITIZEN":
      return report.reporterId === viewer.id;
    case "AGENCY_OFFICER":
      return isDispatchedToAgency(report.incidentId, viewer.agencyId);
  }
}

/** Petugas Instansi: laporan utama Kejadian sudah diteruskan ke Instansinya (UC-10). */
export async function isDispatchedToAgency(incidentId: string, agencyId: string | null): Promise<boolean> {
  if (!agencyId) return false;
  const rows = await sql`SELECT 1 FROM dispatches d JOIN incidents i ON i.primary_report_id = d.report_id
    WHERE i.id = ${incidentId} AND d.agency_id = ${agencyId} LIMIT 1`;
  return rows.length > 0;
}
