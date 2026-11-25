-- UC-10 Meneruskan Laporan ke Instansi: Penerusan per Instansi pada laporan utama Kejadian.
CREATE TABLE dispatches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     uuid NOT NULL REFERENCES reports(id),
  agency_id     uuid NOT NULL REFERENCES agencies(id),
  dispatched_by uuid NOT NULL REFERENCES users(id),
  dispatched_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  note          text,
  confirmed_by  uuid REFERENCES users(id),
  confirmed_at  timestamptz,
  CONSTRAINT dispatches_unique_agency UNIQUE (report_id, agency_id)
);
CREATE INDEX dispatches_agency_idx ON dispatches (agency_id);

ALTER TYPE activity_kind ADD VALUE IF NOT EXISTS 'AGENCY_ADDED';
