import type { SQL } from "bun";
import { sql } from "../db/client";

/**
 * NotificationService: iterasi 3 menyimpan Notifikasi di basis data.
 * Push (FCM) ke Android dan siaran SSE ke dasbor menyusul [SEPAKATI].
 */
export const NotificationService = {
  /** Langkah 9: semua Admin Polres aktif + Operator Polsek wilayah (6a: Admin saja). */
  async notifyNewReport(tx: SQL, report: { id: string; reportNumber: string; districtName: string; policeSectorId: string | null }) {
    const recipients = await tx`SELECT id FROM users
      WHERE is_active AND (role = 'ADMIN'
        OR (role = 'SECTOR_OPERATOR' AND ${report.policeSectorId}::uuid IS NOT NULL AND police_sector_id = ${report.policeSectorId}))`;
    const title = `Laporan baru ${report.reportNumber}`;
    const body = report.policeSectorId
      ? `Laporan karhutla baru di Kecamatan ${report.districtName}, menunggu verifikasi.`
      : `Laporan karhutla baru di Kecamatan ${report.districtName}, menunggu verifikasi. Polsek belum ditentukan.`;
    for (const { id } of recipients) {
      await tx`INSERT INTO notifications (recipient_id, report_id, title, body) VALUES (${id}, ${report.id}, ${title}, ${body})`;
    }
    return recipients.length;
  },

  /** NotificationService.send: satu Notifikasi per penerima (penerima ganda diabaikan). */
  async send(tx: SQL, recipientIds: string[], title: string, body: string, reportId: string | null = null) {
    const unique = [...new Set(recipientIds)];
    for (const id of unique) {
      await tx`INSERT INTO notifications (recipient_id, report_id, title, body) VALUES (${id}, ${reportId}, ${title}, ${body})`;
    }
    return unique.length;
  },

  async admins(tx: SQL): Promise<string[]> {
    return (await tx`SELECT id FROM users WHERE is_active AND role = 'ADMIN'`).map((r: { id: string }) => r.id);
  },

  async sectorOperators(tx: SQL, policeSectorId: string | null): Promise<string[]> {
    if (!policeSectorId) return [];
    return (await tx`SELECT id FROM users WHERE is_active AND role = 'SECTOR_OPERATOR' AND police_sector_id = ${policeSectorId}`).map(
      (r: { id: string }) => r.id,
    );
  },

  /** UC-05 langkah 4: Warga membuka Notifikasi (ditandai sudah dibaca) lalu menuju Detail Laporan. */
  async markRead(userId: string, id: string) {
    const rows = await sql`UPDATE notifications SET is_read = true WHERE id = ${id} AND recipient_id = ${userId}
      RETURNING id, report_id AS "reportId", title, body, is_read AS "isRead", created_at AS "createdAt"`;
    return rows[0] ?? null;
  },

  async listFor(userId: string) {
    return sql`SELECT id, report_id AS "reportId", title, body, is_read AS "isRead", created_at AS "createdAt"
      FROM notifications WHERE recipient_id = ${userId} ORDER BY created_at DESC LIMIT 100`;
  },
};
