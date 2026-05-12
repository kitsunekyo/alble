import { apiRoutes } from "./api";
import { runMigrations } from "./db/client";

let migrationsPromise: Promise<void> | null = null;

function ensureMigrations() {
  migrationsPromise ??= runMigrations();
  return migrationsPromise;
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
    await ensureMigrations();

    const url = new URL(request.url, "http://localhost");
    const path = url.pathname;
    const method = request.method;

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
