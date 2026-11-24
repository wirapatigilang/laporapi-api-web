import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../config";
import { sql } from "../db/client";
import { ApiError, validationError, type FieldErrors } from "../lib/errors";
import { detectImageType } from "../lib/image";
import { STATUS_LABELS, type ReportStatus } from "../lib/status";
import { IncidentRepository, ReportRepository, StatusHistoryRepository, type ReportRow } from "../repositories/report-repository";
import { DuplicateDetectionService } from "./duplicate-detection";
import { ExifService } from "./exif-service";
import { GeoService, LOCATION_MISMATCH_METERS, haversine, isValidCoordinate, isWithinRadius, roundForDisplay, type Coordinate } from "./geo";
import { NotificationService } from "./notification-service";
import { ReportNumberService } from "./report-number";

const DESCRIPTION_MAX = 300;
const REPORT_LOCK_KEY = 4040; // kunci advisory untuk langkah 7–8

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

interface ValidatedForm {
  photo: Uint8Array;
  photoExt: string;
  device: Coordinate | null;
  gpsAccuracy: number | null;
  reportedAt: Date | null;
  description: string | null;
  clientId: string | null;
}

export interface SubmitResult {
  status: 200 | 201;
  message: string;
  report: ReturnType<typeof toSubmittedReport>;
}

export function toSubmittedReport(r: ReportRow) {
  const isDuplicate = r.primaryReportId !== r.id;
  return {
    id: r.id,
    reportNumber: r.reportNumber,
    status: r.currentStatus,
    statusLabel: STATUS_LABELS[r.currentStatus],
    incidentId: r.incidentId,
    isDuplicate,
    primaryReportNumber: isDuplicate ? r.primaryReportNumber : null,
    latitude: r.latitude,
    longitude: r.longitude,
    locationSource: r.locationSource,
    gpsAccuracy: r.gpsAccuracy,
    photoCoordinate: r.photoLat === null || r.photoLng === null ? null : { latitude: r.photoLat, longitude: r.photoLng },
    photoCoordinateNote: r.photoLat === null ? "Koordinat foto tidak tersedia" : null,
    hasLocationMismatch: r.hasLocationMismatch,
    locationMismatchMeters: r.locationMismatchMeters === null ? null : roundForDisplay(r.locationMismatchMeters),
    district: { id: r.districtId, name: r.districtName },
    policeSector: r.policeSectorId ? { id: r.policeSectorId, name: r.policeSectorName } : null,
    policeSectorNote: r.policeSectorId ? null : "Polsek belum ditentukan",
    description: r.description,
    reportedAt: r.reportedAt,
    receivedAt: r.receivedAt,
  };
}

function parseNumber(raw: unknown, field: string, errors: FieldErrors, label: string): number | null {
  const t = text(raw);
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) {
    errors[field] = `${label} harus berupa angka`;
    return null;
  }
  return n;
}

export const ReportService = {
  /** Langkah 4 dan alternate 4a, 4c (serta validasi format kolom lain). */
  async validate(body: Record<string, unknown>): Promise<ValidatedForm> {
    const errors: FieldErrors = {};
    const file = body.photo;
    let photo = new Uint8Array();
    let photoExt = "";
    if (!(file instanceof Blob) || file.size === 0) {
      errors.photo = "Foto wajib dilampirkan";
    } else if (file.size > config.maxPhotoBytes) {
      errors.photo = "Ukuran foto maksimal 10 MB";
    } else {
      photo = new Uint8Array(await file.arrayBuffer());
      const type = detectImageType(photo);
      if (!type) errors.photo = "Foto wajib dilampirkan dan harus berupa gambar (JPEG, PNG, WebP, atau HEIC)";
      else photoExt = type;
    }

    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (description.length > DESCRIPTION_MAX) errors.description = `Keterangan maksimal ${DESCRIPTION_MAX} karakter`;

    const lat = parseNumber(body.deviceLat, "deviceLat", errors, "Lintang");
    const lng = parseNumber(body.deviceLng, "deviceLng", errors, "Bujur");
    let device: Coordinate | null = null;
    if ((lat === null) !== (lng === null) && !errors.deviceLat && !errors.deviceLng) {
      errors[lat === null ? "deviceLat" : "deviceLng"] = "Koordinat perangkat harus berisi lintang dan bujur";
    } else if (lat !== null && lng !== null) {
      if (!isValidCoordinate(lat, lng)) {
        if (Math.abs(lat) > 90) errors.deviceLat = "Lintang harus di antara -90 dan 90";
        if (Math.abs(lng) > 180) errors.deviceLng = "Bujur harus di antara -180 dan 180";
      } else device = { latitude: lat, longitude: lng };
    }

    const gpsAccuracy = parseNumber(body.gpsAccuracy, "gpsAccuracy", errors, "Akurasi GPS");
    if (gpsAccuracy !== null && gpsAccuracy < 0) errors.gpsAccuracy = "Akurasi GPS tidak boleh negatif";

    let reportedAt: Date | null = null;
    const rawReportedAt = text(body.reportedAt);
    if (rawReportedAt) {
      const d = new Date(rawReportedAt);
      if (Number.isNaN(d.getTime()) || !/^\d{4}-\d{2}-\d{2}T/.test(rawReportedAt)) errors.reportedAt = "Waktu lapor harus berformat ISO 8601";
      else reportedAt = d;
    }

    const clientId = text(body.clientId) || null;
    if (clientId && clientId.length > 100) errors.clientId = "clientId maksimal 100 karakter";

    if (Object.keys(errors).length > 0) throw validationError(errors);
    return { photo, photoExt, device, gpsAccuracy, reportedAt, description: description || null, clientId };
  },

  /** UC-04 Mengirim Laporan Karhutla. */
  async submit(reporterId: string, body: Record<string, unknown>): Promise<SubmitResult> {
    // 3b: kirim ulang dengan clientId yang sama → Laporan lama.
    const rawClientId = text(body.clientId);
    if (rawClientId) {
      const existing = await ReportRepository.findByClientId(reporterId, rawClientId);
      if (existing) {
        return { status: 200, message: `Laporan ${existing.reportNumber} sudah diterima sebelumnya`, report: toSubmittedReport(existing) };
      }
    }

    const form = await this.validate(body); // 4, 4a, 4c

    // 5: koordinat foto (EXIF) dan lokasi Laporan.
    const photoCoordinate = await ExifService.readCoordinates(form.photo);
    const location = form.device ?? photoCoordinate;
    if (!location) {
      throw new ApiError(422, "LOCATION_UNAVAILABLE", "Lokasi tidak terdeteksi, aktifkan GPS lalu kirim ulang"); // 5d
    }
    const locationSource = form.device ? "DEVICE" : "PHOTO";
    let mismatch: number | null = null;
    let hasMismatch = false;
    if (form.device && photoCoordinate) {
      mismatch = haversine(form.device, photoCoordinate);
      hasMismatch = !isWithinRadius(mismatch, LOCATION_MISMATCH_METERS); // 5b
    }

    // 6: Kecamatan dan Polsek.
    const district = await GeoService.findDistrict(location);
    if (!district) {
      throw new ApiError(422, "OUTSIDE_SERVICE_AREA", "Lokasi di luar wilayah layanan Polres Sekadau, silakan hubungi 110", undefined, {
        emergencyNumber: "110",
      }); // 6b
    }

    const reportId = crypto.randomUUID();
    const photoPath = join("reports", `${reportId}.${form.photoExt}`);
    await mkdir(join(config.uploadDir, "reports"), { recursive: true });
    await Bun.write(join(config.uploadDir, photoPath), form.photo);

    // 7–9 dalam satu transaksi berkunci.
    await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(${REPORT_LOCK_KEY})`;
      const incident = await DuplicateDetectionService.findOpenIncidentNearby(tx, location);
      const reportNumber = await ReportNumberService.generate(tx);
      const status: ReportStatus = incident ? incident.primaryStatus : "RECEIVED";
      const incidentId = incident ? incident.id : await IncidentRepository.create(tx, reportId);
      await ReportRepository.insert(tx, {
        id: reportId,
        reportNumber,
        clientId: form.clientId,
        reporterId,
        incidentId,
        photoPath,
        deviceLat: form.device?.latitude ?? null,
        deviceLng: form.device?.longitude ?? null,
        gpsAccuracy: form.gpsAccuracy,
        photoLat: photoCoordinate?.latitude ?? null,
        photoLng: photoCoordinate?.longitude ?? null,
        locationSource,
        latitude: location.latitude,
        longitude: location.longitude,
        locationMismatchMeters: mismatch,
        hasLocationMismatch: hasMismatch,
        districtId: district.id,
        policeSectorId: district.policeSectorId,
        reportedAt: form.reportedAt ?? new Date(),
        description: form.description,
        currentStatus: status,
      });
      await StatusHistoryRepository.record(tx, {
        reportId,
        type: "STATUS",
        status,
        actorId: reporterId,
        note: incident ? `Tergabung dengan laporan ${incident.primaryReportNumber}` : null,
      });
      if (!incident) {
        await NotificationService.notifyNewReport(tx, { id: reportId, reportNumber, districtName: district.name, policeSectorId: district.policeSectorId });
      }
    });

    const saved = (await ReportRepository.findById(reportId))!;
    const report = toSubmittedReport(saved);
    const message = report.isDuplicate
      ? "Laporan Anda tergabung dengan laporan lain di lokasi yang sama"
      : `Laporan ${report.reportNumber} terkirim, sedang diverifikasi`;
    return { status: 201, message, report };
  },
};
