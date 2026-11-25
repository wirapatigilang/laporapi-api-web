/** Jenis kegiatan pada Riwayat Status (StatusHistory.type = ACTIVITY). */
export type ActivityKind =
  | "FIELD_CHECK_REQUESTED"
  | "SECTOR_STANDBY"
  | "AGENCY_ADDED"
  | "DISPATCH_CONFIRMED"
  | "TEAM_DEPARTED"
  | "SECTOR_PERSONNEL_DEPARTED";

export const ACTIVITY_LABELS: Record<string, string> = {
  FIELD_CHECK_REQUESTED: "Permintaan cek lapangan",
  SECTOR_STANDBY: "Personel Polsek disiagakan",
  AGENCY_ADDED: "Instansi ditambahkan",
  DISPATCH_CONFIRMED: "Instansi mengonfirmasi tugas",
  TEAM_DEPARTED: "Tim instansi berangkat",
  SECTOR_PERSONNEL_DEPARTED: "Personel Polsek berangkat",
};
