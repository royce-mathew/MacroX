import React, { useState } from "react";
import {
  Circle,
  Square,
  Play,
  MousePointer2,
  Keyboard,
  MousePointerClick,
  ChevronLeft,
  ChevronRight,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Macro, RecordingSettings } from "../../types/macro";

interface MiniRecordingPanelProps {
  isRecording: boolean;
  notificationMsg?: string;
  onStartRecording: () => void;
  onStopRecording: () => void;

  // Recording Props
  recordingSettings: RecordingSettings;
  onRecordingSettingsChange: (settings: RecordingSettings) => void;

  // Playback Props
  macros: Macro[];
  isPlaying: boolean;
  onPlayMacro: (macro: Macro) => void;
  onStopPlayback: () => void;
  selectedMacroId: string;
  onMacroSelect: (id: string) => void;
}

export const MiniRecordingPanel: React.FC<MiniRecordingPanelProps> = ({
  isRecording,
  notificationMsg,
  onStartRecording,
  onStopRecording,
  recordingSettings,
  onRecordingSettingsChange,
  macros,
  isPlaying,
  onPlayMacro,
  onStopPlayback,
  selectedMacroId,
  onMacroSelect,
}) => {
  const [activeTab, setActiveTab] = useState<"record" | "play">("record");

  const handlePlayClick = () => {
    if (isPlaying) {
      onStopPlayback();
    } else {
      const macro = macros.find((m) => m.id === selectedMacroId);
      if (macro) {
        onPlayMacro(macro);
      }
    }
  };

  const cycleMacro = (direction: "prev" | "next") => {
    if (macros.length === 0) return;
    const currentIndex = macros.findIndex((m) => m.id === selectedMacroId);
    let newIndex;
    if (direction === "prev") {
      newIndex = currentIndex > 0 ? currentIndex - 1 : macros.length - 1;
    } else {
      newIndex = currentIndex < macros.length - 1 ? currentIndex + 1 : 0;
    }
    onMacroSelect(macros[newIndex].id);
  };

  const toggleSetting = (key: keyof RecordingSettings) => {
    onRecordingSettingsChange({
      ...recordingSettings,
      [key]: !recordingSettings[key],
    });
  };

  const selectedMacro = macros.find((m) => m.id === selectedMacroId);

  return (
    <div
      className="h-full w-full flex flex-col bg-background border rounded-lg shadow-sm overflow-hidden"
      data-tauri-drag-region
    >
      {/* Top Header Row with Tabs and Window Controls */}
      <div
        className="flex items-center justify-between px-2 pt-1 pb-1 border-b bg-muted/20"
        data-tauri-drag-region
      >
        {/* Tabs */}
        <div className="flex items-center gap-1 w-full justify-center">
          <Button
            variant={activeTab === "record" ? "secondary" : "ghost"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setActiveTab("record")}
          >
            <Mic className="w-3 h-3 mr-1" /> Record
          </Button>
          <Button
            variant={activeTab === "play" ? "secondary" : "ghost"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setActiveTab("play")}
          >
            <Play className="w-3 h-3 mr-1" /> Play
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-2 min-h-0">
        {activeTab === "record" ? (
          <div className="flex items-center gap-4">
            {/* Recording Options Toggles */}
            <div className="flex items-center gap-0.5 border rounded-md p-0.5 bg-muted/20">
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 ${
                  recordingSettings.recordMouseMovement
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground"
                }`}
                onClick={() => toggleSetting("recordMouseMovement")}
                title="Record Mouse Move"
              >
                <MousePointer2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 ${
                  recordingSettings.recordMouseClicks
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground"
                }`}
                onClick={() => toggleSetting("recordMouseClicks")}
                title="Record Clicks"
              >
                <MousePointerClick className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 ${
                  recordingSettings.recordKeyboard
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground"
                }`}
                onClick={() => toggleSetting("recordKeyboard")}
                title="Record Keyboard"
              >
                <Keyboard className="h-3 w-3" />
              </Button>
            </div>

            <div className="w-px h-6 bg-border mx-1" />

            <div className="flex flex-col items-center">
              <span className="text-xs font-mono font-medium">
                {isRecording ? "00:00:00" : "Ready"}
              </span>
            </div>
            <Button
              onClick={isRecording ? onStopRecording : onStartRecording}
              size="icon"
              className={`h-8 w-8 rounded-full ${
                isRecording
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-primary hover:bg-primary/90"
              }`}
            >
              {isRecording ? (
                <Square className="h-4 w-4 fill-current" />
              ) : (
                <Circle className="h-4 w-4 fill-current" />
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full max-w-[300px] justify-center">
            {/* Use Stepper for Cycle */}
            <div className="flex items-center bg-muted/20 rounded-md p-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => cycleMacro("prev")}
                disabled={macros.length <= 1}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-xs px-2 w-24 text-center truncate font-medium select-none">
                {selectedMacro ? selectedMacro.name : "No Macros"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => cycleMacro("next")}
                disabled={macros.length <= 1}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>

            <Button
              onClick={handlePlayClick}
              size="icon"
              className="h-7 w-7 shrink-0"
              disabled={!selectedMacroId || macros.length === 0}
            >
              {isPlaying ? (
                <Square className="h-3 w-3 fill-current" />
              ) : (
                <Play className="h-3 w-3 fill-current" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Persistent Footer Notification Area */}
      <div className="bg-muted/50 px-2 py-0.5 text-[10px] text-center truncate h-5 flex items-center justify-center text-muted-foreground">
        {notificationMsg ||
          (activeTab === "record" ? "Ready to record" : "Ready to play")}
      </div>
    </div>
  );
};
