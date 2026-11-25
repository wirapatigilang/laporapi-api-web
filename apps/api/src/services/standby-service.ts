/**
 * StandbyService: UC-09 Menyiagakan Personel Polsek.
 */
import { sql } from "../db/client";
import { ApiError, validationError } from "../lib/errors";
import { agencyIdsOf, IncidentCommands } from "../repositories/incident-repository";
import { StatusHistoryRepository } from "../repositories/report-repository";
import { forbidden, notFound, type Viewer } from "./access";
import { DashboardStream } from "./dashboard-stream";
import { isUuid, registerDetailExtender, registerIncidentEnricher } from "./report-view";

const NOTE_MAX = 500;

export const StandbyService = {
  /** UC-09 langkah 2–4 dan alternate 2a, 2b. */
  async standby(operator: Viewer, reportId: string, body: Record<string, unknown>) {
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (note.length > NOTE_MAX) throw validationError({ note: `Catatan maksimal ${NOTE_MAX} karakter` });
    if (!isUuid(reportId)) throw notFound();
    const result = await sql.begin(async (tx) => {
      const incident = await IncidentCommands.lockByReport(tx, reportId);
      if (!incident) throw notFound();
      // 2b: hanya Laporan di wilayah Polsek milik Operator.
      if (!incident.policeSectorId || incident.policeSectorId !== operator.policeSectorId) throw forbidden();
      // 2a: Laporan yang sudah ditolak (dan tiket yang sudah selesai) tidak dapat disiagakan.
      if (incident.status === "REJECTED") throw new ApiError(409, "REPORT_REJECTED", "Laporan sudah ditolak");
      if (incident.status === "RESOLVED") throw new ApiError(409, "REPORT_RESOLVED", "Penanganan sudah selesai");
      await StatusHistoryRepository.record(tx, {
        reportId: incident.primaryReportId, type: "ACTIVITY", status: null, activity: "SECTOR_STANDBY", actorId: operator.id, note: note || null,
      });
      return incident;
    });
    DashboardStream.broadcast({ event: "incident-updated", incidentId: result.incidentId, reportId: result.primaryReportId, policeSectorId: result.policeSectorId, agencyIds: await agencyIdsOf(result.incidentId) });
    return { message: "Personel Polsek disiagakan", sectorStandby: true };
  },
};

type Standby = { at: Date; by: string | null; note: string | null };
async function standbyByIncident(incidentIds: string[]): Promise<Map<string, Standby>> {
  if (incidentIds.length === 0) return new Map();
  const rows = await sql`SELECT DISTINCT ON (r.incident_id) r.incident_id AS "incidentId", h.created_at AS at, u.name AS by, h.note
    FROM status_histories h JOIN reports r ON r.id = h.report_id LEFT JOIN users u ON u.id = h.actor_id
    WHERE h.activity = 'SECTOR_STANDBY' AND r.incident_id IN ${sql(incidentIds)}
    ORDER BY r.incident_id, h.created_at DESC`;
  return new Map(rows.map((r: any) => [r.incidentId as string, { at: r.at, by: r.by, note: r.note } as Standby]));
}

// UC-09 langkah 4: tanda "Polsek sudah siaga" pada Dasbor Laporan dan Halaman Detail Laporan.
registerIncidentEnricher(async (_viewer, rows) => {
  const map = await standbyByIncident(rows.map((r) => r.incidentId));
  return new Map(rows.map((r) => [r.incidentId, { sectorStandby: map.has(r.incidentId) }]));
});
registerDetailExtender(async (_viewer, report) => {
  const s = (await standbyByIncident([report.incidentId])).get(report.incidentId);
  return { sectorStandby: s ? { at: s.at, by: s.by, note: s.note } : null };
});
