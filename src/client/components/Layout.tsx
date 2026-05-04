import { NavLink, Outlet } from "react-router";
import { CalendarClock, History, BarChart3, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/client/lib/utils";

const navItems = [
  { to: "/", label: "Heute", icon: CalendarClock, end: true },
  { to: "/history", label: "Verlauf", icon: History },
  { to: "/charts", label: "Charts", icon: BarChart3 },
  { to: "/settings", label: "Einstellungen", icon: SettingsIcon },
];

export function Layout() {
  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <header className="hidden md:flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">Alble</span>
          <span className="text-muted-foreground text-sm">Allein-Bleib-Training</span>
        </div>
        <nav className="flex gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 bg-background border-t z-40"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center gap-1 py-2.5 text-xs transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )
                }
              >
                <Icon className="size-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
