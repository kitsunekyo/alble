import { RATINGS, type Rating } from "@/shared/ratings";
import { cn } from "@/client/lib/utils";

interface Props {
  value: Rating | null;
  onChange: (rating: Rating) => void;
  className?: string;
}

const COMPACT: Record<Rating, string> = {
  Ausgezeichnet: "Ausgez.",
  Gut: "Gut",
  Mittel: "Mittel",
  "Bitte anschauen": "Bitte ansch.",
  Pause: "Pause",
};

const RING: Record<Rating, string> = {
  Ausgezeichnet:
    "data-[active=true]:bg-chart-2 data-[active=true]:text-white data-[active=true]:border-chart-2",
  Gut: "data-[active=true]:bg-chart-1 data-[active=true]:text-white data-[active=true]:border-chart-1",
  Mittel:
    "data-[active=true]:bg-chart-4 data-[active=true]:text-black data-[active=true]:border-chart-4",
  "Bitte anschauen":
    "data-[active=true]:bg-destructive data-[active=true]:text-white data-[active=true]:border-destructive",
  Pause:
    "data-[active=true]:bg-muted-foreground data-[active=true]:text-background data-[active=true]:border-muted-foreground",
};

export function RatingPicker({ value, onChange, className }: Props) {
  return (
    <div className={cn("grid grid-cols-5 gap-1.5", className)}>
      {RATINGS.map((rating) => {
        const active = value === rating;
        return (
          <button
            key={rating}
            type="button"
            data-active={active}
            onClick={() => onChange(rating)}
            className={cn(
              "px-2 py-3 text-xs font-medium rounded-md border bg-background transition-colors",
              "hover:bg-muted",
              RING[rating],
            )}
            aria-pressed={active}
          >
            {COMPACT[rating]}
          </button>
        );
      })}
    </div>
  );
}
