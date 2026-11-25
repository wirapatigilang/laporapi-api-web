/**
 * ResolutionService: UC-12 Menyatakan Penanganan Selesai.
 */
import { sql } from "../db/client";
import { ApiError } from "../lib/errors";
import { STATUS_LABELS } from "../lib/status";
import { agencyIdsOf, IncidentCommands } from "../repositories/incident-repository";
import { forbidden, type Viewer } from "./access";
import { DashboardStream } from "./dashboard-stream";
import { registerResolver } from "./handling-service";
import { NotificationService } from "./notification-service";
import { lockOrNotFound } from "./verification-service";

export const ResolutionService = {
  /** UC-12 langkah 3–5 dan alternate 1a, 1b. Tanpa catatan penyelesaian (ASUMSI-20). */
  async markResolved(officer: Viewer, reportId: string) {
    // 1b: hanya Admin Polres yang menyatakan selesai (masukan dosen 25 Nov 2026; sebelumnya Petugas Instansi).
    if (officer.role !== "ADMIN") throw forbidden();
    const result = await sql.begin(async (tx) => {
      const incident = await lockOrNotFound(tx, reportId);
      // 1a: hanya dari Penanganan Berlangsung (pemeriksaan status lebih dulu, seperti UC-11).
      if (incident.status !== "IN_PROGRESS") {
        throw new ApiError(409, "INVALID_TRANSITION",
          incident.status === "RESOLVED" ? "Penanganan sudah selesai" : `Laporan berstatus ${STATUS_LABELS[incident.status]}; penanganan belum berlangsung`,
          undefined, { currentStatus: incident.status });
      }
      const agencyRows = await tx`SELECT a.name, a.id FROM dispatches d JOIN agencies a ON a.id = d.agency_id
        WHERE d.report_id = ${incident.primaryReportId} ORDER BY a.name`;
      const agencyNames = agencyRows.map((r: { name: string }) => r.name).join(", ");
      const members = await IncidentCommands.applyStatus(tx, incident.incidentId, "RESOLVED", officer.id, agencyNames ? `Ditangani ${agencyNames}` : null);
      await IncidentCommands.close(tx, incident.incidentId);
      for (const m of members) {
        await NotificationService.send(tx, [m.reporterId], `Laporan ${m.reportNumber} selesai, api sudah padam`,
          `Penanganan${agencyNames ? ` oleh ${agencyNames}` : ""} dinyatakan selesai oleh Admin Polres. Terima kasih atas laporan Anda.`, m.id);
      }
      const agencyOfficers = (await tx`SELECT id FROM users WHERE is_active AND role = 'AGENCY_OFFICER'
        AND agency_id IN (SELECT agency_id FROM dispatches WHERE report_id = ${incident.primaryReportId})`).map((r: { id: string }) => r.id);
      const staff = [...(await NotificationService.admins(tx)), ...(await NotificationService.sectorOperators(tx, incident.policeSectorId)), ...agencyOfficers]
        .filter((id) => id !== officer.id);
      await NotificationService.send(tx, staff, `Laporan ${incident.primaryReportNumber} selesai, api sudah padam`,
        `Penanganan dinyatakan selesai oleh ${officer.name} (Admin Polres).`, incident.primaryReportId);
      return incident;
    });
    DashboardStream.broadcast({
      event: "incident-updated", incidentId: result.incidentId, reportId: result.primaryReportId,
      policeSectorId: result.policeSectorId, agencyIds: await agencyIdsOf(result.incidentId),
    });
    return { message: "Penanganan selesai", report: { id: result.primaryReportId, status: "RESOLVED", statusLabel: STATUS_LABELS.RESOLVED } };
  },
};

// `POST /api/reports/:id/status {nextStatus: RESOLVED}` (UC-11) memakai aturan yang sama.
registerResolver((officer, reportId) => ResolutionService.markResolved(officer, reportId));
