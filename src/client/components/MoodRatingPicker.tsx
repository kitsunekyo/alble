import { cn } from "@/client/lib/utils";
import { type Rating } from "@/shared/ratings";

export const BEIGE = "#e8d9b5";

export const MOOD_OPTIONS = [
  { key: "sehr-gut", emoji: "🤩", label: "Sehr gut", rating: "Ausgezeichnet" as Rating },
  { key: "gut", emoji: "😊", label: "Gut", rating: "Gut" as Rating },
  { key: "ok", emoji: "😐", label: "Ok", rating: "Mittel" as Rating },
  { key: "schlecht", emoji: "😕", label: "Schlecht", rating: "Schlecht" as Rating },
  { key: "mies", emoji: "😢", label: "Mies", rating: "Abbruch" as Rating },
] as const;

export const MOOD_COLORS: Record<string, string> = {
  "sehr-gut": "hsl(80.78deg 72.71% 60.15% / 22%)",
  "gut": "hsl(136.17deg 100% 50% / 11%)",
  ok: "hsl(53.09deg 100% 50% / 22%)",
  schlecht: "hsl(38.82deg 100% 50% / 22%)",
  mies: "hsl(0deg 100% 93.33%)",
};

interface MoodRatingPickerProps {
  value: Rating | null;
  onChange: (rating: Rating | null) => void;
  className?: string;
}

export function MoodRatingPicker({ value, onChange, className }: MoodRatingPickerProps) {
  return (
    <div className={cn("flex gap-1.5", className)}>
      {MOOD_OPTIONS.map((m) => {
        const active = value === m.rating;
        return (
          <button
            key={m.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : m.rating)}
            className={cn(
              "flex-1 rounded-lg border-2 border-transparent flex flex-col items-center justify-center gap-1 py-2 transition-colors cursor-pointer",
              active && "border-primary",
            )}
            style={{ backgroundColor: MOOD_COLORS[m.key] }}
          >
            <span className="text-xl leading-none">{m.emoji}</span>
            <span className="text-xs font-medium hidden md:block">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}