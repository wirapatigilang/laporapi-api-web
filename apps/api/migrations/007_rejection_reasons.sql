-- UC-08 Menolak Laporan: daftar baku Alasan Penolakan (ASUMSI-14) dan alasan pada Laporan.
CREATE TABLE rejection_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  requires_note boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL
);
INSERT INTO rejection_reasons (code, label, requires_note, sort_order) VALUES
  ('CONTROLLED_BURNING', 'Pembakaran sampah atau terkendali', false, 1),
  ('LOCATION_MISMATCH', 'Lokasi tidak sesuai', false, 2),
  ('UNCLEAR_PHOTO', 'Foto tidak jelas atau bukan kebakaran', false, 3),
  ('PRANK', 'Laporan iseng', false, 4),
  ('OTHER', 'Lainnya', true, 5);

ALTER TABLE reports ADD COLUMN rejection_reason_id uuid REFERENCES rejection_reasons(id);
ALTER TABLE reports ADD COLUMN rejection_note text;
ALTER TABLE reports ADD CONSTRAINT reports_rejection_check
  CHECK (current_status <> 'REJECTED' OR rejection_reason_id IS NOT NULL) NOT VALID;
