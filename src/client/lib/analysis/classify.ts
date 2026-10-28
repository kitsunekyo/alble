import { BAND_HF, BAND_LF, BAND_MID, BAND_CORE, FFT_LEN, NFFT, SR } from "./constants";

/** Precomputed Hann window over NFFT samples. */
const HANN = (() => {
  const w = new Float64Array(NFFT);
  for (let i = 0; i < NFFT; i++) {
    w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (NFFT - 1));
  }
  return w;
})();

/** Scratch buffers for the FFT (single-threaded use only). */
const fftRe = new Float64Array(FFT_LEN);
const fftIm = new Float64Array(FFT_LEN);

/** In-place iterative radix-2 FFT. Length must be a power of two. */
function fft(re: Float64Array, im: Float64Array): void {
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
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
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
}

export interface SpectralFeatures {
  shares: { lf: number; core: number; mid: number; hf: number };
  domHz: number;
}

const BIN_HZ = SR / FFT_LEN;

function binOf(hz: number): number {
  return Math.max(0, Math.round(hz / BIN_HZ));
}

const LF_RANGE = [binOf(BAND_LF[0]), binOf(BAND_LF[1])] as const;
const CORE_RANGE = [binOf(BAND_CORE[0]), binOf(BAND_CORE[1])] as const;
const MID_RANGE = [binOf(BAND_MID[0]), binOf(BAND_MID[1])] as const;
const HF_RANGE = [binOf(BAND_HF[0]), binOf(BAND_HF[1])] as const;
const DOM_MIN = binOf(60);
const DOM_MAX = binOf(7400);

function bandPower(re: Float64Array, im: Float64Array, from: number, to: number): number {
  let sum = 0;
  for (let k = from; k < to; k++) {
    sum += re[k]! * re[k]! + im[k]! * im[k]!;
  }
  return sum;
}

/**
 * Spectral features of one event (frames [f0, f1)): band power shares and the
 * dominant frequency of the loudest frame. Mirrors the CLI's
 * spectral_features(), with the FFT zero-padded to 1024 points.
 */
export function spectralFeatures(
  x: Float32Array,
  f0: number,
  f1: number,
  peakDb: (i: number) => number,
): SpectralFeatures {
  const hop = Math.round(SR * 0.025);
  const band = { lf: 0, core: 0, mid: 0, hf: 0 };
  let domHz = 0;
  let domMag = -1;

  for (let i = f0; i < f1; i++) {
    const off = i * hop;
    if (off + NFFT > x.length) break;
    for (let k = 0; k < NFFT; k++) {
      fftRe[k] = x[off + k]! * HANN[k]!;
      fftIm[k] = 0;
    }
    for (let k = NFFT; k < FFT_LEN; k++) {
      fftRe[k] = 0;
      fftIm[k] = 0;
    }
    fft(fftRe, fftIm);

    band.lf += bandPower(fftRe, fftIm, LF_RANGE[0], LF_RANGE[1]);
    band.core += bandPower(fftRe, fftIm, CORE_RANGE[0], CORE_RANGE[1]);
    band.mid += bandPower(fftRe, fftIm, MID_RANGE[0], MID_RANGE[1]);
    band.hf += bandPower(fftRe, fftIm, HF_RANGE[0], HF_RANGE[1]);

    // dominant frequency (60 Hz .. 7.4 kHz)
    for (let k = DOM_MIN; k < DOM_MAX; k++) {
      const mag = fftRe[k]! * fftRe[k]! + fftIm[k]! * fftIm[k]!;
      if (mag > domMag) {
        domMag = mag;
        domHz = k * BIN_HZ;
      }
    }
  }

  void peakDb;
  const total = band.lf + band.core + band.mid + band.hf + 1e-20;
  return {
    shares: {
      lf: band.lf / total,
      core: band.core / total,
      mid: band.mid / total,
      hf: band.hf / total,
    },
    domHz,
  };
}
