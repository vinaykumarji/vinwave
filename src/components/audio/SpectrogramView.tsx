import { useEffect, useMemo, useRef } from "react";

import { magnitudes, stft } from "@/lib/dsp";
import { colormapLut, cssVar, type ColormapName } from "@/lib/viz/colormap";
import { formatTime } from "@/lib/format";
import type { WindowType } from "@/types/audio";

export interface SpectrogramViewProps {
  samples: Float32Array;
  sampleRate: number;
  fftSize?: number;
  windowType?: WindowType;
  colormap?: ColormapName;
  height?: number;
  dynamicRangeDb?: number;
  cursorSec: number;
  viewStartSec: number;
  viewDurationSec: number;
  maxFrames?: number;
  onSeek?: (sec: number) => void;
  className?: string;
}

/** STFT spectrogram rendered through a colormap LUT, with cursor highlight. */
export function SpectrogramView({
  samples,
  sampleRate,
  fftSize = 512,
  windowType = "hann",
  colormap = "magma",
  height = 190,
  dynamicRangeDb = 72,
  cursorSec,
  viewStartSec,
  viewDurationSec,
  maxFrames = 900,
  onSeek,
  className,
}: SpectrogramViewProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLCanvasElement | null>(null);

  const analysis = useMemo(() => {
    if (samples.length === 0) return null;
    const hopSize = Math.max(fftSize / 8, Math.ceil(samples.length / maxFrames));
    const spec = stft(samples, { fftSize, hopSize, windowType });
    const mags = magnitudes(spec);
    let peak = 1e-9;
    for (const frame of mags) for (let k = 0; k < frame.length; k++) peak = Math.max(peak, frame[k]);
    return { mags, bins: spec.bins, hopSize, peak };
  }, [fftSize, maxFrames, samples, windowType]);

  useEffect(() => {
    if (!analysis) return;
    const { mags, bins, peak } = analysis;
    const off = document.createElement("canvas");
    off.width = mags.length;
    off.height = bins;
    const octx = off.getContext("2d");
    if (!octx) return;
    const image = octx.createImageData(mags.length, bins);
    const lut = colormapLut(colormap);
    const peakDb = 20 * Math.log10(peak);

    for (let x = 0; x < mags.length; x++) {
      const frame = mags[x];
      for (let k = 0; k < bins; k++) {
        const db = 20 * Math.log10(frame[k] + 1e-12);
        const norm = Math.min(1, Math.max(0, (db - (peakDb - dynamicRangeDb)) / dynamicRangeDb));
        const lutIndex = Math.floor(norm * 255) * 3;
        const pixel = ((bins - 1 - k) * mags.length + x) * 4;
        image.data[pixel] = lut[lutIndex];
        image.data[pixel + 1] = lut[lutIndex + 1];
        image.data[pixel + 2] = lut[lutIndex + 2];
        image.data[pixel + 3] = 255;
      }
    }
    octx.putImageData(image, 0, 0);
    imageRef.current = off;
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, colormap, dynamicRangeDb]);

  function render() {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const source = imageRef.current;
    if (!canvas || !wrap || !source || !analysis) return;
    const width = wrap.clientWidth;
    if (width === 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = cssVar("--elevated", "#121B2B");
    ctx.fillRect(0, 0, width, height);

    const totalSec = samples.length / sampleRate;
    const sx = (viewStartSec / totalSec) * source.width;
    const sw = Math.max(1, (viewDurationSec / totalSec) * source.width);
    ctx.drawImage(source, sx, 0, sw, source.height, 0, 0, width, height);

    // Frequency gridlines
    const nyquist = sampleRate / 2;
    ctx.font = "500 10px ui-monospace, monospace";
    ctx.textBaseline = "middle";
    for (let i = 1; i < 4; i++) {
      const y = (height * i) / 4;
      ctx.strokeStyle = "rgba(255,255,255,0.13)";
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
      const hz = nyquist * (1 - i / 4);
      ctx.fillStyle = "rgba(255,255,255,0.62)";
      ctx.fillText(`${(hz / 1000).toFixed(1)}k`, 4, y - 7);
    }

    const x = ((cursorSec - viewStartSec) / viewDurationSec) * width;
    if (x >= 0 && x <= width) {
      ctx.strokeStyle = cssVar("--warning", "#F59E0B");
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
      const label = formatTime(cursorSec);
      const w = ctx.measureText(label).width + 8;
      const bx = Math.min(Math.max(x + 6, 2), width - w - 2);
      ctx.fillStyle = "rgba(11,18,32,0.85)";
      ctx.fillRect(bx, 4, w, 15);
      ctx.fillStyle = cssVar("--warning", "#F59E0B");
      ctx.fillText(label, bx + 4, 12);
    }
  }

  useEffect(() => {
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursorSec, viewStartSec, viewDurationSec, height]);

  useEffect(() => {
    const observer = new ResizeObserver(() => render());
    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`relative w-full cursor-crosshair overflow-hidden rounded-md border border-border ${className ?? ""}`}
      style={{ height }}
      onPointerDown={(event) => {
        const rect = wrapRef.current?.getBoundingClientRect();
        if (!rect || !onSeek) return;
        const ratio = (event.clientX - rect.left) / rect.width;
        onSeek(viewStartSec + ratio * viewDurationSec);
      }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
