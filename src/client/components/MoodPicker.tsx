"use client";

import { cn } from "@/client/lib/utils";
import { MOODS } from "@/shared/journal";
import type { Mood } from "@/shared/journal";

interface MoodPickerProps {
  value: Mood | null;
  onChange: (mood: Mood | null) => void;
}

export function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MOODS.map((m) => {
        const selected = value === m.key;
        return (
          <button
            key={m.key}
            type="button"
            aria-label={m.label}
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : m.key)}
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center text-lg bg-muted/40 opacity-60 hover:opacity-100 hover:bg-muted transition-all cursor-pointer",
              selected && "opacity-100 bg-primary/10 ring-2 ring-primary scale-110",
            )}
            title={m.label}
          >
            {m.emoji}
          </button>
        );
      })}
    </div>
  );
}
