import { useCallback, useEffect, useMemo, useRef } from "react";

import { cssVar } from "@/lib/viz/colormap";
import { formatTime } from "@/lib/format";
import type { VadSegment } from "@/types/audio";

export interface WaveformSelection {
  startSec: number;
  endSec: number;
}

export interface WaveformViewProps {
  samples: Float32Array;
  sampleRate: number;
  /** Visible window start, in seconds. */
  viewStartSec: number;
  /** Visible window length, in seconds. */
  viewDurationSec: number;
  cursorSec: number;
  playheadSec?: number;
  vadSegments?: VadSegment[] | null;
  selection?: WaveformSelection | null;
  accent?: "primary" | "accent" | "success" | "destructive";
  height?: number;
  showRuler?: boolean;
  animateDraw?: boolean;
  onSeek?: (sec: number) => void;
  onPan?: (deltaSec: number) => void;
  onZoom?: (factor: number, anchorSec: number) => void;
  onSelect?: (selection: WaveformSelection | null) => void;
  className?: string;
}

const ACCENT_VARS: Record<NonNullable<WaveformViewProps["accent"]>, [string, string]> = {
  primary: ["--primary", "#8B5CF6"],
  accent: ["--gold", "#FBBF24"],
  success: ["--success", "#22C55E"],
  destructive: ["--destructive", "#EF4444"],
};

/**
 * Canvas waveform with min/max peak reduction, timeline ruler, VAD overlay,
 * click-to-seek, drag region selection, wheel zoom (pointer anchored) and alt-drag panning.
 */
export function WaveformView({
  samples,
  sampleRate,
  viewStartSec,
  viewDurationSec,
  cursorSec,
  playheadSec,
  vadSegments,
  selection = null,
  accent = "primary",
  height = 168,
  showRuler = true,
  animateDraw = false,
  onSeek,
  onPan,
  onZoom,
  onSelect,
  className,
}: WaveformViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(animateDraw ? 0 : 1);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<{ x: number; start: number } | null>(null);
  const selectRef = useRef<{ x: number; sec: number; moved: boolean } | null>(null);
  const stateRef = useRef({ viewStartSec, viewDurationSec, cursorSec, playheadSec, selection });

  stateRef.current = { viewStartSec, viewDurationSec, cursorSec, playheadSec, selection };

  const rulerHeight = showRuler ? 20 : 0;
  const colors = useMemo(() => ACCENT_VARS[accent], [accent]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = wrap.clientWidth;
    if (width === 0) return;
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const {
      viewStartSec: vs,
      viewDurationSec: vd,
      cursorSec: cs,
      playheadSec: ph,
      selection: sel,
    } = stateRef.current;
    const waveTop = rulerHeight;
    const waveHeight = height - rulerHeight;
    const mid = waveTop + waveHeight / 2;

    const border = cssVar("--border-strong", "#3A2B63");
    const muted = cssVar("--muted-foreground", "#9CA3AF");
    const gold = cssVar("--gold", "#FBBF24");
    const accentColor = cssVar(colors[0], colors[1]);
    const xOf = (sec: number) => ((sec - vs) / vd) * width;

    // Background grid
    ctx.fillStyle = cssVar("--elevated", "#21173A");
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = border;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = waveTop + (waveHeight * i) / 4;
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // VAD speech regions
    if (vadSegments) {
      for (const seg of vadSegments) {
        if (!seg.speech) continue;
        const x1 = xOf(seg.startSec);
        const x2 = xOf(seg.endSec);
        if (x2 < 0 || x1 > width) continue;
        ctx.fillStyle = cssVar("--success", "#22C55E");
        ctx.globalAlpha = 0.14;
        ctx.fillRect(x1, waveTop, x2 - x1, waveHeight);
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = cssVar("--success", "#22C55E");
        ctx.beginPath();
        ctx.moveTo(x1 + 0.5, waveTop);
        ctx.lineTo(x1 + 0.5, height);
        ctx.moveTo(x2 + 0.5, waveTop);
        ctx.lineTo(x2 + 0.5, height);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // Region selection
    if (sel && Math.abs(sel.endSec - sel.startSec) > 1e-4) {
      const x1 = xOf(Math.min(sel.startSec, sel.endSec));
      const x2 = xOf(Math.max(sel.startSec, sel.endSec));
      ctx.fillStyle = gold;
      ctx.globalAlpha = 0.14;
      ctx.fillRect(x1, waveTop, x2 - x1, waveHeight);
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = gold;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x1 + 0.5, waveTop);
      ctx.lineTo(x1 + 0.5, height);
      ctx.moveTo(x2 + 0.5, waveTop);
      ctx.lineTo(x2 + 0.5, height);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Ruler
    if (showRuler) {
      ctx.fillStyle = cssVar("--surface", "#171129");
      ctx.fillRect(0, 0, width, rulerHeight);
      ctx.strokeStyle = border;
      ctx.beginPath();
      ctx.moveTo(0, rulerHeight - 0.5);
      ctx.lineTo(width, rulerHeight - 0.5);
      ctx.stroke();

      const targetTicks = Math.max(4, Math.floor(width / 110));
      const rawStep = vd / targetTicks;
      const steps = [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60];
      const step = steps.find((s) => s >= rawStep) ?? 120;
      const first = Math.ceil(vs / step) * step;
      ctx.fillStyle = muted;
      ctx.font = "500 10px ui-monospace, monospace";
      ctx.textBaseline = "middle";
      for (let t = first; t < vs + vd; t += step) {
        const x = xOf(t);
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = border;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillText(formatTime(t, vd < 4), x + 4, rulerHeight / 2);
      }
    }

    // Waveform (min/max envelope per pixel column)
    const startSample = Math.max(0, Math.floor(vs * sampleRate));
    const endSample = Math.min(samples.length, Math.ceil((vs + vd) * sampleRate));
    const total = Math.max(1, endSample - startSample);
    const perPixel = total / width;
    const visibleWidth = width * progressRef.current;

    ctx.strokeStyle = accentColor;
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    for (let x = 0; x < visibleWidth; x++) {
      const from = startSample + Math.floor(x * perPixel);
      const to = Math.min(endSample, startSample + Math.floor((x + 1) * perPixel));
      let min = 1;
      let max = -1;
      if (perPixel < 1) {
        const v = samples[from] ?? 0;
        min = Math.min(v, 0);
        max = Math.max(v, 0);
      } else {
        for (let i = from; i < to; i++) {
          const v = samples[i] ?? 0;
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
      const y1 = mid - max * (waveHeight / 2) * 0.94;
      const y2 = mid - min * (waveHeight / 2) * 0.94;
      ctx.moveTo(x + 0.5, y1);
      ctx.lineTo(x + 0.5, Math.max(y2, y1 + 0.6));
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Zero line
    ctx.strokeStyle = muted;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(0, mid + 0.5);
    ctx.lineTo(width, mid + 0.5);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const drawMarker = (sec: number, color: string, label: boolean) => {
      const x = xOf(sec);
      if (x < -2 || x > width + 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, rulerHeight);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - 4, rulerHeight);
      ctx.lineTo(x + 4, rulerHeight);
      ctx.lineTo(x, rulerHeight + 6);
      ctx.closePath();
      ctx.fill();
      if (label) {
        ctx.font = "600 10px ui-monospace, monospace";
        const text = formatTime(sec);
        const w = ctx.measureText(text).width + 8;
        const bx = Math.min(Math.max(x + 6, 2), width - w - 2);
        ctx.fillStyle = cssVar("--surface", "#171129");
        ctx.fillRect(bx, height - 18, w, 15);
        ctx.fillStyle = color;
        ctx.fillText(text, bx + 4, height - 10);
      }
    };

    // Cursor is gold (selected state), playhead is bright purple.
    drawMarker(cs, gold, true);
    if (ph !== undefined && Math.abs(ph - cs) > 1e-4) {
      drawMarker(ph, cssVar("--primary-bright", "#A855F7"), false);
    }
  }, [colors, height, rulerHeight, samples, sampleRate, showRuler, vadSegments]);

  useEffect(() => {
    if (!animateDraw) {
      progressRef.current = 1;
      draw();
      return;
    }
    progressRef.current = 0;
    const start = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - start) / 520);
      progressRef.current = 1 - Math.pow(1 - t, 3);
      draw();
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [animateDraw, draw, samples]);

  useEffect(() => {
    draw();
  }, [draw, viewStartSec, viewDurationSec, cursorSec, playheadSec, selection]);

  useEffect(() => {
    const observer = new ResizeObserver(() => draw());
    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [draw]);

  const secFromEvent = useCallback(
    (clientX: number) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return 0;
      const ratio = (clientX - rect.left) / rect.width;
      return viewStartSec + ratio * viewDurationSec;
    },
    [viewDurationSec, viewStartSec],
  );

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !onZoom) return;
    const handler = (event: WheelEvent) => {
      event.preventDefault();
      const dy = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
      onZoom(Math.exp(dy * 0.0015), secFromEvent(event.clientX));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [onZoom, secFromEvent]);

  return (
    <div
      ref={wrapRef}
      className={`relative w-full cursor-crosshair touch-none select-none overflow-hidden rounded-md border border-border ${className ?? ""}`}
      style={{ height }}
      onPointerDown={(event) => {
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        if (event.button === 1 || event.altKey) {
          dragRef.current = { x: event.clientX, start: viewStartSec };
          return;
        }
        const sec = secFromEvent(event.clientX);
        selectRef.current = { x: event.clientX, sec, moved: false };
        onSeek?.(sec);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (drag && onPan) {
          const rect = wrapRef.current?.getBoundingClientRect();
          if (!rect) return;
          const deltaSec = ((drag.x - event.clientX) / rect.width) * viewDurationSec;
          onPan(deltaSec);
          dragRef.current = { x: event.clientX, start: drag.start };
          return;
        }
        const sel = selectRef.current;
        if (!sel) return;
        const sec = secFromEvent(event.clientX);
        if (Math.abs(event.clientX - sel.x) > 3) {
          sel.moved = true;
          onSelect?.({ startSec: Math.min(sel.sec, sec), endSec: Math.max(sel.sec, sec) });
          onSeek?.(sec);
        }
      }}
      onPointerUp={(event) => {
        (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
        if (selectRef.current && !selectRef.current.moved) onSelect?.(null);
        dragRef.current = null;
        selectRef.current = null;
      }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
