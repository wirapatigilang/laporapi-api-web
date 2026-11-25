import { Elysia } from "elysia";
import { authContext, requireRole } from "../plugins/auth-guard";
import { loadViewer } from "../services/access";
import { RejectionReasons, RejectionService } from "../services/rejection-service";
import { VerificationService } from "../services/verification-service";

export const verificationRoutes = new Elysia()
  .use(authContext)
  // UC-07 langkah 2–6
  .post("/api/reports/:id/verify", async ({ authUser, authError, params }) => {
    const admin = await loadViewer(requireRole(authUser, authError, "ADMIN"));
    return VerificationService.verify(admin, params.id);
  })
  // UC-07 alternate 1a
  .post("/api/reports/:id/notes", async ({ authUser, authError, params, body, set }) => {
    const admin = await loadViewer(requireRole(authUser, authError, "ADMIN"));
    const result = await VerificationService.requestFieldCheck(admin, params.id, (body ?? {}) as Record<string, unknown>);
    set.status = 201;
    return result;
  })
  // UC-08 langkah 2: pilihan Alasan Penolakan
  .get("/api/rejection-reasons", async ({ authUser, authError }) => {
    requireRole(authUser, authError, "ADMIN");
    return { reasons: await RejectionReasons.list() };
  })
  // UC-08 langkah 3–6
  .post("/api/reports/:id/reject", async ({ authUser, authError, params, body }) => {
    const admin = await loadViewer(requireRole(authUser, authError, "ADMIN"));
    return RejectionService.reject(admin, params.id, (body ?? {}) as Record<string, unknown>);
  });
