import { Elysia } from "elysia";
import { authContext, requireRole } from "../plugins/auth-guard";
import { loadViewer } from "../services/access";
import { ReportService } from "../services/report-service";
import { getDetail, getPhoto } from "../services/report-view";

export const reportRoutes = new Elysia({ prefix: "/api/reports" })
  .use(authContext)
  // UC-04
  .post("/", async ({ authUser, authError, body, set }) => {
    const reporter = requireRole(authUser, authError, "CITIZEN");
    const result = await ReportService.submit(reporter.id, (body ?? {}) as Record<string, unknown>);
    set.status = result.status;
    return { message: result.message, report: result.report };
  })
  // UC-06 langkah 4 (juga UC-05 langkah 3 dan UC-11 langkah 1)
  .get("/:id", async ({ authUser, authError, params }) => {
    const viewer = await loadViewer(requireRole(authUser, authError));
    return getDetail(viewer, params.id);
  })
  .get("/:id/photo", async ({ authUser, authError, params }) => {
    const viewer = await loadViewer(requireRole(authUser, authError));
    return getPhoto(viewer, params.id);
  });
