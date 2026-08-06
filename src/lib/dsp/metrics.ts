import type { SignalStatistics } from "@/types/audio";
import { detectVoiceActivity } from "./vad";

/**
 * Segmental SNR estimate: speech-active frame power vs. noise-only frame power,
 * derived from the VAD decision. This is the standard "no reference signal"
 * estimate used for single-channel enhancement evaluation.
 */
export function estimateSnrDb(signal: Float32Array, sampleRate: number): number {
  const vad = detectVoiceActivity(signal, sampleRate);
  const frame = vad.frameSizeSamples;
  let speechPower = 0;
  let speechFrames = 0;
  let noisePower = 0;
  let noiseFrames = 0;

  for (let f = 0; f < vad.frameFlags.length; f++) {
    let sum = 0;
    for (let n = 0; n < frame; n++) {
      const s = signal[f * frame + n] ?? 0;
      sum += s * s;
    }
    const power = sum / frame;
    if (vad.frameFlags[f]) {
      speechPower += power;
      speechFrames++;
    } else {
      noisePower += power;
      noiseFrames++;
    }
  }

  const speech = speechFrames ? speechPower / speechFrames : 0;
  const noise = noiseFrames ? noisePower / noiseFrames : 1e-10;
  const snr = 10 * Math.log10(Math.max(speech - noise, 1e-12) / Math.max(noise, 1e-12));
  return Number.isFinite(snr) ? snr : 0;
}

export function computeStatistics(signal: Float32Array, sampleRate: number): SignalStatistics {
  let peak = 0;
  let sumSquares = 0;
  let sum = 0;
  let crossings = 0;

  for (let i = 0; i < signal.length; i++) {
    const s = signal[i];
    const a = Math.abs(s);
    if (a > peak) peak = a;
    sumSquares += s * s;
    sum += s;
    if (i > 0 && (s < 0) !== (signal[i - 1] < 0)) crossings++;
  }

  const rms = Math.sqrt(sumSquares / Math.max(1, signal.length));
  const vad = detectVoiceActivity(signal, sampleRate);

  return {
    peakAmplitude: peak,
    rms,
    crestFactorDb: 20 * Math.log10((peak + 1e-12) / (rms + 1e-12)),
    zeroCrossingRate: crossings / Math.max(1, signal.length),
    dcOffset: sum / Math.max(1, signal.length),
    estimatedNoiseFloorDb: vad.noiseFloorDb,
    estimatedSnrDb: estimateSnrDb(signal, sampleRate),
  };
}

/** Residual level between two signals, in dB — used as "noise removed". */
export function differenceLevelDb(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return 10 * Math.log10(sum / Math.max(1, n) + 1e-12);
}
