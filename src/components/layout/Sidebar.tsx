import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Download,
  Gauge,
  LayoutDashboard,
  Mic,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  Upload,
  Waves,
} from "lucide-react";

import { AppLogo } from "@/components/common/AppLogo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useStudio } from "@/store/studio";

export interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  hint: string;
  group: "workspace" | "pipeline" | "system";
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, hint: "Session overview", group: "workspace" },
  { to: "/import", label: "Import Audio", icon: Upload, hint: "WAV · MP3 · FLAC", group: "workspace" },
  { to: "/record", label: "Record Audio", icon: Mic, hint: "Capture from microphone", group: "workspace" },
  { to: "/explorer", label: "Signal Explorer", icon: Waves, hint: "Waveform · FFT · Spectrogram", group: "pipeline" },
  { to: "/enhancement", label: "Enhancement", icon: Sparkles, hint: "Classical DSP algorithms", group: "pipeline" },
  { to: "/comparison", label: "Comparison", icon: ArrowLeftRight, hint: "Original vs enhanced", group: "pipeline" },
  { to: "/export", label: "Export", icon: Download, hint: "Render WAV or MP3", group: "pipeline" },
  { to: "/settings", label: "Settings", icon: Settings, hint: "Appearance · audio · performance", group: "system" },
];

const GROUP_LABEL: Record<NavItem["group"], string> = {
  workspace: "Session",
  pipeline: "DSP Pipeline",
  system: "System",
};

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { runs, original } = useStudio();

  const groups: NavItem["group"][] = ["workspace", "pipeline", "system"];

  return (
    <aside
      className={cn(
        "z-20 flex h-full flex-col border-r border-border bg-sidebar transition-[width] duration-200 ease-out",
        collapsed ? "w-[60px]" : "w-[236px]",
      )}
    >
      <div
        className={cn(
          "flex h-12 items-center border-b border-border px-3",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {collapsed ? (
          <AppLogo size={26} />
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2.5">
              <AppLogo size={26} />
              <span className="truncate text-[13px] font-semibold tracking-tight">VinWave</span>
            </div>
            <button
              onClick={onToggle}
              aria-label="Collapse sidebar"
              className="press grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {groups.map((group) => (
          <div key={group} className="mb-1.5">
            {!collapsed && <div className="label-eyebrow px-4 pb-1.5 pt-2">{GROUP_LABEL[group]}</div>}
            {collapsed && <div className="mx-3 my-2 h-px bg-border" />}
            <ul className="space-y-0.5 px-2">
              {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
                const active = pathname === item.to;
                const disabledHint =
                  !original && ["/explorer", "/enhancement", "/comparison", "/export"].includes(item.to);
                return (
                  <li key={item.to}>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.to}
                          className={cn(
                            "group relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[12.5px] font-medium transition-all duration-150",
                            active
                              ? "bg-sidebar-accent text-foreground"
                              : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground hover:translate-x-[2px]",
                            collapsed && "justify-center px-0",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-r bg-primary transition-opacity duration-150",
                              active ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <item.icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                            )}
                          />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                          {!collapsed && item.to === "/comparison" && runs.length > 0 && (
                            <span className="num ml-auto rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                              {runs.length}
                            </span>
                          )}
                          {!collapsed && disabledHint && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-warning/70" />
                          )}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-[11px]">
                        <span className="font-medium">{item.label}</span>
                        <span className="block text-muted-foreground">{item.hint}</span>
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-2">
        {collapsed ? (
          <button
            onClick={onToggle}
            aria-label="Expand sidebar"
            className="press grid h-8 w-full place-items-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : (
          <div className="panel-flat flex items-center gap-2 px-2.5 py-2">
            <Gauge className="h-3.5 w-3.5 shrink-0 text-accent" />
            <div className="min-w-0">
              <div className="num text-[10.5px] text-foreground">v1.0.0</div>
              <div className="truncate text-[10px] text-muted-foreground">Classical DSP engine</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
