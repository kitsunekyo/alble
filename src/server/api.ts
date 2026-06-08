import { z } from "zod";
import {
  createSessionSchema,
  updateSessionSchema,
  createStepSchema,
  updateStepSchema,
  createJournalEntrySchema,
  updateJournalEntrySchema,
} from "../shared/schemas";
import * as repo from "./repo";
import { parseCsv, rowsToCsv } from "./csv";
import { db } from "./db/client";
import { sessions, steps } from "./db/schema";
import { asc } from "drizzle-orm";
import { login, logout, validateSession, setSessionCookie, clearSessionCookie, getPasswordHash, setPassword, changePassword, requireAuth } from "./auth";
import { todayIsoString } from "../shared/dates";

type RouteRequest = Request & { params: Record<string, string> };

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
    GET: async () => json(await repo.listSessions()),
    POST: async (req: Request) => {
      const r = await readJson(req, createSessionSchema);
      if (!r.ok) return r.res;
      return json(await repo.createSession(r.data), { status: 201 });
    },
  },

  "/api/sessions/today": {
    GET: async () => {
      const session = await repo.getTodaySession();
      if (!session) return json(null);
      return json(session);
    },
  },

  "/api/sessions/today/steps": {
    POST: async (req: Request) => {
      const r = await readJson(req, createStepSchema);
      if (!r.ok) return r.res;
      return json(await repo.addStepToTodaySession(r.data), { status: 201 });
    },
  },

  "/api/sessions/by-date/:date": {
    GET: async (req: RouteRequest) => {
      const date = req.params.date;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return badRequest("Invalid date format, expected YYYY-MM-DD");
      const session = await repo.getSessionByDate(date);
      if (!session) return json(null);
      return json(session);
    },
  },

  "/api/sessions/by-date/:date/steps": {
    POST: async (req: RouteRequest) => {
      const date = req.params.date;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return badRequest("Invalid date format, expected YYYY-MM-DD");
      const r = await readJson(req, createStepSchema);
      if (!r.ok) return r.res;
      return json(await repo.addStepToSessionByDate(date, r.data), { status: 201 });
    },
  },

  "/api/sessions/:id": {
    GET: async (req: RouteRequest) => {
      const id = parseId(req.params.id);
      if (id === null) return badRequest("Invalid id");
      const s = await repo.getSession(id);
      if (!s) return notFound();
      return json(s);
    },
    PATCH: async (req: RouteRequest) => {
      const id = parseId(req.params.id);
      if (id === null) return badRequest("Invalid id");
      const r = await readJson(req, updateSessionSchema);
      if (!r.ok) return r.res;
      const updated = await repo.updateSession(id, r.data);
      if (!updated) return notFound();
      return json(updated);
    },
    DELETE: async (req: RouteRequest) => {
      const id = parseId(req.params.id);
      if (id === null) return badRequest("Invalid id");
      const ok = await repo.deleteSession(id);
      if (!ok) return notFound();
      return new Response(null, { status: 204 });
    },
  },

  "/api/sessions/:id/steps": {
    POST: async (req: RouteRequest) => {
      const id = parseId(req.params.id);
      if (id === null) return badRequest("Invalid id");
      const r = await readJson(req, createStepSchema);
      if (!r.ok) return r.res;
      const created = await repo.addStep(id, r.data);
      if (!created) return notFound("Session not found");
      return json(created, { status: 201 });
    },
  },

  "/api/steps/:id": {
    PATCH: async (req: RouteRequest) => {
      const id = parseId(req.params.id);
      if (id === null) return badRequest("Invalid id");
      const r = await readJson(req, updateStepSchema);
      if (!r.ok) return r.res;
      const updated = await repo.updateStep(id, r.data);
      if (!updated) return notFound();
      return json(updated);
    },
    DELETE: async (req: RouteRequest) => {
      const id = parseId(req.params.id);
      if (id === null) return badRequest("Invalid id");
      const ok = await repo.deleteStep(id);
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
      const result = await repo.importCsvRows(parsed.rows);
      return json({ ...result, parseErrors: parsed.errors });
    },
  },

  "/api/export/csv": {
    GET: async () => {
      const allSessions = await db.select().from(sessions).orderBy(asc(sessions.global_day)).all();
      const allSteps = await db.select().from(steps).orderBy(asc(steps.session_id), asc(steps.step_number)).all();
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
          "content-disposition": `attachment; filename="alble-${todayIsoString()}.csv"`,
        },
      });
    },
  },

  "/api/wipe": {
    POST: async () => {
      await repo.wipeAll();
      return new Response(null, { status: 204 });
    },
  },

  "/api/health": {
    GET: async () => json({ ok: true, sessions: await repo.countSessions() }),
  },

  "/api/auth/login": {
    POST: async (req: Request) => {
      const body = await req.json().catch(() => null);
      if (!body || typeof body.password !== "string") {
        return badRequest("Password required");
      }
      const existingHash = await getPasswordHash();
      if (!existingHash) {
        await setPassword(body.password);
        const token = await login(body.password);
        if (!token) return json({ error: "Login failed" }, { status: 500 });
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json", "set-cookie": setSessionCookie(token) },
        });
      }
      const token = await login(body.password);
      if (!token) {
        return json({ error: "Invalid password" }, { status: 401 });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json", "set-cookie": setSessionCookie(token) },
      });
    },
  },

  "/api/auth/logout": {
    POST: async (req: Request) => {
      const cookieHeader = req.headers.get("cookie") ?? "";
      const token = parseCookieSimple(cookieHeader, "session_token");
      if (token) await logout(token);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json", "set-cookie": clearSessionCookie() },
      });
    },
  },

  "/api/auth/check": {
    GET: async (req: Request) => {
      const cookieHeader = req.headers.get("cookie") ?? "";
      const token = parseCookieSimple(cookieHeader, "session_token");
      const valid = await validateSession(token);
      if (!valid) return json({ authenticated: false }, { status: 401 });
      return json({ authenticated: true });
    },
  },

  "/api/auth/change-password": {
    POST: async (req: Request) => {
      const body = await req.json().catch(() => null);
      if (!body || typeof body.current_password !== "string" || typeof body.new_password !== "string") {
        return badRequest("current_password and new_password required");
      }
      if (body.new_password.length < 1) {
        return badRequest("New password cannot be empty");
      }
      const ok = await changePassword(body.current_password, body.new_password);
      if (!ok) {
        return json({ error: "Current password is incorrect" }, { status: 403 });
      }
      return json({ ok: true });
    },
  },

  "/api/journal": {
    GET: async () => json(await repo.listJournalEntries()),
    POST: async (req: Request) => {
      const r = await readJson(req, createJournalEntrySchema);
      if (!r.ok) return r.res;
      return json(await repo.createJournalEntry(r.data), { status: 201 });
    },
  },

  "/api/journal/:id": {
    GET: async (req: RouteRequest) => {
      const id = parseId(req.params.id);
      if (id === null) return badRequest("Invalid id");
      const entry = await repo.getJournalEntry(id);
      if (!entry) return notFound();
      return json(entry);
    },
    PATCH: async (req: RouteRequest) => {
      const id = parseId(req.params.id);
      if (id === null) return badRequest("Invalid id");
      const r = await readJson(req, updateJournalEntrySchema);
      if (!r.ok) return r.res;
      const updated = await repo.updateJournalEntry(id, r.data);
      if (!updated) return notFound();
      return json(updated);
    },
    DELETE: async (req: RouteRequest) => {
      const id = parseId(req.params.id);
      if (id === null) return badRequest("Invalid id");
      const ok = await repo.deleteJournalEntry(id);
      if (!ok) return notFound();
      return new Response(null, { status: 204 });
    },
  },
} as const;

function parseCookieSimple(cookie: string, name: string): string | null {
  for (const part of cookie.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key === name && val) return val;
  }
  return null;
}
