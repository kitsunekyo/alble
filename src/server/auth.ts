import crypto from "node:crypto";
import { db } from "./db/client";
import { authConfig, authSessions } from "./db/schema";
import { eq } from "drizzle-orm";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const verify = crypto.scryptSync(password, salt, 64).toString("hex");
  return hash === verify;
}

function createToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function getPasswordHash(): Promise<string | null> {
  const rows = await db.select({ passwordHash: authConfig.passwordHash }).from(authConfig).all();
  const r = rows[0];
  return r ? r.passwordHash : null;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
  const storedHash = await getPasswordHash();
  if (!storedHash) return false;
  if (!verifyPassword(currentPassword, storedHash)) return false;
  await setPassword(newPassword);
  return true;
}

export async function setPassword(password: string): Promise<void> {
  const hash = hashPassword(password);
  const existing = await db.select().from(authConfig).all();
  const first = existing[0];
  if (first) {
    await db.update(authConfig).set({ passwordHash: hash }).where(eq(authConfig.id, first.id)).run();
  } else {
    await db.insert(authConfig).values({ passwordHash: hash, createdAt: Date.now() }).run();
  }
}

export async function login(password: string): Promise<string | null> {
  const storedHash = await getPasswordHash();
  if (!storedHash) return null;
  if (!verifyPassword(password, storedHash)) return null;
  const token = createToken();
  await db.insert(authSessions).values({
    token,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION_MS,
  }).run();
  return token;
}

export async function logout(token: string): Promise<void> {
  await db.delete(authSessions).where(eq(authSessions.token, token)).run();
}

export async function validateSession(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const session = await db.select().from(authSessions).where(eq(authSessions.token, token)).get();
  if (!session) return false;
  if (session.expiresAt < Date.now()) {
    await db.delete(authSessions).where(eq(authSessions.token, token)).run();
    return false;
  }
  return true;
}

export async function requireAuth(request: Request): Promise<Response | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = parseCookie(cookieHeader, "session_token");
  const valid = await validateSession(token);
  if (!valid) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return null;
}

export function setSessionCookie(token: string): string {
  return `session_token=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function clearSessionCookie(): string {
  return "session_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";
}

function parseCookie(cookie: string, name: string): string | null {
  for (const part of cookie.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key === name && val) return val;
  }
  return null;
}
