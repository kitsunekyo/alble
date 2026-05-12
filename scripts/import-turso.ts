import { createClient } from "@libsql/client";
import Database from "bun:sqlite";

const local = new Database("data/training.db");
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const { rows } = await turso.execute("SELECT COUNT(*) as count FROM sessions");
if (rows[0] && Number(rows[0].count) > 0) {
  console.log("Remote DB already has data. Aborting.");
  process.exit(1);
}

const sessions = local.query("SELECT * FROM sessions ORDER BY id").all() as any[];
const steps = local.query("SELECT * FROM steps ORDER BY id").all() as any[];

console.log(`Local: ${sessions.length} sessions, ${steps.length} steps. Importing...`);

const BATCH_SIZE = 100;

async function batchInsert(table: string, rows: any[], cols: string[]) {
  const placeholders = cols.map(() => "?").join(", ");
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const stmts = batch.map(r => ({
      sql: `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`,
      args: cols.map(c => r[c]),
    }));
    await turso.batch(stmts, "write");
    console.log(`  ${table}: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }
}

await batchInsert("sessions", sessions, ["id", "date", "global_day", "notes", "created_at"]);
await batchInsert("steps", steps, ["id", "session_id", "step_number", "duration_seconds", "rating", "notes"]);

console.log("Done!");
