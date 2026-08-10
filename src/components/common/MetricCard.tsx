import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "positive" | "negative" | "accent" | "gold";
  className?: string;
}

const TONE_CLASS: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  neutral: "text-foreground",
  positive: "text-success",
  negative: "text-destructive",
  accent: "text-primary-bright",
  gold: "text-gold",
};

export function MetricCard({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = "neutral",
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "panel-flat hover-lift flex min-w-0 flex-col gap-1.5 px-3.5 py-3",
        tone === "gold" && "gold-ring",
        className,
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <span className="label-eyebrow truncate">{label}</span>
        {Icon ? (
          <Icon
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              tone === "gold" ? "text-gold" : "text-muted-foreground",
            )}
          />
        ) : null}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn("num text-[19px] font-semibold leading-none", TONE_CLASS[tone])}>
          {value}
        </span>
        {unit ? <span className="num text-[11px] text-muted-foreground">{unit}</span> : null}
      </div>
      {hint ? <span className="truncate text-[11px] text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

export function StatRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 py-[7px] last:border-0">
      <span className="truncate text-[11.5px] text-muted-foreground">{label}</span>
      <span className={cn("shrink-0 text-[11.5px] font-medium text-foreground", mono && "num")}>
        {value}
      </span>
    </div>
  );
}
