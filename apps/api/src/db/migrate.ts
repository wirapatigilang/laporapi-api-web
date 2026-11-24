import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "./client";

const dir = join(import.meta.dir, "../../migrations");

await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)`;

const applied = new Set(
  (await sql`SELECT name FROM schema_migrations`).map((r: { name: string }) => r.name),
);
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  if (applied.has(file)) continue;
  const text = await Bun.file(join(dir, file)).text();
  await sql.begin(async (tx) => {
    await tx.unsafe(text);
    await tx`INSERT INTO schema_migrations (name) VALUES (${file})`;
  });
  console.log(`migrated ${file}`);
}
await sql.close();
