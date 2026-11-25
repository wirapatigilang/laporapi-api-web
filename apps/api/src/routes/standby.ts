import { Elysia } from "elysia";
import { authContext, requireRole } from "../plugins/auth-guard";
import { loadViewer } from "../services/access";
import { StandbyService } from "../services/standby-service";

export const standbyRoutes = new Elysia()
  .use(authContext)
  // UC-09 langkah 2–4
  .post("/api/reports/:id/standby", async ({ authUser, authError, params, body, set }) => {
    const operator = await loadViewer(requireRole(authUser, authError, "SECTOR_OPERATOR"));
    const result = await StandbyService.standby(operator, params.id, (body ?? {}) as Record<string, unknown>);
    set.status = 201;
    return result;
  });
