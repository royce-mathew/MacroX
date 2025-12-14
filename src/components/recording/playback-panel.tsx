import React, { useState, useEffect, useMemo } from "react";
import { Play, StopCircle, Settings2, Gauge } from "lucide-react"; // Changed icons
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator"; // Added separator
import { PlaybackSettings, MacroEvent, Macro } from "../../types/macro";

interface PlaybackPanelProps {
  isPlaying: boolean;
  actionEventCount: number;
  onPlayRecorded: (
    events: MacroEvent[],
    playbackSettings: PlaybackSettings
  ) => void;
  onStopPlayback: () => void;
  recordedEvents: MacroEvent[];
  macros: Macro[];
  selectedMacroId: string;
  onMacroSelect: (id: string) => void;
}

export const PlaybackPanel: React.FC<PlaybackPanelProps> = ({
  isPlaying,
  onPlayRecorded,
  onStopPlayback,
  recordedEvents,
  macros,
  selectedMacroId,
  onMacroSelect,
}) => {
  const [playbackSettings, setPlaybackSettings] = useState<PlaybackSettings>({
    speed: 1,
    repeatMode: "once",
    repeatCount: 1,
  });

  const getActiveEvents = () => {
    // Rely solely on macro selection
    const macro = macros.find((m) => m.id === selectedMacroId);
    return macro ? macro.events : [];
  };

  const activeEvents = getActiveEvents();
  const activeEventCount = activeEvents
    ? activeEvents.filter((e) => {
        const evt = e as any;
        return evt.type !== "mouse_move" && evt.event_type !== "mouse_move";
      }).length
    : 0;

  // Calculate Total Duration for Progress Bar
  const totalDuration = useMemo(() => {
    const events = getActiveEvents();
    if (!events || events.length === 0) return 0;

    const singleLoopDuration = events[events.length - 1].timestamp;
    const adjustedSingleDuration = singleLoopDuration / playbackSettings.speed;

    if (playbackSettings.repeatMode === "count") {
      const count = playbackSettings.repeatCount || 1;
      const delay = 500;
      return adjustedSingleDuration * count + (count - 1) * delay;
    }

    return adjustedSingleDuration;
  }, [selectedMacroId, recordedEvents, macros, playbackSettings]);

  // Handle Animation Trigger
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isPlaying) {
      setProgress(0);
      const timer = setTimeout(() => {
        setProgress(100);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setProgress(0);
    }
  }, [isPlaying, totalDuration]);

  const handlePlay = () => {
    const events = getActiveEvents();
    if (onPlayRecorded && events.length > 0) {
      onPlayRecorded(events, playbackSettings);
    }
  };

  const hasContent =
    (recordedEvents && recordedEvents.length > 0) || macros.length > 0;

  if (!hasContent) {
    return (
      <Card className="opacity-50 pointer-events-none h-full bg-muted/30 border-dashed">
        <CardHeader>
          <CardTitle className="text-muted-foreground flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Playback
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-sm text-center text-muted-foreground">
            No macros available for playback.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative w-full md:w-1/2 overflow-hidden h-full flex flex-col">
      {/* Top Progress Bar */}
      {isPlaying && (
        <div className="absolute top-0 left-0 h-1 w-full bg-secondary z-50">
          <div
            className="h-full bg-primary transition-all ease-linear"
            style={{
              width: `${progress}%`,
              transitionDuration:
                isPlaying && progress === 100 ? `${totalDuration}ms` : "0ms",
            }}
          />
        </div>
      )}

      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          <span>Playback</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-6">
        {/* Primary Controls Section */}
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Selected Macro
            </Label>
            <Select value={selectedMacroId} onValueChange={onMacroSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a macro..." />
              </SelectTrigger>
              <SelectContent>
                {macros.map((macro) => (
                  <SelectItem key={macro.id} value={macro.id}>
                    {macro.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground text-right px-1">
              {activeEventCount} action{activeEventCount !== 1 ? "s" : ""}
            </div>
          </div>

          <Button
            onClick={isPlaying ? onStopPlayback : handlePlay}
            variant={isPlaying ? "destructive" : "default"}
            size="lg"
            className="w-full h-12 text-base shadow-sm transition-all active:scale-[0.98]"
          >
            {isPlaying ? (
              <>
                <StopCircle className="mr-2 h-5 w-5" /> Stop Playback
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5 fill-current" /> Play Macro
              </>
            )}
          </Button>
        </div>

        <Separator />

        {/* Settings Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Playback Settings</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Speed Control */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Speed</Label>
              <Select
                value={playbackSettings.speed.toString()}
                onValueChange={(value) =>
                  setPlaybackSettings({
                    ...playbackSettings,
                    speed: parseFloat(value),
                  })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.25">0.25x (Slow)</SelectItem>
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="1">1x (Normal)</SelectItem>
                  <SelectItem value="2">2x (Fast)</SelectItem>
                  <SelectItem value="3">3x (Very Fast)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Loop Mode */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Repeat</Label>
              <Select
                value={playbackSettings.repeatMode}
                onValueChange={(value) =>
                  setPlaybackSettings({
                    ...playbackSettings,
                    repeatMode: value as "once" | "count" | "infinite",
                  })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Once</SelectItem>
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="infinite">Infinite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Repeat Count - Only show if mode is 'count' */}
          {playbackSettings.repeatMode === "count" && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <Label className="text-xs text-muted-foreground">
                Enter Loop Count
              </Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={playbackSettings.repeatCount}
                onChange={(e) =>
                  setPlaybackSettings({
                    ...playbackSettings,
                    repeatCount: parseInt(e.target.value) || 1,
                  })
                }
                className="h-9"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
