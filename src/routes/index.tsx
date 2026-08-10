import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FlaskConical, Lightbulb, Mic, Upload, FolderOpen, Sparkles } from "lucide-react";

import { AppLogo } from "@/components/common/AppLogo";
import { EmptyState } from "@/components/common/EmptyState";
import { Panel, PanelBody, PanelHeader } from "@/components/common/Panel";
import { ProcessingHistory } from "@/components/audio/ProcessingHistory";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDb, formatRelativeTime, formatTime } from "@/lib/format";
import { useStudio } from "@/store/studio";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — VinWave Studio" },
      {
        name: "description",
        content:
          "Start a DSP session: import audio, record from a microphone, or explore the demo noisy-speech signal.",
      },
      { property: "og:title", content: "VinWave Studio — DSP Engineering Workspace" },
      {
        property: "og:description",
        content: "Analyze, enhance and compare speech using classical DSP algorithms.",
      },
    ],
  }),
  component: DashboardPage,
});

const TIPS = [
  "Alt-drag the waveform to pan; scroll to zoom around the pointer.",
  "Spectral subtraction assumes the first 400 ms contains noise only.",
  "A larger FFT sharpens frequency resolution but smears transients.",
  "Segmental SNR is measured from the VAD speech/noise decision.",
];

function DashboardPage() {
  const navigate = useNavigate();
  const { original, runs, recentFiles, loadDemo } = useStudio();

  const cards = [
    {
      title: "Import Audio",
      description: "Load a WAV, MP3 or FLAC recording for analysis.",
      icon: Upload,
      action: () => navigate({ to: "/import" }),
      cta: "Browse files",
    },
    {
      title: "Record Audio",
      description: "Capture a fresh sample directly from your microphone.",
      icon: Mic,
      action: () => navigate({ to: "/record" }),
      cta: "Open recorder",
    },
    {
      title: "Explore Demo",
      description: "Synthesised noisy speech with broadband noise and 50 Hz hum.",
      icon: FlaskConical,
      action: () => {
        loadDemo();
        navigate({ to: "/explorer" });
      },
      cta: "Load demo signal",
    },
  ];

  return (
    <div className="min-w-0 space-y-4 p-4">
      <Panel className="grid-lines overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 p-6">
          <div className="flex min-w-0 items-center gap-4">
            <AppLogo size={52} />
            <div className="min-w-0">
              <h1 className="truncate text-[22px] font-bold tracking-tight">VinWave Studio</h1>
              <p className="num text-[12px] text-accent">Analyze • Enhance • Understand</p>
              <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-muted-foreground">
                An engineering workspace for classical single-channel speech enhancement — spectral
                subtraction, Wiener filtering and voice activity detection, with measurable results.
              </p>
            </div>
          </div>
          <div className="hidden shrink-0 flex-col items-end gap-1 md:flex">
            <span className="num rounded border border-border bg-elevated px-2 py-1 text-[10.5px] text-muted-foreground">
              v1.0.0 · classical DSP only
            </span>
            <span className="num text-[10.5px] text-muted-foreground">Vinay Kumar · 23F3000334</span>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.title}
            onClick={card.action}
            className="panel hover-lift group flex flex-col items-start gap-3 p-5 text-left"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg border border-primary/35 bg-primary/10">
              <card.icon className="h-4.5 w-4.5 text-primary" />
            </span>
            <span className="text-[14px] font-semibold tracking-tight">{card.title}</span>
            <span className="text-[12.5px] leading-relaxed text-muted-foreground">
              {card.description}
            </span>
            <span className="num mt-auto text-[11px] text-primary transition-transform group-hover:translate-x-0.5">
              {card.cta} →
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader title="Recent projects" subtitle="Signals opened in this session" icon={<FolderOpen className="h-3.5 w-3.5" />} />
          <PanelBody className="pt-3">
            {recentFiles.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No projects yet"
                description="Import audio or record a new sample to start a DSP session."
                actionLabel="Import audio"
                onAction={() => navigate({ to: "/import" })}
                secondary={
                  <Button variant="outline" size="sm" className="press" onClick={() => loadDemo()}>
                    Load demo
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-1.5">
                {recentFiles.map((file) => (
                  <li
                    key={file.name}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-elevated px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="num truncate text-[12px] text-foreground">{file.name}</div>
                      <div className="num truncate text-[10.5px] text-muted-foreground">
                        {formatTime(file.durationSec, false)} · {(file.sampleRate / 1000).toFixed(1)} kHz ·{" "}
                        {formatBytes(file.sizeBytes)}
                      </div>
                    </div>
                    <span className="num shrink-0 text-[10.5px] text-muted-foreground">
                      {formatRelativeTime(file.openedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PanelBody>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Processing history" subtitle="Signal chain" icon={<Sparkles className="h-3.5 w-3.5" />} />
            <PanelBody className="pt-3">
              {original ? (
                <>
                  <ProcessingHistory />
                  {runs.length > 0 && (
                    <div className="num mt-3 text-[11px] text-muted-foreground">
                      Best improvement{" "}
                      <span className="text-success">
                        {formatDb(Math.max(...runs.map((r) => r.metrics.snrImprovementDb)), 2)}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="No processing results"
                  description="Once a signal is enhanced, every stage stays previewable here."
                  className="min-h-[180px]"
                />
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Quick tips" icon={<Lightbulb className="h-3.5 w-3.5" />} />
            <PanelBody className="space-y-2 pt-3">
              {TIPS.map((tip) => (
                <p key={tip} className="flex gap-2 text-[11.5px] leading-relaxed text-muted-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  {tip}
                </p>
              ))}
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  );
}
