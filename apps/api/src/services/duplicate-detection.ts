import type { SQL } from "bun";
import { IncidentRepository, type OpenIncident } from "../repositories/report-repository";
import { DUPLICATE_RADIUS_METERS, haversine, isWithinRadius, type Coordinate } from "./geo";

/** DuplicateDetectionService: Kejadian terbuka terdekat yang laporan utamanya ≤ 50 m (langkah 7, 7a). */
export const DuplicateDetectionService = {
  async findOpenIncidentNearby(tx: SQL, location: Coordinate): Promise<(OpenIncident & { distance: number }) | null> {
    let nearest: (OpenIncident & { distance: number }) | null = null;
    for (const incident of await IncidentRepository.listOpen(tx)) {
      const distance = haversine(location, incident);
      if (!isWithinRadius(distance, DUPLICATE_RADIUS_METERS)) continue;
      if (!nearest || distance < nearest.distance) nearest = { ...incident, distance };
    }
    return nearest;
  },
};
