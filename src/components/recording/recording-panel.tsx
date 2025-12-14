import React from "react";
import { Circle, Square } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RecordingSettings } from "../../types/macro";

interface RecordingPanelProps {
  isRecording: boolean;
  recordingSettings: RecordingSettings;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSettingsChange: (settings: RecordingSettings) => void;
}

export const RecordingPanel: React.FC<RecordingPanelProps> = ({
  isRecording,
  recordingSettings,
  onStartRecording,
  onStopRecording,
  onSettingsChange,
}) => {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-3xl font-bold">Record Macro</h2>
        <p className="text-muted-foreground mt-2">
          Capture mouse movements, clicks, and keyboard input to create
          automated macros
        </p>
      </div>

      <div className="grid gap-6 flex-1">
        <Card className="relative overflow-hidden flex flex-col justify-center">
          <CardHeader>
            <CardTitle>Controls</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 pb-12">
            <div className="text-center">
              {isRecording ? (
                <div className="flex items-center gap-3 text-destructive">
                  <div className="w-3 h-3 bg-destructive rounded-full animate-pulse"></div>
                  <span className="text-lg font-semibold">
                    Recording in progress...
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-3 h-3 bg-zinc-400 rounded-full"></div>
                  <span className="text-lg">Ready to record</span>
                </div>
              )}
            </div>

            {/* Recording Control Button */}
            <Button
              onClick={isRecording ? onStopRecording : onStartRecording}
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              className={`w-24 h-24 rounded-full transition-all duration-300 ${
                isRecording
                  ? "bg-red-600 hover:bg-red-700 text-white scale-110 shadow-lg shadow-red-500/20"
                  : "hover:scale-105"
              }`}
            >
              {isRecording ? (
                <Square size={32} className="fill-current" />
              ) : (
                <Circle size={32} className="fill-current" />
              )}
            </Button>

            <p className="text-sm text-muted-foreground mt-2">
              {isRecording
                ? "Press Stop to save macro"
                : "Press Record to start capturing"}
            </p>
          </CardContent>
        </Card>

        <Card className="flex-1">
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
                disabled={isRecording}
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
                disabled={isRecording}
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
                disabled={isRecording}
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
      </div>
    </div>
  );
};
