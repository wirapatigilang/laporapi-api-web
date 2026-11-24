-- Keputusan Gilang 2026-11-24: masuk memakai nomor HP + kata sandi, email tidak dipakai lagi.
ALTER TABLE users DROP COLUMN IF EXISTS email;
