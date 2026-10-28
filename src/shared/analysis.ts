import { z } from "zod";

export const SOUND_EVENT_TYPES = ["bark", "whine"] as const;
export type SoundEventType = (typeof SOUND_EVENT_TYPES)[number];

export const PRESETS = ["all", "whine", "bark"] as const;
export type Preset = (typeof PRESETS)[number];

export const PRESET_LABELS: Record<Preset, string> = {
  all: "Alle Geräusche",
  whine: "Jammern & Weinen",
  bark: "Bellen",
};

export const ANALYSIS_EVENT_CAP = 2000;

/** A detected sound event. Keys kept compact; the full list is persisted capped. */
export const analysisEventSchema = z.object({
  s: z.number().min(0), // start, seconds into the video
  e: z.number().min(0), // end, seconds into the video
  d: z.number().min(0), // duration seconds
  pk: z.number(), // peak loudness in dBFS
  hz: z.number().min(0), // dominant frequency
  ty: z.enum(SOUND_EVENT_TYPES),
});
export type AnalysisEvent = z.infer<typeof analysisEventSchema>;

export const analysisEpisodeSchema = z.object({
  s: z.number().min(0),
  e: z.number().min(0),
  n: z.number().int().min(1), // number of events
  snd: z.number().min(0), // seconds of sound
});
export type AnalysisEpisode = z.infer<typeof analysisEpisodeSchema>;

export const analysisMetricsSchema = z.object({
  level: z.number(), // detection threshold in dBFS
  durationSeconds: z.number().min(0),
  soundSeconds: z.number().min(0),
  windExcluded: z.number().int().min(0),
  counts: z.object({ bark: z.number().int().min(0), whine: z.number().int().min(0) }),
  episodes: z.array(analysisEpisodeSchema),
  events: z.array(analysisEventSchema).max(ANALYSIS_EVENT_CAP),
});
export type AnalysisMetrics = z.infer<typeof analysisMetricsSchema>;

/**
 * Seconds of whine/cry in an analysis. `soundSeconds` is the sum over *all*
 * events (barks included), so it can't be shown next to a whine count.
 */
export function whineSecondsOf(metrics: AnalysisMetrics): number {
  let total = 0;
  for (const e of metrics.events) if (e.ty === "whine") total += e.d;
  return Math.round(total);
}

export const saveAnalysisSchema = z.object({
  date: z.iso.date(), // training day this recording belongs to
  file_name: z.string().min(1).max(300),
  started_at: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).nullable(), // clock start from filename
  metrics: analysisMetricsSchema,
});
export type SaveAnalysisInput = z.infer<typeof saveAnalysisSchema>;

export interface VideoAnalysisDTO {
  id: number;
  date: string;
  file_name: string;
  started_at: string | null;
  created_at: number;
  metrics: AnalysisMetrics;
}
