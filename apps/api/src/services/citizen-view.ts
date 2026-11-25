/**
 * Bagian baca untuk Warga: UC-05 Memantau Status Laporan (Layar Riwayat dan Detail Laporan di Android).
 */
import { sql } from "../db/client";
import { validationError } from "../lib/errors";
import { STATUS_LABELS, isReportStatus } from "../lib/status";
import type { ReportRow } from "../repositories/report-repository";
import type { Viewer } from "./access";
import { historyOf } from "./report-view";

/** Penambah isi Detail Laporan Warga dari iterasi berikutnya (mis. Instansi yang menangani pada UC-10). */
type CitizenExtender = (report: ReportRow) => Promise<Record<string, unknown>>;
const extenders: CitizenExtender[] = [];
export const registerCitizenDetailExtender = (e: CitizenExtender) => extenders.push(e);

/** UC-05 langkah 1–2: daftar Laporan milik Warga, terbaru lebih dulu, dapat disaring menurut status. */
export async function listMine(citizen: Viewer, query: Record<string, string | undefined>) {
  const status = query.status && query.status !== "ALL" ? query.status : null;
  if (status && !isReportStatus(status)) throw validationError({ status: "Status tidak dikenal" });
  const rows = await sql`SELECT r.id, r.report_number AS "reportNumber", r.reported_at AS "reportedAt",
      r.received_at AS "receivedAt", d.name AS "districtName", r.current_status AS status,
      (i.primary_report_id <> r.id) AS "isDuplicate", p.report_number AS "primaryReportNumber"
    FROM reports r
    JOIN districts d ON d.id = r.district_id
    JOIN incidents i ON i.id = r.incident_id
    JOIN reports p ON p.id = i.primary_report_id
    WHERE r.reporter_id = ${citizen.id}
      AND (${status}::report_status IS NULL OR r.current_status = ${status}::report_status)
    ORDER BY r.received_at DESC, r.report_number DESC`;
  return {
    reports: rows.map((r: any) => ({
      id: r.id,
      reportNumber: r.reportNumber,
      reportedAt: r.reportedAt,
      receivedAt: r.receivedAt,
      district: { name: r.districtName },
      photoUrl: `/api/reports/${r.id}/photo`,
      status: r.status,
      statusLabel: STATUS_LABELS[r.status as keyof typeof STATUS_LABELS],
      isDuplicate: r.isDuplicate,
      primaryReportNumber: r.isDuplicate ? r.primaryReportNumber : null,
    })),
  };
}

/** UC-05 langkah 3, 3a, 3c: Detail Laporan untuk pemiliknya (tanpa data pelapor lain dan tanpa posisi tim). */
export async function citizenDetail(report: ReportRow) {
  const history = (await historyOf(report.id))
    .filter((h) => h.type === "STATUS")
    .map((h) => ({ status: h.status, statusLabel: h.statusLabel, actorName: h.actorName, note: h.note, createdAt: h.createdAt }));
  let rejection = null;
  if (report.currentStatus === "REJECTED") {
    const [row] = await sql`SELECT rr.code, rr.label, r.rejection_note AS note
      FROM reports r JOIN rejection_reasons rr ON rr.id = r.rejection_reason_id WHERE r.id = ${report.id}`;
    rejection = row ? { code: row.code, reason: row.label, note: row.note } : null;
  }
  const isDuplicate = report.primaryReportId !== report.id;
  const extra = Object.assign({}, ...(await Promise.all(extenders.map((e) => e(report)))));
  return {
    report: {
      id: report.id,
      reportNumber: report.reportNumber,
      status: report.currentStatus,
      statusLabel: STATUS_LABELS[report.currentStatus],
      photoUrl: `/api/reports/${report.id}/photo`,
      latitude: report.latitude,
      longitude: report.longitude,
      district: { name: report.districtName },
      policeSector: report.policeSectorName ? { name: report.policeSectorName } : null,
      reportedAt: report.reportedAt,
      receivedAt: report.receivedAt,
      description: report.description,
      isDuplicate,
      primaryReportNumber: isDuplicate ? report.primaryReportNumber : null,
      duplicateNote: isDuplicate ? `Tergabung dengan laporan #${report.primaryReportNumber}` : null,
      rejection,
      history,
      ...extra,
    },
    hotspots: null,
  };
}
