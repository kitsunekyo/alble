/** Analysis constants — ported 1:1 from the validated CLI script (detect_sounds.py). */

export const SR = 16000; // analysis sample rate (Hz)
export const FRAME = 0.05; // frame length (s)
export const HOP = 0.025; // hop between frames (s)
export const NFFT = 800; // samples per frame = SR * FRAME

export const LEVEL = -40; // event starts above this dBFS
export const HYSTERESIS = 6; // event ends LEVEL - this many dB
export const MIN_DURATION = 0.15; // ignore shorter events (s)
export const MERGE_GAP = 0.35; // merge events closer than this (s)
export const EPISODE_GAP = 60; // events within this gap form one episode (s)

/** Spectral bands for classification (Hz). */
export const BAND_LF = [60, 250] as const; // rumble/wind
export const BAND_CORE = [250, 800] as const; // tonal dog vocal core
export const BAND_MID = [800, 3000] as const; // bark spread
export const BAND_HF = [3000, 7400] as const; // hiss/tags

/** FFT length: next power of two >= NFFT (zero-padded). */
export const FFT_LEN = 1024;

export const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024; // ~2 GB browser ArrayBuffer limit
