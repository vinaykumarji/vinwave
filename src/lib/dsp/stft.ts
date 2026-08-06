import type { WindowType } from "@/types/audio";
import { fft } from "./fft";
import { createWindow } from "./windows";

export interface StftConfig {
  fftSize: number;
  hopSize: number;
  windowType: WindowType;
}

export interface StftResult {
  /** Per-frame real/imaginary spectra, single-sided (fftSize/2 + 1 bins). */
  real: Float32Array[];
  imag: Float32Array[];
  frameCount: number;
  bins: number;
  config: StftConfig;
  signalLength: number;
}

export const hopFromOverlap = (fftSize: number, overlap: number): number =>
  Math.max(1, Math.round(fftSize * (1 - Math.min(0.9, Math.max(0.1, overlap)))));

/** Short-time Fourier transform of a mono signal. */
export function stft(signal: Float32Array, config: StftConfig): StftResult {
  const { fftSize, hopSize, windowType } = config;
  const window = createWindow(windowType, fftSize);
  const bins = fftSize / 2 + 1;
  const frameCount = Math.max(1, Math.ceil((signal.length + fftSize) / hopSize));
  const real: Float32Array[] = [];
  const imag: Float32Array[] = [];

  const re = new Float32Array(fftSize);
  const im = new Float32Array(fftSize);

  for (let f = 0; f < frameCount; f++) {
    const offset = f * hopSize - (fftSize >> 1);
    re.fill(0);
    im.fill(0);
    for (let n = 0; n < fftSize; n++) {
      const idx = offset + n;
      if (idx >= 0 && idx < signal.length) re[n] = signal[idx] * window[n];
    }
    fft(re, im);
    real.push(new Float32Array(re.subarray(0, bins)));
    imag.push(new Float32Array(im.subarray(0, bins)));
  }

  return { real, imag, frameCount, bins, config, signalLength: signal.length };
}

/** Inverse STFT with weighted overlap-add reconstruction. */
export function istft(spec: StftResult): Float32Array {
  const { fftSize, hopSize, windowType } = spec.config;
  const window = createWindow(windowType, fftSize);
  const out = new Float32Array(spec.signalLength);
  const norm = new Float32Array(spec.signalLength);

  const re = new Float32Array(fftSize);
  const im = new Float32Array(fftSize);

  for (let f = 0; f < spec.frameCount; f++) {
    re.fill(0);
    im.fill(0);
    const fr = spec.real[f];
    const fi = spec.imag[f];
    for (let k = 0; k < spec.bins; k++) {
      re[k] = fr[k];
      im[k] = fi[k];
      if (k > 0 && k < fftSize / 2) {
        re[fftSize - k] = fr[k];
        im[fftSize - k] = -fi[k];
      }
    }
    fft(re, im, true);

    const offset = f * hopSize - (fftSize >> 1);
    for (let n = 0; n < fftSize; n++) {
      const idx = offset + n;
      if (idx < 0 || idx >= out.length) continue;
      out[idx] += re[n] * window[n];
      norm[idx] += window[n] * window[n];
    }
  }

  for (let i = 0; i < out.length; i++) out[i] = norm[i] > 1e-8 ? out[i] / norm[i] : 0;
  return out;
}

/** Magnitude matrix helper used by spectrogram rendering and noise estimation. */
export function magnitudes(spec: StftResult): Float32Array[] {
  const mags: Float32Array[] = [];
  for (let f = 0; f < spec.frameCount; f++) {
    const m = new Float32Array(spec.bins);
    for (let k = 0; k < spec.bins; k++) m[k] = Math.hypot(spec.real[f][k], spec.imag[f][k]);
    mags.push(m);
  }
  return mags;
}
