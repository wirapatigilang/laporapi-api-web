import { Elysia } from "elysia";
import { authContext, requireRole } from "../plugins/auth-guard";
import { OfficerAccountService } from "../services/officer-service";

const body = (b: unknown) => (b ?? {}) as Record<string, unknown>;

/** UC-03 Mengelola Akun Petugas — hanya Admin Polres. */
export const officerRoutes = new Elysia({ prefix: "/api/officers" })
  .use(authContext)
  .get("/", ({ authUser, authError }) => {
    requireRole(authUser, authError, "ADMIN");
    return OfficerAccountService.list();
  })
  .post("/", async ({ authUser, authError, body: b, set }) => {
    requireRole(authUser, authError, "ADMIN");
    const result = await OfficerAccountService.create(body(b));
    set.status = 201;
    return result;
  })
  .patch("/:id", ({ authUser, authError, params, body: b }) => {
    requireRole(authUser, authError, "ADMIN");
    return OfficerAccountService.update(params.id, body(b));
  })
  .post("/:id/deactivate", ({ authUser, authError, params }) => {
    requireRole(authUser, authError, "ADMIN");
    return OfficerAccountService.deactivate(params.id);
  });
