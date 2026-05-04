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
  Schlecht: "Schlecht",
  Abbruch: "Abbruch",
};

const RING: Record<Rating, string> = {
  Ausgezeichnet: "data-[active=true]:bg-lime-500 data-[active=true]:text-black data-[active=true]:border-lime-500",
  Gut: "data-[active=true]:bg-green-700 data-[active=true]:text-white data-[active=true]:border-green-700",
  Mittel: "data-[active=true]:bg-yellow-500 data-[active=true]:text-black data-[active=true]:border-yellow-500",
  Schlecht: "data-[active=true]:bg-orange-500 data-[active=true]:text-black data-[active=true]:border-orange-500",
  Abbruch: "data-[active=true]:bg-red-800 data-[active=true]:text-white data-[active=true]:border-red-800",
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
