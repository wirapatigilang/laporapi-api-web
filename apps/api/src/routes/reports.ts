import { Elysia } from "elysia";
import { authContext, requireRole } from "../plugins/auth-guard";
import { ReportService } from "../services/report-service";

export const reportRoutes = new Elysia({ prefix: "/api/reports" })
  .use(authContext)
  // UC-04
  .post("/", async ({ authUser, authError, body, set }) => {
    const reporter = requireRole(authUser, authError, "REPORTER");
    const result = await ReportService.submit(reporter.id, (body ?? {}) as Record<string, unknown>);
    set.status = result.status;
    return { message: result.message, report: result.report };
  });
