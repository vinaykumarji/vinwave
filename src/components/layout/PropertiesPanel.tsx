import { History, Info, SlidersHorizontal, Waves } from "lucide-react";

import { StatRow } from "@/components/common/MetricCard";
import { ProcessingHistory } from "@/components/audio/ProcessingHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBytes, formatDb, formatHz, formatTime } from "@/lib/format";
import { useStudio } from "@/store/studio";

/** Right-hand properties panel — always shows metadata for the active signal. */
export function PropertiesPanel() {
  const { activeSignal, statistics, runs } = useStudio();

  return (
    <aside className="flex h-full w-[288px] shrink-0 flex-col border-l border-border bg-sidebar">
      <div className="flex h-9 items-center gap-2 border-b border-border px-3">
        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="label-eyebrow">Properties</span>
      </div>

      {!activeSignal ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <Waves className="h-5 w-5 text-muted-foreground" />
          <p className="text-[11.5px] text-muted-foreground">
            Metadata and signal statistics appear once audio is loaded into the workspace.
          </p>
        </div>
      ) : (
        <Tabs defaultValue="metadata" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList className="mx-3 mt-3 grid h-8 grid-cols-3 bg-elevated p-0.5">
            <TabsTrigger value="metadata" className="text-[11px]">
              <Info className="mr-1 h-3 w-3" /> File
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-[11px]">
              <Waves className="mr-1 h-3 w-3" /> Signal
            </TabsTrigger>
            <TabsTrigger value="history" className="text-[11px]">
              <History className="mr-1 h-3 w-3" /> Chain
            </TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3">
            <TabsContent value="metadata" className="mt-0 animate-fade-in">
              <StatRow label="File name" value={activeSignal.metadata.fileName} mono={false} />
              <StatRow label="Duration" value={formatTime(activeSignal.metadata.durationSec)} />
              <StatRow label="File size" value={formatBytes(activeSignal.metadata.fileSizeBytes)} />
              <StatRow label="Sample rate" value={formatHz(activeSignal.metadata.sampleRate)} />
              <StatRow label="Channels" value={`${activeSignal.metadata.channels} (analysed mono)`} />
              <StatRow label="Bit depth" value={`${activeSignal.metadata.bitDepth}-bit`} />
              <StatRow label="Encoding" value={activeSignal.metadata.encoding} mono={false} />
              <StatRow
                label="Last modified"
                value={new Date(activeSignal.metadata.lastModified).toLocaleString()}
              />
              <StatRow label="Total samples" value={activeSignal.samples.length.toLocaleString()} />
              <StatRow label="Source" value={activeSignal.kind} mono={false} />
            </TabsContent>

            <TabsContent value="stats" className="mt-0 animate-fade-in">
              {statistics ? (
                <>
                  <StatRow label="Peak amplitude" value={statistics.peakAmplitude.toFixed(4)} />
                  <StatRow
                    label="Peak level"
                    value={formatDb(20 * Math.log10(statistics.peakAmplitude + 1e-12))}
                  />
                  <StatRow label="RMS" value={statistics.rms.toFixed(5)} />
                  <StatRow label="Crest factor" value={formatDb(statistics.crestFactorDb)} />
                  <StatRow label="DC offset" value={statistics.dcOffset.toFixed(6)} />
                  <StatRow
                    label="Zero-crossing rate"
                    value={statistics.zeroCrossingRate.toFixed(5)}
                  />
                  <StatRow label="Noise floor" value={formatDb(statistics.estimatedNoiseFloorDb)} />
                  <StatRow label="Segmental SNR" value={formatDb(statistics.estimatedSnrDb, 2)} />
                  <StatRow
                    label="Nyquist"
                    value={formatHz(activeSignal.metadata.sampleRate / 2)}
                  />
                </>
              ) : null}
            </TabsContent>

            <TabsContent value="history" className="mt-0 animate-fade-in">
              <ProcessingHistory compact />
              {runs.length === 0 && (
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  Run an algorithm from the Enhancement workspace to build a processing chain. Each
                  stage stays previewable.
                </p>
              )}
            </TabsContent>
          </div>
        </Tabs>
      )}
    </aside>
  );
}
