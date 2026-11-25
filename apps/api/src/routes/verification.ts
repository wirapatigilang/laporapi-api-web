import { Elysia } from "elysia";
import { authContext, requireRole } from "../plugins/auth-guard";
import { loadViewer } from "../services/access";
import { VerificationService } from "../services/verification-service";

export const verificationRoutes = new Elysia({ prefix: "/api/reports" })
  .use(authContext)
  // UC-07 langkah 2–6
  .post("/:id/verify", async ({ authUser, authError, params }) => {
    const admin = await loadViewer(requireRole(authUser, authError, "ADMIN"));
    return VerificationService.verify(admin, params.id);
  })
  // UC-07 alternate 1a
  .post("/:id/notes", async ({ authUser, authError, params, body, set }) => {
    const admin = await loadViewer(requireRole(authUser, authError, "ADMIN"));
    const result = await VerificationService.requestFieldCheck(admin, params.id, (body ?? {}) as Record<string, unknown>);
    set.status = 201;
    return result;
  });
