/**
 * ReportStatus: enam status dan aturan maju satu tahap (AB-08, FR-29).
 * Dipakai bersama oleh UC-07, UC-08, UC-10, UC-11, dan UC-12.
 */
export type ReportStatus = "RECEIVED" | "VERIFIED" | "REJECTED" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED";

export const STATUS_LABELS: Record<ReportStatus, string> = {
  RECEIVED: "Laporan Diterima",
  VERIFIED: "Laporan Diverifikasi",
  REJECTED: "Laporan Ditolak",
  ASSIGNED: "Petugas Ditugaskan",
  IN_PROGRESS: "Penanganan Berlangsung",
  RESOLVED: "Penanganan Selesai",
};

export const REPORT_STATUSES = Object.keys(STATUS_LABELS) as ReportStatus[];
export const isReportStatus = (v: unknown): v is ReportStatus => typeof v === "string" && v in STATUS_LABELS;

/** Urutan utama; REJECTED adalah cabang dari RECEIVED. */
const MAIN_LINE: ReportStatus[] = ["RECEIVED", "VERIFIED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"];

export const ReportStatusRules = {
  /** Status berikutnya pada urutan utama, atau null untuk status akhir. */
  next(status: ReportStatus): ReportStatus | null {
    if (status === "REJECTED") return null;
    const i = MAIN_LINE.indexOf(status);
    return MAIN_LINE[i + 1] ?? null;
  },

  /** Hanya boleh maju satu tahap; Laporan Diterima juga boleh menjadi Laporan Ditolak. */
  canTransitionTo(from: ReportStatus, to: ReportStatus): boolean {
    if (from === "RECEIVED" && to === "REJECTED") return true;
    return this.next(from) === to;
  },

  isFinal(status: ReportStatus): boolean {
    return status === "REJECTED" || status === "RESOLVED";
  },
};
