import type { SQL } from "bun";
import { sql } from "../db/client";
import type { ReportStatus } from "../lib/status";

export interface IncidentFilter {
  status?: ReportStatus;
  districtId?: string;
  policeSectorId?: string;
  from?: string; // YYYY-MM-DD (WIB)
  to?: string; // YYYY-MM-DD (WIB)
}

export interface IncidentScope {
  /** null = semua (Admin Polres). */
  policeSectorId?: string | null;
  /** Petugas Instansi: hanya Kejadian yang laporan utamanya diteruskan ke Instansi ini (UC-10). */
  agencyId?: string | null;
  none?: boolean;
}

export interface IncidentRow {
  incidentId: string;
  isOpen: boolean;
  reportId: string;
  reportNumber: string;
  reportedAt: Date;
  receivedAt: Date;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  districtId: string;
  districtName: string;
  policeSectorId: string | null;
  policeSectorName: string | null;
  duplicateCount: number;
  hasLocationMismatch: boolean;
}

export const IncidentQueries = {
  /** Kejadian beserta laporan utama dan jumlah laporan ganda (UC-06 langkah 2–3). */
  async list(filter: IncidentFilter, scope: IncidentScope, db: SQL = sql): Promise<IncidentRow[]> {
    if (scope.none) return [];
    const status = filter.status ?? null;
    const districtId = filter.districtId ?? null;
    const sectorFilter = filter.policeSectorId ?? null;
    const from = filter.from ?? null;
    const to = filter.to ?? null;
    const scopeSector = scope.policeSectorId ?? null;
    const scopeAgency = scope.agencyId ?? null;
    return db`SELECT i.id AS "incidentId", i.is_open AS "isOpen", r.id AS "reportId", r.report_number AS "reportNumber",
        r.reported_at AS "reportedAt", r.received_at AS "receivedAt", r.current_status AS status,
        r.latitude, r.longitude, r.district_id AS "districtId", d.name AS "districtName",
        r.police_sector_id AS "policeSectorId", ps.name AS "policeSectorName",
        (SELECT count(*)::int FROM reports x WHERE x.incident_id = i.id AND x.id <> r.id) AS "duplicateCount",
        r.has_location_mismatch AS "hasLocationMismatch"
      FROM incidents i
      JOIN reports r ON r.id = i.primary_report_id
      JOIN districts d ON d.id = r.district_id
      LEFT JOIN police_sectors ps ON ps.id = r.police_sector_id
      WHERE (${status}::report_status IS NULL OR r.current_status = ${status}::report_status)
        AND (${districtId}::uuid IS NULL OR r.district_id = ${districtId}::uuid)
        AND (${sectorFilter}::uuid IS NULL OR r.police_sector_id = ${sectorFilter}::uuid)
        AND (${from}::date IS NULL OR r.reported_at >= (${from}::date)::timestamp AT TIME ZONE 'Asia/Jakarta')
        AND (${to}::date IS NULL OR r.reported_at < ((${to}::date) + 1)::timestamp AT TIME ZONE 'Asia/Jakarta')
        AND (${scopeSector}::uuid IS NULL OR r.police_sector_id = ${scopeSector}::uuid)
        AND (${scopeAgency}::uuid IS NULL OR EXISTS (SELECT 1 FROM dispatches dp WHERE dp.report_id = r.id AND dp.agency_id = ${scopeAgency}::uuid))
      ORDER BY r.received_at DESC
      LIMIT 500`;
  },

  async findForReport(reportId: string, db: SQL = sql): Promise<IncidentRow | null> {
    const [row] = await db`SELECT i.id FROM incidents i JOIN reports r ON r.incident_id = i.id WHERE r.id = ${reportId}`;
    if (!row) return null;
    const rows = await db`SELECT i.id AS "incidentId", i.is_open AS "isOpen", r.id AS "reportId", r.report_number AS "reportNumber",
        r.reported_at AS "reportedAt", r.received_at AS "receivedAt", r.current_status AS status,
        r.latitude, r.longitude, r.district_id AS "districtId", d.name AS "districtName",
        r.police_sector_id AS "policeSectorId", ps.name AS "policeSectorName",
        (SELECT count(*)::int FROM reports x WHERE x.incident_id = i.id AND x.id <> r.id) AS "duplicateCount",
        r.has_location_mismatch AS "hasLocationMismatch"
      FROM incidents i JOIN reports r ON r.id = i.primary_report_id
      JOIN districts d ON d.id = r.district_id LEFT JOIN police_sectors ps ON ps.id = r.police_sector_id
      WHERE i.id = ${row.id}`;
    return rows[0] ?? null;
  },
};

/** Instansi yang menerima Penerusan untuk Kejadian (cakupan siaran dasbor Petugas Instansi). */
export async function agencyIdsOf(incidentId: string, db: SQL = sql): Promise<string[]> {
  const rows = await db`SELECT d.agency_id AS id FROM dispatches d JOIN incidents i ON i.primary_report_id = d.report_id WHERE i.id = ${incidentId}`;
  return rows.map((r: { id: string }) => r.id);
}

export interface LockedIncident {
  incidentId: string;
  isOpen: boolean;
  primaryReportId: string;
  primaryReportNumber: string;
  status: ReportStatus;
  policeSectorId: string | null;
}

export interface IncidentMember {
  id: string;
  reportNumber: string;
  reporterId: string;
}

/** Operasi tulis pada Kejadian (Incident.applyStatus, Incident.close) di dalam transaksi. */
export const IncidentCommands = {
  /** Mengunci Kejadian milik Laporan (laporan utama atau ganda) agar pemeriksaan status dan perubahannya tidak bertabrakan (UC-07 4a). */
  async lockByReport(tx: SQL, reportId: string): Promise<LockedIncident | null> {
    const rows = await tx`SELECT i.id AS "incidentId", i.is_open AS "isOpen", p.id AS "primaryReportId",
        p.report_number AS "primaryReportNumber", p.current_status AS status, p.police_sector_id AS "policeSectorId"
      FROM reports r JOIN incidents i ON i.id = r.incident_id JOIN reports p ON p.id = i.primary_report_id
      WHERE r.id = ${reportId}
      FOR UPDATE OF i`;
    return rows[0] ?? null;
  },

  async members(tx: SQL, incidentId: string): Promise<IncidentMember[]> {
    return tx`SELECT id, report_number AS "reportNumber", reporter_id AS "reporterId"
      FROM reports WHERE incident_id = ${incidentId} ORDER BY received_at`;
  },

  /** Mengubah status laporan utama dan semua laporan ganda, satu entri Riwayat Status per Laporan. */
  async applyStatus(tx: SQL, incidentId: string, next: ReportStatus, actorId: string, note: string | null = null): Promise<IncidentMember[]> {
    const members = await this.members(tx, incidentId);
    await tx`UPDATE reports SET current_status = ${next} WHERE incident_id = ${incidentId}`;
    for (const m of members) {
      await tx`INSERT INTO status_histories (report_id, type, status, actor_id, note)
        VALUES (${m.id}, 'STATUS', ${next}, ${actorId}, ${note})`;
    }
    return members;
  },

  async close(tx: SQL, incidentId: string) {
    await tx`UPDATE incidents SET is_open = false, closed_at = now() WHERE id = ${incidentId} AND is_open`;
  },

  /** Perubahan status terakhir pada laporan utama (untuk pesan 409 "sudah diproses oleh ..."). */
  async lastStatusChange(tx: SQL, reportId: string): Promise<{ actorName: string | null; createdAt: Date } | null> {
    const rows = await tx`SELECT u.name AS "actorName", h.created_at AS "createdAt"
      FROM status_histories h LEFT JOIN users u ON u.id = h.actor_id
      WHERE h.report_id = ${reportId} AND h.type = 'STATUS'
      ORDER BY h.created_at DESC, h.id DESC LIMIT 1`;
    return rows[0] ?? null;
  },
};
