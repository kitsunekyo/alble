"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, History, BarChart3, Settings as SettingsIcon, BookOpen } from "lucide-react";
import { ThemeToggle } from "@/client/components/ThemeToggle";
import { cn } from "@/client/lib/utils";

const navItems = [
  { to: "/", label: "Heute", icon: CalendarClock, end: true },
  { to: "/history", label: "Verlauf", icon: History },
  { to: "/charts", label: "Charts", icon: BarChart3 },
  { to: "/journal", label: "Tagebuch", icon: BookOpen },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="hidden md:flex items-center justify-between border-b bg-background px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">Alble</span>
          <span className="text-muted-foreground text-sm">Allein-Bleib-Training</span>
        </div>
        <nav className="flex gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              href={item.to}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                isActivePath(pathname, item.to, item.end)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/settings"
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              isActivePath(pathname, "/settings", false)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            Einstellungen
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      <header className="md:hidden sticky top-0 bg-background/80 backdrop-blur border-b z-30 flex items-center justify-end px-4 py-2 gap-1 shadow-sm">
        <Link
          href="/settings"
          className={cn(
            "p-2 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted",
            isActivePath(pathname, "/settings", false) && "text-foreground bg-muted",
          )}
          aria-label="Einstellungen"
        >
          <SettingsIcon className="size-5" />
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 bg-background/80 backdrop-blur border-t z-40"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                href={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-xs transition-colors",
                  isActivePath(pathname, item.to, item.end) ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function isActivePath(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
