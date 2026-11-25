import { Elysia } from "elysia";
import { authContext, requireRole } from "../plugins/auth-guard";
import { loadViewer } from "../services/access";
import { HandlingService } from "../services/handling-service";
import { ResolutionService } from "../services/resolution-service";

export const handlingRoutes = new Elysia()
  .use(authContext)
  // UC-11 langkah 2–6 (kegiatan atau status berikutnya)
  .post("/api/reports/:id/status", async ({ authUser, authError, params, body }) => {
    const user = await loadViewer(requireRole(authUser, authError));
    return HandlingService.update(user, params.id, (body ?? {}) as Record<string, unknown>);
  })
  // UC-12 langkah 3–5
  .post("/api/reports/:id/resolve", async ({ authUser, authError, params }) => {
    const user = await loadViewer(requireRole(authUser, authError));
    return ResolutionService.markResolved(user, params.id);
  });
