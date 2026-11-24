import { Elysia } from "elysia";
import { AuthService } from "../services/auth-service";

export const authRoutes = new Elysia({ prefix: "/api/auth" }).post(
  "/register",
  async ({ body, set }) => {
    const user = await AuthService.register((body ?? {}) as Record<string, unknown>);
    set.status = 201;
    return { user };
  },
);
