export type RouteConfig = {
  title: string | null;
  hideHeader?: boolean;
};

const routeConfig: Record<string, RouteConfig> = {
  "/": { title: null },
  "/history": { title: "Verlauf" },
  "/charts": { title: "Diagramme" },
  "/journal": { title: "Tagebuch" },
  "/settings": { title: "Einstellungen" },
  "/login": { title: null, hideHeader: true },
  "/~offline": { title: null, hideHeader: true },
};

export function getRouteConfig(pathname: string): RouteConfig {
  const exact = routeConfig[pathname];
  if (exact) return exact;
  const parent = getParentPath(pathname);
  if (parent && routeConfig[parent]) {
    const segment = pathname.split("/").filter(Boolean).pop() ?? "";
    return { title: capitalize(segment) };
  }
  return { title: null };
}

export function getRouteLevel(pathname: string): number {
  return pathname.split("/").filter(Boolean).length;
}

export function getParentPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  if (segments.length === 1) return "/";
  return "/" + segments.slice(0, -1).join("/");
}

export function shouldHideHeader(pathname: string): boolean {
  return getRouteConfig(pathname).hideHeader ?? false;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
