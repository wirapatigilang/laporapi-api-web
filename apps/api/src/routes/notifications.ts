import { Elysia } from "elysia";
import { authContext, requireRole } from "../plugins/auth-guard";
import { NotificationService } from "../services/notification-service";

export const notificationRoutes = new Elysia({ prefix: "/api/notifications" })
  .use(authContext)
  .get("/", async ({ authUser, authError }) => {
    const user = requireRole(authUser, authError);
    return { notifications: await NotificationService.listFor(user.id) };
  });
