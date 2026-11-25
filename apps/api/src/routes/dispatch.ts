import { Elysia } from "elysia";
import { authContext, requireRole } from "../plugins/auth-guard";
import { loadViewer } from "../services/access";
import { Agencies, DispatchService } from "../services/dispatch-service";

export const dispatchRoutes = new Elysia()
  .use(authContext)
  // UC-10 langkah 2
  .get("/api/agencies", async ({ authUser, authError }) => {
    requireRole(authUser, authError, "ADMIN");
    return { agencies: await Agencies.list() };
  })
  // UC-10 langkah 3–6
  .post("/api/reports/:id/dispatches", async ({ authUser, authError, params, body, set }) => {
    const admin = await loadViewer(requireRole(authUser, authError, "ADMIN"));
    const result = await DispatchService.dispatch(admin, params.id, (body ?? {}) as Record<string, unknown>);
    set.status = 201;
    return result;
  });
