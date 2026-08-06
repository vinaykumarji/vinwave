import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeftRight, Clock, Gauge, TrendingUp } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { MetricCard } from "@/components/common/MetricCard";
import { Panel, PanelHeader } from "@/components/common/Panel";
import { SpectrogramView } from "@/components/audio/SpectrogramView";
import { SpectrumView } from "@/components/audio/SpectrumView";
import { TransportBar } from "@/components/audio/TransportBar";
import { WaveformView } from "@/components/audio/WaveformView";
import { Button } from "@/components/ui/button";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { formatDb, formatTime } from "@/lib/format";
import { useStudio } from "@/store/studio";
import type { AudioSignal } from "@/types/audio";

export const Route = createFileRoute("/comparison")({
  head: () => ({
    meta: [
      { title: "Comparison — VinWave Studio" },
      {
        name: "description",
        content: "Compare original and enhanced speech with synchronised waveforms, spectrograms and SNR metrics.",
      },
      { property: "og:title", content: "Comparison — VinWave Studio" },
      { property: "og:description", content: "Synchronised original vs enhanced analysis with quality metrics." },
    ],
  }),
  component: ComparisonPage,
});

function ComparisonPage() {
  const navigate = useNavigate();
  const { original, enhanced, runs, cursorSec, setCursorSec, settings } = useStudio();
  const [side, setSide] = useState<"original" | "enhanced">("enhanced");
  const lastRun = runs[runs.length - 1];

  const difference = useMemo<AudioSignal | null>(() => {
    if (!original || !enhanced) return null;
    const n = Math.min(original.samples.length, enhanced.samples.length);
    const diff = new Float32Array(n);
    for (let i = 0; i < n; i++) diff[i] = original.samples[i] - enhanced.samples[i];
    return { ...original, id: "difference", samples: diff };
  }, [enhanced, original]);

  const playback = useAudioPlayback(side === "original" ? original : enhanced);

  if (!original || !enhanced || !lastRun) {
    return (
      <div className="p-4">
        <EmptyState
          icon={ArrowLeftRight}
          title="No processing results"
          description="Run an enhancement algorithm to compare the original and processed signals side by side."
          actionLabel="Open enhancement"
          onAction={() => navigate({ to: "/enhancement" })}
        />
      </div>
    );
  }

  const total = original.metadata.durationSec;
  const seek = (sec: number) => {
    setCursorSec(sec);
    playback.seek(sec);
  };

  return (
    <div className="min-w-0 space-y-4 p-4">
      <Panel className="overflow-hidden">
        <PanelHeader
          title={`Comparison · ${lastRun.algorithmLabel}`}
          subtitle="Playback and cursor are synchronised across both signals"
          actions={
            <div className="flex items-center gap-1 rounded-md border border-border bg-elevated p-0.5">
              {(["original", "enhanced"] as const).map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={side === option ? "secondary" : "ghost"}
                  className="press h-6 px-2 text-[11px] capitalize"
                  onClick={() => setSide(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
          }
        />
        <TransportBar playback={playback} cursorSec={cursorSec} />
        <div className="grid gap-3 p-3 xl:grid-cols-2">
          <SignalColumn
            label="Original"
            signal={original}
            cursorSec={cursorSec}
            playheadSec={playback.playing && side === "original" ? playback.positionSec : undefined}
            total={total}
            accent="primary"
            colormap={settings.spectrogramColormap}
            onSeek={seek}
          />
          <SignalColumn
            label="Enhanced"
            signal={enhanced}
            cursorSec={cursorSec}
            playheadSec={playback.playing && side === "enhanced" ? playback.positionSec : undefined}
            total={total}
            accent="success"
            colormap={settings.spectrogramColormap}
            onSeek={seek}
          />
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader title="Difference signal" subtitle="Original − enhanced (removed component)" />
          <div className="p-3">
            {difference ? (
              <WaveformView
                samples={difference.samples}
                sampleRate={difference.metadata.sampleRate}
                viewStartSec={0}
                viewDurationSec={total}
                cursorSec={cursorSec}
                accent="destructive"
                height={140}
                onSeek={seek}
              />
            ) : null}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Spectrum overlay" subtitle="Enhanced (cyan) over original (grey), at cursor" />
          <div className="p-3">
            <SpectrumView
              samples={enhanced.samples}
              referenceSamples={original.samples}
              sampleRate={enhanced.metadata.sampleRate}
              atSec={cursorSec}
              fftSize={settings.fftSize}
              windowType={settings.windowType}
              height={140}
            />
          </div>
        </Panel>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Input SNR" value={lastRun.metrics.inputSnrDb.toFixed(2)} unit="dB" icon={Gauge} />
        <MetricCard label="Output SNR" value={lastRun.metrics.outputSnrDb.toFixed(2)} unit="dB" icon={Gauge} tone="accent" />
        <MetricCard
          label="SNR improvement"
          value={formatDb(lastRun.metrics.snrImprovementDb, 2)}
          icon={TrendingUp}
          tone={lastRun.metrics.snrImprovementDb >= 0 ? "positive" : "negative"}
          hint={`Speech ratio ${(lastRun.metrics.speechRatio * 100).toFixed(0)}%`}
        />
        <MetricCard
          label="Processing time"
          value={lastRun.metrics.processingTimeMs.toFixed(0)}
          unit="ms"
          icon={Clock}
          hint={`${formatTime(total, false)} of audio`}
        />
      </div>
    </div>
  );
}

function SignalColumn({
  label,
  signal,
  cursorSec,
  playheadSec,
  total,
  accent,
  colormap,
  onSeek,
}: {
  label: string;
  signal: AudioSignal;
  cursorSec: number;
  playheadSec: number | undefined;
  total: number;
  accent: "primary" | "success";
  colormap: "magma" | "viridis" | "grayscale";
  onSeek: (sec: number) => void;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-center justify-between">
        <span className="label-eyebrow">{label}</span>
        <span className="num truncate text-[10.5px] text-muted-foreground">{signal.metadata.fileName}</span>
      </div>
      <WaveformView
        samples={signal.samples}
        sampleRate={signal.metadata.sampleRate}
        viewStartSec={0}
        viewDurationSec={total}
        cursorSec={cursorSec}
        playheadSec={playheadSec}
        accent={accent}
        height={150}
        onSeek={onSeek}
      />
      <SpectrogramView
        samples={signal.samples}
        sampleRate={signal.metadata.sampleRate}
        cursorSec={cursorSec}
        viewStartSec={0}
        viewDurationSec={total}
        colormap={colormap}
        height={160}
        onSeek={onSeek}
      />
    </div>
  );
}
