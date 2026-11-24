import exifr from "exifr";
import { isValidCoordinate, type Coordinate } from "./geo";

/** ExifService: membaca tag GPS EXIF dari foto (UC-04 langkah 5, alternate 5a dan 5c). */
export const ExifService = {
  async readCoordinates(photo: Uint8Array): Promise<Coordinate | null> {
    try {
      const gps = await exifr.gps(Buffer.from(photo));
      if (!gps) return null; // 5a: tidak ada tag GPS
      const { latitude, longitude } = gps;
      if (!isValidCoordinate(latitude, longitude)) return null; // 5c: di luar rentang
      if (latitude === 0 && longitude === 0) return null; // 5c: 0,0
      return { latitude, longitude };
    } catch {
      return null; // metadata rusak diperlakukan seperti tanpa EXIF
    }
  },
};
