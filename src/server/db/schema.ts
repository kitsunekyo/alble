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
  },
  (t) => [uniqueIndex("steps_session_step_unique").on(t.session_id, t.step_number)],
);

export type SessionRow = typeof sessions.$inferSelect;
export type StepRow = typeof steps.$inferSelect;
