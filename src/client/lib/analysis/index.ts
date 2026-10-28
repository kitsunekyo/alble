import { LEVEL, HOP } from "./constants";
import { decodeMono16k, type DecodeStage } from "./decode";
import { frameEnergies, perSecondCurve } from "./dsp";
import { detectRawEvents, classify, buildEpisodes } from "./detect";
import { spectralFeatures } from "./classify";
import { parseReolinkTimes } from "./filename";
import type { AnalysisEvent, AnalysisEpisode } from "@/shared/analysis";

export type AnalysisStage = DecodeStage | "analyze";

export interface AnalysisResult {
  fileName: string;
  fileSize: number;
  durationSeconds: number; // audio length (s)
  level: number; // threshold used (dBFS)
  startedAt: number | null; // recording clock start, seconds of day (from filename)
  curve: number[]; // per-second max dBFS
  events: AnalysisEvent[]; // bark + whine (wind excluded)
  windExcluded: number;
}

export interface AnalyzeOutput extends AnalysisResult {
  episodes: AnalysisEpisode[]; // episodes over all (non-wind) events
  soundSeconds: number;
  counts: { bark: number; whine: number };
}

/**
 * Analyze a video's sound entirely in the browser: decode -> frame energies ->
 * hysteresis detection -> spectral classification -> episodes.
 * The video file never leaves the browser.
 */
export async function analyzeVideo(
  file: File,
  onStage: (stage: AnalysisStage) => void,
): Promise<AnalysisResult> {
  const x = await decodeMono16k(file, onStage);

  onStage("analyze");
  const energies = frameEnergies(x);
  const raw = detectRawEvents(energies);

  const events: AnalysisEvent[] = [];
  let windExcluded = 0;

  for (const ev of raw) {
    const f0 = Math.floor(ev.startS / HOP);
    const f1 = Math.floor(ev.endS / HOP) + 1;
    const { shares, domHz } = spectralFeatures(x, f0, f1, () => energies.db[ev.peakI]!);
    const dur = ev.endS - ev.startS + HOP;
    const type = classify(shares, dur);
    if (type === "wind") {
      windExcluded++;
      continue;
    }
    events.push({
      s: Math.round(ev.startS * 100) / 100,
      e: Math.round(ev.endS * 100) / 100,
      d: Math.round(dur * 100) / 100,
      pk: Math.round(energies.db[ev.peakI]! * 10) / 10,
      hz: Math.round(domHz),
      ty: type,
    });
  }

  const parsed = parseReolinkTimes(file.name);

  return {
    fileName: file.name,
    fileSize: file.size,
    durationSeconds: x.length / 16000,
    level: LEVEL,
    startedAt: parsed?.startSec ?? null,
    curve: perSecondCurve(energies.t, energies.db),
    events,
    windExcluded,
  };
}

/** Derived aggregates used for saving and reporting. */
export function aggregate(result: AnalysisResult): AnalyzeOutput {
  let bark = 0;
  let whine = 0;
  let sound = 0;
  for (const e of result.events) {
    if (e.ty === "bark") bark++;
    else whine++;
    sound += e.d;
  }
  return {
    ...result,
    counts: { bark, whine },
    soundSeconds: Math.round(sound),
    episodes: buildEpisodes(result.events),
  };
}
