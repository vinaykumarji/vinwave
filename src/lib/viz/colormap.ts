export type ColormapName = "magma" | "viridis" | "grayscale";

type Stop = [number, number, number];

const MAGMA: Stop[] = [
  [0, 0, 4],
  [28, 16, 68],
  [79, 18, 123],
  [129, 37, 129],
  [181, 54, 122],
  [229, 80, 100],
  [251, 135, 97],
  [254, 194, 135],
  [252, 253, 191],
];

const VIRIDIS: Stop[] = [
  [68, 1, 84],
  [72, 40, 120],
  [62, 74, 137],
  [49, 104, 142],
  [38, 130, 142],
  [31, 158, 137],
  [53, 183, 121],
  [109, 205, 89],
  [180, 222, 44],
  [253, 231, 37],
];

const GRAY: Stop[] = [
  [8, 12, 20],
  [255, 255, 255],
];

const TABLES: Record<ColormapName, Stop[]> = {
  magma: MAGMA,
  viridis: VIRIDIS,
  grayscale: GRAY,
};

const cache = new Map<ColormapName, Uint8ClampedArray>();

/** 256-entry RGB lookup table for spectrogram rendering. */
export function colormapLut(name: ColormapName): Uint8ClampedArray {
  const cached = cache.get(name);
  if (cached) return cached;
  const stops = TABLES[name];
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (stops.length - 1);
    const lo = Math.floor(t);
    const hi = Math.min(stops.length - 1, lo + 1);
    const f = t - lo;
    for (let c = 0; c < 3; c++) {
      lut[i * 3 + c] = stops[lo][c] + (stops[hi][c] - stops[lo][c]) * f;
    }
  }
  cache.set(name, lut);
  return lut;
}

/** Resolve a CSS custom property to a concrete color string for canvas use. */
export function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}
