import { Elysia } from "elysia";
import { authContext, requireRole } from "../plugins/auth-guard";
import { loadViewer } from "../services/access";
import { HandlingService } from "../services/handling-service";

export const handlingRoutes = new Elysia()
  .use(authContext)
  // UC-11 langkah 2–6 (kegiatan atau status berikutnya)
  .post("/api/reports/:id/status", async ({ authUser, authError, params, body }) => {
    const user = await loadViewer(requireRole(authUser, authError));
    return HandlingService.update(user, params.id, (body ?? {}) as Record<string, unknown>);
  });
