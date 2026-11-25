/**
 * Bagian baca dari ReportService: daftar Kejadian (UC-06) dan detail Laporan (UC-06, UC-05).
 */
import { join } from "node:path";
import { config } from "../config";
import { sql } from "../db/client";
import { ApiError, validationError, type FieldErrors } from "../lib/errors";
import { STATUS_LABELS, isReportStatus } from "../lib/status";
import { IncidentQueries, type IncidentFilter, type IncidentRow, type IncidentScope } from "../repositories/incident-repository";
import { ReportRepository, type ReportRow } from "../repositories/report-repository";
import { canView, forbidden, notFound, type Viewer } from "./access";
import { FirmsClient } from "./firms-client";
import { roundForDisplay } from "./geo";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export function scopeFor(viewer: Viewer): IncidentScope {
  if (viewer.role === "ADMIN") return {};
  if (viewer.role === "SECTOR_OPERATOR") return { policeSectorId: viewer.policeSectorId };
  // Petugas Instansi: Laporan yang diteruskan ke Instansinya; Penerusan baru ada di UC-10.
  return { none: true };
}

export function parseIncidentFilter(q: Record<string, string | undefined>): IncidentFilter {
  const errors: FieldErrors = {};
  const filter: IncidentFilter = {};
  if (q.status) {
    if (isReportStatus(q.status)) filter.status = q.status;
    else errors.status = "Status tidak dikenal";
  }
  for (const key of ["districtId", "policeSectorId"] as const) {
    if (q[key]) {
      if (isUuid(q[key])) filter[key] = q[key];
      else errors[key] = "Pilihan wilayah tidak valid";
    }
  }
  for (const key of ["from", "to"] as const) {
    if (q[key]) {
      if (DATE.test(q[key]!) && !Number.isNaN(new Date(q[key]!).getTime())) filter[key] = q[key];
      else errors[key] = "Tanggal harus berformat YYYY-MM-DD";
    }
  }
  if (filter.from && filter.to && filter.from > filter.to) errors.to = "Tanggal akhir tidak boleh sebelum tanggal awal";
  if (Object.keys(errors).length) throw validationError(errors);
  return filter;
}

export function toIncidentItem(row: IncidentRow, extra: Record<string, unknown> = {}) {
  return {
    incidentId: row.incidentId,
    isOpen: row.isOpen,
    reportId: row.reportId,
    reportNumber: row.reportNumber,
    reportedAt: row.reportedAt,
    receivedAt: row.receivedAt,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status],
    latitude: row.latitude,
    longitude: row.longitude,
    district: { id: row.districtId, name: row.districtName },
    policeSector: row.policeSectorId ? { id: row.policeSectorId, name: row.policeSectorName } : null,
    duplicateCount: row.duplicateCount,
    hasLocationMismatch: row.hasLocationMismatch,
    ...extra,
  };
}

export type IncidentItem = ReturnType<typeof toIncidentItem>;

/** Penambah data per Kejadian dari iterasi berikutnya (siaga Polsek, belum direspons). */
type Enricher = (viewer: Viewer, rows: IncidentRow[]) => Promise<Map<string, Record<string, unknown>>>;
const enrichers: Enricher[] = [];
export const registerIncidentEnricher = (e: Enricher) => enrichers.push(e);

async function enrich(viewer: Viewer, rows: IncidentRow[]): Promise<IncidentItem[]> {
  const maps = await Promise.all(enrichers.map((e) => e(viewer, rows)));
  return rows.map((row) => toIncidentItem(row, Object.assign({}, ...maps.map((m) => m.get(row.incidentId) ?? {}))));
}

export async function listIncidents(viewer: Viewer, filter: IncidentFilter): Promise<IncidentItem[]> {
  if (viewer.role === "CITIZEN") throw forbidden();
  return enrich(viewer, await IncidentQueries.list(filter, scopeFor(viewer)));
}

export async function incidentItemForReport(viewer: Viewer, reportId: string): Promise<IncidentItem | null> {
  const row = await IncidentQueries.findForReport(reportId);
  return row ? (await enrich(viewer, [row]))[0] : null;
}

/** Laporan yang boleh dilihat pengguna, atau 404/403. */
export async function findViewableReport(viewer: Viewer, id: string): Promise<ReportRow> {
  if (!isUuid(id)) throw notFound();
  const report = await ReportRepository.findById(id);
  if (!report) throw notFound();
  if (!(await canView(viewer, report))) throw forbidden();
  return report;
}

export interface HistoryEntry {
  id: string;
  type: "STATUS" | "ACTIVITY";
  status: string | null;
  statusLabel: string | null;
  activity: string | null;
  note: string | null;
  actorName: string | null;
  actorRole: string | null;
  createdAt: Date;
}

export async function historyOf(reportId: string): Promise<HistoryEntry[]> {
  const rows = await sql`SELECT h.id, h.type, h.status, NULL::text AS activity, h.note, h.created_at AS "createdAt",
      u.name AS "actorName", u.role AS "actorRole"
    FROM status_histories h LEFT JOIN users u ON u.id = h.actor_id
    WHERE h.report_id = ${reportId}
    ORDER BY h.created_at, h.id`;
  return rows.map((r: HistoryEntry) => ({ ...r, statusLabel: r.status ? STATUS_LABELS[r.status as keyof typeof STATUS_LABELS] : null }));
}

/** Penambah isi detail dari iterasi berikutnya (alasan penolakan, Penerusan, siaga Polsek). */
type DetailExtender = (viewer: Viewer, report: ReportRow) => Promise<Record<string, unknown>>;
const extenders: DetailExtender[] = [];
export const registerDetailExtender = (e: DetailExtender) => extenders.push(e);

/** UC-06 langkah 4: detail untuk petugas. */
export async function getDetail(viewer: Viewer, id: string) {
  const report = await findViewableReport(viewer, id);
  const [reporter] = await sql`SELECT name, phone_number AS "phoneNumber" FROM users WHERE id = ${report.reporterId}`;
  const duplicates = await sql`SELECT r.id, r.report_number AS "reportNumber", r.reported_at AS "reportedAt",
      r.current_status AS status, u.name AS "reporterName"
    FROM reports r JOIN users u ON u.id = r.reporter_id
    WHERE r.incident_id = ${report.incidentId} AND r.id <> ${report.id}
    ORDER BY r.received_at`;
  const showPhone = viewer.role === "ADMIN" || viewer.role === "SECTOR_OPERATOR"; // NFR-03
  const [incident] = await sql`SELECT is_open AS "isOpen", opened_at AS "openedAt", closed_at AS "closedAt" FROM incidents WHERE id = ${report.incidentId}`;
  const isPrimary = report.primaryReportId === report.id;
  const hotspots = viewer.role === "CITIZEN" ? null : await FirmsClient.hintFor({ latitude: report.latitude, longitude: report.longitude });
  const extra = Object.assign({}, ...(await Promise.all(extenders.map((e) => e(viewer, report)))));
  return {
    report: {
      id: report.id,
      reportNumber: report.reportNumber,
      status: report.currentStatus,
      statusLabel: STATUS_LABELS[report.currentStatus],
      photoUrl: `/api/reports/${report.id}/photo`,
      latitude: report.latitude,
      longitude: report.longitude,
      locationSource: report.locationSource,
      deviceCoordinate: report.deviceLat === null || report.deviceLng === null ? null : { latitude: report.deviceLat, longitude: report.deviceLng },
      gpsAccuracy: report.gpsAccuracy,
      photoCoordinate: report.photoLat === null || report.photoLng === null ? null : { latitude: report.photoLat, longitude: report.photoLng },
      photoCoordinateNote: report.photoLat === null ? "Koordinat foto tidak tersedia" : null,
      hasLocationMismatch: report.hasLocationMismatch,
      locationMismatchMeters: report.locationMismatchMeters === null ? null : roundForDisplay(report.locationMismatchMeters),
      locationMismatchNote: report.hasLocationMismatch ? "Selisih lokasi foto" : null,
      district: { id: report.districtId, name: report.districtName },
      policeSector: report.policeSectorId ? { id: report.policeSectorId, name: report.policeSectorName } : null,
      policeSectorNote: report.policeSectorId ? null : "Polsek belum ditentukan",
      reportedAt: report.reportedAt,
      receivedAt: report.receivedAt,
      description: report.description,
      reporter: { name: reporter.name, phoneNumber: showPhone ? reporter.phoneNumber : null },
      incident: { id: report.incidentId, isOpen: incident.isOpen, openedAt: incident.openedAt, closedAt: incident.closedAt },
      isDuplicate: !isPrimary,
      primaryReport: isPrimary ? null : { id: report.primaryReportId, reportNumber: report.primaryReportNumber },
      duplicates,
      history: await historyOf(report.id),
      ...extra,
    },
    hotspots,
  };
}

/** Berkas foto Laporan dengan hak akses yang sama dengan detail. */
export async function getPhoto(viewer: Viewer, id: string): Promise<Response> {
  const report = await findViewableReport(viewer, id);
  const file = Bun.file(join(config.uploadDir, report.photoPath));
  if (!(await file.exists())) throw new ApiError(404, "NOT_FOUND", "Foto tidak ditemukan");
  return new Response(file, { headers: { "Cache-Control": "private, max-age=3600" } });
}
