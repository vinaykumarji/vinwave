import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AlertTriangle, FileAudio, FolderOpen, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/EmptyState";
import { Panel, PanelBody, PanelHeader } from "@/components/common/Panel";
import { Button } from "@/components/ui/button";
import { AudioValidationError, decodeFile, SUPPORTED_EXTENSIONS } from "@/lib/audio/decode";
import { formatBytes, formatRelativeTime, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStudio } from "@/store/studio";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Import Audio — VinWave Studio" },
      {
        name: "description",
        content: "Drag and drop WAV, MP3 or FLAC speech recordings into the DSP workspace.",
      },
      { property: "og:title", content: "Import Audio — VinWave Studio" },
      { property: "og:description", content: "Validate and load speech recordings for DSP analysis." },
    ],
  }),
  component: ImportPage,
});

function ImportPage() {
  const navigate = useNavigate();
  const { loadSignal, recentFiles, settings } = useStudio();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; suggestion: string } | null>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const signal = await decodeFile(file, settings.normalizeOnImport);
      loadSignal(signal);
      toast.success("Audio imported", {
        description: `${file.name} · ${formatTime(signal.metadata.durationSec, false)} · ${(signal.metadata.sampleRate / 1000).toFixed(1)} kHz`,
      });
      navigate({ to: "/explorer" });
    } catch (err) {
      const validation = err instanceof AudioValidationError ? err : null;
      const message = validation?.message ?? "Import failed";
      const suggestion = validation?.suggestion ?? "Try a different file.";
      setError({ message, suggestion });
      toast.error(message, { description: suggestion });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4 p-4">
      <Panel>
        <PanelHeader
          title="Import audio"
          subtitle="Original audio is preserved — enhancement always writes to a new signal"
          icon={<Upload className="h-3.5 w-3.5" />}
        />
        <PanelBody>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) void handleFile(file);
            }}
            className={cn(
              "grid-lines flex min-h-[300px] flex-col items-center justify-center rounded-lg border-2 border-dashed px-8 py-12 text-center transition-colors duration-200",
              dragging ? "border-primary bg-primary/8" : "border-border-strong/70",
            )}
          >
            <div className="mb-5 grid h-14 w-14 place-items-center rounded-xl border border-border-strong bg-elevated">
              {busy ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <Upload className="h-6 w-6 text-primary" strokeWidth={1.6} />
              )}
            </div>
            <h3 className="text-sm font-semibold tracking-tight">
              {busy ? "Decoding audio stream…" : "Drop a speech recording here"}
            </h3>
            <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
              Files are decoded locally in the browser, summed to mono for analysis and never
              uploaded anywhere.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <Button size="sm" className="press" disabled={busy} onClick={() => inputRef.current?.click()}>
                Browse audio
              </Button>
              <span className="num rounded border border-border bg-elevated px-2 py-1 text-[10.5px] uppercase text-muted-foreground">
                {SUPPORTED_EXTENSIONS.join(" · ")}
              </span>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".wav,.mp3,.flac,audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
          </div>

          {error ? (
            <div className="mt-4 flex items-start gap-3 rounded-md border border-destructive/45 bg-destructive/10 px-3.5 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-medium text-foreground">{error.message}</p>
                <p className="text-[11.5px] text-muted-foreground">{error.suggestion}</p>
              </div>
              <Button size="sm" variant="outline" className="press shrink-0" onClick={() => inputRef.current?.click()}>
                Retry
              </Button>
            </div>
          ) : null}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="Recent files" icon={<FolderOpen className="h-3.5 w-3.5" />} />
        <PanelBody className="pt-3">
          {recentFiles.length === 0 ? (
            <EmptyState
              icon={FileAudio}
              title="No recent files"
              description="Imported and recorded signals from this session will be listed here."
              className="min-h-[160px]"
            />
          ) : (
            <ul className="space-y-1.5">
              {recentFiles.map((file) => (
                <li
                  key={file.name}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-elevated px-3 py-2"
                >
                  <FileAudio className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="num truncate text-[12px]">{file.name}</div>
                    <div className="num truncate text-[10.5px] text-muted-foreground">
                      {formatTime(file.durationSec, false)} · {formatBytes(file.sizeBytes)}
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
    </div>
  );
}
