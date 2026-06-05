"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const themes = ["system", "light", "dark"] as const;

const labels: Record<string, string> = {
  system: "System",
  light: "Hell",
  dark: "Dunkel",
};

const nextTheme: Record<string, (typeof themes)[number]> = {
  system: "light",
  light: "dark",
  dark: "system",
};

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cycle = () => {
    setTheme(nextTheme[theme ?? "system"] ?? "system");
  };

  const label = theme ? labels[theme] ?? theme : "";
  const isLight = resolvedTheme === "light";

  return (
    <button
      type="button"
      aria-label="Design wechseln"
      onClick={cycle}
      className="flex flex-col items-center justify-center gap-1 py-2.5 text-xs transition-colors md:flex-row md:gap-1.5 md:px-3 md:py-1.5 md:rounded-md md:font-medium hover:bg-muted hover:text-foreground text-muted-foreground"
    >
      {mounted ? (
        isLight ? (
          <Sun className="size-5 md:size-4" />
        ) : (
          <Moon className="size-5 md:size-4" />
        )
      ) : (
        <span className="size-5 md:size-4" />
      )}
      <span className="md:hidden">{label}</span>
    </button>
  );
}
