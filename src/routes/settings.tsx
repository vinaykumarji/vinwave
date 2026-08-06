import { createFileRoute } from "@tanstack/react-router";
import { Info, Keyboard, Palette, Settings2, Zap } from "lucide-react";

import { Panel, PanelBody, PanelHeader } from "@/components/common/Panel";
import { StatRow } from "@/components/common/MetricCard";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WINDOW_LABELS } from "@/lib/dsp/windows";
import { useStudio } from "@/store/studio";
import type { WindowType } from "@/types/audio";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — VinWave Studio" },
      { name: "description", content: "Appearance, audio defaults, performance options and application information." },
      { property: "og:title", content: "Settings — VinWave Studio" },
      { property: "og:description", content: "Configure analysis defaults and rendering behaviour." },
    ],
  }),
  component: SettingsPage,
});

const SHORTCUTS = [
  ["Space", "Play / pause"],
  ["S", "Stop playback"],
  ["Scroll", "Zoom waveform at pointer"],
  ["Alt + drag", "Pan waveform"],
  ["⌘K", "Command search (placeholder)"],
];

function SettingsPage() {
  const { settings, updateSettings } = useStudio();

  return (
    <div className="min-w-0 space-y-4 p-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <PanelHeader title="Appearance" subtitle="Dark engineering theme" icon={<Palette className="h-3.5 w-3.5" />} />
          <PanelBody className="space-y-3">
            <Row label="Spectrogram colormap">
              <Select
                value={settings.spectrogramColormap}
                onValueChange={(v) => updateSettings({ spectrogramColormap: v as typeof settings.spectrogramColormap })}
              >
                <SelectTrigger className="h-8 w-[170px] text-[11.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="magma">Magma</SelectItem>
                  <SelectItem value="viridis">Viridis</SelectItem>
                  <SelectItem value="grayscale">Grayscale</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row label="Interface animations">
              <Switch
                checked={settings.animationsEnabled}
                onCheckedChange={(v) => updateSettings({ animationsEnabled: v })}
              />
            </Row>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Audio & analysis" subtitle="Defaults applied to new signals" icon={<Settings2 className="h-3.5 w-3.5" />} />
          <PanelBody className="space-y-3">
            <Row label="Default FFT size">
              <Select value={String(settings.fftSize)} onValueChange={(v) => updateSettings({ fftSize: Number(v) })}>
                <SelectTrigger className="h-8 w-[170px] text-[11.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[256, 512, 1024, 2048, 4096].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} points
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <Row label="Default window">
              <Select value={settings.windowType} onValueChange={(v) => updateSettings({ windowType: v as WindowType })}>
                <SelectTrigger className="h-8 w-[170px] text-[11.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(WINDOW_LABELS) as WindowType[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {WINDOW_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <Row label="Normalise amplitude on import">
              <Switch
                checked={settings.normalizeOnImport}
                onCheckedChange={(v) => updateSettings({ normalizeOnImport: v })}
              />
            </Row>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Performance" subtitle="Rendering and processing behaviour" icon={<Zap className="h-3.5 w-3.5" />} />
          <PanelBody className="space-y-3">
            <Row label="High-quality canvas rendering">
              <Switch
                checked={settings.highQualityRendering}
                onCheckedChange={(v) => updateSettings({ highQualityRendering: v })}
              />
            </Row>
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              DSP runs in cooperative chunks on the main thread and yields between frame batches, so
              the interface stays responsive and every job can be cancelled.
            </p>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="About" icon={<Info className="h-3.5 w-3.5" />} />
          <PanelBody>
            <StatRow label="Application" value="VinWave Studio" mono={false} />
            <StatRow label="Version" value="1.0.0" />
            <StatRow label="DSP engine" value="Classical (no AI / ML)" mono={false} />
            <StatRow label="Algorithms" value="Spectral subtraction · Wiener · VAD" mono={false} />
            <StatRow label="Author" value="Vinay Kumar" mono={false} />
            <StatRow label="Roll number" value="23F3000334" />
          </PanelBody>
        </Panel>

        <Panel className="xl:col-span-2">
          <PanelHeader title="Keyboard shortcuts" icon={<Keyboard className="h-3.5 w-3.5" />} />
          <PanelBody className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SHORTCUTS.map(([key, action]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-elevated px-3 py-2"
              >
                <span className="text-[11.5px] text-muted-foreground">{action}</span>
                <kbd className="num shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px]">
                  {key}
                </kbd>
              </div>
            ))}
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <span className="truncate text-[12px] text-secondary-foreground">{label}</span>
      {children}
    </div>
  );
}
