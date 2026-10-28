import { NFFT, SR, FRAME, HOP } from "./constants";

export interface FrameEnergies {
  t: Float64Array; // frame start times (s)
  db: Float64Array; // frame RMS energy (dBFS)
}

/**
 * Per-frame RMS energy in dBFS, computed via a cumulative sum of squares
 * (identical math to the CLI reference implementation).
 */
export function frameEnergies(x: Float32Array): FrameEnergies {
  if (x.length < NFFT) {
    return { t: new Float64Array(0), db: new Float64Array(0) };
  }

  const cum = new Float64Array(x.length + 1);
  for (let i = 0; i < x.length; i++) {
    cum[i + 1] = cum[i]! + x[i]! * x[i]!;
  }

  const hop = Math.round(SR * HOP);
  const nFrames = Math.floor((x.length - NFFT) / hop) + 1;
  const t = new Float64Array(nFrames);
  const db = new Float64Array(nFrames);

  for (let i = 0; i < nFrames; i++) {
    const start = i * hop;
    const sum = cum[start + NFFT]! - cum[start]!;
    const rms = Math.sqrt(sum / NFFT);
    t[i] = start / SR;
    db[i] = 20 * Math.log10(rms + 1e-10);
  }

  void FRAME;
  return { t, db };
}

/**
 * Per-second maximum energy (dBFS) for the timeline curve.
 * Index i covers second [i, i+1).
 */
export function perSecondCurve(t: Float64Array, db: Float64Array): number[] {
  if (t.length === 0) return [];
  const nSec = Math.floor(t[t.length - 1]!) + 1;
  const curve = new Array<number>(nSec).fill(-90);
  for (let i = 0; i < t.length; i++) {
    const sec = Math.min(Math.floor(t[i]!), nSec - 1);
    if (db[i]! > curve[sec]!) curve[sec] = db[i]!;
  }
  return curve;
}
