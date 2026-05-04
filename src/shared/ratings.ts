export const RATINGS = [
  "Ausgezeichnet",
  "Gut",
  "Mittel",
  "Schlecht",
  "Abbruch",
] as const;

export type Rating = (typeof RATINGS)[number];

export const RATING_SCORE: Record<Rating, number | null> = {
  Ausgezeichnet: 4,
  Gut: 3,
  Mittel: 2,
  Schlecht: 1,
  Abbruch: 0,
};

export const RATING_COLORS: Record<Rating, string> = {
  Ausgezeichnet: "var(--color-lime-500)",
  Gut: "var(--color-green-700)",
  Mittel: "var(--color-yellow-500)",
  Schlecht: "var(--color-orange-500)",
  Abbruch: "var(--color-red-800)",
};

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}
