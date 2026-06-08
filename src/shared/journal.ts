export const MOODS = [
  { key: "entspannt", emoji: "😌", label: "Entspannt" },
  { key: "fröhlich", emoji: "😊", label: "Fröhlich" },
  { key: "verspielt", emoji: "🎾", label: "Verspielt" },
  { key: "müde", emoji: "😴", label: "Müde" },
  { key: "ängstlich", emoji: "😰", label: "Ängstlich" },
  { key: "reaktiv", emoji: "😤", label: "Reaktiv" },
  { key: "neutral", emoji: "😐", label: "Neutral" },
  { key: "hundekontakt", emoji: "🐶", label: "Hundekontakt" },
  { key: "freilauf", emoji: "🐕", label: "Freilauf" },
] as const;

export type Mood = (typeof MOODS)[number]["key"];
export const MOOD_KEYS = MOODS.map((m) => m.key);
export const MOOD_MAP: Record<Mood, (typeof MOODS)[number]> = Object.fromEntries(
  MOODS.map((m) => [m.key, m]),
) as Record<Mood, (typeof MOODS)[number]>;
