import { RATING_SCORE, type Rating } from "@/shared/ratings";

export function closestRatingLabel(score: number): string {
  const entries = Object.entries(RATING_SCORE).filter(([_, v]) => v !== null) as [Rating, number][];
  entries.sort((a, b) => Math.abs(score - a[1]) - Math.abs(score - b[1]));
  return entries[0]?.[0] ?? "";
}

export function formatDelta(value: number, suffix: string): { text: string; color: string; arrow: string } {
  if (value > 0) return { text: `↑ +${value}${suffix}`, color: "var(--color-green-600)", arrow: "↑" };
  if (value < 0) return { text: `↓ ${value}${suffix}`, color: "var(--color-red-600)", arrow: "↓" };
  return { text: `→ 0${suffix}`, color: "var(--color-muted-foreground)", arrow: "→" };
}
