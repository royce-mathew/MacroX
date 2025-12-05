use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Mouse button types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MouseButton {
    Left,
    Right,
    Middle,
}

/// Individual macro event with flexible data storage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MacroEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub timestamp: u64,
    pub data: Value,
}

/// Playback settings for macro execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybackSettings {
    pub speed: f64,
    #[serde(rename = "repeatMode")]
    pub repeat_mode: String,
    #[serde(rename = "repeatCount")]
    pub repeat_count: u32,
}

/// Recording settings - what to capture
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingSettings {
    #[serde(rename = "recordMouseMovement")]
    pub record_mouse_movement: bool,
    #[serde(rename = "recordMouseClicks")]
    pub record_mouse_clicks: bool,
    #[serde(rename = "recordKeyboard")]
    pub record_keyboard: bool,
}

/// Complete macro with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Macro {
    pub id: String,
    pub name: String,
    pub description: String,
    pub events: Vec<MacroEvent>,
    #[serde(rename = "recordingSettings")]
    pub recording_settings: RecordingSettings,
    #[serde(rename = "playbackSettings")]
    pub playback_settings: PlaybackSettings,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

/// App-wide hotkey configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HotkeySettings {
    #[serde(rename = "recordStart")]
    pub record_start: String,
    #[serde(rename = "recordStop")]
    pub record_stop: String,
    #[serde(rename = "playbackStart")]
    pub playback_start: String,
    #[serde(rename = "playbackStop")]
    pub playback_stop: String,
}

impl Default for HotkeySettings {
    fn default() -> Self {
        Self {
            record_start: "F9".to_string(),
            record_stop: "F10".to_string(),
            playback_start: "F11".to_string(),
            playback_stop: "F12".to_string(),
        }
    }
}
