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
              "flex-1 rounded-lg border bg-white flex flex-col items-center justify-center gap-1 py-2 transition-colors cursor-pointer",
              "hover:bg-muted",
              active && "border-transparent",
            )}
            style={active ? { backgroundColor: BEIGE, borderColor: BEIGE } : undefined}
          >
            <span className="text-xl leading-none">{m.emoji}</span>
            <span className="text-xs font-medium">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}