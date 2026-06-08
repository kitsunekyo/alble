import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { join } from "node:path";
import * as schema from "./schema";

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:./data/training.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(turso, { schema });

async function ensureMigrationsTable() {
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at numeric
    )
  `);
}

async function getLatestMigration(): Promise<{ id: number; hash: string; created_at: number } | null> {
  const r = await turso.execute(
    "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1"
  );
  if (r.rows.length === 0) return null;
  const row = r.rows[0]!;
  return { id: row.id as number, hash: row.hash as string, created_at: row.created_at as number };
}

export async function runMigrations() {
  await ensureMigrationsTable();

  const migrations = readMigrationFiles({
    migrationsFolder: join(process.cwd(), "drizzle"),
  });

  const lastMigration = await getLatestMigration();

  for (const migration of migrations) {
    if (lastMigration && lastMigration.created_at >= migration.folderMillis) continue;

    for (const stmt of migration.sql) {
      await turso.execute(stmt);
    }

    await turso.execute({
      sql: 'INSERT INTO __drizzle_migrations ("hash", "created_at") VALUES (?, ?)',
      args: [migration.hash, migration.folderMillis],
    });
  }
}
