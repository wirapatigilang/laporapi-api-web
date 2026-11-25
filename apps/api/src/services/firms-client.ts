/**
 * FirmsClient: titik panas NASA FIRMS (MODIS dan VIIRS) di sekitar lokasi Laporan.
 * Data hanya petunjuk bagi Admin Polres (AB-04) dan tidak disimpan.
 */
import { haversine, type Coordinate } from "./geo";

export interface Hotspot {
  latitude: number;
  longitude: number;
  detectedAt: string; // ISO, dari acq_date + acq_time (UTC)
  satellite: string;
  confidence: string;
}

export interface HotspotHint {
  available: boolean;
  note: string | null;
  radiusKm: number;
  dayRange: number;
  count: number;
  nearestMeters: number | null;
  hotspots: (Hotspot & { distanceMeters: number })[];
}

export const HOTSPOT_RADIUS_KM = 5;
export const HOTSPOT_DAY_RANGE = 2;
const SOURCES = ["MODIS_NRT", "VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT"];
const TIMEOUT_MS = 5000;
const UNAVAILABLE_NOTE = "Data titik panas tidak tersedia";

const baseUrl = () => process.env.FIRMS_BASE_URL ?? "https://firms.modaps.eosdis.nasa.gov";
const mapKey = () => process.env.FIRMS_MAP_KEY ?? "";

/** Kotak (barat, selatan, timur, utara) berukuran radius di sekeliling titik. */
export function bboxAround(c: Coordinate, radiusKm: number): [number, number, number, number] {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.cos((c.latitude * Math.PI) / 180));
  const r = (n: number) => Math.round(n * 1e5) / 1e5;
  return [r(c.longitude - dLng), r(c.latitude - dLat), r(c.longitude + dLng), r(c.latitude + dLat)];
}

function parseCsv(text: string, source: string): Hotspot[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0 || !lines[0].includes("latitude")) return [];
  const head = lines[0].split(",");
  const idx = (name: string) => head.indexOf(name);
  const out: Hotspot[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(",");
    const lat = Number(cols[idx("latitude")]);
    const lng = Number(cols[idx("longitude")]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const date = cols[idx("acq_date")] ?? "";
    const time = (cols[idx("acq_time")] ?? "0000").padStart(4, "0");
    out.push({
      latitude: lat,
      longitude: lng,
      detectedAt: date ? `${date}T${time.slice(0, 2)}:${time.slice(2)}:00Z` : "",
      satellite: cols[idx("satellite")] || source,
      confidence: cols[idx("confidence")] ?? "",
    });
  }
  return out;
}

export const FirmsClient = {
  /** Mengambil titik panas di dalam kotak dari semua sumber; melempar galat bila salah satu gagal. */
  async fetchHotspots(bbox: [number, number, number, number], days: number): Promise<Hotspot[]> {
    const key = mapKey();
    if (!key) throw new Error("FIRMS_MAP_KEY belum diatur");
    const area = bbox.join(",");
    const results = await Promise.all(
      SOURCES.map(async (source) => {
        const res = await fetch(`${baseUrl()}/api/area/csv/${key}/${source}/${area}/${days}`, {
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok) throw new Error(`FIRMS ${source} menjawab ${res.status}`);
        const text = await res.text();
        if (!text.trim().startsWith("latitude") && text.trim() !== "") throw new Error(`FIRMS ${source}: ${text.slice(0, 80)}`);
        return parseCsv(text, source);
      }),
    );
    return results.flat();
  },

  /** Petunjuk untuk Halaman Detail Laporan; tidak pernah melempar galat (NFR-10). */
  async hintFor(location: Coordinate): Promise<HotspotHint> {
    const base = { radiusKm: HOTSPOT_RADIUS_KM, dayRange: HOTSPOT_DAY_RANGE };
    try {
      const all = await this.fetchHotspots(bboxAround(location, HOTSPOT_RADIUS_KM), HOTSPOT_DAY_RANGE);
      const near = all
        .map((h) => ({ ...h, distanceMeters: Math.round(haversine(location, h)) }))
        .filter((h) => h.distanceMeters <= HOTSPOT_RADIUS_KM * 1000)
        .sort((a, b) => a.distanceMeters - b.distanceMeters);
      return { ...base, available: true, note: null, count: near.length, nearestMeters: near[0]?.distanceMeters ?? null, hotspots: near };
    } catch (error) {
      console.warn("FIRMS tidak tersedia:", (error as Error).message);
      return { ...base, available: false, note: UNAVAILABLE_NOTE, count: 0, nearestMeters: null, hotspots: [] };
    }
  },
};
