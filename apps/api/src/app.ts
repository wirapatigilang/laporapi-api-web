import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { ApiError } from "./lib/errors";
import { authRoutes } from "./routes/auth";
import { dashboardRoutes } from "./routes/dashboard";
import { notificationRoutes } from "./routes/notifications";
import { reportRoutes } from "./routes/reports";
import { verificationRoutes } from "./routes/verification";

export function createApp() {
  return new Elysia()
    .use(cors())
    .onError(({ error, code, set }) => {
      if (error instanceof ApiError) {
        set.status = error.status;
        return error.toBody();
      }
      if (code === "NOT_FOUND") {
        set.status = 404;
        return { error: { code: "NOT_FOUND", message: "Alamat tidak ditemukan" } };
      }
      if (code === "PARSE") {
        set.status = 422;
        return { error: { code: "VALIDATION_ERROR", message: "Format permintaan tidak valid" } };
      }
      console.error(error);
      set.status = 500;
      return { error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan pada server" } };
    })
    .get("/api/health", () => ({ status: "ok" }))
    .use(authRoutes)
    .use(reportRoutes)
    .use(notificationRoutes)
    .use(dashboardRoutes)
    .use(verificationRoutes);
}
