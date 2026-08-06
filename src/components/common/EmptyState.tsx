import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondary?: ReactNode;
  className?: string;
}

/** Engineering-styled empty state: schematic illustration, title, action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondary,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "grid-lines flex min-h-[280px] flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border-strong/70 px-8 py-12 text-center",
        className,
      )}
    >
      <div className="relative mb-5">
        <div className="absolute inset-0 -m-4 rounded-full bg-primary/10 blur-xl" aria-hidden />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-border-strong bg-elevated">
          <Icon className="h-6 w-6 text-primary" strokeWidth={1.6} />
        </div>
      </div>
      <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      {(actionLabel || secondary) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {actionLabel && onAction ? (
            <Button size="sm" onClick={onAction} className="press">
              {actionLabel}
            </Button>
          ) : null}
          {secondary}
        </div>
      )}
    </div>
  );
}
