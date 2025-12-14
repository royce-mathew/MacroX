import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { HotkeyInput } from "../ui/hotkey-input";
import { ModeToggle } from "../mode-toggle";
import { HotkeySettings } from "../../types/macro";

interface SettingsPanelProps {
  hotkeySettings: HotkeySettings;
  onHotkeyChange: (settings: HotkeySettings) => void;
  isAlwaysOnTop: boolean;
  onToggleAlwaysOnTop: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  hotkeySettings,
  onHotkeyChange,
  isAlwaysOnTop,
  onToggleAlwaysOnTop,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Settings</h2>
        <p className="text-muted-foreground mt-2">
          Configure global hotkeys and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Theme Mode</Label>
              <p className="text-sm text-muted-foreground">
                Choose your preferred color scheme
              </p>
            </div>
            <ModeToggle />
          </div>
          <Separator className="my-4" />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Always on Top</Label>
              <p className="text-sm text-muted-foreground">
                Keep the window floating above other applications
              </p>
            </div>
            <Checkbox
              checked={isAlwaysOnTop}
              onCheckedChange={onToggleAlwaysOnTop}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Global Hotkeys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm">
              <strong>Note:</strong> Click on an input field and press your
              desired key combination. The hotkey will be automatically
              detected.
            </p>
          </div>

          <HotkeyInput
            label="Start Recording"
            value={hotkeySettings.recordStart}
            onChange={(value) =>
              onHotkeyChange({
                ...hotkeySettings,
                recordStart: value,
              })
            }
            placeholder="Click and press keys..."
          />

          <HotkeyInput
            label="Stop Recording"
            value={hotkeySettings.recordStop}
            onChange={(value) =>
              onHotkeyChange({
                ...hotkeySettings,
                recordStop: value,
              })
            }
            placeholder="Click and press keys..."
          />

          <HotkeyInput
            label="Start Playback"
            value={hotkeySettings.playbackStart}
            onChange={(value) =>
              onHotkeyChange({
                ...hotkeySettings,
                playbackStart: value,
              })
            }
            placeholder="Click and press keys..."
          />

          <HotkeyInput
            label="Stop Playback"
            value={hotkeySettings.playbackStop}
            onChange={(value) =>
              onHotkeyChange({
                ...hotkeySettings,
                playbackStop: value,
              })
            }
            placeholder="Click and press keys..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About MacroX</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Version:</strong> 0.1.0
          </p>
          <p>
            <strong>License:</strong> Free & Open Source
          </p>
          <Separator className="my-4" />
          <p className="text-muted-foreground">
            MacroX is a powerful macro recorder that helps you automate
            repetitive tasks with ease. Record mouse movements, clicks, and
            keyboard input, then play them back with customizable speed and
            repeat options.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
