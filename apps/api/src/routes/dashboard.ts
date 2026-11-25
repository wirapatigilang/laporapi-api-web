import { Elysia } from "elysia";
import { sql } from "../db/client";
import { authContext, requireRole } from "../plugins/auth-guard";
import { loadViewer } from "../services/access";
import { DashboardStream } from "../services/dashboard-stream";
import { listIncidents, parseIncidentFilter } from "../services/report-view";

const STAFF = ["ADMIN", "SECTOR_OPERATOR", "AGENCY_OFFICER"] as const;

export const dashboardRoutes = new Elysia({ prefix: "/api" })
  .use(authContext)
  // UC-06 langkah 2–3, alternate 1a, 2b
  .get("/incidents", async ({ authUser, authError, query }) => {
    const viewer = await loadViewer(requireRole(authUser, authError, ...STAFF));
    const filter = parseIncidentFilter(query as Record<string, string | undefined>);
    return { incidents: await listIncidents(viewer, filter) };
  })
  // UC-06 alternate 2a
  .get("/stream", async ({ authUser, authError }) => {
    const viewer = await loadViewer(requireRole(authUser, authError, ...STAFF));
    return DashboardStream.open(viewer);
  })
  // Pilihan saringan kecamatan/Polsek
  .get("/districts", async ({ authUser, authError }) => {
    requireRole(authUser, authError, ...STAFF);
    const districts = await sql`SELECT d.id, d.code, d.name, d.police_sector_id AS "policeSectorId", p.name AS "policeSectorName"
      FROM districts d LEFT JOIN police_sectors p ON p.id = d.police_sector_id ORDER BY d.name`;
    return { districts };
  })
  .get("/police-sectors", async ({ authUser, authError }) => {
    requireRole(authUser, authError, ...STAFF);
    return { policeSectors: await sql`SELECT id, name FROM police_sectors ORDER BY name` };
  });
