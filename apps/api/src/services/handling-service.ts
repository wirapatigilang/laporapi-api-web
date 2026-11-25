/**
 * HandlingService: UC-11 Memperbarui Status Penanganan (Petugas Instansi dan Operator Polsek).
 */
import type { SQL } from "bun";
import { sql } from "../db/client";
import { ApiError, validationError } from "../lib/errors";
import { isReportStatus, ReportStatusRules, STATUS_LABELS, type ReportStatus } from "../lib/status";
import { agencyIdsOf, IncidentCommands, type LockedIncident } from "../repositories/incident-repository";
import { StatusHistoryRepository } from "../repositories/report-repository";
import { forbidden, type Viewer } from "./access";
import { DashboardStream } from "./dashboard-stream";
import { NotificationService } from "./notification-service";
import { registerDetailExtender } from "./report-view";
import { lockOrNotFound } from "./verification-service";

const NOTE_MAX = 500;
const ACTIVITIES = ["CONFIRMED", "DEPARTED"] as const;
type HandlingActivity = (typeof ACTIVITIES)[number];

/** Penyelesaian (UC-12) didaftarkan oleh ResolutionService agar `nextStatus = RESOLVED` memakai aturan yang sama. */
type Resolver = (officer: Viewer, reportId: string) => Promise<unknown>;
let resolver: Resolver | null = null;
export const registerResolver = (r: Resolver) => (resolver = r);

interface OwnDispatch {
  id: string;
  agencyName: string;
  confirmedAt: Date | null;
}

async function ownDispatch(tx: SQL, incident: LockedIncident, agencyId: string | null): Promise<OwnDispatch | null> {
  if (!agencyId) return null;
  const rows = await tx`SELECT d.id, a.name AS "agencyName", d.confirmed_at AS "confirmedAt"
    FROM dispatches d JOIN agencies a ON a.id = d.agency_id
    WHERE d.report_id = ${incident.primaryReportId} AND d.agency_id = ${agencyId}
    FOR UPDATE OF d`;
  return rows[0] ?? null;
}

const transitionError = (from: ReportStatus, to: ReportStatus) =>
  new ApiError(409, "INVALID_TRANSITION",
    ReportStatusRules.isFinal(from)
      ? `Laporan sudah berstatus akhir (${STATUS_LABELS[from]})`
      : `Status hanya boleh maju satu tahap: dari ${STATUS_LABELS[from]} ke ${STATUS_LABELS[ReportStatusRules.next(from)!]}, bukan ${STATUS_LABELS[to]}`,
    undefined, { currentStatus: from });

async function broadcast(incident: LockedIncident) {
  DashboardStream.broadcast({
    event: "incident-updated", incidentId: incident.incidentId, reportId: incident.primaryReportId,
    policeSectorId: incident.policeSectorId, agencyIds: await agencyIdsOf(incident.incidentId),
  });
}

/** Konfirmasi Terima Tugas (langkah 3): tandai Penerusan dan catat kegiatan. */
async function confirmDispatch(tx: SQL, officer: Viewer, incident: LockedIncident, dispatch: OwnDispatch, note: string | null) {
  await tx`UPDATE dispatches SET confirmed_at = clock_timestamp(), confirmed_by = ${officer.id} WHERE id = ${dispatch.id}`;
  await StatusHistoryRepository.record(tx, {
    reportId: incident.primaryReportId, type: "ACTIVITY", status: null, activity: "DISPATCH_CONFIRMED", actorId: officer.id,
    note: note ? `${dispatch.agencyName}. ${note}` : dispatch.agencyName,
  });
  const members = await IncidentCommands.members(tx, incident.incidentId);
  for (const m of members) {
    await NotificationService.send(tx, [m.reporterId], `Laporan ${m.reportNumber}: ${dispatch.agencyName} menerima tugas`,
      `${dispatch.agencyName} sudah mengonfirmasi penugasan. Petugas: ${officer.name}.`, m.id);
  }
  await NotificationService.send(tx, await NotificationService.admins(tx), `${dispatch.agencyName} mengonfirmasi laporan ${incident.primaryReportNumber}`,
    `Penugasan dikonfirmasi oleh ${officer.name}.`, incident.primaryReportId);
}

export const HandlingService = {
  /** UC-11 langkah 2–6 dan alternate 1a, 2a, 2b, 4a, "kapan saja". */
  async update(user: Viewer, reportId: string, body: Record<string, unknown>) {
    if (user.role !== "AGENCY_OFFICER" && user.role !== "SECTOR_OPERATOR") throw forbidden();
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
    if (note && note.length > NOTE_MAX) throw validationError({ note: `Catatan maksimal ${NOTE_MAX} karakter` });
    const hasNext = body.nextStatus !== undefined && body.nextStatus !== null;
    const hasActivity = body.activity !== undefined && body.activity !== null;
    if (hasNext === hasActivity) throw validationError({ nextStatus: "Isi salah satu: nextStatus atau activity" });
    if (hasNext && !isReportStatus(body.nextStatus)) throw validationError({ nextStatus: "Status tidak dikenal" });
    if (hasActivity && !(ACTIVITIES as readonly unknown[]).includes(body.activity)) throw validationError({ activity: "Kegiatan tidak dikenal" });

    if (hasNext) {
      const next = body.nextStatus as ReportStatus;
      // Penyelesaian memakai aturan UC-12 (hanya Petugas Instansi yang menerima Penerusan).
      if (next === "RESOLVED" && resolver) {
        const incident = await sql.begin((tx) => lockOrNotFound(tx, reportId));
        if (!ReportStatusRules.canTransitionTo(incident.status, next)) throw transitionError(incident.status, next);
        return resolver(user, reportId);
      }
      return this.changeStatus(user, reportId, next, note);
    }
    return this.recordActivity(user, reportId, body.activity as HandlingActivity, note);
  },

  async changeStatus(user: Viewer, reportId: string, next: ReportStatus, note: string | null) {
    const result = await sql.begin(async (tx) => {
      const incident = await lockOrNotFound(tx, reportId);
      // Urutan pemeriksaan: maju satu tahap (409) → Petugas Ditugaskan hanya oleh Admin (403, 2b) → hak atas Laporan (403, 1a).
      if (!ReportStatusRules.canTransitionTo(incident.status, next)) throw transitionError(incident.status, next);
      if (next === "ASSIGNED") {
        throw new ApiError(403, "FORBIDDEN", "Status Petugas Ditugaskan hanya diberikan Admin Polres melalui penerusan ke instansi");
      }
      if (user.role !== "AGENCY_OFFICER" || next !== "IN_PROGRESS") throw forbidden();
      const dispatch = await ownDispatch(tx, incident, user.agencyId);
      if (!dispatch) throw forbidden();
      // Mulai Penanganan tanpa konfirmasi sebelumnya sekaligus mengonfirmasi Penerusan Instansinya.
      if (!dispatch.confirmedAt) await confirmDispatch(tx, user, incident, dispatch, null);
      const members = await IncidentCommands.applyStatus(tx, incident.incidentId, next, user.id, note ? `${dispatch.agencyName}. ${note}` : dispatch.agencyName);
      for (const m of members) {
        await NotificationService.send(tx, [m.reporterId], `Laporan ${m.reportNumber}: penanganan berlangsung`,
          `Tim ${dispatch.agencyName} mulai menangani kebakaran. Petugas: ${user.name}.`, m.id);
      }
      await NotificationService.send(tx, await NotificationService.admins(tx), `Laporan ${incident.primaryReportNumber}: penanganan berlangsung`,
        `${dispatch.agencyName} mulai menangani (${user.name}).`, incident.primaryReportId);
      return incident;
    });
    await broadcast(result);
    return { message: "Status menjadi Penanganan Berlangsung", report: { id: result.primaryReportId, status: next, statusLabel: STATUS_LABELS[next] } };
  },

  async recordActivity(user: Viewer, reportId: string, activity: HandlingActivity, note: string | null) {
    const result = await sql.begin(async (tx) => {
      const incident = await lockOrNotFound(tx, reportId);
      if (user.role === "SECTOR_OPERATOR") {
        // 4a: keberangkatan personel Polsek, juga sebelum verifikasi (ASUMSI-19).
        if (activity !== "DEPARTED") throw forbidden();
        if (!incident.policeSectorId || incident.policeSectorId !== user.policeSectorId) throw forbidden();
        if (ReportStatusRules.isFinal(incident.status)) {
          throw new ApiError(409, "FINAL_STATUS", `Laporan sudah berstatus akhir (${STATUS_LABELS[incident.status]}); keberangkatan tidak dapat dicatat`);
        }
        await StatusHistoryRepository.record(tx, {
          reportId: incident.primaryReportId, type: "ACTIVITY", status: null, activity: "SECTOR_PERSONNEL_DEPARTED", actorId: user.id, note,
        });
        return { incident, message: "Keberangkatan personel Polsek dicatat" };
      }
      const dispatch = await ownDispatch(tx, incident, user.agencyId);
      if (!dispatch) throw forbidden();
      if (incident.status !== "ASSIGNED" && incident.status !== "IN_PROGRESS") {
        throw new ApiError(409, "FINAL_STATUS", `Laporan berstatus ${STATUS_LABELS[incident.status]}; kegiatan tidak dapat dicatat`);
      }
      if (activity === "CONFIRMED") {
        if (dispatch.confirmedAt) throw new ApiError(409, "ALREADY_CONFIRMED", "Penugasan sudah dikonfirmasi");
        await confirmDispatch(tx, user, incident, dispatch, note);
        return { incident, message: "Penugasan dikonfirmasi" };
      }
      await StatusHistoryRepository.record(tx, {
        reportId: incident.primaryReportId, type: "ACTIVITY", status: null, activity: "TEAM_DEPARTED", actorId: user.id,
        note: note ? `${dispatch.agencyName}. ${note}` : dispatch.agencyName,
      });
      return { incident, message: "Keberangkatan tim dicatat" };
    });
    await broadcast(result.incident);
    return { message: result.message, report: { id: result.incident.primaryReportId, status: result.incident.status, statusLabel: STATUS_LABELS[result.incident.status] } };
  },
};

// Petugas Instansi melihat Penerusan Instansinya sendiri (untuk tombol Konfirmasi Terima Tugas).
registerDetailExtender(async (viewer, report) => {
  if (viewer.role !== "AGENCY_OFFICER" || !viewer.agencyId) return {};
  const [row] = await sql`SELECT d.id, d.confirmed_at AS "confirmedAt" FROM dispatches d JOIN incidents i ON i.primary_report_id = d.report_id
    WHERE i.id = ${report.incidentId} AND d.agency_id = ${viewer.agencyId}`;
  return { myDispatch: row ? { id: row.id, confirmed: !!row.confirmedAt, confirmedAt: row.confirmedAt } : null };
});
