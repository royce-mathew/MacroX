import { useState, useEffect, useRef, useCallback } from "react";
import { getCurrentWindow, PhysicalSize } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { info, error, warn } from "@tauri-apps/plugin-log";

interface UseWindowManagerReturn {
  isMiniMode: boolean;
  setMiniMode: (isMini: boolean) => void;
  toggleMiniMode: () => Promise<void>;
  expandFromMini: () => Promise<void>;
}

export function useWindowManager(): UseWindowManagerReturn {
  const [isMiniMode, setIsMiniMode] = useState(false);

  // Ref to track current mode immediately for event listeners
  // This prevents the "resize loop" race condition
  const isMiniModeRef = useRef(isMiniMode);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync ref with state
  useEffect(() => {
    isMiniModeRef.current = isMiniMode;
  }, [isMiniMode]);

  const setWindowSize = async (width: number, height: number) => {
    try {
      const window = getCurrentWindow();
      await window.setSize(new PhysicalSize(width, height));
    } catch (err) {
      error(`Failed to set window size: ${err}`);
    }
  };

  const snapToMini = useCallback(async () => {
    info("Snapping DOWN to Mini Mode");
    await setWindowSize(355, 140);
    // Update ref immediately to block subsequent resize events from triggering logic again
    isMiniModeRef.current = true;
    setIsMiniMode(true);

    // Auto-enable "Always On Top" for Mini Mode
    // We do this silently as requested
    try {
      await invoke("update_app_settings", { settings: { alwaysOnTop: true } });
    } catch (e) {
      error(`Failed to set always on top: ${e}`);
    }
  }, []);

  const snapToMedium = useCallback(async () => {
    info("Snapping UP to Medium Mode");
    await setWindowSize(1000, 700);
    // Update ref immediately
    isMiniModeRef.current = false;
    setIsMiniMode(false);

    // Optional: reverting "Always On Top" is user preference, we might leave it or disable it.
    // For now, let's leave it as is to not annoy users who want it always on top.
  }, []);

  const toggleMiniMode = useCallback(async () => {
    if (isMiniModeRef.current) {
      await snapToMedium();
    } else {
      await snapToMini();
    }
  }, [snapToMini, snapToMedium]);

  const expandFromMini = useCallback(async () => {
    await snapToMedium();
  }, [snapToMedium]);

  useEffect(() => {
    const handleResize = () => {
      // Clear previous timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const window = getCurrentWindow();
          const size = await window.innerSize();
          const currentMini = isMiniModeRef.current;

          // Snapping Logic
          // 1. If currently Normal Mode AND (width < 500 OR height < 500) -> Snap DOWN
          if (!currentMini && (size.width < 500 || size.height < 500)) {
            await snapToMini();
          }
          // 2. If currently Mini Mode AND (width > 360 OR height > 150) -> Snap UP
          // Using slightly larger than 355/140 to detect user attempt to resize
          else if (currentMini && (size.width > 360 || size.height > 150)) {
            await snapToMedium();
          }
        } catch (e) {
          error(`Resize check failed: ${e}`);
        }
      }, 200); // 200ms debounce
    };

    let unlisten: () => void;
    const setupListener = async () => {
      try {
        unlisten = await getCurrentWindow().onResized(handleResize);
      } catch (e) {
        warn(
          `Standard onResized failed, falling back to listen Tary event: ${e}`
        );
        try {
          unlisten = await getCurrentWindow().listen(
            "tauri://resize",
            handleResize
          );
        } catch (inner) {
          error(`Failed to listen to resize events: ${inner}`);
        }
      }
    };

    setupListener();

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (unlisten) unlisten();
    };
  }, [snapToMini, snapToMedium]);

  return {
    isMiniMode,
    setMiniMode: setIsMiniMode,
    toggleMiniMode,
    expandFromMini,
  };
}
