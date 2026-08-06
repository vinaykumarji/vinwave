import { ArrowDown, Check, Download, Eye, FileAudio, Sparkles } from "lucide-react";

import { formatDb, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStudio } from "@/store/studio";

/** Original → algorithm → algorithm → export chain, with stage preview. */
export function ProcessingHistory({ compact = false }: { compact?: boolean }) {
  const { original, runs, exports, activeSignalId, setActiveSignal } = useStudio();

  if (!original) return null;

  const nodes = [
    {
      id: original.id,
      title: "Original",
      subtitle: original.metadata.fileName,
      icon: FileAudio,
      meta: formatRelativeTime(original.createdAt),
      selectable: true,
    },
    ...runs.map((run) => ({
      id: run.resultSignalId,
      title: run.algorithmLabel,
      subtitle: `SNR ${formatDb(run.metrics.snrImprovementDb, 2)} · ${run.metrics.processingTimeMs.toFixed(0)} ms`,
      icon: Sparkles,
      meta: formatRelativeTime(run.createdAt),
      selectable: true,
    })),
    ...exports.slice(0, 1).map((record) => ({
      id: `export-${record.id}`,
      title: `Export · ${record.format.toUpperCase()}`,
      subtitle: record.fileName,
      icon: Download,
      meta: formatRelativeTime(record.createdAt),
      selectable: false,
    })),
  ];

  return (
    <ol className="space-y-0">
      {nodes.map((node, index) => {
        const active = node.id === activeSignalId;
        return (
          <li key={node.id}>
            <button
              type="button"
              disabled={!node.selectable}
              onClick={() => node.selectable && setActiveSignal(node.id)}
              className={cn(
                "group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-all duration-150",
                active
                  ? "border-primary/50 bg-primary/10"
                  : "border-border bg-elevated hover:border-border-strong",
                !node.selectable && "cursor-default opacity-80",
              )}
            >
              <span
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded border",
                  active ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground",
                )}
              >
                <node.icon className="h-3 w-3" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11.5px] font-medium text-foreground">
                  {node.title}
                </span>
                <span className="num block truncate text-[10.5px] text-muted-foreground">
                  {node.subtitle}
                </span>
              </span>
              <span className="shrink-0">
                {active ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : node.selectable ? (
                  <Eye className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                ) : null}
              </span>
            </button>
            {index < nodes.length - 1 && (
              <div className={cn("flex items-center gap-2 py-1", compact ? "pl-4" : "pl-4")}>
                <ArrowDown className="h-3 w-3 text-border-strong" />
                <span className="h-px flex-1 bg-border/70" />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
