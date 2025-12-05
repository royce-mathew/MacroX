import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Macro,
  MacroEvent,
  HotkeySettings,
  RecordingSettings,
  PlaybackSettings,
} from "./types/macro";
import { ViewType, MainLayout } from "./components/layout/main-layout";
import { RecordingPanel } from "./components/recording/recording-panel";
import { MacroList } from "./components/macros/macro-list";
import { SettingsPanel } from "./components/settings/settings-panel";
import { Toaster, toast } from "sonner";

function App() {
  const [currentView, setCurrentView] = useState<ViewType>("recording");
  const [macros, setMacros] = useState<Macro[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedEvents, setRecordedEvents] = useState<MacroEvent[]>([]);

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
      console.log("Recording started");
      toast.success("Recording started");
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error(`Failed to start recording: ${error}`);
    }
  };

  const handleStopRecording = async () => {
    try {
      const events = await invoke<MacroEvent[]>("stop_recording");
      setIsRecording(false);
      setRecordedEvents(events);

      const actionCount = getActionEventCount(events);
      console.log(
        `Recording stopped. Captured ${events.length} total events (${actionCount} actions)`
      );
      toast.success(`Recording stopped. Captured ${events.length} events`);

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
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      setIsRecording(false);
      toast.error(`Failed to stop recording: ${error}`);
    }
  };

  const handlePlayRecordedEvents = async (
    playbackSettings: PlaybackSettings
  ) => {
    if (recordedEvents.length === 0) {
      toast.error("No events to play");
      return;
    }

    try {
      setIsPlaying(true);
      const tempMacro: Macro = {
        id: "temp",
        name: "Preview",
        description: "Preview playback",
        events: recordedEvents,
        recordingSettings,
        playbackSettings,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await invoke("play_macro", { macroData: tempMacro });
      console.log("Playback completed");
    } catch (error) {
      console.error("Failed to play events:", error);
      alert(`Failed to play: ${error}`);
    } finally {
      setIsPlaying(false);
    }
  };

  const handleStopPlayback = () => {
    setIsPlaying(false);
    console.log("Playback stopped");
  };

  const handlePlayMacro = async (macro: Macro) => {
    try {
      setIsPlaying(true);
      console.log("Playing macro:", macro.name);
      toast.info(`Playing macro: ${macro.name}`);
      await invoke("play_macro", { macroData: macro });
      console.log("Macro playback completed");
      toast.success("Playback completed");
    } catch (error) {
      console.error("Failed to play macro:", error);
      toast.error(`Failed to play macro: ${error}`);
    } finally {
      setIsPlaying(false);
    }
  };

  const handleEditMacro = (macro: Macro) => {
    console.log("Edit macro:", macro.name);
  };

  const handleDeleteMacro = async (macroId: string) => {
    try {
      setMacros(macros.filter((m) => m.id !== macroId));
      await invoke("delete_macro", { macroId });
      toast.success("Macro deleted");
    } catch (error) {
      console.error("Failed to delete macro:", error);
      toast.error("Failed to delete macro");
    }
  };

  const handleExportMacro = async (macro: Macro) => {
    try {
      console.log("Exporting macro:", macro);
      await invoke("export_macro", { macroData: macro });
    } catch (error) {
      console.error("Failed to export macro:", error);
    }
  };

  const handleImportMacro = async () => {
    try {
      console.log("Importing macro...");
      const macro = await invoke<Macro | null>("import_macro");
      if (macro) {
        setMacros((prev) => [...prev, macro]);
        await invoke("save_macro", { macroData: macro });
        toast.success("Macro imported");
      }
    } catch (error) {
      console.error("Failed to import macro:", error);
    }
  };

  useEffect(() => {
    const updateHotkeys = async () => {
      try {
        await invoke("update_hotkeys", {
          recordStart: hotkeySettings.recordStart,
          recordStop: hotkeySettings.recordStop,
          playbackStart: hotkeySettings.playbackStart,
          playbackStop: hotkeySettings.playbackStop,
        });
        console.log("Hotkeys updated:", hotkeySettings);
      } catch (error) {
        console.error("Failed to update hotkeys:", error);
      }
    };

    updateHotkeys();
  }, [hotkeySettings]);

  // Refs for state access in event listeners
  const isRecordingRef = useRef(isRecording);
  const isPlayingRef = useRef(isPlaying);
  const recordedEventsRef = useRef(recordedEvents);
  const recordingSettingsRef = useRef(recordingSettings);

  useEffect(() => {
    isRecordingRef.current = isRecording;
    isPlayingRef.current = isPlaying;
    recordedEventsRef.current = recordedEvents;
    recordingSettingsRef.current = recordingSettings;
  }, [isRecording, isPlaying, recordedEvents, recordingSettings]);

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
      } catch (error) {
        console.error("Failed to initialize app:", error);
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
        if (!isRecordingRef.current && !isPlayingRef.current) {
          invoke("start_recording", { settings: recordingSettingsRef.current })
            .then(() => {
              setIsRecording(true);
              setRecordedEvents([]);
              console.log("Recording started via hotkey");
            })
            .catch((err) => {
              console.error("Failed to start recording:", err);
              alert(`Failed to start recording: ${err}`);
            });
        }
      });
      if (!isMounted) {
        u1();
        return;
      }
      unlistenFunctions.push(u1);

      const u2 = await listen("hotkey:record-stop", () => {
        if (!isMounted) return;
        if (isRecordingRef.current) {
          invoke<MacroEvent[]>("stop_recording")
            .then((events) => {
              setIsRecording(false);
              setRecordedEvents(events);
              console.log(
                `Recording stopped. Captured ${events.length} events`
              );

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
                  invoke("save_macro", { macroData: newMacro }).catch(
                    console.error
                  );
                  return [...prevMacros, newMacro];
                });
              }
            })
            .catch((err) => {
              console.error("Failed to stop recording:", err);
              setIsRecording(false);
              alert(`Failed to stop recording: ${err}`);
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
              repeatCount: 1,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          invoke("play_macro", { macroData: tempMacro })
            .then(() => console.log("Playback completed"))
            .catch((err) => {
              console.error("Failed to play:", err);
              alert(`Failed to play: ${err}`);
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
      <MainLayout currentView={currentView} onViewChange={setCurrentView}>
        {currentView === "recording" && (
          <RecordingPanel
            isRecording={isRecording}
            isPlaying={isPlaying}
            actionEventCount={getActionEventCount(recordedEvents)}
            recordingSettings={recordingSettings}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onSettingsChange={setRecordingSettings}
            onPlayRecorded={handlePlayRecordedEvents}
            onStopPlayback={handleStopPlayback}
            hasRecordedEvents={recordedEvents.length > 0}
            recordedEvents={recordedEvents}
          />
        )}

        {currentView === "macros" && (
          <MacroList
            macros={macros}
            onPlay={handlePlayMacro}
            onEdit={handleEditMacro}
            onDelete={handleDeleteMacro}
            onExport={handleExportMacro}
            onImport={handleImportMacro}
          />
        )}

        {currentView === "settings" && (
          <SettingsPanel
            hotkeySettings={hotkeySettings}
            defaultRecordingSettings={recordingSettings}
            onHotkeyChange={setHotkeySettings}
            onDefaultRecordingChange={setRecordingSettings}
          />
        )}
      </MainLayout>
      <Toaster />
    </>
  );
}

export default App;
