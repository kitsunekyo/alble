import { apiRoutes } from "../src/server/api";

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

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  for (const [pattern, handlers] of Object.entries(apiRoutes)) {
    const params = matchRoute(pattern, path);
    if (!params) continue;

    const routeHandler = (handlers as Record<string, Function>)[method];
    if (!routeHandler) {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }

    const keys = Object.keys(params);
    if (keys.length === 0) {
      return await routeHandler();
    }

    const proxy = new Proxy(request, {
      get(target, prop) {
        if (prop === "params") return params;
        const val = Reflect.get(target, prop);
        return typeof val === "function" ? val.bind(target) : val;
      },
    });
    return await routeHandler(proxy);
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}
