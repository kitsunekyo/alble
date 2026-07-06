"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft, CalendarClock, History, BarChart3, BookOpen, Settings } from "lucide-react";
import { getRouteConfig, getParentPath, shouldHideHeader } from "@/client/lib/routes";
import { cn } from "@/client/lib/utils";

const navItems = [
  { to: "/", label: "Heute", icon: CalendarClock, end: true },
  { to: "/journal", label: "Tagebuch", icon: BookOpen },
  { to: "/history", label: "Training", icon: History },
  { to: "/charts", label: "Charts", icon: BarChart3 },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (shouldHideHeader(pathname)) {
    return <main className="min-h-dvh">{children}</main>;
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Header pathname={pathname} />
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav pathname={pathname} />
    </div>
  );
}

function Header({ pathname }: { pathname: string }) {
  const router = useRouter();
  const config = getRouteConfig(pathname);
  const isHome = pathname === "/";
  const parent = getParentPath(pathname);
  const title = config.title;

  return (
    <header
      className="sticky top-0 z-30 flex items-center px-2 py-2"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
    >
      <div className="flex items-center justify-start">
        {isHome ? (
          <img src="/pwa/icon-192.png" alt="Alble" className="size-10 rounded-full bg-primary" />
        ) : parent ? (
          <button
            type="button"
            onClick={() => router.push(parent)}
            aria-label="Zurück"
            className="flex items-center justify-center size-10 rounded-full text-foreground bg-white hover:bg-muted/60 transition-colors"
          >
            <ArrowLeft className="size-5" />
          </button>
        ) : null}
      </div>

      <div className="flex flex-1 items-center justify-center">
        {title && (
          <h1 className="text-base font-semibold text-foreground truncate px-2">
            {title}
          </h1>
        )}
      </div>

      <div className="flex h-10 w-14 items-center justify-end">
        {isHome && <OverflowMenu />}
      </div>
    </header>
  );
}

function OverflowMenu() {
  return (
    <Link
      href="/settings"
      aria-label="Einstellungen"
      className="flex items-center justify-center size-10 rounded-full text-foreground bg-white hover:bg-muted/60 transition-colors"
    >
      <Settings className="size-5" />
    </Link>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-background/80 backdrop-blur z-40 shadow-[0_-2px_8px_-2px_rgba(0,0,0,0.1)] rounded-t-2xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.to, item.end);
          return (
            <Link
              key={item.to}
              href={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 text-xs transition-colors",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function isActivePath(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
