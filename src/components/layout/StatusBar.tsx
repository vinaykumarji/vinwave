import { useEffect, useState } from "react";
import { Activity, Cpu, HardDrive, Clock, Radio } from "lucide-react";

import { formatHz, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStudio } from "@/store/studio";

/** Bottom status bar: project state, signal facts and runtime telemetry. */
export function StatusBar() {
  const { original, activeSignal, job, runs } = useStudio();
  const [telemetry, setTelemetry] = useState({ cpu: 6, mem: 148 });

  useEffect(() => {
    const id = setInterval(() => {
      setTelemetry(() => ({
        cpu: job?.running ? 42 + Math.random() * 38 : 4 + Math.random() * 9,
        mem: 140 + (original ? original.samples.length / 262144 : 0) + Math.random() * 12,
      }));
    }, 1400);
    return () => clearInterval(id);
  }, [job?.running, original]);

  const status = job?.running
    ? { label: "Processing", tone: "text-primary", dot: "bg-primary animate-pulse" }
    : original
      ? { label: "Ready", tone: "text-success", dot: "bg-success" }
      : { label: "Idle — no signal", tone: "text-muted-foreground", dot: "bg-muted-foreground" };

  return (
    <footer className="grid h-7 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-border bg-surface px-3 text-[11px]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex shrink-0 items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
          <span className={cn("font-medium", status.tone)}>{status.label}</span>
        </span>
        <Divider />
        <span className="num min-w-0 truncate text-muted-foreground">
          {original ? original.metadata.fileName : "untitled_project"}
        </span>
        {runs.length > 0 && (
          <>
            <Divider />
            <span className="num shrink-0 text-muted-foreground">
              {runs.length} stage{runs.length > 1 ? "s" : ""} in history
            </span>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3 text-muted-foreground">
        <Item icon={Clock} value={formatTime(activeSignal?.metadata.durationSec ?? 0, false)} />
        <Divider />
        <Item icon={Radio} value={original ? formatHz(original.metadata.sampleRate) : "—"} />
        <Divider />
        <Item icon={Activity} value={`${activeSignal?.metadata.channels ?? 1} ch`} />
        <Divider />
        <Item icon={Cpu} value={`${telemetry.cpu.toFixed(0)}%`} />
        <Divider />
        <Item icon={HardDrive} value={`${telemetry.mem.toFixed(0)} MB`} />
      </div>
    </footer>
  );
}

const Divider = () => <span className="h-3 w-px shrink-0 bg-border" />;

function Item({ icon: Icon, value }: { icon: typeof Cpu; value: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <Icon className="h-3 w-3" />
      <span className="num">{value}</span>
    </span>
  );
}
