import type { SpectralSubtractionParams } from "@/types/audio";
import { hopFromOverlap, istft, stft, type StftResult } from "./stft";

export const DEFAULT_SPECTRAL_SUBTRACTION: SpectralSubtractionParams = {
  fftSize: 1024,
  overlap: 0.75,
  windowType: "hann",
  noiseEstimateMs: 400,
  reductionStrength: 1.8,
  spectralFloor: 0.05,
};

export interface EnhancementResult {
  samples: Float32Array;
  noiseProfileDb: Float32Array;
  framesProcessed: number;
}

export type ProgressFn = (ratio: number) => void | Promise<void>;

/** Average magnitude spectrum over the leading noise-only region. */
function estimateNoiseProfile(spec: StftResult, frames: number): Float32Array {
  const profile = new Float32Array(spec.bins);
  const used = Math.max(1, Math.min(frames, spec.frameCount));
  for (let f = 0; f < used; f++) {
    for (let k = 0; k < spec.bins; k++) {
      profile[k] += Math.hypot(spec.real[f][k], spec.imag[f][k]);
    }
  }
  for (let k = 0; k < spec.bins; k++) profile[k] /= used;
  return profile;
}

/**
 * Magnitude spectral subtraction (Boll, 1979) with over-subtraction factor and
 * a spectral floor to control musical noise. Phase is preserved from the input.
 */
export async function spectralSubtraction(
  signal: Float32Array,
  sampleRate: number,
  params: SpectralSubtractionParams,
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
  const noise = estimateNoiseProfile(spec, noiseFrames);

  const alpha = params.reductionStrength;
  const beta = params.spectralFloor;

  for (let f = 0; f < spec.frameCount; f++) {
    const re = spec.real[f];
    const im = spec.imag[f];
    for (let k = 0; k < spec.bins; k++) {
      const mag = Math.hypot(re[k], im[k]);
      if (mag < 1e-12) continue;
      const cleaned = Math.max(mag - alpha * noise[k], beta * mag);
      const gain = cleaned / mag;
      re[k] *= gain;
      im[k] *= gain;
    }
    if (onProgress && f % 24 === 0) {
      await onProgress(f / spec.frameCount);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  const samples = istft(spec);
  const noiseProfileDb = new Float32Array(spec.bins);
  for (let k = 0; k < spec.bins; k++) {
    noiseProfileDb[k] = 20 * Math.log10(noise[k] + 1e-12);
  }

  return { samples, noiseProfileDb, framesProcessed: spec.frameCount };
}
