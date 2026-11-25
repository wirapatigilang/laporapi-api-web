/**
 * VerificationService: UC-07 Memverifikasi Laporan (dan UC-08 Menolak Laporan pada iterasi 6).
 */
import { sql } from "../db/client";
import { ApiError, validationError } from "../lib/errors";
import { STATUS_LABELS } from "../lib/status";
import { formatWib } from "../lib/time";
import { IncidentCommands, type LockedIncident } from "../repositories/incident-repository";
import { StatusHistoryRepository } from "../repositories/report-repository";
import type { Viewer } from "./access";
import { notFound } from "./access";
import { DashboardStream } from "./dashboard-stream";
import { NotificationService } from "./notification-service";
import { isUuid } from "./report-view";

const NOTE_MAX = 500;

export async function lockOrNotFound(tx: Parameters<typeof IncidentCommands.lockByReport>[0], reportId: string): Promise<LockedIncident> {
  if (!isUuid(reportId)) throw notFound();
  const incident = await IncidentCommands.lockByReport(tx, reportId);
  if (!incident) throw notFound();
  return incident;
}

/** 409 untuk Laporan yang sudah tidak berstatus Laporan Diterima (UC-07 4a). */
export async function alreadyProcessed(tx: Parameters<typeof IncidentCommands.lockByReport>[0], incident: LockedIncident): Promise<ApiError> {
  const last = await IncidentCommands.lastStatusChange(tx, incident.primaryReportId);
  const who = last?.actorName ?? "petugas lain";
  const when = last ? formatWib(last.createdAt) : "";
  return new ApiError(409, "ALREADY_PROCESSED", `Laporan sudah diproses oleh ${who} pada ${when}`.trim(), undefined, {
    currentStatus: incident.status,
    currentStatusLabel: STATUS_LABELS[incident.status],
  });
}

export const VerificationService = {
  /** UC-07 langkah 4–5. */
  async verify(admin: Viewer, reportId: string) {
    const result = await sql.begin(async (tx) => {
      const incident = await lockOrNotFound(tx, reportId);
      if (incident.status !== "RECEIVED") throw await alreadyProcessed(tx, incident);
      const members = await IncidentCommands.applyStatus(tx, incident.incidentId, "VERIFIED", admin.id);
      const title = `Laporan ${incident.primaryReportNumber} diverifikasi`;
      for (const m of members) {
        await NotificationService.send(tx, [m.reporterId], `Laporan ${m.reportNumber} diverifikasi`,
          `Laporan Anda sudah diverifikasi oleh ${admin.name} dan segera diteruskan ke instansi penanganan.`, m.id);
      }
      await NotificationService.send(tx, await NotificationService.sectorOperators(tx, incident.policeSectorId), title,
        `Laporan di wilayah Anda sudah diverifikasi oleh ${admin.name}.`, incident.primaryReportId);
      return incident;
    });
    DashboardStream.broadcast({ event: "incident-updated", incidentId: result.incidentId, reportId: result.primaryReportId, policeSectorId: result.policeSectorId });
    return { message: "Laporan diverifikasi", report: { id: result.primaryReportId, reportNumber: result.primaryReportNumber, status: "VERIFIED", statusLabel: STATUS_LABELS.VERIFIED } };
  },

  /** UC-07 alternate 1a: permintaan cek lapangan ke Operator Polsek, tanpa mengubah status. */
  async requestFieldCheck(admin: Viewer, reportId: string, body: Record<string, unknown>) {
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (!note) throw validationError({ note: "Catatan cek lapangan wajib diisi" });
    if (note.length > NOTE_MAX) throw validationError({ note: `Catatan maksimal ${NOTE_MAX} karakter` });
    const result = await sql.begin(async (tx) => {
      const incident = await lockOrNotFound(tx, reportId);
      if (incident.status !== "RECEIVED") throw await alreadyProcessed(tx, incident);
      await StatusHistoryRepository.record(tx, {
        reportId: incident.primaryReportId, type: "ACTIVITY", status: null, activity: "FIELD_CHECK_REQUESTED", actorId: admin.id, note,
      });
      const notified = await NotificationService.send(tx, await NotificationService.sectorOperators(tx, incident.policeSectorId),
        `Mohon cek lapangan laporan ${incident.primaryReportNumber}`, note, incident.primaryReportId);
      return { incident, notified };
    });
    return {
      message: result.notified > 0 ? "Permintaan cek lapangan dikirim ke Operator Polsek" : "Permintaan cek lapangan dicatat; Polsek belum ditentukan",
      notifiedOperators: result.notified,
    };
  },
};
