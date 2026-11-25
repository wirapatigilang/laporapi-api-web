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
