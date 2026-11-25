/**
 * DispatchService: UC-10 Meneruskan Laporan ke Instansi.
 */
import { sql } from "../db/client";
import { ApiError, validationError } from "../lib/errors";
import { STATUS_LABELS } from "../lib/status";
import { agencyIdsOf, IncidentCommands } from "../repositories/incident-repository";
import { StatusHistoryRepository } from "../repositories/report-repository";
import type { Viewer } from "./access";
import { registerCitizenDetailExtender } from "./citizen-view";
import { DashboardStream } from "./dashboard-stream";
import { NotificationService } from "./notification-service";
import { isUuid, registerDetailExtender, registerIncidentEnricher } from "./report-view";
import { lockOrNotFound } from "./verification-service";

/** Batas respons Instansi sebelum penanda "belum direspons" (FR-26, ASUMSI-18). */
export const RESPONSE_LIMIT_MIN = 60;
const NOTE_MAX = 500;
const DISPATCHABLE = ["VERIFIED", "ASSIGNED", "IN_PROGRESS"] as const;

export interface DispatchView {
  id: string;
  agency: { id: string; name: string };
  dispatchedAt: Date;
  dispatchedBy: string | null;
  note: string | null;
  confirmedAt: Date | null;
  confirmedBy: string | null;
  state: "WAITING" | "CONFIRMED";
  stateLabel: string;
}

export const Agencies = {
  async list() {
    return sql`SELECT id, name, type FROM agencies ORDER BY name`;
  },
};

export const DispatchQueries = {
  /** Penerusan untuk Kejadian (disimpan pada laporan utama). */
  async forIncident(incidentId: string): Promise<DispatchView[]> {
    const rows = await sql`SELECT d.id, a.id AS "agencyId", a.name AS "agencyName", d.dispatched_at AS "dispatchedAt",
        ub.name AS "dispatchedBy", d.note, d.confirmed_at AS "confirmedAt", uc.name AS "confirmedBy"
      FROM dispatches d
      JOIN incidents i ON i.primary_report_id = d.report_id
      JOIN agencies a ON a.id = d.agency_id
      LEFT JOIN users ub ON ub.id = d.dispatched_by
      LEFT JOIN users uc ON uc.id = d.confirmed_by
      WHERE i.id = ${incidentId}
      ORDER BY d.dispatched_at, a.name`;
    return rows.map((r: any) => ({
      id: r.id,
      agency: { id: r.agencyId, name: r.agencyName },
      dispatchedAt: r.dispatchedAt,
      dispatchedBy: r.dispatchedBy,
      note: r.note,
      confirmedAt: r.confirmedAt,
      confirmedBy: r.confirmedBy,
      state: r.confirmedAt ? "CONFIRMED" : "WAITING",
      stateLabel: r.confirmedAt ? "sudah dikonfirmasi" : "menunggu konfirmasi",
    }));
  },

  /** FR-26: Kejadian berstatus Petugas Ditugaskan yang belum dikonfirmasi Instansi mana pun ≥ 60 menit sejak Penerusan pertama. */
  async overdueIncidents(incidentIds: string[]): Promise<Set<string>> {
    if (incidentIds.length === 0) return new Set();
    const rows = await sql`SELECT i.id FROM incidents i
      JOIN reports p ON p.id = i.primary_report_id
      JOIN dispatches d ON d.report_id = p.id
      WHERE i.id IN ${sql(incidentIds)} AND p.current_status = 'ASSIGNED'
      GROUP BY i.id
      HAVING count(d.confirmed_at) = 0 AND min(d.dispatched_at) <= now() - make_interval(mins => ${RESPONSE_LIMIT_MIN})`;
    return new Set(rows.map((r: { id: string }) => r.id));
  },
};

export const DispatchService = {
  /** UC-10 langkah 3–5 dan alternate 3a, 3b. */
  async dispatch(admin: Viewer, reportId: string, body: Record<string, unknown>) {
    const raw = Array.isArray(body.agencyIds) ? body.agencyIds : [];
    const agencyIds = [...new Set(raw.filter((x): x is string => typeof x === "string" && x.length > 0))];
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (agencyIds.length === 0) throw validationError({ agencyIds: "Pilih minimal satu instansi" });
    if (!agencyIds.every(isUuid)) throw validationError({ agencyIds: "Instansi tidak dikenal" });
    if (note.length > NOTE_MAX) throw validationError({ note: `Catatan maksimal ${NOTE_MAX} karakter` });
    const agencies = await sql`SELECT id, name FROM agencies WHERE id IN ${sql(agencyIds)} ORDER BY name`;
    if (agencies.length !== agencyIds.length) throw validationError({ agencyIds: "Instansi tidak dikenal" });

    const result = await sql.begin(async (tx) => {
      const incident = await lockOrNotFound(tx, reportId);
      if (!(DISPATCHABLE as readonly string[]).includes(incident.status)) {
        throw new ApiError(409, "INVALID_STATUS", `Laporan berstatus ${STATUS_LABELS[incident.status]} tidak dapat diteruskan; verifikasi laporan lebih dulu`, undefined, {
          currentStatus: incident.status,
        });
      }
      // 3b: Instansi yang sudah pernah diteruskan dilewati.
      const existing = new Set(
        (await tx`SELECT agency_id FROM dispatches WHERE report_id = ${incident.primaryReportId}`).map((r: { agency_id: string }) => r.agency_id),
      );
      const added = agencies.filter((a: { id: string }) => !existing.has(a.id)) as { id: string; name: string }[];
      const skipped = agencies.filter((a: { id: string }) => existing.has(a.id)) as { id: string; name: string }[];
      if (added.length === 0) {
        throw new ApiError(409, "ALREADY_DISPATCHED", "Semua instansi yang dipilih sudah menerima penerusan", undefined, {
          skippedAgencies: skipped.map((a) => a.name),
        });
      }
      for (const a of added) {
        await tx`INSERT INTO dispatches (report_id, agency_id, dispatched_by, note) VALUES (${incident.primaryReportId}, ${a.id}, ${admin.id}, ${note || null})`;
      }
      const names = added.map((a) => a.name).join(", ");
      const historyNote = `Diteruskan ke ${names}${note ? `. Catatan: ${note}` : ""}`;
      let statusChanged = false;
      if (incident.status === "VERIFIED") {
        const members = await IncidentCommands.applyStatus(tx, incident.incidentId, "ASSIGNED", admin.id, historyNote);
        statusChanged = true;
        for (const m of members) {
          await NotificationService.send(tx, [m.reporterId], `Laporan ${m.reportNumber}: petugas ditugaskan`,
            `Laporan Anda diteruskan ke ${names} oleh ${admin.name}.`, m.id);
        }
      } else {
        await StatusHistoryRepository.record(tx, {
          reportId: incident.primaryReportId, type: "ACTIVITY", status: null, activity: "AGENCY_ADDED", actorId: admin.id,
          note: `Instansi ditambahkan: ${names}${note ? `. Catatan: ${note}` : ""}`,
        });
      }
      const officers = (await tx`SELECT id FROM users WHERE is_active AND role = 'AGENCY_OFFICER' AND agency_id IN ${tx(added.map((a) => a.id))}`).map(
        (r: { id: string }) => r.id,
      );
      await NotificationService.send(tx, officers, `Penugasan baru: laporan ${incident.primaryReportNumber}`,
        `Admin Polres meneruskan laporan karhutla ke instansi Anda${note ? `. Catatan: ${note}` : ""}. Mohon konfirmasi penugasan.`, incident.primaryReportId);
      return { incident, added, skipped, statusChanged };
    });
    DashboardStream.broadcast({
      event: "incident-updated", incidentId: result.incident.incidentId, reportId: result.incident.primaryReportId,
      policeSectorId: result.incident.policeSectorId, agencyIds: await agencyIdsOf(result.incident.incidentId),
    });
    const status = result.statusChanged ? "ASSIGNED" : result.incident.status;
    return {
      message: result.skipped.length
        ? `Diteruskan ke ${result.added.map((a) => a.name).join(", ")}; ${result.skipped.map((a) => a.name).join(", ")} sudah menerima penerusan sebelumnya`
        : `Laporan diteruskan ke ${result.added.map((a) => a.name).join(", ")}`,
      report: { id: result.incident.primaryReportId, status, statusLabel: STATUS_LABELS[status] },
      addedAgencies: result.added.map((a) => a.name),
      skippedAgencies: result.skipped.map((a) => a.name),
      dispatches: await DispatchQueries.forIncident(result.incident.incidentId),
    };
  },
};

// UC-10 6a: penanda "belum direspons" di Dasbor Laporan Admin Polres.
registerIncidentEnricher(async (viewer, rows) => {
  const overdue = viewer.role === "ADMIN" ? await DispatchQueries.overdueIncidents(rows.map((r) => r.incidentId)) : new Set<string>();
  return new Map(rows.map((r) => [r.incidentId, { isOverdue: overdue.has(r.incidentId) }]));
});
// UC-10 langkah 6: Instansi penerima dan tandanya di Halaman Detail Laporan.
registerDetailExtender(async (viewer, report) => {
  const dispatches = await DispatchQueries.forIncident(report.incidentId);
  const isOverdue = viewer.role === "ADMIN" && (await DispatchQueries.overdueIncidents([report.incidentId])).has(report.incidentId);
  return { dispatches, isOverdue };
});
// UC-05 / FR-16: Warga melihat Instansi yang menangani, tanpa posisi tim.
registerCitizenDetailExtender(async (report) => {
  const dispatches = await DispatchQueries.forIncident(report.incidentId);
  return { handlingAgencies: dispatches.map((d) => ({ name: d.agency.name, confirmed: d.state === "CONFIRMED" })) };
});
