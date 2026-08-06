import { Pause, Play, Repeat, Square, Volume2, ZoomIn, ZoomOut, Maximize } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlaybackController } from "@/hooks/useAudioPlayback";

export interface TransportBarProps {
  playback: PlaybackController;
  cursorSec: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetView?: () => void;
  zoomLabel?: string;
}

/** Playback transport + view controls, shared by Explorer and Comparison. */
export function TransportBar({
  playback,
  cursorSec,
  onZoomIn,
  onZoomOut,
  onResetView,
  zoomLabel,
}: TransportBarProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-elevated px-3 py-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <Button
          size="icon"
          className="press h-8 w-8"
          onClick={() => (playback.playing ? playback.pause() : playback.play(cursorSec))}
          aria-label={playback.playing ? "Pause" : "Play"}
        >
          {playback.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <IconAction label="Stop" onClick={playback.stop}>
          <Square className="h-3.5 w-3.5" />
        </IconAction>
        <IconAction
          label={playback.loop ? "Loop on" : "Loop off"}
          onClick={() => playback.setLoop(!playback.loop)}
          active={playback.loop}
        >
          <Repeat className="h-3.5 w-3.5" />
        </IconAction>

        <span className="mx-2 h-5 w-px bg-border" />

        <span className="num shrink-0 text-[12px] text-foreground">
          {formatTime(playback.positionSec)}
        </span>
        <span className="num shrink-0 text-[11px] text-muted-foreground">
          / {formatTime(playback.durationSec)}
        </span>

        <span className="mx-2 hidden h-5 w-px bg-border md:block" />
        <span className="num hidden shrink-0 text-[11px] text-muted-foreground md:inline">
          cursor {formatTime(cursorSec)}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-1.5 lg:flex">
          <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
          <Slider
            className="w-20"
            value={[playback.volume * 100]}
            max={100}
            step={1}
            onValueChange={([v]) => playback.setVolume(v / 100)}
          />
        </div>

        <div className="hidden items-center gap-1 rounded-md border border-border bg-surface px-1 py-0.5 lg:flex">
          {[0.5, 1, 1.5, 2].map((rate) => (
            <button
              key={rate}
              onClick={() => playback.setRate(rate)}
              className={cn(
                "num rounded px-1.5 py-0.5 text-[10px] transition-colors",
                playback.rate === rate
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {rate}×
            </button>
          ))}
        </div>

        {onZoomOut && (
          <>
            <span className="h-5 w-px bg-border" />
            <IconAction label="Zoom out" onClick={onZoomOut}>
              <ZoomOut className="h-3.5 w-3.5" />
            </IconAction>
            {zoomLabel ? (
              <span className="num min-w-[52px] text-center text-[10.5px] text-muted-foreground">
                {zoomLabel}
              </span>
            ) : null}
            <IconAction label="Zoom in" onClick={onZoomIn ?? (() => undefined)}>
              <ZoomIn className="h-3.5 w-3.5" />
            </IconAction>
            <IconAction label="Reset view" onClick={onResetView ?? (() => undefined)}>
              <Maximize className="h-3.5 w-3.5" />
            </IconAction>
          </>
        )}
      </div>
    </div>
  );
}

function IconAction({
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
            "press h-8 w-8 text-muted-foreground hover:text-foreground",
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
