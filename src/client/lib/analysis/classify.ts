import {
  BAND_HF,
  BAND_LF,
  BAND_MID,
  BAND_CORE,
  CONV_LEN,
  HARMONY_MAX_HZ,
  HARMONY_MIN_HZ,
  NFFT,
  SR,
} from "./constants";

/** Precomputed Hann window over NFFT samples (matches np.hanning). */
const HANN = (() => {
  const w = new Float64Array(NFFT);
  for (let i = 0; i < NFFT; i++) {
    w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (NFFT - 1));
  }
  return w;
})();

/** In-place iterative radix-2 FFT. Length must be a power of two. */
function fft(re: Float64Array, im: Float64Array, inverse = false): void {
  const n = re.length;
  // bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }
  // butterflies
  const sign = inverse ? 1 : -1;
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (sign * 2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = i + k + len / 2;
        const tRe = re[b]! * curRe - im[b]! * curIm;
        const tIm = re[b]! * curIm + im[b]! * curRe;
        re[b] = re[a]! - tRe;
        im[b] = im[a]! - tIm;
        re[a] = re[a]! + tRe;
        im[a] = im[a]! + tIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] = re[i]! / n;
      im[i] = im[i]! / n;
    }
  }
}

/**
 * Exact NFFT-point DFT via Bluestein's chirp-z algorithm.
 *
 * The CLI uses `np.fft.rfft` over the 800-sample frame (20 Hz bins) and compares
 * band edges against those exact bin frequencies. A zero-padded 1024-point FFT
 * samples the same spectrum on a finer 15.625 Hz grid, which shifts the summed
 * band power enough to reclassify borderline wind/rumble events. This computes
 * the same 800 bins as the reference so band shares match.
 */
const CHIRP_RE = new Float64Array(NFFT);
const CHIRP_IM = new Float64Array(NFFT);
(() => {
  // w[j] = exp(-i*pi*j^2/n) — reduced mod 2n to keep the angle small
  const mod = 2 * NFFT;
  const jsq = new Float64Array(NFFT);
  for (let j = 0; j < NFFT; j++) {
    const sq = (j * j) % mod;
    jsq[j] = sq;
    const ang = (-Math.PI * sq) / NFFT;
    CHIRP_RE[j] = Math.cos(ang);
    CHIRP_IM[j] = Math.sin(ang);
  }
})();

/** FFT of the chirp kernel b (precomputed once). */
const KERNEL_RE = new Float64Array(CONV_LEN);
const KERNEL_IM = new Float64Array(CONV_LEN);
(() => {
  // b[j] = conj(w[j]) for 0 <= j < n; b[M-j] = conj(w[j]) for 1 <= j < n
  for (let j = 0; j < NFFT; j++) {
    KERNEL_RE[j] = CHIRP_RE[j]!;
    KERNEL_IM[j] = -CHIRP_IM[j]!;
    if (j > 0) {
      KERNEL_RE[CONV_LEN - j] = CHIRP_RE[j]!;
      KERNEL_IM[CONV_LEN - j] = -CHIRP_IM[j]!;
    }
  }
  fft(KERNEL_RE, KERNEL_IM);
})();

/** Scratch buffers for the per-frame transform (single-threaded use only). */
const dftRe = new Float64Array(CONV_LEN);
const dftIm = new Float64Array(CONV_LEN);

/** Run one frame through the exact NFFT-point DFT; writes bins into dftRe/dftIm. */
function dftFrame(x: Float32Array, off: number): void {
  for (let j = 0; j < NFFT; j++) {
    const v = x[off + j]! * HANN[j]!;
    dftRe[j] = v * CHIRP_RE[j]!;
    dftIm[j] = v * CHIRP_IM[j]!;
  }
  for (let j = NFFT; j < CONV_LEN; j++) {
    dftRe[j] = 0;
    dftIm[j] = 0;
  }
  fft(dftRe, dftIm);

  for (let k = 0; k < CONV_LEN; k++) {
    const aRe = dftRe[k]!;
    const aIm = dftIm[k]!;
    const bRe = KERNEL_RE[k]!;
    const bIm = KERNEL_IM[k]!;
    dftRe[k] = aRe * bRe - aIm * bIm;
    dftIm[k] = aRe * bIm + aIm * bRe;
  }
  fft(dftRe, dftIm, true);

  // X[k] = w[k] * conv[k]
  for (let k = 0; k < NFFT; k++) {
    const cRe = dftRe[k]!;
    const cIm = dftIm[k]!;
    const wRe = CHIRP_RE[k]!;
    const wIm = CHIRP_IM[k]!;
    dftRe[k] = cRe * wRe - cIm * wIm;
    dftIm[k] = cRe * wIm + cIm * wRe;
  }
}

export interface SpectralFeatures {
  shares: { lf: number; core: number; mid: number; hf: number };
  domHz: number;
  /** Power-weighted mean frequency of the event (Hz). */
  centroid: number;
  /** Normalized autocorrelation peak (0..1) of the loudest frame. */
  harmony: number;
  /** Spectral flatness of the event (0 = pure tone, ~1 = white noise). */
  flatness: number;
}

const BIN_HZ = SR / NFFT; // 20 Hz — same grid as np.fft.rfftfreq(NFFT, 1/SR)

/** First bin whose frequency is >= hz. */
function binFrom(hz: number): number {
  return Math.min(NFFT, Math.max(0, Math.ceil((hz * NFFT) / SR)));
}

function rangeOf(lo: number, hi: number): [number, number] {
  return [binFrom(lo), binFrom(hi)];
}

const LF_RANGE = rangeOf(BAND_LF[0], BAND_LF[1]);
const CORE_RANGE = rangeOf(BAND_CORE[0], BAND_CORE[1]);
const MID_RANGE = rangeOf(BAND_MID[0], BAND_MID[1]);
const HF_RANGE = rangeOf(BAND_HF[0], BAND_HF[1]);
const DOM_MIN = binFrom(60);
const DOM_MAX = Math.floor((7400 * NFFT) / SR); // inclusive

const HARMONY_LAG_MIN = Math.ceil(SR / HARMONY_MAX_HZ);
const HARMONY_LAG_MAX = Math.floor(SR / HARMONY_MIN_HZ);

function bandPower(from: number, to: number): number {
  let sum = 0;
  for (let k = from; k < to; k++) {
    sum += dftRe[k]! * dftRe[k]! + dftIm[k]! * dftIm[k]!;
  }
  return sum;
}

/**
 * Periodicity of one frame: peak of the normalized autocorrelation for lags
 * matching HARMONY_MIN_HZ..HARMONY_MAX_HZ. ~1 for a clean tone, low for noise.
 */
function harmonyAt(x: Float32Array, off: number): number {
  let mean = 0;
  for (let k = 0; k < NFFT; k++) mean += x[off + k]!;
  mean /= NFFT;

  let energy = 0;
  for (let k = 0; k < NFFT; k++) {
    const v = x[off + k]! - mean;
    energy += v * v;
  }
  if (energy <= 1e-12) return 0;

  let best = 0;
  for (let lag = HARMONY_LAG_MIN; lag <= HARMONY_LAG_MAX; lag++) {
    let sum = 0;
    for (let k = 0; k + lag < NFFT; k++) {
      sum += (x[off + k]! - mean) * (x[off + k + lag]! - mean);
    }
    const r = sum / energy;
    if (r > best) best = r;
  }
  return best;
}

const SPECTRUM_BINS = DOM_MAX - DOM_MIN + 1;
/** Mean power spectrum of the current event (scratch, single-threaded use). */
const meanSpectrum = new Float64Array(SPECTRUM_BINS);

/**
 * Spectral features of one event (frames [f0, f1)): band power shares, the
 * dominant frequency of the loudest frame, spectral centroid, flatness and the
 * periodicity of the loudest frame. Band shares mirror the CLI's
 * spectral_features() bin for bin.
 */
export function spectralFeatures(x: Float32Array, f0: number, f1: number): SpectralFeatures {
  const hop = Math.round(SR * 0.025);
  const band = { lf: 0, core: 0, mid: 0, hf: 0 };
  let domHz = 0;
  let domMag = -1;
  let domFrame = -1;
  let centNum = 0;
  let centDen = 0;
  meanSpectrum.fill(0);

  for (let i = f0; i < f1; i++) {
    const off = i * hop;
    if (off + NFFT > x.length) break;
    dftFrame(x, off);

    band.lf += bandPower(LF_RANGE[0], LF_RANGE[1]);
    band.core += bandPower(CORE_RANGE[0], CORE_RANGE[1]);
    band.mid += bandPower(MID_RANGE[0], MID_RANGE[1]);
    band.hf += bandPower(HF_RANGE[0], HF_RANGE[1]);

    // dominant frequency (60 Hz .. 7.4 kHz, inclusive) + spectral centroid
    for (let k = DOM_MIN; k <= DOM_MAX; k++) {
      const mag = dftRe[k]! * dftRe[k]! + dftIm[k]! * dftIm[k]!;
      centNum += k * BIN_HZ * mag;
      centDen += mag;
      meanSpectrum[k - DOM_MIN] = meanSpectrum[k - DOM_MIN]! + mag;
      if (mag > domMag) {
        domMag = mag;
        domHz = k * BIN_HZ;
        domFrame = i;
      }
    }
  }

  // spectral flatness of the mean spectrum: geometric / arithmetic mean power
  let logSum = 0;
  for (let k = 0; k < SPECTRUM_BINS; k++) logSum += Math.log(meanSpectrum[k]! + 1e-20);
  const arith = centDen / SPECTRUM_BINS;

  const total = band.lf + band.core + band.mid + band.hf + 1e-20;
  return {
    shares: {
      lf: band.lf / total,
      core: band.core / total,
      mid: band.mid / total,
      hf: band.hf / total,
    },
    domHz,
    centroid: centDen > 0 ? centNum / centDen : 0,
    harmony: domFrame >= 0 ? harmonyAt(x, domFrame * hop) : 0,
    flatness: arith > 0 ? Math.exp(logSum / SPECTRUM_BINS) / arith : 0,
  };
}
