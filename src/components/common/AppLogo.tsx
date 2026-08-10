import { cn } from "@/lib/utils";

/**
 * VinWave mark: a stencil "V" whose stroke resolves into an audio waveform.
 * Purple body, gold waveform accent.
 */
export function AppLogo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center rounded-[7px] border border-primary/45 bg-primary/12",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.72}
        height={size * 0.72}
        fill="none"
        strokeLinecap="round"
      >
        {/* V body */}
        <path
          d="M4 5.5 L11.4 19 L18.8 5.5"
          stroke="var(--primary-bright)"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        {/* waveform crossing the V */}
        <g stroke="var(--gold)" strokeWidth="1.7">
          <path d="M6.6 12 v-2.4" />
          <path d="M9.4 12 v-4.6" />
          <path d="M12 12 v-6.4" opacity="0.95" />
          <path d="M14.6 12 v-4.6" />
          <path d="M17.4 12 v-2.4" />
        </g>
      </svg>
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
          <div className="num truncate text-[10px] text-accent">Analyze • Enhance • Understand</div>
        </div>
      )}
    </div>
  );
}
