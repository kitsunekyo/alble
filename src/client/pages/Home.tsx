"use client";

import { useState } from "react";
import { Card } from "@/client/components/ui/card";
import { QuickDurationInput } from "@/client/components/QuickDurationInput";
import { cn } from "@/client/lib/utils";

const MOOD_OPTIONS = [
  { key: "sehr-gut", emoji: "🤩", label: "Sehr gut" },
  { key: "gut", emoji: "😊", label: "Gut" },
  { key: "ok", emoji: "😐", label: "Ok" },
  { key: "schlecht", emoji: "😕", label: "Schlecht" },
  { key: "mies", emoji: "😢", label: "Mies" },
] as const;

const BEIGE = "#e8d9b5";

export function Home() {
  const [selected, setSelected] = useState<string | null>(null);
  const [duration, setDuration] = useState("");

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 md:pb-8 space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        Wie gehts Pina heute?
      </h1>

      <Card className="p-4">
        <div className="flex gap-2">
          {MOOD_OPTIONS.map((m) => {
            const active = selected === m.key;
            return (
              <button
                key={m.key}
                type="button"
                aria-pressed={active}
                onClick={() => setSelected(active ? null : m.key)}
                className={cn(
                  "flex-1 aspect-square rounded-xl border bg-white flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer",
                  "hover:bg-muted",
                  active && "border-transparent",
                )}
                style={active ? { backgroundColor: BEIGE, borderColor: BEIGE } : undefined}
              >
                <span className="text-3xl leading-none">{m.emoji}</span>
                <span className="text-sm font-medium">{m.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <section className="space-y-2 pt-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Alleinbleiben Training
        </h2>
        <Card className="p-4">
          <QuickDurationInput value={duration} onChange={setDuration} />
        </Card>
      </section>
    </div>
  );
}
