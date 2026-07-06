"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/client/components/ui/input";
import { cn } from "@/client/lib/utils";

export const MAX_DURATION_SECONDS = 86_400;

export function parseDuration(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return 0;

  const pairs = [...trimmed.matchAll(/(\d+)\s*([hms])/gi)];
  if (pairs.length === 0) return null;

  let cursor = 0;
  for (const m of pairs) {
    const idx = m.index ?? 0;
    if (trimmed.slice(cursor, idx).trim() !== "") return null;
    cursor = idx + m[0].length;
  }
  if (trimmed.slice(cursor).trim() !== "") return null;

  let total = 0;
  for (const m of pairs) {
    const valueStr = m[1];
    const unitStr = m[2];
    if (valueStr === undefined || unitStr === undefined) return null;
    const value = Number.parseInt(valueStr, 10);
    const unit = unitStr.toLowerCase();
    if (unit === "h") total += value * 3600;
    else if (unit === "m") total += value * 60;
    else total += value;
  }
  return total;
}

function formatReadable(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} Std`);
  if (m > 0) parts.push(`${m} Min`);
  if (s > 0) parts.push(`${s} Sek`);
  return parts.join(" ");
}

interface QuickDurationInputProps {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  className?: string;
  placeholder?: string;
}

export function QuickDurationInput({
  value,
  onChange,
  onEnter,
  className,
  placeholder = "z.B. 1h20m4s",
}: QuickDurationInputProps) {
  const seconds = useMemo(() => parseDuration(value), [value]);
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), 500);
    return () => clearTimeout(t);
  }, [value]);

  const debouncedSeconds = useMemo(() => parseDuration(debouncedValue), [debouncedValue]);
  const isError = debouncedValue.trim() !== "" && debouncedSeconds === null;
  const isOverLimit =
    !isError && debouncedSeconds !== null && debouncedSeconds > MAX_DURATION_SECONDS;
  const showError = isError || isOverLimit;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Input
        type="text"
        inputMode="text"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        aria-invalid={showError || undefined}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter?.();
        }}
        className={showError ? "border-destructive focus-visible:ring-destructive" : undefined}
      />
      <div className="min-h-5 text-sm tabular-nums">
        {isError ? (
          <span className="text-destructive">
            Ungültiger Wert. Eine gültige Eingabe wäre 1h20m4s
          </span>
        ) : isOverLimit ? (
          <span className="text-destructive">
            Dauer darf maximal 24 Stunden betragen
          </span>
        ) : seconds !== null && seconds > 0 ? (
          <span className="text-muted-foreground">{formatReadable(seconds)}</span>
        ) : (
          <span className="text-muted-foreground/60">Format: 1h 20m 4s</span>
        )}
      </div>
    </div>
  );
}
