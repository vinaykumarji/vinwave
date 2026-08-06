import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Download, FileDown, FolderDown, History } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/EmptyState";
import { Panel, PanelBody, PanelHeader } from "@/components/common/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadBlob, encodeMp3, encodeWav } from "@/lib/audio/encode";
import { formatBytes, formatRelativeTime } from "@/lib/format";
import { useStudio } from "@/store/studio";

export const Route = createFileRoute("/export")({
  head: () => ({
    meta: [
      { title: "Export — VinWave Studio" },
      { name: "description", content: "Render the enhanced signal to WAV or MP3 and keep an export history." },
      { property: "og:title", content: "Export — VinWave Studio" },
      { property: "og:description", content: "Export processed speech as WAV or MP3." },
    ],
  }),
  component: ExportPage,
});

function ExportPage() {
  const navigate = useNavigate();
  const { original, enhanced, activeSignal, exports, addExport } = useStudio();
  const source = enhanced ?? original;
  const [format, setFormat] = useState<"wav" | "mp3">("wav");
  const [destination, setDestination] = useState("Downloads/VinWave");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!source) {
    return (
      <div className="p-4">
        <EmptyState
          icon={FileDown}
          title="Nothing to export"
          description="Load a signal and optionally enhance it, then render the result to WAV or MP3."
          actionLabel="Import audio"
          onAction={() => navigate({ to: "/import" })}
        />
      </div>
    );
  }

  const target = activeSignal ?? source;
  const base = fileName || target.metadata.fileName.replace(/\.[^.]+$/, "");

  const handleExport = async () => {
    setBusy(true);
    try {
      const blob =
        format === "wav"
          ? encodeWav(target.samples, target.metadata.sampleRate)
          : await encodeMp3(target.samples, target.metadata.sampleRate);
      const name = `${base}.${format}`;
      downloadBlob(blob, name);
      addExport({
        id: crypto.randomUUID(),
        fileName: name,
        format,
        destination,
        sizeBytes: blob.size,
        sourceLabel: target.kind === "processed" ? "Enhanced signal" : "Original signal",
        createdAt: Date.now(),
      });
      toast.success("Export complete", { description: `${name} · ${formatBytes(blob.size)}` });
    } catch (error) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "Encoding error.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4 p-4">
      <Panel>
        <PanelHeader
          title="Export signal"
          subtitle={`Rendering “${target.metadata.fileName}”`}
          icon={<Download className="h-3.5 w-3.5" />}
        />
        <PanelBody className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="File name">
              <Input
                value={fileName}
                placeholder={base}
                onChange={(e) => setFileName(e.target.value)}
                className="h-9 text-[12px]"
              />
            </Field>
            <Field label="Destination folder">
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="h-9 text-[12px]"
              />
            </Field>
            <Field label="Format">
              <Select value={format} onValueChange={(v) => setFormat(v as "wav" | "mp3")}>
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wav">WAV · 16-bit PCM (lossless)</SelectItem>
                  <SelectItem value="mp3">MP3 · 192 kbps</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" className="press" disabled={busy} onClick={() => void handleExport()}>
              <FolderDown className="mr-1.5 h-3.5 w-3.5" />
              {busy ? "Encoding…" : `Export ${format.toUpperCase()}`}
            </Button>
            <span className="num text-[11px] text-muted-foreground">
              {base}.{format} → {destination}
            </span>
          </div>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="Export history" icon={<History className="h-3.5 w-3.5" />} />
        <PanelBody className="pt-3">
          {exports.length === 0 ? (
            <EmptyState
              icon={FileDown}
              title="No export history"
              description="Rendered files from this session are listed here with format and size."
              className="min-h-[160px]"
            />
          ) : (
            <ul className="space-y-1.5">
              {exports.map((record) => (
                <li
                  key={record.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-elevated px-3 py-2"
                >
                  <span className="num shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                    {record.format}
                  </span>
                  <div className="min-w-0">
                    <div className="num truncate text-[12px]">{record.fileName}</div>
                    <div className="num truncate text-[10.5px] text-muted-foreground">
                      {record.sourceLabel} · {formatBytes(record.sizeBytes)} · {record.destination}
                    </div>
                  </div>
                  <span className="num shrink-0 text-[10.5px] text-muted-foreground">
                    {formatRelativeTime(record.createdAt)}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="label-eyebrow mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
