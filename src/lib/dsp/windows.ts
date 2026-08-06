import type { WindowType } from "@/types/audio";

const cache = new Map<string, Float32Array>();

/** Analysis window generator (periodic definition, suited to STFT overlap-add). */
export function createWindow(type: WindowType, length: number): Float32Array {
  const key = `${type}:${length}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const w = new Float32Array(length);
  for (let n = 0; n < length; n++) {
    const x = (2 * Math.PI * n) / length;
    switch (type) {
      case "hamming":
        w[n] = 0.54 - 0.46 * Math.cos(x);
        break;
      case "blackman":
        w[n] = 0.42 - 0.5 * Math.cos(x) + 0.08 * Math.cos(2 * x);
        break;
      case "rectangular":
        w[n] = 1;
        break;
      case "hann":
      default:
        w[n] = 0.5 * (1 - Math.cos(x));
        break;
    }
  }
  cache.set(key, w);
  return w;
}

export const WINDOW_LABELS: Record<WindowType, string> = {
  hann: "Hann",
  hamming: "Hamming",
  blackman: "Blackman",
  rectangular: "Rectangular",
};
