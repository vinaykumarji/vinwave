import type { VadParams, VadSegment } from "@/types/audio";

export interface VadResult {
  frameFlags: Uint8Array;
  frameSizeSamples: number;
  segments: VadSegment[];
  speechRatio: number;
  noiseFloorDb: number;
}

export const DEFAULT_VAD_PARAMS: VadParams = {
  frameMs: 20,
  energyThresholdDb: 8,
  zcrThreshold: 0.28,
  hangoverFrames: 4,
};

/**
 * Classical energy + zero-crossing-rate voice activity detection.
 * The noise floor is taken as a low percentile of frame energies, which makes
 * the decision robust to the absolute level of the recording.
 */
export function detectVoiceActivity(
  signal: Float32Array,
  sampleRate: number,
  params: VadParams = DEFAULT_VAD_PARAMS,
): VadResult {
  const frameSize = Math.max(64, Math.round((params.frameMs / 1000) * sampleRate));
  const frameCount = Math.max(1, Math.floor(signal.length / frameSize));
  const energiesDb = new Float32Array(frameCount);
  const zcr = new Float32Array(frameCount);

  for (let f = 0; f < frameCount; f++) {
    const start = f * frameSize;
    let sum = 0;
    let crossings = 0;
    for (let n = 0; n < frameSize; n++) {
      const s = signal[start + n] ?? 0;
      sum += s * s;
      if (n > 0 && (s < 0) !== ((signal[start + n - 1] ?? 0) < 0)) crossings++;
    }
    energiesDb[f] = 10 * Math.log10(sum / frameSize + 1e-12);
    zcr[f] = crossings / frameSize;
  }

  const sorted = Float32Array.from(energiesDb).sort();
  const noiseFloorDb = sorted[Math.floor(sorted.length * 0.15)] ?? -90;
  const peakDb = sorted[sorted.length - 1] ?? 0;
  const threshold = Math.min(
    noiseFloorDb + params.energyThresholdDb,
    noiseFloorDb + (peakDb - noiseFloorDb) * 0.35,
  );

  const flags = new Uint8Array(frameCount);
  let hangover = 0;
  for (let f = 0; f < frameCount; f++) {
    const voiced = energiesDb[f] > threshold && zcr[f] < params.zcrThreshold * 2;
    if (voiced) {
      flags[f] = 1;
      hangover = params.hangoverFrames;
    } else if (hangover > 0) {
      flags[f] = 1;
      hangover--;
    }
  }

  const segments: VadSegment[] = [];
  let cursor = 0;
  while (cursor < frameCount) {
    const speech = flags[cursor] === 1;
    let end = cursor;
    while (end + 1 < frameCount && flags[end + 1] === flags[cursor]) end++;
    segments.push({
      startSec: (cursor * frameSize) / sampleRate,
      endSec: ((end + 1) * frameSize) / sampleRate,
      speech,
    });
    cursor = end + 1;
  }

  let speechFrames = 0;
  for (let f = 0; f < frameCount; f++) speechFrames += flags[f];

  return {
    frameFlags: flags,
    frameSizeSamples: frameSize,
    segments,
    speechRatio: frameCount ? speechFrames / frameCount : 0,
    noiseFloorDb,
  };
}
