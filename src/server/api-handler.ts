import { apiRoutes } from "./api";
import { runMigrations } from "./db/client";
import { requireAuth } from "./auth";

let migrationsPromise: Promise<void> | null = null;

/**
 * Migrations run once per process, lazily, on the first request that needs the
 * database. A rejected attempt is not cached: otherwise one transient error
 * (or a slow remote) would keep every API route failing until a restart.
 */
function ensureMigrations() {
  migrationsPromise ??= runMigrations().catch((err) => {
    migrationsPromise = null;
    throw err;
  });
  return migrationsPromise;
}

/**
 * Routes that must never wait for migrations. `/api/auth/check` is what the
 * login page calls before showing the form: for an anonymous visitor it only
 * needs a cookie presence check (`validateSession` returns early without a
 * query), so making it wait on a remote migration is what turns the login
 * screen into an endless spinner.
 */
const MIGRATION_EXEMPT = new Set(["/api/auth/check"]);

/** Never let a stalled migration hold a request open forever. */
const MIGRATION_WAIT_MS = 15_000;

async function ensureMigrationsReady(): Promise<boolean> {
  const migrations = ensureMigrations();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), MIGRATION_WAIT_MS);
  });
  try {
    return await Promise.race([migrations.then(() => true as const), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isAuthRoute(path: string): boolean {
  return path.startsWith("/api/auth/");
}

function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const pat = pattern.split("/");
  const pth = path.split("/");
  if (pat.length !== pth.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pat.length; i++) {
    const seg = pat[i];
    const req = pth[i];
    if (seg && seg.startsWith(":")) {
      if (req) params[seg.slice(1)] = decodeURIComponent(req);
    } else if (seg !== req) {
      return null;
    }
  }
  return params;
}

function requestWithParams(request: Request, params: Record<string, string>): Request {
  return new Proxy(request, {
    get(target, prop) {
      if (prop === "params") return params;
      const val = Reflect.get(target, prop);
      return typeof val === "function" ? val.bind(target) : val;
    },
  });
}

export async function handleApiRequest(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url, "http://localhost");
    const path = url.pathname;
    const method = request.method;

    if (!MIGRATION_EXEMPT.has(path) && !(await ensureMigrationsReady())) {
      return new Response(
        JSON.stringify({
          error: "Datenbank wird noch vorbereitet — bitte gleich noch einmal versuchen.",
        }),
        { status: 503, headers: { "content-type": "application/json" } },
      );
    }

    if (!isAuthRoute(path)) {
      const authRes = await requireAuth(request);
      if (authRes) return authRes;
    }

    for (const [pattern, handlers] of Object.entries(apiRoutes)) {
      const params = matchRoute(pattern, path);
      if (!params) continue;

      const routeHandler = (handlers as Record<string, (request?: Request) => Promise<Response>>)[method];
      if (!routeHandler) {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { "content-type": "application/json" },
        });
      }

      return await routeHandler(requestWithParams(request, params));
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("API handler error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
}
