-- Iterasi 1 (UC-01): Pengguna dan Peran
CREATE TYPE user_role AS ENUM ('REPORTER', 'ADMIN', 'SECTOR_OPERATOR', 'AGENCY_OFFICER');

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          varchar(100) NOT NULL,
  phone_number  varchar(20)  NOT NULL UNIQUE,
  email         varchar(254) NOT NULL UNIQUE,
  password_hash text         NOT NULL,
  role          user_role    NOT NULL,
  is_active     boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  NOT NULL DEFAULT now()
);
