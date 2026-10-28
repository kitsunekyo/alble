import type { Preset } from "@/shared/analysis";
import type { AnalysisEvent } from "@/shared/analysis";

/** Filter events for a preset view. */
export function filterByPreset(events: AnalysisEvent[], preset: Preset): AnalysisEvent[] {
  if (preset === "all") return events;
  return events.filter((e) => e.ty === preset);
}

export interface Summary {
  count: number;
  bark: number;
  whine: number;
  soundSeconds: number;
}

export function summarize(events: AnalysisEvent[]): Summary {
  let bark = 0;
  let whine = 0;
  let sound = 0;
  for (const e of events) {
    if (e.ty === "bark") bark++;
    else whine++;
    sound += e.d;
  }
  return { count: events.length, bark, whine, soundSeconds: Math.round(sound) };
}
