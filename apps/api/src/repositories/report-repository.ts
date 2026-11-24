import type { SQL } from "bun";
import { sql } from "../db/client";
import type { ReportStatus } from "../lib/status";

export interface ReportRow {
  id: string;
  reportNumber: string;
  clientId: string | null;
  reporterId: string;
  incidentId: string;
  photoPath: string;
  deviceLat: number | null;
  deviceLng: number | null;
  gpsAccuracy: number | null;
  photoLat: number | null;
  photoLng: number | null;
  locationSource: "DEVICE" | "PHOTO";
  latitude: number;
  longitude: number;
  locationMismatchMeters: number | null;
  hasLocationMismatch: boolean;
  districtId: string;
  districtName: string;
  policeSectorId: string | null;
  policeSectorName: string | null;
  reportedAt: Date;
  receivedAt: Date;
  description: string | null;
  currentStatus: ReportStatus;
  primaryReportId: string;
  primaryReportNumber: string;
}

export type NewReport = Omit<ReportRow, "id" | "receivedAt" | "districtName" | "policeSectorName" | "primaryReportId" | "primaryReportNumber">;

const select = (db: SQL) => db`SELECT r.id, r.report_number AS "reportNumber", r.client_id AS "clientId",
    r.reporter_id AS "reporterId", r.incident_id AS "incidentId", r.photo_path AS "photoPath",
    r.device_lat AS "deviceLat", r.device_lng AS "deviceLng", r.gps_accuracy AS "gpsAccuracy",
    r.photo_lat AS "photoLat", r.photo_lng AS "photoLng", r.location_source AS "locationSource",
    r.latitude, r.longitude, r.location_mismatch_meters AS "locationMismatchMeters",
    r.has_location_mismatch AS "hasLocationMismatch", r.district_id AS "districtId", d.name AS "districtName",
    r.police_sector_id AS "policeSectorId", ps.name AS "policeSectorName", r.reported_at AS "reportedAt",
    r.received_at AS "receivedAt", r.description, r.current_status AS "currentStatus",
    i.primary_report_id AS "primaryReportId", pr.report_number AS "primaryReportNumber"
  FROM reports r
  JOIN districts d ON d.id = r.district_id
  LEFT JOIN police_sectors ps ON ps.id = r.police_sector_id
  JOIN incidents i ON i.id = r.incident_id
  JOIN reports pr ON pr.id = i.primary_report_id`;

export const ReportRepository = {
  async findById(id: string, db: SQL = sql): Promise<ReportRow | null> {
    const rows = await db`${select(db)} WHERE r.id = ${id}`;
    return rows[0] ?? null;
  },

  async findByClientId(reporterId: string, clientId: string): Promise<ReportRow | null> {
    const rows = await sql`${select(sql)} WHERE r.reporter_id = ${reporterId} AND r.client_id = ${clientId}`;
    return rows[0] ?? null;
  },

  async insert(tx: SQL, r: NewReport & { id: string }): Promise<void> {
    await tx`INSERT INTO reports (id, report_number, client_id, reporter_id, incident_id, photo_path,
        device_lat, device_lng, gps_accuracy, photo_lat, photo_lng, location_source, latitude, longitude,
        location_mismatch_meters, has_location_mismatch, district_id, police_sector_id, reported_at,
        description, current_status)
      VALUES (${r.id}, ${r.reportNumber}, ${r.clientId}, ${r.reporterId}, ${r.incidentId}, ${r.photoPath},
        ${r.deviceLat}, ${r.deviceLng}, ${r.gpsAccuracy}, ${r.photoLat}, ${r.photoLng}, ${r.locationSource},
        ${r.latitude}, ${r.longitude}, ${r.locationMismatchMeters}, ${r.hasLocationMismatch}, ${r.districtId},
        ${r.policeSectorId}, ${r.reportedAt}, ${r.description}, ${r.currentStatus})`;
  },
};

export interface OpenIncident {
  id: string;
  primaryReportId: string;
  primaryReportNumber: string;
  primaryStatus: ReportStatus;
  latitude: number;
  longitude: number;
}

export const IncidentRepository = {
  async listOpen(tx: SQL): Promise<OpenIncident[]> {
    return tx`SELECT i.id, i.primary_report_id AS "primaryReportId", r.report_number AS "primaryReportNumber",
        r.current_status AS "primaryStatus", r.latitude, r.longitude
      FROM incidents i JOIN reports r ON r.id = i.primary_report_id
      WHERE i.is_open`;
  },

  async create(tx: SQL, primaryReportId: string): Promise<string> {
    const [row] = await tx`INSERT INTO incidents (primary_report_id) VALUES (${primaryReportId}) RETURNING id`;
    return row.id;
  },
};

export const StatusHistoryRepository = {
  async record(tx: SQL, entry: { reportId: string; type: "STATUS" | "ACTIVITY"; status: ReportStatus | null; actorId: string | null; note?: string | null }) {
    await tx`INSERT INTO status_histories (report_id, type, status, actor_id, note)
      VALUES (${entry.reportId}, ${entry.type}, ${entry.status}, ${entry.actorId}, ${entry.note ?? null})`;
  },
};
