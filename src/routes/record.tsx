import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";

import { Panel, PanelBody, PanelHeader } from "@/components/common/Panel";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAudioContext, normalizePeak } from "@/lib/audio/decode";
import { formatTime } from "@/lib/format";
import { useStudio } from "@/store/studio";

export const Route = createFileRoute("/record")({
  head: () => ({
    meta: [
      { title: "Record Audio — VinWave Studio" },
      { name: "description", content: "Capture speech from a microphone with a live waveform monitor." },
      { property: "og:title", content: "Record Audio — VinWave Studio" },
      { property: "og:description", content: "Record speech samples directly into the DSP workspace." },
    ],
  }),
  component: RecordPage,
});

function RecordPage() {
  const navigate = useNavigate();
  const { loadSignal, settings } = useStudio();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("default");
  const [state, setState] = useState<"idle" | "recording" | "paused">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState<number[]>(Array.from({ length: 96 }, () => 0));

  const streamRef = useRef<MediaStream | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((list) => setDevices(list.filter((d) => d.kind === "audioinput")))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (state !== "recording") return;
    const id = setInterval(() => setElapsed((v) => v + 0.1), 100);
    return () => clearInterval(id);
  }, [state]);

  const cleanup = () => {
    nodeRef.current?.disconnect();
    nodeRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => cleanup, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId === "default" ? true : { deviceId: { exact: deviceId } },
      });
      streamRef.current = stream;
      const ctx = getAudioContext();
      await ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(2048, 1, 1);
      chunksRef.current = [];
      processor.onaudioprocess = (event) => {
        if (stateRef.current !== "recording") return;
        const input = event.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(input));
        let peak = 0;
        for (let i = 0; i < input.length; i++) peak = Math.max(peak, Math.abs(input[i]));
        setLevel((prev) => [...prev.slice(1), peak]);
      };
      source.connect(processor);
      processor.connect(ctx.destination);
      nodeRef.current = processor;
      setElapsed(0);
      setState("recording");
    } catch {
      toast.error("Microphone unavailable", {
        description: "Grant microphone permission in the browser to record.",
      });
    }
  };

  const stop = () => {
    const chunks = chunksRef.current;
    const sampleRate = getAudioContext().sampleRate;
    cleanup();
    setState("idle");
    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    if (total < sampleRate * 0.25) {
      toast.warning("Recording too short", { description: "Record at least 0.25 s of audio." });
      return;
    }
    const merged = new Float32Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    const samples = settings.normalizeOnImport ? normalizePeak(merged) : merged;
    loadSignal({
      id: crypto.randomUUID(),
      kind: "record",
      samples,
      createdAt: Date.now(),
      metadata: {
        fileName: `recording_${new Date().toISOString().slice(11, 19).replace(/:/g, "")}.wav`,
        durationSec: samples.length / sampleRate,
        fileSizeBytes: samples.length * 2 + 44,
        sampleRate,
        channels: 1,
        bitDepth: 16,
        encoding: "Linear PCM (captured)",
        lastModified: Date.now(),
      },
    });
    toast.success("Recording saved", { description: `${formatTime(samples.length / sampleRate, false)} captured` });
    navigate({ to: "/explorer" });
  };

  return (
    <div className="min-w-0 space-y-4 p-4">
      <Panel>
        <PanelHeader
          title="Record audio"
          subtitle="Mono capture at the device sample rate"
          icon={<Mic className="h-3.5 w-3.5" />}
        />
        <PanelBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="min-w-0">
              <label className="label-eyebrow mb-1.5 block">Input device</label>
              <Select value={deviceId} onValueChange={setDeviceId} disabled={state !== "idle"}>
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue placeholder="System default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">System default microphone</SelectItem>
                  {devices
                    .filter((d) => d.deviceId && d.deviceId !== "default")
                    .map((d, i) => (
                      <SelectItem key={d.deviceId} value={d.deviceId}>
                        {d.label || `Input ${i + 1}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2">
                <span
                  className={
                    state === "recording"
                      ? "animate-pulse-rec h-2 w-2 rounded-full bg-destructive"
                      : "h-2 w-2 rounded-full bg-muted-foreground"
                  }
                />
                <span className="num text-[15px] font-semibold">{formatTime(elapsed, false)}</span>
              </span>
            </div>
          </div>

          <div className="flex h-[168px] items-center gap-[2px] rounded-md border border-border bg-elevated px-3">
            {level.map((value, index) => (
              <span
                key={index}
                className="flex-1 rounded-sm bg-primary/80 transition-[height] duration-100"
                style={{ height: `${Math.max(2, Math.min(100, value * 190))}%` }}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {state === "idle" ? (
              <Button size="sm" className="press" onClick={() => void start()}>
                <Mic className="mr-1.5 h-3.5 w-3.5" /> Start recording
              </Button>
            ) : (
              <>
                {state === "recording" ? (
                  <Button size="sm" variant="outline" className="press" onClick={() => setState("paused")}>
                    <Pause className="mr-1.5 h-3.5 w-3.5" /> Pause
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="press" onClick={() => setState("recording")}>
                    <Play className="mr-1.5 h-3.5 w-3.5" /> Resume
                  </Button>
                )}
                <Button size="sm" variant="destructive" className="press" onClick={stop}>
                  <Square className="mr-1.5 h-3.5 w-3.5" /> Stop &amp; analyse
                </Button>
              </>
            )}
            <span className="text-[11.5px] text-muted-foreground">
              Leave ~0.5 s of silence at the start so the noise profile can be estimated.
            </span>
          </div>
        </PanelBody>
      </Panel>
    </div>
  );
}
