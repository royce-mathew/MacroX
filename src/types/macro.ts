// TypeScript types for macro recording and playback

/**
 * Types of events that can be recorded
 */
export type EventType =
  | "mouse_move"
  | "mouse_click"
  | "key_press"
  | "key_release";

/**
 * Mouse button types
 */
export type MouseButton = "left" | "right" | "middle";

/**
 * Individual macro event
 */
export interface MacroEvent {
  type: EventType;
  timestamp: number;

  // Mouse event data
  x?: number;
  y?: number;
  button?: MouseButton;

  // Keyboard event data
  key?: string;
}

/**
 * Playback repeat modes
 */
export type RepeatMode = "once" | "count" | "infinite";

/**
 * Playback settings for macro execution
 */
export interface PlaybackSettings {
  speed: number; // 0.25x to 4x
  repeatMode: RepeatMode;
  repeatCount?: number; // Only used when repeatMode is 'count'
  interval?: number; // Delay between repetitions in milliseconds
  scheduledTime?: Date; // When to automatically execute
}

/**
 * Recording settings - what to capture
 */
export interface RecordingSettings {
  recordMouseMovement: boolean;
  recordMouseClicks: boolean;
  recordKeyboard: boolean;
}

/**
 * Complete macro with metadata
 */
export interface Macro {
  id: string;
  name: string;
  description?: string;
  events: MacroEvent[];
  recordingSettings: RecordingSettings;
  playbackSettings: PlaybackSettings;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Application hotkeys
 */
export interface HotkeySettings {
  recordStart: string;
  recordStop: string;
  playbackStart: string;
  playbackStop: string;
}

/**
 * Application state
 */
export interface AppState {
  isRecording: boolean;
  isPlaying: boolean;
  currentRecordedEvents: number;
}
