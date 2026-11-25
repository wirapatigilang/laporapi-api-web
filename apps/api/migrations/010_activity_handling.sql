-- UC-11 Memperbarui Status Penanganan: konfirmasi dan keberangkatan sebagai kegiatan (FR-27, FR-28).
ALTER TYPE activity_kind ADD VALUE IF NOT EXISTS 'DISPATCH_CONFIRMED';
ALTER TYPE activity_kind ADD VALUE IF NOT EXISTS 'TEAM_DEPARTED';
ALTER TYPE activity_kind ADD VALUE IF NOT EXISTS 'SECTOR_PERSONNEL_DEPARTED';
