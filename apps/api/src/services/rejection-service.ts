/**
 * RejectionService: UC-08 Menolak Laporan.
 */
import { sql } from "../db/client";
import { validationError, type FieldErrors } from "../lib/errors";
import { ReportStatusRules, STATUS_LABELS } from "../lib/status";
import { agencyIdsOf, IncidentCommands } from "../repositories/incident-repository";
import type { Viewer } from "./access";
import { DashboardStream } from "./dashboard-stream";
import { NotificationService } from "./notification-service";
import { isUuid, registerDetailExtender } from "./report-view";
import { alreadyProcessed, lockOrNotFound } from "./verification-service";

const NOTE_MAX = 500;

export interface RejectionReason {
  id: string;
  code: string;
  label: string;
  requiresNote: boolean;
}

export const RejectionReasons = {
  async list(): Promise<RejectionReason[]> {
    return sql`SELECT id, code, label, requires_note AS "requiresNote" FROM rejection_reasons ORDER BY sort_order`;
  },
  async find(id: string): Promise<RejectionReason | null> {
    const rows = await sql`SELECT id, code, label, requires_note AS "requiresNote" FROM rejection_reasons WHERE id = ${id}`;
    return rows[0] ?? null;
  },
};

export const RejectionService = {
  /** UC-08 langkah 3–5 dan alternate 3a, 3b, 4a. Berlaku untuk semua status yang belum akhir. */
  async reject(admin: Viewer, reportId: string, body: Record<string, unknown>) {
    const errors: FieldErrors = {};
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const reason = isUuid(body.reasonId) ? await RejectionReasons.find(body.reasonId) : null;
    if (!body.reasonId) errors.reasonId = "Pilih alasan penolakan";
    else if (!reason) errors.reasonId = "Alasan penolakan tidak dikenal";
    else if (reason.requiresNote && !note) errors.note = "Catatan wajib diisi untuk alasan Lainnya";
    if (note.length > NOTE_MAX) errors.note = `Catatan maksimal ${NOTE_MAX} karakter`;
    if (Object.keys(errors).length) throw validationError(errors);

    const result = await sql.begin(async (tx) => {
      const incident = await lockOrNotFound(tx, reportId);
      // Admin Polres boleh menolak selama Laporan belum berstatus akhir (masukan dosen 25 Nov 2026).
      if (ReportStatusRules.isFinal(incident.status)) throw await alreadyProcessed(tx, incident);
      // Alasan disimpan lebih dulu: CHECK reports_rejection_check mensyaratkan alasan pada setiap Laporan Ditolak.
      await tx`UPDATE reports SET rejection_reason_id = ${reason!.id}, rejection_note = ${note || null} WHERE incident_id = ${incident.incidentId}`;
      const members = await IncidentCommands.applyStatus(tx, incident.incidentId, "REJECTED", admin.id, note || null);
      await IncidentCommands.close(tx, incident.incidentId);
      const reasonText = note ? `${reason!.label} (${note})` : reason!.label;
      for (const m of members) {
        await NotificationService.send(tx, [m.reporterId], `Laporan ${m.reportNumber} ditolak`, `Alasan: ${reasonText}.`, m.id);
      }
      await NotificationService.send(tx, await NotificationService.sectorOperators(tx, incident.policeSectorId),
        `Laporan ${incident.primaryReportNumber} ditolak`, `Laporan ditolak Admin Polres (alasan: ${reasonText}). Penyiagaan personel dapat dihentikan.`,
        incident.primaryReportId);
      // Penolakan setelah diteruskan: Petugas Instansi penerima ikut diberi tahu agar penanganan dihentikan.
      const agencyOfficers = (await tx`SELECT u.id FROM users u JOIN dispatches d ON d.agency_id = u.agency_id
        WHERE d.report_id = ${incident.primaryReportId} AND u.is_active AND u.role = 'AGENCY_OFFICER'`).map((r: { id: string }) => r.id);
      await NotificationService.send(tx, agencyOfficers, `Laporan ${incident.primaryReportNumber} ditolak`,
        `Laporan ditolak Admin Polres (alasan: ${reasonText}). Penanganan dihentikan.`, incident.primaryReportId);
      return incident;
    });
    DashboardStream.broadcast({ event: "incident-updated", incidentId: result.incidentId, reportId: result.primaryReportId, policeSectorId: result.policeSectorId, agencyIds: await agencyIdsOf(result.incidentId) });
    return {
      message: "Laporan ditolak",
      report: { id: result.primaryReportId, reportNumber: result.primaryReportNumber, status: "REJECTED", statusLabel: STATUS_LABELS.REJECTED, rejection: { reason: reason!.label, note: note || null } },
    };
  },
};

// Detail Laporan memuat alasan penolakan (UC-08 langkah 6, UC-05).
registerDetailExtender(async (_viewer, report) => {
  if (report.currentStatus !== "REJECTED") return { rejection: null };
  const [row] = await sql`SELECT rr.code, rr.label, r.rejection_note AS note
    FROM reports r JOIN rejection_reasons rr ON rr.id = r.rejection_reason_id WHERE r.id = ${report.id}`;
  return { rejection: row ? { code: row.code, reason: row.label, note: row.note } : null };
});
