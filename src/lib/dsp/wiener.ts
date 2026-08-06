import type { WienerParams } from "@/types/audio";
import { hopFromOverlap, istft, stft } from "./stft";
import type { EnhancementResult, ProgressFn } from "./spectralSubtraction";

export const DEFAULT_WIENER: WienerParams = {
  fftSize: 1024,
  overlap: 0.75,
  windowType: "hann",
  noiseEstimateMs: 400,
  smoothing: 0.94,
  noiseVarianceScale: 1,
};

/**
 * Frequency-domain Wiener filter with decision-directed a priori SNR
 * estimation (classical Ephraim-Malah recursion, Wiener gain form).
 * Gain(k) = xi(k) / (1 + xi(k))
 */
export async function wienerFilter(
  signal: Float32Array,
  sampleRate: number,
  params: WienerParams,
  onProgress?: ProgressFn,
): Promise<EnhancementResult> {
  const hopSize = hopFromOverlap(params.fftSize, params.overlap);
  const spec = stft(signal, {
    fftSize: params.fftSize,
    hopSize,
    windowType: params.windowType,
  });

  const noiseFrames = Math.max(
    2,
    Math.round(((params.noiseEstimateMs / 1000) * sampleRate) / hopSize),
  );
  const used = Math.min(noiseFrames, spec.frameCount);
  const noisePower = new Float32Array(spec.bins);
  for (let f = 0; f < used; f++) {
    for (let k = 0; k < spec.bins; k++) {
      const mag = Math.hypot(spec.real[f][k], spec.imag[f][k]);
      noisePower[k] += mag * mag;
    }
  }
  for (let k = 0; k < spec.bins; k++) {
    noisePower[k] = (noisePower[k] / used) * params.noiseVarianceScale + 1e-12;
  }

  const prevGain = new Float32Array(spec.bins).fill(1);
  const prevPower = new Float32Array(spec.bins);
  const alpha = Math.min(0.99, Math.max(0.5, params.smoothing));

  for (let f = 0; f < spec.frameCount; f++) {
    const re = spec.real[f];
    const im = spec.imag[f];
    for (let k = 0; k < spec.bins; k++) {
      const mag = Math.hypot(re[k], im[k]);
      const power = mag * mag;
      const gammaPost = power / noisePower[k];
      const xiPrev = (prevGain[k] * prevGain[k] * prevPower[k]) / noisePower[k];
      const xi = alpha * xiPrev + (1 - alpha) * Math.max(gammaPost - 1, 0);
      const gain = xi / (1 + xi);
      re[k] *= gain;
      im[k] *= gain;
      prevGain[k] = gain;
      prevPower[k] = power;
    }
    if (onProgress && f % 24 === 0) {
      await onProgress(f / spec.frameCount);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  const samples = istft(spec);
  const noiseProfileDb = new Float32Array(spec.bins);
  for (let k = 0; k < spec.bins; k++) {
    noiseProfileDb[k] = 10 * Math.log10(noisePower[k] + 1e-12);
  }

  return { samples, noiseProfileDb, framesProcessed: spec.frameCount };
}
