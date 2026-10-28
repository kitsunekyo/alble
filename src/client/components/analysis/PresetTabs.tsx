"use client";

import { PRESETS, PRESET_LABELS, type Preset } from "@/shared/analysis";
import { cn } from "@/client/lib/utils";

export function PresetTabs({ preset, onChange }: { preset: Preset; onChange: (p: Preset) => void }) {
  return (
    <div className="flex gap-2">
      {PRESETS.map((p) => {
        const isActive = preset === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors border",
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "text-muted-foreground border-border bg-transparent hover:bg-muted",
            )}
          >
            {PRESET_LABELS[p]}
          </button>
        );
      })}
    </div>
  );
}
