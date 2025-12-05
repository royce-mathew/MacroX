import React, { useState, useEffect } from "react";
import { Circle, Square, Play, StopCircle, Repeat, Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { RecordingSettings, PlaybackSettings } from "../../types/macro";

import { MacroEvent } from "../../types/macro"; // Ensure this import exists or add it

interface RecordingPanelProps {
  isRecording: boolean;
  isPlaying: boolean;
  actionEventCount: number;
  recordingSettings: RecordingSettings;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSettingsChange: (settings: RecordingSettings) => void;
  onPlayRecorded?: (playbackSettings: PlaybackSettings) => void;
  onStopPlayback?: () => void;
  hasRecordedEvents?: boolean;
  recordedEvents?: MacroEvent[];
}

export const RecordingPanel: React.FC<RecordingPanelProps> = ({
  isRecording,
  isPlaying,
  actionEventCount,
  recordingSettings,
  onStartRecording,
  onStopRecording,
  onSettingsChange,
  onPlayRecorded,
  onStopPlayback,
  hasRecordedEvents = false,
  recordedEvents = [],
}) => {
  const [playbackSettings, setPlaybackSettings] = useState<PlaybackSettings>({
    speed: 1,
    repeatMode: "once",
    repeatCount: 1,
  });

  // Calculate Total Duration for Progress Bar
  const totalDuration = React.useMemo(() => {
    if (!recordedEvents || recordedEvents.length === 0) return 0;

    // Backend normalizes timestamps to start at 0, so last event timestamp is the duration
    const singleLoopDuration =
      recordedEvents[recordedEvents.length - 1].timestamp;
    const adjustedSingleDuration = singleLoopDuration / playbackSettings.speed;

    if (playbackSettings.repeatMode === "count") {
      const count = playbackSettings.repeatCount || 1;
      // Backend adds 500ms delay between iterations
      const delay = 500;
      return adjustedSingleDuration * count + (count - 1) * delay;
    }

    return adjustedSingleDuration;
  }, [recordedEvents, playbackSettings]);

  // Handle Animation Trigger
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isPlaying) {
      setProgress(0);
      // Small timeout to ensure browser paints 0% before transitioning to 100%
      const timer = setTimeout(() => {
        setProgress(100);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setProgress(0);
    }
  }, [isPlaying, totalDuration]);

  const handlePlay = () => {
    if (onPlayRecorded) {
      onPlayRecorded(playbackSettings);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Record Macro</h2>
        <p className="text-muted-foreground mt-2">
          Capture mouse movements, clicks, and keyboard input to create
          automated macros
        </p>
      </div>

      <Card className="relative overflow-hidden">
        <CardContent className="flex flex-col items-center gap-6 pt-6 pb-12">
          {/* Progress Bar */}
          {isPlaying && (
            <div className="absolute bottom-0 left-0 h-1 w-full bg-slate-100 z-50">
              <div
                className="h-full bg-slate-900 transition-all ease-linear"
                style={{
                  width: `${progress}%`,
                  transitionDuration:
                    isPlaying && progress === 100
                      ? `${totalDuration}ms`
                      : "0ms",
                }}
              />
            </div>
          )}

          <div className="text-center">
            {isRecording ? (
              <div className="flex items-center gap-3 text-destructive">
                <div className="w-3 h-3 bg-destructive rounded-full animate-pulse"></div>
                <span className="text-lg font-semibold">
                  Recording in progress...
                </span>
              </div>
            ) : isPlaying ? (
              <div className="flex items-center gap-3 text-primary">
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                <span className="text-lg font-semibold">Playing back...</span>
              </div>
            ) : (
              <span className="text-lg text-muted-foreground">
                Ready to record
              </span>
            )}
          </div>

          {/* Recording Control Button - Red when recording */}
          {!isPlaying && (
            <Button
              onClick={isRecording ? onStopRecording : onStartRecording}
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              className={`w-24 h-24 rounded-full ${
                isRecording ? "bg-red-600 hover:bg-red-700 text-white" : ""
              }`}
              disabled={isPlaying}
            >
              {isRecording ? (
                <Square size={32} className="fill-current" />
              ) : (
                <Circle size={32} className="fill-current" />
              )}
            </Button>
          )}

          {/* Playback Controls with Settings */}
          {!isRecording && hasRecordedEvents && onPlayRecorded && (
            <div className="flex flex-col gap-4 items-stretch w-full max-w-md">
              <p className="text-sm text-muted-foreground text-center">
                Recorded {actionEventCount} action
                {actionEventCount !== 1 ? "s" : ""}
              </p>

              {/* Playback Settings */}
              <Card className="border-muted">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    Playback Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Speed Control */}
                  <div className="space-y-2">
                    <Label className="text-sm">
                      Speed: {playbackSettings.speed}x
                    </Label>
                    <Select
                      value={playbackSettings.speed.toString()}
                      onValueChange={(value) =>
                        setPlaybackSettings({
                          ...playbackSettings,
                          speed: parseFloat(value),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.25">0.25x (Slow)</SelectItem>
                        <SelectItem value="0.5">0.5x</SelectItem>
                        <SelectItem value="0.75">0.75x</SelectItem>
                        <SelectItem value="1">1x (Normal)</SelectItem>
                        <SelectItem value="1.5">1.5x</SelectItem>
                        <SelectItem value="2">2x (Fast)</SelectItem>
                        <SelectItem value="3">3x (Very Fast)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Loop Mode */}
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-2">
                      <Repeat className="h-4 w-4" />
                      Repeat Mode
                    </Label>
                    <Select
                      value={playbackSettings.repeatMode}
                      onValueChange={(value) =>
                        setPlaybackSettings({
                          ...playbackSettings,
                          repeatMode: value as "once" | "count" | "infinite",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">Play Once</SelectItem>
                        <SelectItem value="count">Repeat N Times</SelectItem>
                        <SelectItem value="infinite">Loop Forever</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Repeat Count - Only show if mode is 'count' */}
                  {playbackSettings.repeatMode === "count" && (
                    <div className="space-y-2">
                      <Label className="text-sm">Repeat Count</Label>
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
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Play/Stop Button - Green play icon */}
              <div className="flex gap-3 w-full">
                {!isPlaying ? (
                  <Button
                    onClick={handlePlay}
                    variant="default"
                    size="lg"
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Play size={20} className="fill-current" />
                    Play Recording
                  </Button>
                ) : (
                  <Button
                    onClick={onStopPlayback}
                    variant="destructive"
                    size="lg"
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <StopCircle size={20} />
                    Stop Playback
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recording Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="mouse-movement"
              checked={recordingSettings.recordMouseMovement}
              onCheckedChange={(checked) =>
                onSettingsChange({
                  ...recordingSettings,
                  recordMouseMovement: checked as boolean,
                })
              }
              disabled={isRecording || isPlaying}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="mouse-movement"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Mouse Movement
              </Label>
              <p className="text-sm text-muted-foreground">
                Record smooth mouse cursor movements
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="mouse-clicks"
              checked={recordingSettings.recordMouseClicks}
              onCheckedChange={(checked) =>
                onSettingsChange({
                  ...recordingSettings,
                  recordMouseClicks: checked as boolean,
                })
              }
              disabled={isRecording || isPlaying}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="mouse-clicks" className="text-sm font-medium">
                Mouse Clicks
              </Label>
              <p className="text-sm text-muted-foreground">
                Record left, right, and middle clicks
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="keyboard"
              checked={recordingSettings.recordKeyboard}
              onCheckedChange={(checked) =>
                onSettingsChange({
                  ...recordingSettings,
                  recordKeyboard: checked as boolean,
                })
              }
              disabled={isRecording || isPlaying}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="keyboard" className="text-sm font-medium">
                Keyboard Input
              </Label>
              <p className="text-sm text-muted-foreground">
                Record all keyboard presses and releases
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!isRecording && !isPlaying && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-2">💡 Quick Start</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Select which events you want to record above</li>
              <li>• Click the record button (circle) to start capturing</li>
              <li>• Perform the actions you want to automate</li>
              <li>• Click stop (square) when finished</li>
              <li>• Configure playback settings and click "Play Recording"</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
