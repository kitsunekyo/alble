import {
  EPISODE_GAP,
  HOWL_MAX_CENTROID,
  HOWL_MAX_FLATNESS,
  HOWL_MIN_HARMONY,
  HYSTERESIS,
  LEVEL,
  MERGE_GAP,
  MIN_DURATION,
  HOP,
} from "./constants";
import type { FrameEnergies } from "./dsp";
import type { SpectralFeatures } from "./classify";
import type { AnalysisEpisode, AnalysisEvent, SoundEventType } from "@/shared/analysis";

export interface RawEvent {
  startS: number;
  endS: number;
  peakI: number; // index of loudest frame
}

/**
 * Hysteresis detector above LEVEL dBFS (enter LEVEL, exit LEVEL-HYSTERESIS),
 * then merge close events and drop blips — ported 1:1 from the CLI script.
 */
export function detectRawEvents({ t, db }: FrameEnergies): RawEvent[] {
  const enter = LEVEL;
  const exit = LEVEL - HYSTERESIS;

  const raw: Array<[number, number]> = [];
  let inside = false;
  let i0 = 0;
  for (let i = 0; i < t.length; i++) {
    if (!inside && db[i]! > enter) {
      inside = true;
      i0 = i;
    } else if (inside && db[i]! < exit) {
      inside = false;
      raw.push([i0, i]);
    }
  }
  if (inside) raw.push([i0, t.length]);

  // merge events separated by less than MERGE_GAP, tracking the loudest frame
  const events: RawEvent[] = [];
  for (const [a, b] of raw) {
    const peakI = a + argMax(db, a, b);
    const last = events[events.length - 1];
    if (last && t[a]! - last.endS < MERGE_GAP) {
      last.endS = t[b - 1]!;
      if (db[peakI]! > db[last.peakI]!) last.peakI = peakI;
    } else {
      events.push({ startS: t[a]!, endS: t[b - 1]!, peakI });
    }
  }

  return events.filter((e) => e.endS - e.startS + HOP >= MIN_DURATION);
}

function argMax(db: Float64Array, from: number, to: number): number {
  let best = from;
  for (let i = from + 1; i < to; i++) {
    if (db[i]! > db[best]!) best = i;
  }
  return best - from;
}

export interface ClassifiableEvent extends RawEvent {
  lf: number;
  core: number;
  mid: number;
  hf: number;
  domHz: number;
}

/**
 * Wind/rumble filter + Winseln (bark-like) / Jaulen (whine/cry) heuristic.
 *
 * The band-share rule alone misclassifies howls whose fundamental is 600-1000 Hz:
 * their harmonic stack fills the 800-3000 Hz band, `mid + hf` exceeds 0.25 and
 * they land in "bark" even though they are long, tonal and low pitched. So a
 * sustained, periodic, low-centroid event is always a whine (Jaulen) and only
 * short, bright or noisy events are barks (Winseln).
 */
export function classify(f: SpectralFeatures, dur: number): SoundEventType | "wind" {
  if (f.shares.lf > 0.5) return "wind";
  if (dur <= 0.6) return "bark";
  if (
    f.harmony >= HOWL_MIN_HARMONY &&
    f.flatness <= HOWL_MAX_FLATNESS &&
    f.centroid <= HOWL_MAX_CENTROID
  ) {
    return "whine";
  }
  if (f.shares.mid + f.shares.hf > 0.25) return "bark";
  return "whine";
}

/** Build episodes: groups of events separated by less than EPISODE_GAP. */
export function buildEpisodes(events: AnalysisEvent[]): AnalysisEpisode[] {
  if (events.length === 0) return [];
  const episodes: AnalysisEpisode[] = [];
  let cur = [events[0]!];
  for (const e of events.slice(1)) {
    if (e.s - cur[cur.length - 1]!.e < EPISODE_GAP) {
      cur.push(e);
    } else {
      episodes.push(episodeOf(cur));
      cur = [e];
    }
  }
  episodes.push(episodeOf(cur));
  return episodes;
}

function episodeOf(events: AnalysisEvent[]): AnalysisEpisode {
  const snd = events.reduce((a, e) => a + e.d, 0);
  return { s: events[0]!.s, e: events[events.length - 1]!.e, n: events.length, snd: Math.round(snd) };
}
