import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:./data/training.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(turso, { schema });

export function runMigrations() {
  migrate(db, { migrationsFolder: "./drizzle" });
}
