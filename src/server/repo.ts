import { db } from "./db/client";
import { sessions, steps, type SessionRow, type StepRow } from "./db/schema";
import { and, asc, desc, eq, isNotNull, max, sql } from "drizzle-orm";
import type { Rating } from "../shared/ratings";
import type {
  CreateSessionInput,
  UpdateSessionInput,
  CreateStepInput,
  UpdateStepInput,
  SessionDTO,
  StepDTO,
} from "../shared/schemas";

function toStepDTO(row: StepRow): StepDTO {
  return {
    id: row.id,
    session_id: row.session_id,
    step_number: row.step_number,
    duration_seconds: row.duration_seconds,
    rating: row.rating as Rating,
    notes: row.notes,
  };
}

function toSessionDTO(row: SessionRow, stepRows: StepRow[]): SessionDTO {
  return {
    id: row.id,
    date: row.date,
    global_day: row.global_day,
    notes: row.notes,
    created_at: row.created_at,
    steps: stepRows.map(toStepDTO),
  };
}

async function nextGlobalDay(): Promise<number> {
  const r = await db.select({ m: max(sessions.global_day) }).from(sessions).get();
  return (r?.m ?? 0) + 1;
}

export async function listSessions(): Promise<SessionDTO[]> {
  const sessionRows = await db.select().from(sessions).orderBy(asc(sessions.global_day)).all();
  if (sessionRows.length === 0) return [];
  const stepRows = await db
    .select()
    .from(steps)
    .orderBy(asc(steps.session_id), asc(steps.step_number))
    .all();
  const stepsBySession = new Map<number, StepRow[]>();
  for (const s of stepRows) {
    const arr = stepsBySession.get(s.session_id) ?? [];
    arr.push(s);
    stepsBySession.set(s.session_id, arr);
  }
  return sessionRows.map((s) => toSessionDTO(s, stepsBySession.get(s.id) ?? []));
}

export async function getSession(id: number): Promise<SessionDTO | null> {
  const s = await db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!s) return null;
  const ss = await db
    .select()
    .from(steps)
    .where(eq(steps.session_id, id))
    .orderBy(asc(steps.step_number))
    .all();
  return toSessionDTO(s, ss);
}

export async function getTodaySession(): Promise<SessionDTO | null> {
  const today = new Date().toISOString().slice(0, 10);
  const s = await db.select().from(sessions).where(eq(sessions.date, today)).get();
  if (!s) return null;
  return getSession(s.id);
}

export async function getOrCreateTodaySession(): Promise<SessionDTO> {
  const existing = await getTodaySession();
  if (existing) return existing;
  const today = new Date().toISOString().slice(0, 10);
  return createSession({ date: today });
}

export async function getOrCreateSessionByDate(date: string): Promise<SessionDTO> {
  const existing = await db.select().from(sessions).where(eq(sessions.date, date)).get();
  if (existing) return getSession(existing.id) as Promise<SessionDTO>;
  return createSession({ date });
}

export async function createSession(input: CreateSessionInput): Promise<SessionDTO> {
  const date = input.date ?? null;
  const notes = input.notes ?? null;
  const created = await db
    .insert(sessions)
    .values({
      date,
      notes,
      global_day: await nextGlobalDay(),
      created_at: Date.now(),
    })
    .returning()
    .get();
  return toSessionDTO(created, []);
}

export async function updateSession(id: number, input: UpdateSessionInput): Promise<SessionDTO | null> {
  const patch: Partial<SessionRow> = {};
  if ("date" in input) patch.date = input.date ?? null;
  if ("notes" in input) patch.notes = input.notes ?? null;
  if (Object.keys(patch).length === 0) return getSession(id);
  await db.update(sessions).set(patch).where(eq(sessions.id, id)).run();
  return getSession(id);
}

export async function deleteSession(id: number): Promise<boolean> {
  const existing = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.id, id)).get();
  if (!existing) return false;
  await db.delete(sessions).where(eq(sessions.id, id)).run();
  return true;
}

export async function addStep(sessionId: number, input: CreateStepInput): Promise<StepDTO | null> {
  const session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!session) return null;
  const r = await db
    .select({ m: max(steps.step_number) })
    .from(steps)
    .where(eq(steps.session_id, sessionId))
    .get();
  const next = (r?.m ?? 0) + 1;
  const created = await db
    .insert(steps)
    .values({
      session_id: sessionId,
      step_number: next,
      duration_seconds: input.duration_seconds,
      rating: input.rating,
      notes: input.notes ?? null,
    })
    .returning()
    .get();
  return toStepDTO(created);
}

export async function updateStep(stepId: number, input: UpdateStepInput): Promise<StepDTO | null> {
  const patch: Partial<StepRow> = {};
  if (input.duration_seconds !== undefined) patch.duration_seconds = input.duration_seconds;
  if (input.rating !== undefined) patch.rating = input.rating;
  if ("notes" in input) patch.notes = input.notes ?? null;
  if (Object.keys(patch).length === 0) {
    const cur = await db.select().from(steps).where(eq(steps.id, stepId)).get();
    return cur ? toStepDTO(cur) : null;
  }
  await db.update(steps).set(patch).where(eq(steps.id, stepId)).run();
  const cur = await db.select().from(steps).where(eq(steps.id, stepId)).get();
  return cur ? toStepDTO(cur) : null;
}

export async function deleteStep(stepId: number): Promise<boolean> {
  const step = await db.select().from(steps).where(eq(steps.id, stepId)).get();
  if (!step) return false;
  await db.delete(steps).where(eq(steps.id, stepId)).run();
  // Renumber remaining steps in the session to keep step_number contiguous.
  const remaining = await db
    .select()
    .from(steps)
    .where(eq(steps.session_id, step.session_id))
    .orderBy(asc(steps.step_number))
    .all();
  // Two-pass renumber to avoid uniqueness conflicts: first push to negative, then back.
  for (const s of remaining) {
    await db.update(steps).set({ step_number: -s.step_number }).where(eq(steps.id, s.id)).run();
  }
  for (let i = 0; i < remaining.length; i++) {
    const r = remaining[i];
    if (r) await db.update(steps).set({ step_number: i + 1 }).where(eq(steps.id, r.id)).run();
  }
  return true;
}

export async function countSessions(): Promise<number> {
  const r = await db.select({ c: sql<number>`count(*)` }).from(sessions).get();
  return r?.c ?? 0;
}

export async function wipeAll(): Promise<void> {
  await db.delete(steps).run();
  await db.delete(sessions).run();
}

export interface CsvRow {
  date: string | null;
  global_day: number;
  step: number;
  trennungszeit_seconds: number;
  bewertung: Rating;
  note: string | null;
}

export async function importCsvRows(rows: CsvRow[]): Promise<{ sessions: number; steps: number }> {
  let sessionsCreated = 0;
  let stepsCreated = 0;

  // Group rows by global_day, preserve step order
  const byDay = new Map<number, CsvRow[]>();
  for (const r of rows) {
    const arr = byDay.get(r.global_day) ?? [];
    arr.push(r);
    byDay.set(r.global_day, arr);
  }

  const sortedDays = [...byDay.keys()].sort((a, b) => a - b);

  await db.transaction(async (tx: any) => {
    for (const day of sortedDays) {
      const dayRows = (byDay.get(day) ?? []).sort((a, b) => a.step - b.step);
      // Skip if a session for this global_day already exists.
      const existing = await tx
        .select()
        .from(sessions)
        .where(eq(sessions.global_day, day))
        .get();
      if (existing) continue;

      const created = await tx
        .insert(sessions)
        .values({
          date: dayRows.find((r) => r.date)?.date ?? null,
          notes: null,
          global_day: day,
          created_at: Date.now(),
        })
        .returning()
        .get();
      sessionsCreated++;

      for (const r of dayRows) {
        await tx
          .insert(steps)
          .values({
            session_id: created.id,
            step_number: r.step,
            duration_seconds: r.trennungszeit_seconds,
            rating: r.bewertung,
            notes: r.note,
          })
          .run();
        stepsCreated++;
      }
    }
  });

  return { sessions: sessionsCreated, steps: stepsCreated };
}
