import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { Activity, AudioWaveform, BarChart3, Waves } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { MetricCard } from "@/components/common/MetricCard";
import { Panel, PanelHeader } from "@/components/common/Panel";
import { SpectrogramView } from "@/components/audio/SpectrogramView";
import { SpectrumView } from "@/components/audio/SpectrumView";
import { TransportBar } from "@/components/audio/TransportBar";
import { WaveformView } from "@/components/audio/WaveformView";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { formatDb, formatHz, formatTime } from "@/lib/format";
import { useStudio } from "@/store/studio";

export const Route = createFileRoute("/explorer")({
  head: () => ({
    meta: [
      { title: "Signal Explorer — VinWave Studio" },
      {
        name: "description",
        content: "Interactive waveform, FFT spectrum and spectrogram inspector for speech signals.",
      },
      { property: "og:title", content: "Signal Explorer — VinWave Studio" },
      { property: "og:description", content: "Inspect waveform, spectrum and spectrogram in one workspace." },
    ],
  }),
  component: ExplorerPage,
});

function ExplorerPage() {
  const navigate = useNavigate();
  const { activeSignal, statistics, cursorSec, setCursorSec, vadSegments, settings } = useStudio();
  const playback = useAudioPlayback(activeSignal);
  const [view, setView] = useState({ start: 0, duration: 0 });

  const total = activeSignal?.metadata.durationSec ?? 0;
  const viewDuration = view.duration || total;
  const viewStart = Math.min(view.start, Math.max(0, total - viewDuration));

  const clampView = useCallback(
    (start: number, duration: number) => {
      const d = Math.max(Math.min(0.02, total), Math.min(duration, total));
      const s = Math.max(0, Math.min(start, total - d));
      setView({ start: s, duration: d });
    },
    [total],
  );

  const zoom = useCallback(
    (factor: number, anchorSec: number) => {
      const next = viewDuration * factor;
      const ratio = (anchorSec - viewStart) / viewDuration;
      clampView(anchorSec - ratio * next, next);
    },
    [clampView, viewDuration, viewStart],
  );

  const zoomLabel = useMemo(
    () => (total ? `${(total / viewDuration).toFixed(1)}×` : "1.0×"),
    [total, viewDuration],
  );

  if (!activeSignal) {
    return (
      <div className="p-4">
        <EmptyState
          icon={Waves}
          title="No audio imported"
          description="The Signal Explorer needs a loaded signal. Import a recording, capture one, or load the demo."
          actionLabel="Import audio"
          onAction={() => navigate({ to: "/import" })}
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4 p-4">
      <Panel className="overflow-hidden">
        <TransportBar
          playback={playback}
          cursorSec={cursorSec}
          zoomLabel={zoomLabel}
          onZoomIn={() => zoom(0.6, cursorSec)}
          onZoomOut={() => zoom(1.66, cursorSec)}
          onResetView={() => setView({ start: 0, duration: total })}
        />
        <div className="p-3">
          <WaveformView
            samples={activeSignal.samples}
            sampleRate={activeSignal.metadata.sampleRate}
            viewStartSec={viewStart}
            viewDurationSec={viewDuration}
            cursorSec={cursorSec}
            playheadSec={playback.playing ? playback.positionSec : undefined}
            vadSegments={vadSegments}
            animateDraw={settings.animationsEnabled}
            height={210}
            onSeek={(sec) => {
              setCursorSec(sec);
              playback.seek(sec);
            }}
            onPan={(delta) => clampView(viewStart + delta, viewDuration)}
            onZoom={zoom}
          />
          <div className="num mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-muted-foreground">
            <span>window {formatTime(viewStart)} → {formatTime(viewStart + viewDuration)}</span>
            <span>cursor {formatTime(cursorSec)}</span>
            <span>sample #{Math.round(cursorSec * activeSignal.metadata.sampleRate).toLocaleString()}</span>
            <span>scroll to zoom · alt-drag to pan · click to place the cursor</span>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <PanelHeader
            title="FFT magnitude spectrum"
            subtitle={`${settings.fftSize}-point · ${settings.windowType} window · at cursor`}
            icon={<BarChart3 className="h-3.5 w-3.5" />}
          />
          <div className="p-3">
            <SpectrumView
              samples={activeSignal.samples}
              sampleRate={activeSignal.metadata.sampleRate}
              atSec={cursorSec}
              fftSize={settings.fftSize}
              windowType={settings.windowType}
            />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Spectrogram"
            subtitle="STFT magnitude · 72 dB dynamic range"
            icon={<AudioWaveform className="h-3.5 w-3.5" />}
          />
          <div className="p-3">
            <SpectrogramView
              samples={activeSignal.samples}
              sampleRate={activeSignal.metadata.sampleRate}
              colormap={settings.spectrogramColormap}
              windowType={settings.windowType}
              cursorSec={cursorSec}
              viewStartSec={viewStart}
              viewDurationSec={viewDuration}
              onSeek={(sec) => {
                setCursorSec(sec);
                playback.seek(sec);
              }}
            />
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Audio statistics" icon={<Activity className="h-3.5 w-3.5" />} />
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <MetricCard label="Duration" value={formatTime(activeSignal.metadata.durationSec, false)} />
          <MetricCard label="Sample rate" value={formatHz(activeSignal.metadata.sampleRate)} />
          <MetricCard
            label="Peak"
            value={statistics ? statistics.peakAmplitude.toFixed(3) : "—"}
            hint={statistics ? formatDb(20 * Math.log10(statistics.peakAmplitude + 1e-12)) : undefined}
          />
          <MetricCard label="RMS" value={statistics ? statistics.rms.toFixed(4) : "—"} />
          <MetricCard
            label="Noise floor"
            value={statistics ? statistics.estimatedNoiseFloorDb.toFixed(1) : "—"}
            unit="dB"
          />
          <MetricCard
            label="Segmental SNR"
            value={statistics ? statistics.estimatedSnrDb.toFixed(2) : "—"}
            unit="dB"
            tone="accent"
          />
        </div>
      </Panel>
    </div>
  );
}
