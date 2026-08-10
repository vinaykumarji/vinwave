import { useRouterState } from "@tanstack/react-router";
import { Bell, Menu, PanelRight, Search, Settings2, FileAudio } from "lucide-react";

import { NAV_ITEMS } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStudio } from "@/store/studio";

export function Toolbar({
  onOpenSettings,
  onOpenNav,
}: {
  onOpenSettings: () => void;
  onOpenNav?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { original, activeSignal, propertiesOpen, setPropertiesOpen, job } = useStudio();
  const current = NAV_ITEMS.find((item) => item.to === pathname);

  return (
    <header className="z-10 grid h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border bg-surface px-3">
      <div className="flex min-w-0 items-center gap-3">
        {onOpenNav ? (
          <button
            aria-label="Open navigation"
            onClick={onOpenNav}
            className="press grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-4 w-4" />
          </button>
        ) : null}
        <div className="min-w-0">

          <div className="flex min-w-0 items-baseline gap-2">
            <h1 className="truncate text-[13px] font-semibold tracking-tight">
              {current?.label ?? "Workspace"}
            </h1>
            <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
              {current?.hint}
            </span>
          </div>
        </div>

        <div className="hidden h-6 w-px bg-border lg:block" />

        <div className="hidden min-w-0 items-center gap-2 lg:flex">
          <FileAudio className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {original ? (
            <span className="num truncate text-[11.5px] text-secondary-foreground">
              {activeSignal?.metadata.fileName ?? original.metadata.fileName}
              <span className="ml-2 text-muted-foreground">
                {formatTime(original.metadata.durationSec, false)}
              </span>
            </span>
          ) : (
            <span className="text-[11.5px] italic text-muted-foreground">No file loaded</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <div className="hidden items-center gap-2 rounded-md border border-border bg-elevated px-2.5 py-1.5 text-[11.5px] text-muted-foreground md:flex">
          <Search className="h-3.5 w-3.5" />
          <span>Search commands</span>
          <kbd className="num ml-2 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px]">
            ⌘K
          </kbd>
        </div>

        {job?.running ? (
          <span className="num flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[10.5px] text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            {Math.round(job.progress * 100)}%
          </span>
        ) : null}

        <ToolbarIcon label="Notifications" onClick={() => undefined}>
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
        </ToolbarIcon>

        <ToolbarIcon label="Settings" onClick={onOpenSettings}>
          <Settings2 className="h-4 w-4" />
        </ToolbarIcon>

        <ToolbarIcon
          label={propertiesOpen ? "Hide properties panel" : "Show properties panel"}
          onClick={() => setPropertiesOpen(!propertiesOpen)}
          active={propertiesOpen}
        >
          <PanelRight className="h-4 w-4" />
        </ToolbarIcon>
      </div>
    </header>
  );
}

function ToolbarIcon({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          aria-label={label}
          className={cn(
            "press relative h-8 w-8 text-muted-foreground hover:text-foreground",
            active && "bg-primary/12 text-primary",
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="text-[11px]">{label}</TooltipContent>
    </Tooltip>
  );
}
