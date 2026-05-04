import { Input } from "@/client/components/ui/input";
import { cn } from "@/client/lib/utils";

export interface DurationParts {
  hours: string;
  minutes: string;
  seconds: string;
}

interface DurationInputProps {
  value: DurationParts;
  onChange: (value: DurationParts) => void;
  onEnter?: () => void;
  className?: string;
}

export function secondsToDurationParts(totalSeconds: number): DurationParts {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours: hours === 0 ? "" : String(hours),
    minutes: minutes === 0 ? "" : String(minutes),
    seconds: seconds === 0 ? "" : String(seconds),
  };
}

export function durationPartsToSeconds(value: DurationParts): number | null {
  const hours = parsePart(value.hours);
  const minutes = parsePart(value.minutes);
  const seconds = parsePart(value.seconds);

  if (hours === null || minutes === null || seconds === null) return null;

  return hours * 3600 + minutes * 60 + seconds;
}

export function DurationInput({ value, onChange, onEnter, className }: DurationInputProps) {
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      <DurationField
        label="Std"
        placeholder="0"
        value={value.hours}
        onChange={(hours) => onChange({ ...value, hours })}
        onEnter={onEnter}
      />
      <DurationField
        label="Min"
        placeholder="0"
        value={value.minutes}
        onChange={(minutes) => onChange({ ...value, minutes })}
        onEnter={onEnter}
      />
      <DurationField
        label="Sek"
        placeholder="0"
        value={value.seconds}
        onChange={(seconds) => onChange({ ...value, seconds })}
        onEnter={onEnter}
      />
    </div>
  );
}

function DurationField({
  label,
  placeholder,
  value,
  onChange,
  onEnter,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter?.();
        }}
      />
    </label>
  );
}

function parsePart(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return 0;

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || String(parsed) !== trimmed) return null;

  return parsed;
}
