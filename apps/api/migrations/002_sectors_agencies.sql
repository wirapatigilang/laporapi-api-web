-- Iterasi 2 (UC-02): Polsek, Instansi, dan keterkaitan akun petugas
CREATE TABLE police_sectors (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL UNIQUE
);

CREATE TABLE agencies (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL UNIQUE,
  type varchar(50)  NOT NULL
);

ALTER TABLE users
  ADD COLUMN police_sector_id uuid REFERENCES police_sectors(id),
  ADD COLUMN agency_id        uuid REFERENCES agencies(id),
  ADD CONSTRAINT users_operator_has_sector CHECK (role <> 'SECTOR_OPERATOR' OR police_sector_id IS NOT NULL),
  ADD CONSTRAINT users_officer_has_agency  CHECK (role <> 'AGENCY_OFFICER'  OR agency_id IS NOT NULL);
