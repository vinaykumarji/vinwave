import { useEffect, useMemo, useRef } from "react";

import { magnitudeSpectrum } from "@/lib/dsp";
import { createWindow } from "@/lib/dsp/windows";
import { cssVar } from "@/lib/viz/colormap";
import type { WindowType } from "@/types/audio";

export interface SpectrumPeakInfo {
  peakHz: number;
  peakDb: number;
  centroidHz: number;
}

export interface SpectrumViewProps {
  samples: Float32Array;
  sampleRate: number;
  atSec: number;
  fftSize?: number;
  windowType?: WindowType;
  height?: number;
  /** Optional second trace, drawn behind (e.g. the original signal). */
  referenceSamples?: Float32Array | null;
  onPeak?: (info: SpectrumPeakInfo) => void;
  className?: string;
}

/** Instantaneous FFT magnitude spectrum at the playback cursor. */
export function SpectrumView({
  samples,
  sampleRate,
  atSec,
  fftSize = 1024,
  windowType = "hann",
  height = 176,
  referenceSamples = null,
  onPeak,
  className,
}: SpectrumViewProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const spectra = useMemo(() => {
    const window = createWindow(windowType, fftSize);
    const start = Math.max(0, Math.min(samples.length - fftSize, Math.floor(atSec * sampleRate)));
    const take = (src: Float32Array) => {
      const frame = new Float32Array(fftSize);
      for (let i = 0; i < fftSize; i++) frame[i] = (src[start + i] ?? 0) * window[i];
      return magnitudeSpectrum(frame, fftSize);
    };
    const main = take(samples);

    // Peak bin + spectral centroid of the analysed frame.
    let peakBin = 1;
    let peakMag = 0;
    let weighted = 0;
    let sum = 0;
    for (let k = 1; k < main.length; k++) {
      const mag = main[k];
      if (mag > peakMag) {
        peakMag = mag;
        peakBin = k;
      }
      const hz = (k / (main.length - 1)) * (sampleRate / 2);
      weighted += hz * mag;
      sum += mag;
    }
    const nyquist = sampleRate / 2;
    return {
      main,
      reference: referenceSamples ? take(referenceSamples) : null,
      peak: {
        peakHz: (peakBin / (main.length - 1)) * nyquist,
        peakDb: 20 * Math.log10(peakMag / (fftSize / 4) + 1e-12),
        centroidHz: sum > 0 ? weighted / sum : 0,
      } satisfies SpectrumPeakInfo,
    };
  }, [atSec, fftSize, referenceSamples, sampleRate, samples, windowType]);

  useEffect(() => {
    onPeak?.(spectra.peak);
  }, [onPeak, spectra]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const width = wrap.clientWidth;
    if (width === 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = cssVar("--elevated", "#21173A");
    ctx.fillRect(0, 0, width, height);

    const minDb = -100;
    const maxDb = 0;
    const bins = spectra.main.length;
    const nyquist = sampleRate / 2;
    const minHz = 20;

    const xOf = (hz: number) =>
      (Math.log10(Math.max(minHz, hz) / minHz) / Math.log10(nyquist / minHz)) * width;
    const yOf = (db: number) => height - ((Math.max(minDb, db) - minDb) / (maxDb - minDb)) * height;

    ctx.font = "500 10px ui-monospace, monospace";
    ctx.textBaseline = "middle";
    for (const db of [-20, -40, -60, -80]) {
      const y = yOf(db);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
      ctx.fillStyle = cssVar("--muted-foreground", "#9CA3AF");
      ctx.fillText(`${db} dB`, 4, y - 7);
    }
    for (const hz of [100, 500, 1000, 2000, 5000, 10000]) {
      if (hz >= nyquist) continue;
      const x = xOf(hz);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
      ctx.fillStyle = cssVar("--muted-foreground", "#9CA3AF");
      ctx.fillText(hz >= 1000 ? `${hz / 1000}k` : `${hz}`, x + 4, height - 8);
    }

    const trace = (data: Float32Array, color: string, alpha: number, fill: boolean) => {
      ctx.beginPath();
      let started = false;
      for (let k = 1; k < bins; k++) {
        const hz = (k / (bins - 1)) * nyquist;
        const db = 20 * Math.log10(data[k] / (fftSize / 4) + 1e-12);
        const x = xOf(hz);
        const y = yOf(db);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      if (fill) {
        ctx.lineTo(width, height);
        ctx.lineTo(xOf(minHz), height);
        ctx.closePath();
        ctx.globalAlpha = alpha * 0.2;
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    if (spectra.reference)
      trace(spectra.reference, cssVar("--muted-foreground", "#9CA3AF"), 0.7, false);
    trace(spectra.main, cssVar("--primary-bright", "#A855F7"), 1, true);

    // Peak frequency marker (gold — key readout)
    const gold = cssVar("--gold", "#FBBF24");
    const px = xOf(spectra.peak.peakHz);
    const py = yOf(spectra.peak.peakDb);
    ctx.strokeStyle = gold;
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(px + 0.5, 0);
    ctx.lineTo(px + 0.5, height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.arc(px, py, 2.6, 0, Math.PI * 2);
    ctx.fill();
    const label = `${spectra.peak.peakHz < 1000 ? spectra.peak.peakHz.toFixed(0) + " Hz" : (spectra.peak.peakHz / 1000).toFixed(2) + " kHz"}`;
    ctx.font = "600 10px ui-monospace, monospace";
    const w = ctx.measureText(label).width + 8;
    const bx = Math.min(Math.max(px + 6, 2), width - w - 2);
    ctx.fillStyle = cssVar("--surface", "#171129");
    ctx.fillRect(bx, 4, w, 15);
    ctx.fillStyle = gold;
    ctx.fillText(label, bx + 4, 12);
  }, [fftSize, height, sampleRate, spectra]);

  return (
    <div
      ref={wrapRef}
      className={`w-full overflow-hidden rounded-md border border-border ${className ?? ""}`}
      style={{ height }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
