-- Iterasi 3 (UC-04): Kecamatan, Laporan, Kejadian, Riwayat Status, Notifikasi
CREATE TABLE districts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             varchar(20)  NOT NULL UNIQUE,
  name             varchar(100) NOT NULL,
  police_sector_id uuid REFERENCES police_sectors(id),
  boundary         jsonb        NOT NULL
);

CREATE TYPE report_status AS ENUM ('RECEIVED', 'VERIFIED', 'REJECTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED');
CREATE TYPE location_source AS ENUM ('DEVICE', 'PHOTO');
CREATE TYPE status_history_type AS ENUM ('STATUS', 'ACTIVITY');
CREATE SEQUENCE report_number_seq START 1;

CREATE TABLE incidents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_report_id uuid,
  is_open           boolean     NOT NULL DEFAULT true,
  opened_at         timestamptz NOT NULL DEFAULT now(),
  closed_at         timestamptz
);

CREATE TABLE reports (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_number            varchar(20) NOT NULL UNIQUE,
  client_id                varchar(100),
  reporter_id              uuid NOT NULL REFERENCES users(id),
  incident_id              uuid NOT NULL REFERENCES incidents(id),
  photo_path               text NOT NULL,
  device_lat               double precision,
  device_lng               double precision,
  gps_accuracy             double precision,
  photo_lat                double precision,
  photo_lng                double precision,
  location_source          location_source NOT NULL,
  latitude                 double precision NOT NULL,
  longitude                double precision NOT NULL,
  location_mismatch_meters double precision,
  has_location_mismatch    boolean NOT NULL DEFAULT false,
  district_id              uuid NOT NULL REFERENCES districts(id),
  police_sector_id         uuid REFERENCES police_sectors(id),
  reported_at              timestamptz NOT NULL,
  received_at              timestamptz NOT NULL DEFAULT now(),
  description              varchar(300),
  current_status           report_status NOT NULL DEFAULT 'RECEIVED',
  UNIQUE (reporter_id, client_id)
);

ALTER TABLE incidents
  ADD CONSTRAINT incidents_primary_report_fk FOREIGN KEY (primary_report_id)
  REFERENCES reports(id) DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX incidents_open_idx ON incidents (is_open) WHERE is_open;

CREATE TABLE status_histories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  uuid NOT NULL REFERENCES reports(id),
  type       status_history_type NOT NULL,
  status     report_status,
  actor_id   uuid REFERENCES users(id),
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES users(id),
  report_id    uuid REFERENCES reports(id),
  title        varchar(150) NOT NULL,
  body         text NOT NULL,
  is_read      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_recipient_idx ON notifications (recipient_id, created_at DESC);
