import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Ban, Check, Info, Loader2, Play, Sparkles, X } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { Panel, PanelBody, PanelHeader } from "@/components/common/Panel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DEFAULT_SPECTRAL_SUBTRACTION,
  DEFAULT_VAD_PARAMS,
  DEFAULT_WIENER,
} from "@/lib/dsp";
import { cn } from "@/lib/utils";
import { useStudio } from "@/store/studio";
import type { SpectralSubtractionParams, VadParams, WienerParams, WindowType } from "@/types/audio";

export const Route = createFileRoute("/enhancement")({
  head: () => ({
    meta: [
      { title: "Enhancement — VinWave Studio" },
      {
        name: "description",
        content: "Apply spectral subtraction, Wiener filtering or voice activity detection to speech.",
      },
      { property: "og:title", content: "Enhancement — VinWave Studio" },
      { property: "og:description", content: "Classical DSP speech enhancement with configurable parameters." },
    ],
  }),
  component: EnhancementPage,
});

const WINDOWS: WindowType[] = ["hann", "hamming", "blackman", "rectangular"];
const FFT_SIZES = [256, 512, 1024, 2048, 4096];

function EnhancementPage() {
  const navigate = useNavigate();
  const { original, job, runEnhancement, cancelProcessing } = useStudio();
  const [ss, setSs] = useState<SpectralSubtractionParams>(DEFAULT_SPECTRAL_SUBTRACTION);
  const [wf, setWf] = useState<WienerParams>(DEFAULT_WIENER);
  const [vad, setVad] = useState<VadParams>(DEFAULT_VAD_PARAMS);
  const [info, setInfo] = useState<string | null>(null);

  if (!original) {
    return (
      <div className="p-4">
        <EmptyState
          icon={Sparkles}
          title="No signal to enhance"
          description="Load a recording first — enhancement always writes to a new signal, leaving the original untouched."
          actionLabel="Import audio"
          onAction={() => navigate({ to: "/import" })}
        />
      </div>
    );
  }

  const busy = Boolean(job?.running);
  const estSec = (factor: number) => Math.max(0.2, (original.samples.length / 400000) * factor).toFixed(1);

  return (
    <div className="min-w-0 space-y-4 p-4">
      {job ? (
        <Panel>
          <PanelHeader
            title="Processing timeline"
            subtitle={`${Math.round(job.progress * 100)}% complete`}
            actions={
              busy ? (
                <Button size="sm" variant="outline" className="press" onClick={cancelProcessing}>
                  <X className="mr-1 h-3 w-3" /> Cancel
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="press" onClick={() => navigate({ to: "/comparison" })}>
                  Open comparison
                </Button>
              )
            }
          />
          <PanelBody className="space-y-3">
            <Progress value={job.progress * 100} className="h-1.5" />
            <ol className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-3">
              {job.stages.map((stage) => (
                <li
                  key={stage.label}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-2.5 py-2 text-[11.5px]",
                    stage.status === "active" && "border-primary/50 bg-primary/10 text-foreground",
                    stage.status === "done" && "border-border bg-elevated text-muted-foreground",
                    stage.status === "pending" && "border-border/60 bg-elevated/50 text-muted-foreground",
                    stage.status === "error" && "border-destructive/50 bg-destructive/10 text-destructive",
                    stage.status === "cancelled" && "border-warning/50 bg-warning/10 text-warning",
                  )}
                >
                  {stage.status === "done" ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : stage.status === "active" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : stage.status === "cancelled" ? (
                    <Ban className="h-3.5 w-3.5" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-border-strong" />
                  )}
                  <span className="min-w-0 truncate">{stage.label}</span>
                  {stage.detail ? (
                    <span className="num ml-auto shrink-0 text-[10px] text-muted-foreground">
                      {stage.detail}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </PanelBody>
        </Panel>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <AlgorithmCard
          title="Spectral Subtraction"
          description="Estimates a stationary noise magnitude spectrum from the leading frames and subtracts it, keeping the original phase. Best for fans, air-conditioning and white noise."
          estimate={`~${estSec(1)} s`}
          busy={busy}
          onApply={() => void runEnhancement("spectral-subtraction", ss)}
          onInfo={() =>
            setInfo(
              "Boll (1979): |Ŝ| = max(|Y| − α|N̂|, β|Y|). α is the over-subtraction factor, β the spectral floor that suppresses musical noise.",
            )
          }
        >
          <SelectRow label="FFT size" value={String(ss.fftSize)} options={FFT_SIZES.map(String)} onChange={(v) => setSs({ ...ss, fftSize: Number(v) })} />
          <SelectRow label="Window" value={ss.windowType} options={WINDOWS} onChange={(v) => setSs({ ...ss, windowType: v as WindowType })} />
          <SliderRow label="Overlap" value={ss.overlap} min={0.25} max={0.875} step={0.125} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setSs({ ...ss, overlap: v })} />
          <SliderRow label="Noise estimate" value={ss.noiseEstimateMs} min={100} max={1500} step={50} format={(v) => `${v} ms`} onChange={(v) => setSs({ ...ss, noiseEstimateMs: v })} />
          <SliderRow label="Reduction strength (α)" value={ss.reductionStrength} min={0.5} max={4} step={0.1} format={(v) => v.toFixed(1)} onChange={(v) => setSs({ ...ss, reductionStrength: v })} />
          <SliderRow label="Spectral floor (β)" value={ss.spectralFloor} min={0.005} max={0.2} step={0.005} format={(v) => v.toFixed(3)} onChange={(v) => setSs({ ...ss, spectralFloor: v })} />
        </AlgorithmCard>

        <AlgorithmCard
          title="Wiener Filter"
          description="Adaptive gain per frequency bin using a decision-directed a priori SNR estimate. Smoother than subtraction on mild, constant background noise."
          estimate={`~${estSec(1.2)} s`}
          busy={busy}
          onApply={() => void runEnhancement("wiener", wf)}
          onInfo={() => setInfo("Gain(k) = ξ(k) / (1 + ξ(k)), with ξ smoothed recursively (Ephraim–Malah decision-directed update).")}
        >
          <SelectRow label="FFT size" value={String(wf.fftSize)} options={FFT_SIZES.map(String)} onChange={(v) => setWf({ ...wf, fftSize: Number(v) })} />
          <SelectRow label="Window" value={wf.windowType} options={WINDOWS} onChange={(v) => setWf({ ...wf, windowType: v as WindowType })} />
          <SliderRow label="Overlap" value={wf.overlap} min={0.25} max={0.875} step={0.125} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setWf({ ...wf, overlap: v })} />
          <SliderRow label="Noise estimate" value={wf.noiseEstimateMs} min={100} max={1500} step={50} format={(v) => `${v} ms`} onChange={(v) => setWf({ ...wf, noiseEstimateMs: v })} />
          <SliderRow label="Smoothing (α)" value={wf.smoothing} min={0.5} max={0.99} step={0.01} format={(v) => v.toFixed(2)} onChange={(v) => setWf({ ...wf, smoothing: v })} />
          <SliderRow label="Noise variance scale" value={wf.noiseVarianceScale} min={0.5} max={3} step={0.1} format={(v) => v.toFixed(1)} onChange={(v) => setWf({ ...wf, noiseVarianceScale: v })} />
        </AlgorithmCard>

        <AlgorithmCard
          title="Voice Activity Detection"
          description="Frame energy and zero-crossing-rate decision against an adaptive noise floor. Marks speech regions on the waveform and attenuates silence."
          estimate={`~${estSec(0.3)} s`}
          busy={busy}
          onApply={() => void runEnhancement("vad", vad)}
          onInfo={() => setInfo("Frames are voiced when energy exceeds the 15th-percentile noise floor by the configured margin and ZCR stays below the fricative threshold. A hangover keeps trailing speech.")}
        >
          <SliderRow label="Frame length" value={vad.frameMs} min={10} max={40} step={5} format={(v) => `${v} ms`} onChange={(v) => setVad({ ...vad, frameMs: v })} />
          <SliderRow label="Energy threshold" value={vad.energyThresholdDb} min={3} max={20} step={1} format={(v) => `+${v} dB`} onChange={(v) => setVad({ ...vad, energyThresholdDb: v })} />
          <SliderRow label="ZCR threshold" value={vad.zcrThreshold} min={0.1} max={0.5} step={0.01} format={(v) => v.toFixed(2)} onChange={(v) => setVad({ ...vad, zcrThreshold: v })} />
          <SliderRow label="Hangover" value={vad.hangoverFrames} min={0} max={12} step={1} format={(v) => `${v} frames`} onChange={(v) => setVad({ ...vad, hangoverFrames: v })} />
        </AlgorithmCard>

        <Panel className="opacity-70">
          <PanelHeader title="MMSE Estimator" subtitle="Version 2 — coming soon" />
          <PanelBody className="space-y-3">
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Minimum mean-square-error short-time spectral amplitude estimation with a gamma speech
              prior. Reserved for a future release; not implemented in Version 1.0.
            </p>
            <span className="num inline-block rounded border border-warning/45 bg-warning/10 px-2 py-1 text-[10.5px] text-warning">
              Coming soon
            </span>
          </PanelBody>
        </Panel>
      </div>

      {info ? (
        <Panel>
          <PanelHeader
            title="Algorithm notes"
            icon={<Info className="h-3.5 w-3.5" />}
            actions={
              <Button size="sm" variant="ghost" className="press h-7" onClick={() => setInfo(null)}>
                Dismiss
              </Button>
            }
          />
          <PanelBody>
            <p className="num text-[12px] leading-relaxed text-secondary-foreground">{info}</p>
          </PanelBody>
        </Panel>
      ) : null}
    </div>
  );
}

function AlgorithmCard({
  title,
  description,
  estimate,
  busy,
  onApply,
  onInfo,
  children,
}: {
  title: string;
  description: string;
  estimate: string;
  busy: boolean;
  onApply: () => void;
  onInfo: () => void;
  children: React.ReactNode;
}) {
  return (
    <Panel className="hover-lift">
      <PanelHeader
        title={title}
        subtitle={`Estimated processing time ${estimate}`}
        icon={<Sparkles className="h-3.5 w-3.5" />}
        actions={
          <>
            <Button size="sm" variant="ghost" className="press h-7 w-7 p-0" aria-label="Algorithm info" onClick={onInfo}>
              <Info className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" className="press h-7" disabled={busy} onClick={onApply}>
              {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
              Apply
            </Button>
          </>
        }
      />
      <PanelBody className="space-y-3">
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">{description}</p>
        <div className="space-y-2.5 border-t border-border pt-3">{children}</div>
      </PanelBody>
    </Panel>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,110px)_minmax(0,1fr)_auto] items-center gap-3">
      <span className="truncate text-[11.5px] text-muted-foreground">{label}</span>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
      <span className="num w-16 shrink-0 text-right text-[11px] text-foreground">{format(value)}</span>
    </div>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,110px)_minmax(0,1fr)] items-center gap-3">
      <span className="truncate text-[11.5px] text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-[11.5px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option} className="text-[11.5px] capitalize">
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
