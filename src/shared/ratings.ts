export const RATINGS = [
  "Ausgezeichnet",
  "Gut",
  "Mittel",
  "Bitte anschauen",
  "Pause",
] as const;

export type Rating = (typeof RATINGS)[number];

export const RATING_SCORE: Record<Rating, number | null> = {
  Ausgezeichnet: 4,
  Gut: 3,
  Mittel: 2,
  "Bitte anschauen": 1,
  Pause: null,
};

export const RATING_COLORS: Record<Rating, string> = {
  Ausgezeichnet: "var(--color-chart-2)",
  Gut: "var(--color-chart-1)",
  Mittel: "var(--color-chart-4)",
  "Bitte anschauen": "var(--color-destructive)",
  Pause: "var(--color-muted-foreground)",
};

export function weekFromGlobalDay(globalDay: number): number {
  return Math.ceil(globalDay / 7);
}

export function dayInWeekFromGlobalDay(globalDay: number): number {
  return ((globalDay - 1) % 7) + 1;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}
