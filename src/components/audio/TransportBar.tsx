import {
  Maximize,
  Pause,
  Play,
  Repeat,
  Scissors,
  Square,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlaybackController } from "@/hooks/useAudioPlayback";

export interface TransportBarProps {
  playback: PlaybackController;
  cursorSec: number;
  onSeek?: (sec: number) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetView?: () => void;
  zoomLabel?: string;
  selection?: { startSec: number; endSec: number } | null;
  onPlaySelection?: () => void;
  onClearSelection?: () => void;
}

/** Professional transport: play/pause/stop, seek, volume, speed, loop, view controls. */
export function TransportBar({
  playback,
  cursorSec,
  onSeek,
  onZoomIn,
  onZoomOut,
  onResetView,
  zoomLabel,
  selection = null,
  onPlaySelection,
  onClearSelection,
}: TransportBarProps) {
  const hasSelection = Boolean(selection && Math.abs(selection.endSec - selection.startSec) > 1e-3);

  return (
    <div className="space-y-2 border-b border-border bg-elevated px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Button
            size="icon"
            className="glow-primary h-8 w-8"
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
          {onPlaySelection ? (
            <IconAction
              label={hasSelection ? "Play selected region" : "Drag on the waveform to select a region"}
              onClick={() => hasSelection && onPlaySelection()}
              active={hasSelection}
              gold
            >
              <Scissors className="h-3.5 w-3.5" />
            </IconAction>
          ) : null}

          <span className="mx-1.5 h-5 w-px bg-border" />

          <span className="num shrink-0 text-[12px] text-foreground">
            {formatTime(playback.positionSec)}
          </span>
          <span className="num shrink-0 text-[11px] text-muted-foreground">
            / {formatTime(playback.durationSec)}
          </span>
          <span className="num hidden shrink-0 text-[11px] text-gold sm:inline">
            · cursor {formatTime(cursorSec)}
          </span>
        </div>

        <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <button
              aria-label={playback.volume === 0 ? "Unmute" : "Mute"}
              className="press text-muted-foreground hover:text-foreground"
              onClick={() => playback.setVolume(playback.volume === 0 ? 0.9 : 0)}
            >
              {playback.volume === 0 ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </button>
            <Slider
              className="w-16 md:w-20"
              value={[playback.volume * 100]}
              max={100}
              step={1}
              onValueChange={([v]) => playback.setVolume(v / 100)}
            />
          </div>

          <div className="flex items-center gap-1 rounded-md border border-border bg-surface px-1 py-0.5">
            {[0.5, 1, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => playback.setRate(rate)}
                className={cn(
                  "num rounded px-1.5 py-0.5 text-[10px] transition-colors",
                  playback.rate === rate
                    ? "bg-gold/15 text-gold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {rate}×
              </button>
            ))}
          </div>

          {onZoomOut && (
            <div className="flex items-center gap-1">
              <span className="h-5 w-px bg-border" />
              <IconAction label="Zoom out" onClick={onZoomOut}>
                <ZoomOut className="h-3.5 w-3.5" />
              </IconAction>
              {zoomLabel ? (
                <span className="num min-w-[46px] text-center text-[10.5px] text-muted-foreground">
                  {zoomLabel}
                </span>
              ) : null}
              <IconAction label="Zoom in" onClick={onZoomIn ?? (() => undefined)}>
                <ZoomIn className="h-3.5 w-3.5" />
              </IconAction>
              <IconAction label="Reset view" onClick={onResetView ?? (() => undefined)}>
                <Maximize className="h-3.5 w-3.5" />
              </IconAction>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Slider
          className="min-w-0 flex-1"
          value={[Math.min(playback.positionSec, playback.durationSec)]}
          max={Math.max(playback.durationSec, 0.01)}
          step={0.001}
          aria-label="Seek"
          onValueChange={([v]) => {
            playback.seek(v);
            onSeek?.(v);
          }}
        />
        {hasSelection && selection ? (
          <button
            onClick={onClearSelection}
            className="num shrink-0 rounded border border-gold/45 bg-gold/10 px-2 py-0.5 text-[10px] text-gold"
          >
            region {formatTime(selection.startSec)}–{formatTime(selection.endSec)} · clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  active,
  gold,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  gold?: boolean;
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
            active && (gold ? "bg-gold/12 text-gold" : "bg-primary/15 text-primary-bright"),
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="text-[11px]">{label}</TooltipContent>
    </Tooltip>
  );
}
