import { Elysia } from "elysia";
import { AuthService } from "../services/auth-service";
import { authContext, jwtPlugin, requireRole } from "../plugins/auth-guard";
import { UserRepository } from "../repositories/user-repository";
import { ApiError } from "../lib/errors";

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  .use(jwtPlugin)
  .use(authContext)
  // UC-01
  .post("/register", async ({ body, set }) => {
    const user = await AuthService.register((body ?? {}) as Record<string, unknown>);
    set.status = 201;
    return { user };
  })
  // UC-02
  .post("/login", async ({ body, jwt }) => {
    return AuthService.login((body ?? {}) as Record<string, unknown>, (p) => jwt.sign(p as never));
  })
  .get("/me", async ({ authUser, authError }) => {
    const me = requireRole(authUser, authError);
    const user = await UserRepository.findSessionUser(me.id);
    if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu");
    return { user };
  });
