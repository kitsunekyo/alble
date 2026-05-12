import { z } from "zod";
import {
  createSessionSchema,
  updateSessionSchema,
  createStepSchema,
  updateStepSchema,
} from "@/shared/schemas";
import * as repo from "./repo";
import { parseCsv, rowsToCsv } from "./csv";
import { db } from "./db/client";
import { sessions, steps } from "./db/schema";
import { asc } from "drizzle-orm";

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
}

function badRequest(message: string, details?: unknown): Response {
  return json({ error: message, details }, { status: 400 });
}

function notFound(message = "Not found"): Response {
  return json({ error: message }, { status: 404 });
}

async function readJson<T>(req: Request, schema: z.ZodType<T>): Promise<{ ok: true; data: T } | { ok: false; res: Response }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, res: badRequest("Invalid JSON body") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, res: badRequest("Validation failed", z.treeifyError(parsed.error)) };
  }
  return { ok: true, data: parsed.data };
}

function parseId(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const apiRoutes = {
  "/api/sessions": {
    GET: () => json(repo.listSessions()),
    POST: async (req: Request) => {
      const r = await readJson(req, createSessionSchema);
      if (!r.ok) return r.res;
      return json(repo.createSession(r.data), { status: 201 });
    },
  },

  "/api/sessions/today": {
    GET: () => json(repo.getOrCreateTodaySession()),
  },

  "/api/sessions/:id": {
    GET: (req: Bun.BunRequest<"/api/sessions/:id">) => {
      const id = parseId(req.params.id);
      if (id === null) return badRequest("Invalid id");
      const s = repo.getSession(id);
      if (!s) return notFound();
      return json(s);
    },
    PATCH: async (req: Bun.BunRequest<"/api/sessions/:id">) => {
      const id = parseId(req.params.id);
      if (id === null) return badRequest("Invalid id");
      const r = await readJson(req, updateSessionSchema);
      if (!r.ok) return r.res;
      const updated = repo.updateSession(id, r.data);
      if (!updated) return notFound();
      return json(updated);
    },
    DELETE: (req: Bun.BunRequest<"/api/sessions/:id">) => {
      const id = parseId(req.params.id);
      if (id === null) return badRequest("Invalid id");
      const ok = repo.deleteSession(id);
      if (!ok) return notFound();
      return new Response(null, { status: 204 });
    },
  },

  "/api/sessions/:id/steps": {
    POST: async (req: Bun.BunRequest<"/api/sessions/:id/steps">) => {
      const id = parseId(req.params.id);
      if (id === null) return badRequest("Invalid id");
      const r = await readJson(req, createStepSchema);
      if (!r.ok) return r.res;
      const created = repo.addStep(id, r.data);
      if (!created) return notFound("Session not found");
      return json(created, { status: 201 });
    },
  },

  "/api/steps/:id": {
    PATCH: async (req: Bun.BunRequest<"/api/steps/:id">) => {
      const id = parseId(req.params.id);
      if (id === null) return badRequest("Invalid id");
      const r = await readJson(req, updateStepSchema);
      if (!r.ok) return r.res;
      const updated = repo.updateStep(id, r.data);
      if (!updated) return notFound();
      return json(updated);
    },
    DELETE: (req: Bun.BunRequest<"/api/steps/:id">) => {
      const id = parseId(req.params.id);
      if (id === null) return badRequest("Invalid id");
      const ok = repo.deleteStep(id);
      if (!ok) return notFound();
      return new Response(null, { status: 204 });
    },
  },

  "/api/import/csv": {
    POST: async (req: Request) => {
      const ct = req.headers.get("content-type") ?? "";
      let text: string;
      if (ct.includes("multipart/form-data")) {
        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File)) return badRequest("Missing 'file' field");
        text = await file.text();
      } else {
        text = await req.text();
      }
      const parsed = parseCsv(text);
      if (parsed.errors.length > 0 && parsed.rows.length === 0) {
        return badRequest("CSV parse failed", parsed.errors);
      }
      const result = repo.importCsvRows(parsed.rows);
      return json({ ...result, parseErrors: parsed.errors });
    },
  },

  "/api/export/csv": {
    GET: () => {
      const allSessions = db.select().from(sessions).orderBy(asc(sessions.global_day)).all();
      const allSteps = db.select().from(steps).orderBy(asc(steps.session_id), asc(steps.step_number)).all();
      const sessionMeta = new Map(allSessions.map((s) => [s.id, { day: s.global_day, date: s.date }]));
      const rows = allSteps.map((s) => ({
        date: sessionMeta.get(s.session_id)?.date ?? null,
        global_day: sessionMeta.get(s.session_id)?.day ?? 0,
        step_number: s.step_number,
        duration_seconds: s.duration_seconds,
        rating: s.rating,
        notes: s.notes,
      }));
      const csv = rowsToCsv(rows);
      return new Response(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="alble-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    },
  },

  "/api/wipe": {
    POST: () => {
      repo.wipeAll();
      return new Response(null, { status: 204 });
    },
  },

  "/api/health": {
    GET: () => json({ ok: true, sessions: repo.countSessions() }),
  },
} as const;
