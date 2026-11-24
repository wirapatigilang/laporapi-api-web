import type { SQL } from "bun";

/** ReportNumberService: nomor laporan `LA-` + nomor urut minimal 4 digit [SEPAKATI]. */
export const ReportNumberService = {
  async generate(tx: SQL): Promise<string> {
    const [{ n }] = await tx`SELECT nextval('report_number_seq')::int AS n`;
    return `LA-${String(n).padStart(4, "0")}`;
  },
};
