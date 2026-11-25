-- Iterasi 5 (UC-07): jenis kegiatan pada Riwayat Status (CDR A-5.1), dimulai dari permintaan cek lapangan.
CREATE TYPE activity_kind AS ENUM ('FIELD_CHECK_REQUESTED');
ALTER TABLE status_histories ADD COLUMN activity activity_kind;
ALTER TABLE status_histories ADD CONSTRAINT status_histories_kind_check
  CHECK ((type = 'STATUS' AND status IS NOT NULL AND activity IS NULL) OR (type = 'ACTIVITY' AND activity IS NOT NULL));
CREATE INDEX status_histories_report_idx ON status_histories (report_id, created_at);
-- Urutan Riwayat Status di dalam satu transaksi tetap terjaga (now() bernilai sama sepanjang transaksi).
ALTER TABLE status_histories ALTER COLUMN created_at SET DEFAULT clock_timestamp();
ALTER TABLE notifications ALTER COLUMN created_at SET DEFAULT clock_timestamp();
