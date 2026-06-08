"use client";

import { cn } from "@/client/lib/utils";
import { MOODS } from "@/shared/journal";
import type { Mood } from "@/shared/journal";

interface MoodPickerProps {
  value: Mood[];
  onChange: (moods: Mood[]) => void;
}

export function MoodPicker({ value, onChange }: MoodPickerProps) {
  function toggle(mood: Mood) {
    if (value.includes(mood)) {
      onChange(value.filter((m) => m !== mood));
    } else {
      onChange([...value, mood]);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {MOODS.map((m) => {
        const selected = value.includes(m.key);
        return (
          <button
            key={m.key}
            type="button"
            aria-label={m.label}
            aria-pressed={selected}
            onClick={() => toggle(m.key)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm bg-muted/40 opacity-60 hover:opacity-100 hover:bg-muted transition-all cursor-pointer",
              selected && "opacity-100 bg-primary/10 ring-2 ring-primary",
            )}
          >
            <span className="text-base">{m.emoji}</span>
            <span className="text-xs">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
