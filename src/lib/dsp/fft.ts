/**
 * Iterative in-place radix-2 Cooley-Tukey FFT.
 * Classical DSP only — no external libraries, no ML.
 */

const reverseTables = new Map<number, Uint32Array>();
const twiddleTables = new Map<number, { cos: Float32Array; sin: Float32Array }>();

export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

function bitReverseTable(n: number): Uint32Array {
  const cached = reverseTables.get(n);
  if (cached) return cached;
  const bits = Math.log2(n);
  const table = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let rev = 0;
    for (let b = 0; b < bits; b++) if (i & (1 << b)) rev |= 1 << (bits - 1 - b);
    table[i] = rev;
  }
  reverseTables.set(n, table);
  return table;
}

function twiddles(n: number) {
  const cached = twiddleTables.get(n);
  if (cached) return cached;
  const cos = new Float32Array(n / 2);
  const sin = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    cos[i] = Math.cos((-2 * Math.PI * i) / n);
    sin[i] = Math.sin((-2 * Math.PI * i) / n);
  }
  const table = { cos, sin };
  twiddleTables.set(n, table);
  return table;
}

/** In-place complex FFT. `inverse` performs the scaled inverse transform. */
export function fft(re: Float32Array, im: Float32Array, inverse = false): void {
  const n = re.length;
  if (!isPowerOfTwo(n)) throw new Error(`FFT size must be a power of two, received ${n}`);

  const rev = bitReverseTable(n);
  for (let i = 0; i < n; i++) {
    const j = rev[i];
    if (j > i) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }

  const { cos, sin } = twiddles(n);
  const sign = inverse ? -1 : 1;

  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const step = n / size;
    for (let i = 0; i < n; i += size) {
      for (let j = 0; j < half; j++) {
        const k = j * step;
        const wr = cos[k];
        const wi = sign * sin[k];
        const a = i + j;
        const b = a + half;
        const tr = re[b] * wr - im[b] * wi;
        const ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }

  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] /= n;
      im[i] /= n;
    }
  }
}

/** Magnitude spectrum (single-sided, length n/2 + 1) of a real frame. */
export function magnitudeSpectrum(frame: Float32Array, fftSize: number): Float32Array {
  const re = new Float32Array(fftSize);
  const im = new Float32Array(fftSize);
  re.set(frame.subarray(0, Math.min(frame.length, fftSize)));
  fft(re, im);
  const bins = fftSize / 2 + 1;
  const out = new Float32Array(bins);
  for (let i = 0; i < bins; i++) out[i] = Math.hypot(re[i], im[i]);
  return out;
}

export const toDb = (magnitude: number, floorDb = -120): number =>
  Math.max(floorDb, 20 * Math.log10(magnitude + 1e-12));
