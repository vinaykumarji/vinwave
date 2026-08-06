import { useEffect, useMemo, useRef } from "react";

import { magnitudeSpectrum } from "@/lib/dsp";
import { createWindow } from "@/lib/dsp/windows";
import { cssVar } from "@/lib/viz/colormap";
import type { WindowType } from "@/types/audio";

export interface SpectrumViewProps {
  samples: Float32Array;
  sampleRate: number;
  atSec: number;
  fftSize?: number;
  windowType?: WindowType;
  height?: number;
  /** Optional second trace, drawn behind (e.g. the original signal). */
  referenceSamples?: Float32Array | null;
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
    return {
      main: take(samples),
      reference: referenceSamples ? take(referenceSamples) : null,
    };
  }, [atSec, fftSize, referenceSamples, sampleRate, samples, windowType]);

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
    ctx.fillStyle = cssVar("--elevated", "#121B2B");
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
      ctx.fillStyle = cssVar("--muted-foreground", "#94A3B8");
      ctx.fillText(`${db}`, 4, y - 7);
    }
    for (const hz of [100, 500, 1000, 2000, 5000, 10000]) {
      if (hz >= nyquist) continue;
      const x = xOf(hz);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
      ctx.fillStyle = cssVar("--muted-foreground", "#94A3B8");
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
        ctx.globalAlpha = alpha * 0.18;
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    if (spectra.reference) trace(spectra.reference, cssVar("--muted-foreground", "#94A3B8"), 0.75, false);
    trace(spectra.main, cssVar("--accent", "#06B6D4"), 1, true);
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
