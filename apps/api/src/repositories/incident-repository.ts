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
