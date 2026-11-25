-- Alamat Warga (requirement tim mobile v0.5 BR-11). Opsional di API; akun petugas tidak memakainya.
ALTER TABLE users ADD COLUMN address text;
ALTER TABLE users ADD CONSTRAINT users_address_length CHECK (address IS NULL OR char_length(address) <= 200);
