export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://lapor:lapor@localhost:5432/lapor_api",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-secret-change-me",
};
