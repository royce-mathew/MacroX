import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { attachConsole, info, error as logError } from "@tauri-apps/plugin-log";
import { listen } from "@tauri-apps/api/event";
import {
  Macro,
  MacroEvent,
  HotkeySettings,
  RecordingSettings,
  PlaybackSettings,
  AppSettings,
} from "./types/macro";
import { ViewType, MainLayout } from "./components/layout/main-layout";
import { RecordingPanel } from "./components/recording/recording-panel";
import { MiniRecordingPanel } from "./components/recording/mini-recording-panel";
import { PlaybackPanel } from "./components/recording/playback-panel";
import { MacroList } from "./components/macros/macro-list";
import { SettingsPanel } from "./components/settings/settings-panel";
import { Toaster, toast } from "sonner";
import { useWindowManager } from "./hooks/use-window-manager";

function App() {
  const [currentView, setCurrentView] = useState<ViewType>("recording");
  const [macros, setMacros] = useState<Macro[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedEvents, setRecordedEvents] = useState<MacroEvent[]>([]);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);

  // Window Manager Hook
  const { isMiniMode, toggleMiniMode } = useWindowManager();

  const [notificationMsg, setNotificationMsg] = useState<string>("");
  const [selectedPlaybackMacroId, setSelectedPlaybackMacroId] =
    useState<string>("");

  const [recordingSettings, setRecordingSettings] = useState<RecordingSettings>(
    {
      recordMouseMovement: true,
      recordMouseClicks: true,
      recordKeyboard: true,
    }
  );

  const [hotkeySettings, setHotkeySettings] = useState<HotkeySettings>({
    recordStart: "F9",
    recordStop: "F10",
    playbackStart: "F11",
    playbackStop: "F12",
  });

  // Refs for state access in event listeners
  const isRecordingRef = useRef(isRecording);
  const isPlayingRef = useRef(isPlaying);
  const recordedEventsRef = useRef(recordedEvents);
  const recordingSettingsRef = useRef(recordingSettings);
  const currentViewRef = useRef(currentView);
  const isMiniModeRef = useRef(isMiniMode);

  useEffect(() => {
    attachConsole();
  }, []);

  useEffect(() => {
    isRecordingRef.current = isRecording;
    isPlayingRef.current = isPlaying;
    recordedEventsRef.current = recordedEvents;
    recordingSettingsRef.current = recordingSettings;
    currentViewRef.current = currentView;
    isMiniModeRef.current = isMiniMode;
  }, [
    isRecording,
    isPlaying,
    recordedEvents,
    recordingSettings,
    currentView,
    isMiniMode,
  ]);

  // Centralized Notification Handler
  const handleNotify = (
    message: string,
    type: "success" | "error" | "info" | "warning" = "info"
  ) => {
    if (isMiniModeRef.current) {
      setNotificationMsg(message);
      // Auto-clear after 3 seconds
      setTimeout(() => setNotificationMsg(""), 3000);
    } else {
      // Standard Toast
      if (type === "success") toast.success(message);
      else if (type === "error") toast.error(message);
      else if (type === "warning") toast.warning(message);
      else toast.info(message);
    }
  };

  const getActionEventCount = (events: MacroEvent[]) => {
    return events.filter((e) => {
      const eventData = e as any;
      return (
        eventData.type !== "mouse_move" && eventData.event_type !== "mouse_move"
      );
    }).length;
  };

  const handleStartRecording = async () => {
    try {
      await invoke("start_recording", { settings: recordingSettings });
      setIsRecording(true);
      setRecordedEvents([]);
      info("Recording started");
      handleNotify("Recording started", "success");
    } catch (error) {
      logError(`Failed to start recording: ${error}`);
      handleNotify(`Failed to start recording: ${error}`, "error");
    }
  };

  const handleStopRecording = async () => {
    try {
      const events = await invoke<MacroEvent[]>("stop_recording");
      setIsRecording(false);
      setRecordedEvents(events);

      const actionCount = getActionEventCount(events);
      info(
        `Recording stopped. Captured ${events.length} total events (${actionCount} actions)`
      );
      handleNotify(
        `Recording stopped. Captured ${events.length} events`,
        "success"
      );

      if (events.length > 0) {
        const newMacro: Macro = {
          id: Date.now().toString(),
          name: `Macro ${macros.length + 1}`,
          description: "",
          events,
          recordingSettings,
          playbackSettings: {
            speed: 1,
            repeatMode: "once",
            repeatCount: 1,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setMacros([...macros, newMacro]);
        await invoke("save_macro", { macroData: newMacro });

        // Auto-select the newly created macro
        handleMacroSelect(newMacro.id);
      }
    } catch (error) {
      logError(`Failed to stop recording: ${error}`);
      setIsRecording(false);
      handleNotify(`Failed to stop recording: ${error}`, "error");
    }
  };

  const handlePlayRecordedEvents = async (
    events: MacroEvent[],
    playbackSettings: PlaybackSettings
  ) => {
    if (events.length === 0) {
      handleNotify("No events to play", "error");
      return;
    }

    try {
      setIsPlaying(true);
      const tempMacro: Macro = {
        id: "temp",
        name: "Preview",
        description: "Preview playback",
        events: events,
        recordingSettings, // Use current recording settings as default
        playbackSettings,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await invoke("play_macro", { macroData: tempMacro });
      info("Playback completed");
    } catch (error) {
      logError(`Failed to play events: ${error}`);
      handleNotify(`Failed to play: ${error}`, "error");
    } finally {
      setIsPlaying(false);
    }
  };

  const handleStopPlayback = () => {
    setIsPlaying(false);
    info("Playback stopped");
  };

  const handlePlayMacro = async (macro: Macro) => {
    try {
      setIsPlaying(true);
      info(`Playing macro: ${macro.name}`);
      handleNotify(`Playing macro: ${macro.name}`, "info");
      await invoke("play_macro", { macroData: macro });
      info("Macro playback completed");
      handleNotify("Playback completed", "success");
    } catch (error) {
      logError(`Failed to play macro: ${error}`);
      handleNotify(`Failed to play macro: ${error}`, "error");
    } finally {
      setIsPlaying(false);
    }
  };

  const handleEditMacro = (macro: Macro) => {
    info(`Edit macro: ${macro.name}`);
  };

  const handleDeleteMacro = async (macroId: string) => {
    try {
      setMacros(macros.filter((m) => m.id !== macroId));
      await invoke("delete_macro", { macroId });

      // If deleted macro was selected, switch to first available or empty
      if (selectedPlaybackMacroId === macroId) {
        const remaining = macros.filter((m) => m.id !== macroId);
        if (remaining.length > 0) {
          handleMacroSelect(remaining[0].id);
        } else {
          handleMacroSelect("");
        }
      }

      handleNotify("Macro deleted", "success");
    } catch (error) {
      logError(`Failed to delete macro: ${error}`);
      handleNotify("Failed to delete macro", "error");
    }
  };

  const handleExportMacro = async (macro: Macro) => {
    try {
      info(`Exporting macro: ${JSON.stringify(macro)}`);
      await invoke("export_macro", { macroData: macro });
    } catch (error) {
      logError(`Failed to export macro: ${error}`);
    }
  };

  const handleImportMacro = async () => {
    try {
      info("Importing macro...");
      const macro = await invoke<Macro | null>("import_macro");
      if (macro) {
        setMacros((prev) => [...prev, macro]);
        await invoke("save_macro", { macroData: macro });
        handleNotify("Macro imported", "success");
      }
    } catch (error) {
      logError(`Failed to import macro: ${error}`);
    }
  };

  const toggleAlwaysOnTop = async () => {
    const newState = !isAlwaysOnTop;
    try {
      await invoke("update_app_settings", {
        settings: { alwaysOnTop: newState },
      });
      setIsAlwaysOnTop(newState);
      handleNotify(
        newState ? "Window pinned to top" : "Window unpinned",
        "success"
      );
    } catch (error) {
      logError(`Failed to toggle always on top: ${error}`);
      handleNotify(
        newState ? "Window pinned to top" : "Window unpinned",
        "success"
      );
    }
  };

  const handleMacroSelect = async (id: string) => {
    setSelectedPlaybackMacroId(id);
    try {
      // Need to send the full settings object, merging current state
      await invoke("update_app_settings", {
        settings: {
          alwaysOnTop: isAlwaysOnTop,
          lastSelectedMacroId: id,
        },
      });
    } catch (error) {
      logError(`Failed to save selection: ${error}`);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await invoke<AppSettings>("get_app_settings");
        setIsAlwaysOnTop(settings.alwaysOnTop);
        if (settings.lastSelectedMacroId) {
          setSelectedPlaybackMacroId(settings.lastSelectedMacroId);
        }
      } catch (error) {
        logError(`Failed to load app settings: ${error}`);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const updateHotkeys = async () => {
      try {
        await invoke("update_hotkeys", {
          recordStart: hotkeySettings.recordStart,
          recordStop: hotkeySettings.recordStop,
          playbackStart: hotkeySettings.playbackStart,
          playbackStop: hotkeySettings.playbackStop,
        });
        info(`Hotkeys updated: ${JSON.stringify(hotkeySettings)}`);
      } catch (error) {
        logError(`Failed to update hotkeys: ${error}`);
      }
    };

    updateHotkeys();
  }, [hotkeySettings]);

  // Load macros and check status on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        const [loadedMacros, recordingStatus, loadedHotkeys] =
          await Promise.all([
            invoke<Macro[]>("load_all_macros"),
            invoke<boolean>("is_recording"),
            invoke<HotkeySettings>("get_hotkeys"),
          ]);

        setMacros(loadedMacros);
        setHotkeySettings(loadedHotkeys);
        if (recordingStatus) {
          setIsRecording(true);
        }

        // Initialize selection if needed
        if (loadedMacros.length > 0) {
          try {
            const settings = await invoke<AppSettings>("get_app_settings");
            let targetId = settings.lastSelectedMacroId;

            // Verify target exists
            if (!targetId || !loadedMacros.find((m) => m.id === targetId)) {
              targetId = loadedMacros[0].id; // Default to first
              // Update settings to match default
              await invoke("update_app_settings", {
                settings: { ...settings, lastSelectedMacroId: targetId },
              });
            }
            setSelectedPlaybackMacroId(targetId);
          } catch (e) {
            logError(`Selection init error: ${e}`);
            setSelectedPlaybackMacroId(loadedMacros[0].id);
          }
        }
      } catch (error) {
        logError(`Failed to initialize app: ${error}`);
      }
    };
    initialize();
  }, []);

  // Listen for hotkey events
  useEffect(() => {
    let isMounted = true;
    let unlistenFunctions: (() => void)[] = [];

    const setupListeners = async () => {
      const u1 = await listen("hotkey:record-start", () => {
        if (!isMounted) return;
        // Disable hotkeys in settings to prevent accidental triggering while configuring
        if (currentViewRef.current === "settings") return;

        if (!isRecordingRef.current && !isPlayingRef.current) {
          invoke("start_recording", { settings: recordingSettingsRef.current })
            .then(() => {
              setIsRecording(true);
              setRecordedEvents([]);
              info("Recording started via hotkey");
              if (isMiniModeRef.current) {
                setNotificationMsg("Recording started via hotkey");
                setTimeout(() => setNotificationMsg(""), 3000);
              } else {
                toast.success("Recording started via hotkey");
              }
            })
            .catch((err) => {
              logError(`Failed to start recording: ${err}`);
              if (isMiniModeRef.current) {
                setNotificationMsg(`Failed to start: ${err}`);
                setTimeout(() => setNotificationMsg(""), 3000);
              } else {
                toast.error(`Failed to start recording: ${err}`);
              }
            });
        }
      });
      if (!isMounted) {
        u1();
        return;
      }
      unlistenFunctions.push(u1);

      // Listen for recording warnings (hotkeys pressed)
      const uWarning = await listen<string>("recording-warning", (event) => {
        if (!isMounted) return;
        if (isMiniModeRef.current) {
          setNotificationMsg(event.payload || "Hotkey detected");
          setTimeout(() => setNotificationMsg(""), 3000);
        } else {
          toast.warning(event.payload || "Hotkey detected and ignored");
        }
      });
      if (!isMounted) {
        uWarning();
        return;
      }
      unlistenFunctions.push(uWarning);

      const u2 = await listen("hotkey:record-stop", () => {
        if (!isMounted) return;
        if (currentViewRef.current === "settings") return;

        if (isRecordingRef.current) {
          invoke<MacroEvent[]>("stop_recording")
            .then((events) => {
              setIsRecording(false);
              setRecordedEvents(events);
              info(`Recording stopped. Captured ${events.length} events`);

              if (events.length > 0) {
                setMacros((prevMacros) => {
                  const newMacro: Macro = {
                    id: Date.now().toString(),
                    name: `Macro ${prevMacros.length + 1}`,
                    description: "",
                    events,
                    recordingSettings: recordingSettingsRef.current,
                    playbackSettings: {
                      speed: 1,
                      repeatMode: "once",
                      repeatCount: 1,
                    },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  };
                  // Persist the new macro
                  invoke("save_macro", { macroData: newMacro }).catch((e) =>
                    logError(String(e))
                  );
                  return [...prevMacros, newMacro];
                });
              }
              // Notification
              if (isMiniModeRef.current) {
                setNotificationMsg(`Stopped. ${events.length} events`);
                setTimeout(() => setNotificationMsg(""), 3000);
              } else {
                toast.success(
                  `Recording stopped. Captured ${events.length} events`
                );
              }
            })
            .catch((err) => {
              logError(`Failed to stop recording: ${err}`);
              setIsRecording(false);
              if (isMiniModeRef.current) {
                setNotificationMsg(`Failed to stop: ${err}`);
                setTimeout(() => setNotificationMsg(""), 3000);
              } else {
                toast.error(`Failed to stop recording: ${err}`);
              }
            });
        }
      });
      if (!isMounted) {
        u2();
        return;
      }
      unlistenFunctions.push(u2);

      const u3 = await listen("hotkey:playback-start", () => {
        if (!isMounted) return;
        if (currentViewRef.current === "settings") return;

        if (
          !isRecordingRef.current &&
          !isPlayingRef.current &&
          recordedEventsRef.current.length > 0
        ) {
          setIsPlaying(true);
          const tempMacro: Macro = {
            id: "temp",
            name: "Preview",
            description: "Preview playback",
            events: recordedEventsRef.current,
            recordingSettings: recordingSettingsRef.current,
            playbackSettings: {
              speed: 1,
              repeatMode: "once",
              repeatCount: 1, // Default playback hotkey is usually once
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          invoke("play_macro", { macroData: tempMacro })
            .then(() => info("Playback completed"))
            .catch((err) => {
              logError(`Failed to play: ${err}`);
              if (isMiniModeRef.current) {
                setNotificationMsg(`Info: ${err}`); // Using info to allow reading
                setTimeout(() => setNotificationMsg(""), 3000);
              } else {
                // toast.error(`Failed to play: ${err}`); // Optional
                alert(`Failed to play: ${err}`);
              }
            })
            .finally(() => setIsPlaying(false));
        }
      });
      if (!isMounted) {
        u3();
        return;
      }
      unlistenFunctions.push(u3);

      const u4 = await listen("hotkey:playback-stop", () => {
        if (!isMounted) return;
        if (currentViewRef.current === "settings") return;

        if (isPlayingRef.current) {
          setIsPlaying(false);
        }
      });
      if (!isMounted) {
        u4();
        return;
      }
      unlistenFunctions.push(u4);
    };

    setupListeners();

    return () => {
      isMounted = false;
      unlistenFunctions.forEach((fn) => fn());
    };
  }, []);

  return (
    <>
      <MainLayout
        currentView={currentView}
        onViewChange={setCurrentView}
        isMiniMode={isMiniMode}
        onToggleMiniMode={toggleMiniMode}
      >
        {isMiniMode ? (
          <MiniRecordingPanel
            isRecording={isRecording}
            notificationMsg={notificationMsg}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            // Recording Props
            recordingSettings={recordingSettings}
            onRecordingSettingsChange={setRecordingSettings}
            // Playback Props
            macros={macros}
            isPlaying={isPlaying}
            onPlayMacro={handlePlayMacro}
            onStopPlayback={handleStopPlayback}
            selectedMacroId={selectedPlaybackMacroId}
            onMacroSelect={handleMacroSelect}
          />
        ) : (
          <>
            {currentView === "recording" && (
              <div className="h-full pb-4">
                <RecordingPanel
                  isRecording={isRecording}
                  recordingSettings={recordingSettings}
                  onStartRecording={handleStartRecording}
                  onStopRecording={handleStopRecording}
                  onSettingsChange={setRecordingSettings}
                />
              </div>
            )}

            {currentView === "macros" && (
              <div className="flex flex-col md:flex-row gap-3 h-full pb-4">
                <MacroList
                  macros={macros}
                  onPlay={handlePlayMacro}
                  onEdit={handleEditMacro}
                  onDelete={handleDeleteMacro}
                  onExport={handleExportMacro}
                  onImport={handleImportMacro}
                  selectedMacroId={selectedPlaybackMacroId}
                  onSelect={handleMacroSelect}
                />
                <PlaybackPanel
                  isPlaying={isPlaying}
                  actionEventCount={getActionEventCount(recordedEvents)}
                  onPlayRecorded={handlePlayRecordedEvents}
                  onStopPlayback={handleStopPlayback}
                  recordedEvents={recordedEvents}
                  macros={macros}
                  selectedMacroId={selectedPlaybackMacroId}
                  onMacroSelect={handleMacroSelect}
                />
              </div>
            )}

            {currentView === "settings" && (
              <SettingsPanel
                hotkeySettings={hotkeySettings}
                onHotkeyChange={setHotkeySettings}
                isAlwaysOnTop={isAlwaysOnTop}
                onToggleAlwaysOnTop={toggleAlwaysOnTop}
              />
            )}
          </>
        )}
      </MainLayout>
      <Toaster />
    </>
  );
}

export default App;
