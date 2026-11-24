export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://lapor:lapor@localhost:5432/lapor_api",
  uploadDir: process.env.UPLOAD_DIR ?? new URL("../uploads", import.meta.url).pathname,
  maxPhotoBytes: Number(process.env.MAX_PHOTO_BYTES ?? 10 * 1024 * 1024),
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-secret-change-me",
};

export const tokenTtlSeconds = Number(process.env.TOKEN_TTL_SECONDS ?? 12 * 60 * 60);
