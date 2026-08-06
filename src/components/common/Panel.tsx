import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  flat = false,
}: {
  children: ReactNode;
  className?: string;
  flat?: boolean;
}) {
  return (
    <section className={cn(flat ? "panel-flat" : "panel", "flex min-w-0 flex-col", className)}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  subtitle,
  icon,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-2.5",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {icon ? <span className="shrink-0 text-muted-foreground">{icon}</span> : null}
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold tracking-tight text-foreground">{title}</h2>
          {subtitle ? (
            <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </header>
  );
}

export function PanelBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0 flex-1 p-4", className)}>{children}</div>;
}
