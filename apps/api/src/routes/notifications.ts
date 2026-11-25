import { Elysia } from "elysia";
import { authContext, requireRole } from "../plugins/auth-guard";
import { ApiError } from "../lib/errors";
import { NotificationService } from "../services/notification-service";
import { isUuid } from "../services/report-view";

export const notificationRoutes = new Elysia({ prefix: "/api/notifications" })
  .use(authContext)
  .get("/", async ({ authUser, authError }) => {
    const user = requireRole(authUser, authError);
    return { notifications: await NotificationService.listFor(user.id) };
  })
  .post("/:id/read", async ({ authUser, authError, params }) => {
    const user = requireRole(authUser, authError);
    const notification = isUuid(params.id) ? await NotificationService.markRead(user.id, params.id) : null;
    if (!notification) throw new ApiError(404, "NOT_FOUND", "Notifikasi tidak ditemukan");
    return { notification };
  });
