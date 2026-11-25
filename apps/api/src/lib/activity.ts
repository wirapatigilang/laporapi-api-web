/** Jenis kegiatan pada Riwayat Status (StatusHistory.type = ACTIVITY). */
export type ActivityKind = "FIELD_CHECK_REQUESTED" | "SECTOR_STANDBY";

export const ACTIVITY_LABELS: Record<string, string> = {
  FIELD_CHECK_REQUESTED: "Permintaan cek lapangan",
  SECTOR_STANDBY: "Personel Polsek disiagakan",
};
