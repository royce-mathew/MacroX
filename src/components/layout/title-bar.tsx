import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, PictureInPicture, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TitleBarProps {
  isMiniMode: boolean;
  onToggleMiniMode: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  isMiniMode,
  onToggleMiniMode,
}) => {
  const minimize = () => getCurrentWindow().minimize();
  const maximize = () => getCurrentWindow().toggleMaximize();
  const close = () => getCurrentWindow().close();

  return (
    <div
      data-tauri-drag-region
      className="h-[30px] bg-background border-b flex items-center justify-between select-none fixed top-0 left-0 right-0 z-50 w-full"
    >
      {/* Drag Region & Title */}
      <div
        className="flex items-center gap-2 px-3 h-full flex-1"
        data-tauri-drag-region
      >
        <img
          src="/logo.png"
          alt="Logo"
          className="w-4 h-4 object-contain"
          data-tauri-drag-region
        />
        <span
          className="text-xs font-medium text-muted-foreground"
          data-tauri-drag-region
        >
          MacroX
        </span>
      </div>

      {/* Window Controls */}
      <div className="flex items-center h-full">
        {/* Mini Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMiniMode}
          className="h-[30px] w-[40px] rounded-none hover:bg-accent hover:text-accent-foreground"
          title={isMiniMode ? "Expand" : "Mini Mode"}
        >
          {isMiniMode ? (
            <Maximize2 className="h-3.5 w-3.5" />
          ) : (
            <PictureInPicture className="h-3.5 w-3.5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={minimize}
          className="h-[30px] w-[40px] rounded-none hover:bg-accent hover:text-accent-foreground"
          title="Minimize"
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={maximize}
          className="h-[30px] w-[40px] rounded-none hover:bg-accent hover:text-accent-foreground"
          title="Maximize"
        >
          <Square className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={close}
          className="h-[30px] w-[40px] rounded-none hover:bg-destructive hover:text-destructive-foreground transition-colors"
          title="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
