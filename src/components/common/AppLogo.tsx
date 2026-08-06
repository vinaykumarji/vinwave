import { Waves } from "lucide-react";

import { cn } from "@/lib/utils";

/** VinWave monogram: a stylised waveform inside a rounded engineering plate. */
export function AppLogo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center rounded-[7px] border border-primary/40 bg-primary/12",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Waves className="text-primary" style={{ width: size * 0.6, height: size * 0.6 }} strokeWidth={2.2} />
      <span className="pointer-events-none absolute inset-0 rounded-[7px] shadow-[inset_0_1px_0_0_oklch(1_0_0/12%)]" />
    </div>
  );
}

export function AppWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <AppLogo />
      {!compact && (
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[13px] font-semibold tracking-tight text-foreground">
            VinWave <span className="text-muted-foreground">Studio</span>
          </div>
          <div className="num truncate text-[10px] text-muted-foreground">
            Analyze • Enhance • Understand
          </div>
        </div>
      )}
    </div>
  );
}
