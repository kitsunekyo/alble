import { sqliteTable, integer, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date"),
  global_day: integer("global_day").notNull().unique(),
  notes: text("notes"),
  created_at: integer("created_at").notNull(),
});

export const steps = sqliteTable(
  "steps",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    session_id: integer("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    step_number: integer("step_number").notNull(),
    duration_seconds: integer("duration_seconds").notNull(),
    rating: text("rating").notNull(),
    notes: text("notes"),
  },
  (t) => [uniqueIndex("steps_session_step_unique").on(t.session_id, t.step_number)],
);

export const authConfig = sqliteTable("auth_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const authSessions = sqliteTable("auth_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const journalEntries = sqliteTable("journal_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  timestamp: text("timestamp").notNull(),
  text: text("text").notNull(),
  moods: text("moods"),
  created_at: integer("created_at").notNull(),
});

export type SessionRow = typeof sessions.$inferSelect;
export type StepRow = typeof steps.$inferSelect;
export type JournalEntryRow = typeof journalEntries.$inferSelect;
