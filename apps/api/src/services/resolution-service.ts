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
    // 1b: hanya Petugas Instansi (ASUMSI-21).
    if (officer.role !== "AGENCY_OFFICER") throw forbidden();
    const result = await sql.begin(async (tx) => {
      const incident = await lockOrNotFound(tx, reportId);
      // 1a: hanya dari Penanganan Berlangsung (pemeriksaan status lebih dulu, seperti UC-11).
      if (incident.status !== "IN_PROGRESS") {
        throw new ApiError(409, "INVALID_TRANSITION",
          incident.status === "RESOLVED" ? "Penanganan sudah selesai" : `Laporan berstatus ${STATUS_LABELS[incident.status]}; penanganan belum berlangsung`,
          undefined, { currentStatus: incident.status });
      }
      const [dispatch] = await tx`SELECT a.name FROM dispatches d JOIN agencies a ON a.id = d.agency_id
        WHERE d.report_id = ${incident.primaryReportId} AND d.agency_id = ${officer.agencyId}`;
      if (!dispatch) throw forbidden();
      const members = await IncidentCommands.applyStatus(tx, incident.incidentId, "RESOLVED", officer.id, dispatch.name);
      await IncidentCommands.close(tx, incident.incidentId);
      for (const m of members) {
        await NotificationService.send(tx, [m.reporterId], `Laporan ${m.reportNumber} selesai, api sudah padam`,
          `Penanganan oleh ${dispatch.name} selesai. Petugas: ${officer.name}. Terima kasih atas laporan Anda.`, m.id);
      }
      const staff = [...(await NotificationService.admins(tx)), ...(await NotificationService.sectorOperators(tx, incident.policeSectorId))];
      await NotificationService.send(tx, staff, `Laporan ${incident.primaryReportNumber} selesai, api sudah padam`,
        `Penanganan dinyatakan selesai oleh ${officer.name} (${dispatch.name}).`, incident.primaryReportId);
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
