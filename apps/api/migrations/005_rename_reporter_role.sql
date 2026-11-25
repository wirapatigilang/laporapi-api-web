-- Aktor Pelapor diganti nama menjadi Warga (keputusan Gilang, 25 November 2026).
-- Kode peran mengikuti glosarium: Warga = CITIZEN. Kolom reports.reporter_id tetap
-- (artinya Warga yang mengirim Laporan).
ALTER TYPE user_role RENAME VALUE 'REPORTER' TO 'CITIZEN';
