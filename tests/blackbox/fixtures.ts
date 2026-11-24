/**
 * Penyiapan data uji UC-04: foto ber-EXIF GPS (penyunting metadata: piexifjs) dan titik
 * pada jarak tertentu. Jarak dihitung dengan bumi berjari-jari 6.371.000 m sesuai spec.
 */
// @ts-ignore piexifjs tidak punya deklarasi tipe
import piexif from "piexifjs";

const R = 6_371_000;
const dir = new URL("./fixtures/", import.meta.url).pathname;
export const BASE_JPEG = await Bun.file(dir + "base.jpg").arrayBuffer();

/** Titik dalam Kecamatan Sekadau Hilir (Polsek Sekadau Hilir), jauh dari batas kecamatan. */
export const SEKADAU_HILIR = { latitude: 0.17643, longitude: 110.92919 };
/** Titik dalam Kecamatan Nanga Mahap. */
export const NANGA_MAHAP = { latitude: -0.47475, longitude: 110.76568 };
/** Kota Pontianak, di luar Kabupaten Sekadau. */
export const PONTIANAK = { latitude: -0.0263, longitude: 109.3425 };

/** Titik yang berjarak `meters` ke utara (sepanjang meridian). */
export function north(p: { latitude: number; longitude: number }, meters: number) {
  return { latitude: p.latitude + (meters / R) * (180 / Math.PI), longitude: p.longitude };
}

let spread = 0;
/** Titik dasar unik per uji (bergeser ±1,5 km di sekitar titik dasar) agar uji tidak saling memengaruhi. */
export function freshPoint(base = SEKADAU_HILIR) {
  spread += 1;
  const dLat = ((spread * 37) % 29 - 14) * 0.001;
  const dLng = ((spread * 53) % 31 - 15) * 0.001;
  return { latitude: base.latitude + dLat, longitude: base.longitude + dLng };
}

function toDmsRational(value: number) {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;
  return [[deg, 1], [min, 1], [Math.round(sec * 1_000_000), 1_000_000]];
}

/** JPEG dengan tag GPS EXIF pada koordinat tertentu (detik berpenyebut 1.000.000). */
export function jpegWithGps(lat: number, lng: number): Blob {
  const binary = Buffer.from(BASE_JPEG).toString("binary");
  const gps = {
    [piexif.GPSIFD.GPSLatitudeRef]: lat >= 0 ? "N" : "S",
    [piexif.GPSIFD.GPSLatitude]: toDmsRational(lat),
    [piexif.GPSIFD.GPSLongitudeRef]: lng >= 0 ? "E" : "W",
    [piexif.GPSIFD.GPSLongitude]: toDmsRational(lng),
  };
  const exif = piexif.dump({ "0th": {}, Exif: {}, GPS: gps });
  const out = piexif.insert(exif, binary);
  return new Blob([Buffer.from(out, "binary")], { type: "image/jpeg" });
}

export const jpegWithoutGps = () => new Blob([BASE_JPEG], { type: "image/jpeg" });

/** Membuat FormData laporan; `photo: null` berarti tanpa foto. */
export function reportForm(opts: {
  photo?: Blob | null;
  device?: { latitude: number; longitude: number } | null;
  description?: string;
  clientId?: string;
  gpsAccuracy?: number;
  reportedAt?: string;
  raw?: Record<string, string>;
}) {
  const f = new FormData();
  if (opts.photo !== null) f.append("photo", opts.photo ?? jpegWithoutGps(), "foto.jpg");
  if (opts.device) {
    f.append("deviceLat", String(opts.device.latitude));
    f.append("deviceLng", String(opts.device.longitude));
  }
  f.append("gpsAccuracy", String(opts.gpsAccuracy ?? 8));
  f.append("reportedAt", opts.reportedAt ?? new Date().toISOString());
  if (opts.description !== undefined) f.append("description", opts.description);
  if (opts.clientId) f.append("clientId", opts.clientId);
  for (const [k, v] of Object.entries(opts.raw ?? {})) f.set(k, v);
  return f;
}
