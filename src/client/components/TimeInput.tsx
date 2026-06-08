import { Input } from "@/client/components/ui/input";
import { cn } from "@/client/lib/utils";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function parsePart(value: string, max: number, len: number): string {
  const digits = value.replace(/\D/g, "").slice(0, len);
  if (digits === "") return "";
  const n = Number.parseInt(digits, 10);
  if (n > max) return String(max);
  return digits;
}

export function TimeInput({ value, onChange, className }: TimeInputProps) {
  const [hh = "", mm = ""] = value.split(":");

  function onHourChange(raw: string) {
    const parsed = parsePart(raw, 23, 2);
    onChange(`${parsed}:${mm}`);
  }

  function onMinuteChange(raw: string) {
    const parsed = parsePart(raw, 59, 2);
    onChange(`${hh}:${parsed}`);
  }

  function onHourBlur() {
    const val = hh === "" ? "00" : hh.length === 1 ? `0${hh}` : hh;
    onChange(`${val}:${mm}`);
  }

  function onMinuteBlur() {
    const val = mm === "" ? "00" : mm.length === 1 ? `0${mm}` : mm;
    onChange(`${hh}:${val}`);
  }

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      <Input
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={hh}
        onChange={(e) => onHourChange(e.target.value)}
        onBlur={onHourBlur}
        className="w-10 text-center px-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Stunde"
      />
      <span className="text-muted-foreground select-none">:</span>
      <Input
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={mm}
        onChange={(e) => onMinuteChange(e.target.value)}
        onBlur={onMinuteBlur}
        className="w-10 text-center px-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Minute"
      />
    </div>
  );
}
