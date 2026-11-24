# Research: UC-04 Mengirim Laporan Karhutla

| Keputusan | Pilihan | Alasan | Alternatif ditolak |
|---|---|---|---|
| Pembaca EXIF | `exifr` 7.1.3 (`exifr.gps()`) | Ringan, membaca JPEG/HEIC/PNG/WebP, langsung memberi derajat desimal bertanda (S/W negatif) | `exif-parser` (JPEG saja), ExifTool (biner luar) |
| Jarak | Haversine, R = 6.371.000 m, di `services/geo.ts` | NFR-06, tanpa PostGIS | Rumus Vincenty (lebih teliti tetapi tidak diperlukan pada skala 50 m) |
| Pembandingan batas 50 m | `Math.round(d * 1000) / 1000 <= 50` | Clarifications (RR-3.1): tahan galat bilangan pecahan, tetap "sebelum dibulatkan untuk ditampilkan" | Perbandingan langsung `d <= 50` (gagal pada titik batas karena galat 1e-9) |
| Titik di dalam poligon | *Ray casting* pada cincin luar dikurangi lubang, dengan uji kotak batas (*bounding box*) lebih dulu | Tanpa PostGIS; tujuh poligon cukup diperiksa di memori | Turf.js (dependensi besar untuk satu fungsi) |
| Data batas kecamatan | 7 berkas GeoJSON kecamatan Kabupaten Sekadau (kode 61.09.01–07) dari `fityannugroho/idn-area-boundary`, sumber Alf-Anas/batas-administrasi-indonesia (pembaruan 2023) | Data terbuka siap pakai dengan kode wilayah | Digitasi sendiri |
| Penyimpanan batas | Kolom `jsonb` di `districts`, dimuat ke memori saat API mulai | Satu sumber kebenaran di basis data, cepat diuji | Membaca berkas setiap permintaan |
| Nomor laporan | Sequence PostgreSQL `report_number_seq` → `LA-` + nomor urut ≥ 4 digit | Unik walau bersamaan | `max()+1` (bentrok saat bersamaan) |
| Kunci laporan ganda | `pg_advisory_xact_lock` dalam satu transaksi untuk langkah 7–8 | Mencegah dua Kejadian untuk titik yang sama (RR-3.7); volume laporan kecil sehingga satu kunci global cukup | Kunci per sel grid (lebih rumit) |
| Deteksi tipe gambar | Tanda tangan berkas (*magic bytes*): JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF....WEBP`, HEIC `ftypheic/heix/mif1` | 4a: berkas teks berakhiran `.jpg` harus ditolak | Percaya MIME dari klien |
| Penyimpanan foto | Berkas di `UPLOAD_DIR/reports/<uuid>.<ext>`, path di `reports.photo_path` | Basis data tetap kecil | Kolom `bytea` |
| Penyiapan foto uji | `piexifjs` di `tests/blackbox` menulis GPS EXIF dengan detik berpenyebut 1.000.000 | Ketelitian ≈ 0,03 mm sehingga titik batas 50 m dapat diuji | ExifTool (tidak tersedia di lingkungan) |
