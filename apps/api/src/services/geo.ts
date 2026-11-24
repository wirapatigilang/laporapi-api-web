/**
 * GeoService: perhitungan jarak dan wilayah di layanan API (NFR-06, tanpa PostGIS).
 */
import { sql } from "../db/client";

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export const EARTH_RADIUS_METERS = 6_371_000;
export const DUPLICATE_RADIUS_METERS = 50;
export const LOCATION_MISMATCH_METERS = 50;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Jarak dua koordinat (meter) dengan formula Haversine. */
export function haversine(a: Coordinate, b: Coordinate): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Pembandingan batas jarak pada ketelitian 1 mm (spec UC-04, Clarifications). */
export function isWithinRadius(distanceMeters: number, radiusMeters: number): boolean {
  return Math.round(distanceMeters * 1000) / 1000 <= radiusMeters;
}

/** Pembulatan untuk ditampilkan (0,1 m). */
export const roundForDisplay = (meters: number) => Math.round(meters * 10) / 10;

export function isValidCoordinate(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

type Ring = [number, number][]; // [lng, lat]
type Polygon = Ring[];

/** Ray casting: apakah titik berada di dalam satu cincin poligon. */
function inRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(lng: number, lat: number, polygon: Polygon): boolean {
  if (!inRing(lng, lat, polygon[0])) return false;
  return !polygon.slice(1).some((hole) => inRing(lng, lat, hole));
}

export function pointInGeometry(point: Coordinate, geometry: { type: string; coordinates: unknown }): boolean {
  const { latitude: lat, longitude: lng } = point;
  if (geometry.type === "Polygon") return inPolygon(lng, lat, geometry.coordinates as Polygon);
  if (geometry.type === "MultiPolygon") return (geometry.coordinates as Polygon[]).some((p) => inPolygon(lng, lat, p));
  return false;
}

export interface District {
  id: string;
  code: string;
  name: string;
  policeSectorId: string | null;
  policeSectorName: string | null;
  boundary: { type: string; coordinates: unknown };
  bbox: [number, number, number, number]; // minLng, minLat, maxLng, maxLat
}

function computeBbox(geometry: District["boundary"]): District["bbox"] {
  const polygons = (geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates) as Polygon[];
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const poly of polygons)
    for (const [x, y] of poly[0]) {
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  return [minX, minY, maxX, maxY];
}

/**
 * Kecamatan dimuat dari basis data setiap kali dicari, karena pemetaan Polsek dapat berubah
 * (UC-03/alternate 6a). Tujuh poligon cukup kecil untuk diperiksa langsung.
 */
async function loadDistricts(): Promise<District[]> {
  const rows = await sql`SELECT d.id, d.code, d.name, d.police_sector_id AS "policeSectorId",
      p.name AS "policeSectorName", d.boundary
    FROM districts d LEFT JOIN police_sectors p ON p.id = d.police_sector_id`;
  return rows.map((r: Omit<District, "bbox">) => ({ ...r, bbox: computeBbox(r.boundary) }));
}

export const GeoService = {
  haversine,
  isWithinRadius,

  /** Langkah 6: Kecamatan yang batas wilayahnya memuat koordinat, atau null (6b). */
  async findDistrict(point: Coordinate): Promise<District | null> {
    for (const d of await loadDistricts()) {
      const [minX, minY, maxX, maxY] = d.bbox;
      if (point.longitude < minX || point.longitude > maxX || point.latitude < minY || point.latitude > maxY) continue;
      if (pointInGeometry(point, d.boundary)) return d;
    }
    return null;
  },
};
