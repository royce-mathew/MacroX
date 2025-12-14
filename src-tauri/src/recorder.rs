// Event recording and playback module

use parking_lot::Mutex;
use rdev::{Event, EventType};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, UNIX_EPOCH};

use crate::types::{HotkeySettings, MacroEvent, MouseButton, RecordingSettings};

pub struct Recorder {
    events: Arc<Mutex<Vec<MacroEvent>>>,
    is_recording: Arc<Mutex<bool>>,
    settings: RecordingSettings,
    app_handle: Option<tauri::AppHandle>,
}

impl Recorder {
    pub fn new(settings: RecordingSettings, app_handle: Option<tauri::AppHandle>) -> Self {
        Self {
            events: Arc::new(Mutex::new(Vec::new())),
            is_recording: Arc::new(Mutex::new(false)),
            settings,
            app_handle,
        }
    }

    pub fn start(&mut self, hotkeys: HotkeySettings) -> Result<(), String> {
        *self.is_recording.lock() = true;
        self.events.lock().clear();

        let events = Arc::clone(&self.events);
        let is_recording = Arc::clone(&self.is_recording);
        let settings = self.settings.clone();
        let app_handle = self.app_handle.clone();
        let hotkeys = hotkeys.clone();

        // Spawn listener thread
        thread::spawn(move || {
            let callback = move |event: Event| {
                if !*is_recording.lock() {
                    return;
                }

                if let Some(macro_event) = convert_rdev_event(event, &settings) {
                    // Check if event matches a hotkey (simple check for single keys like F-keys)
                    if let Some(key_str) = macro_event.data.get("key").and_then(|k| k.as_str()) {
                        let is_hotkey = key_str == hotkeys.record_stop
                            || key_str == hotkeys.record_start
                            || key_str == hotkeys.playback_start
                            || key_str == hotkeys.playback_stop;

                        if is_hotkey {
                            if let Some(handle) = app_handle.as_ref() {
                                let _ = tauri::Emitter::emit(
                                    handle,
                                    "recording-warning",
                                    format!("Hotkey '{}' detected and ignored", key_str),
                                );
                            }
                            return;
                        }
                    }

                    events.lock().push(macro_event);
                }
            };

            // This will block until recording stops
            if let Err(e) = rdev::listen(callback) {
                eprintln!("rdev listen error: {:?}", e);
            }
        });

        Ok(())
    }

    pub fn stop(&mut self) -> Vec<MacroEvent> {
        *self.is_recording.lock() = false;

        // Give the listener thread a moment to finish processing
        thread::sleep(Duration::from_millis(100));

        let events = self.events.lock().clone();

        // Normalize timestamps to start from 0
        if let Some(first_event) = events.first() {
            let start_timestamp = first_event.timestamp;
            events
                .into_iter()
                .map(|mut e| {
                    e.timestamp = e.timestamp.saturating_sub(start_timestamp);
                    e
                })
                .collect()
        } else {
            events
        }
    }
}

fn convert_rdev_event(event: Event, settings: &RecordingSettings) -> Option<MacroEvent> {
    // Convert SystemTime to milliseconds
    let timestamp = event.time.duration_since(UNIX_EPOCH).ok()?.as_millis() as u64;

    match event.event_type {
        EventType::MouseMove { x, y } => {
            if settings.record_mouse_movement {
                Some(MacroEvent {
                    event_type: "MouseMove".to_string(),
                    timestamp,
                    data: serde_json::json!({
                        "x": x as i32,
                        "y": y as i32,
                    }),
                })
            } else {
                None
            }
        }
        EventType::ButtonPress(button) => {
            if settings.record_mouse_clicks {
                Some(MacroEvent {
                    event_type: "MouseDown".to_string(),
                    timestamp,
                    data: serde_json::json!({
                        "button": convert_mouse_button(button),
                    }),
                })
            } else {
                None
            }
        }
        EventType::ButtonRelease(button) => {
            if settings.record_mouse_clicks {
                Some(MacroEvent {
                    event_type: "MouseUp".to_string(),
                    timestamp,
                    data: serde_json::json!({
                        "button": convert_mouse_button(button),
                    }),
                })
            } else {
                None
            }
        }
        EventType::KeyPress(key) => {
            if settings.record_keyboard {
                Some(MacroEvent {
                    event_type: "KeyDown".to_string(),
                    timestamp,
                    data: serde_json::json!({
                        "key": rdev_key_to_string(key),
                    }),
                })
            } else {
                None
            }
        }
        EventType::KeyRelease(key) => {
            if settings.record_keyboard {
                Some(MacroEvent {
                    event_type: "KeyUp".to_string(),
                    timestamp,
                    data: serde_json::json!({
                        "key": rdev_key_to_string(key),
                    }),
                })
            } else {
                None
            }
        }
        EventType::Wheel { delta_x, delta_y } => {
            if settings.record_mouse_clicks {
                Some(MacroEvent {
                    event_type: "MouseWheel".to_string(),
                    timestamp,
                    data: serde_json::json!({
                        "delta_x": delta_x,
                        "delta_y": delta_y,
                    }),
                })
            } else {
                None
            }
        }
    }
}

fn convert_mouse_button(button: rdev::Button) -> MouseButton {
    match button {
        rdev::Button::Left => MouseButton::Left,
        rdev::Button::Right => MouseButton::Right,
        rdev::Button::Middle => MouseButton::Middle,
        _ => MouseButton::Left, // Default fallback
    }
}

fn rdev_key_to_string(key: rdev::Key) -> String {
    use rdev::Key::*;
    match key {
        // Alphanumeric
        KeyA => "a",
        KeyB => "b",
        KeyC => "c",
        KeyD => "d",
        KeyE => "e",
        KeyF => "f",
        KeyG => "g",
        KeyH => "h",
        KeyI => "i",
        KeyJ => "j",
        KeyK => "k",
        KeyL => "l",
        KeyM => "m",
        KeyN => "n",
        KeyO => "o",
        KeyP => "p",
        KeyQ => "q",
        KeyR => "r",
        KeyS => "s",
        KeyT => "t",
        KeyU => "u",
        KeyV => "v",
        KeyW => "w",
        KeyX => "x",
        KeyY => "y",
        KeyZ => "z",
        Num1 => "1",
        Num2 => "2",
        Num3 => "3",
        Num4 => "4",
        Num5 => "5",
        Num6 => "6",
        Num7 => "7",
        Num8 => "8",
        Num9 => "9",
        Num0 => "0",

        // Special
        Return => "Enter",
        Space => "Space",
        Backspace => "Backspace",
        Tab => "Tab",
        Escape => "Escape",
        ShiftLeft | ShiftRight => "Shift",
        ControlLeft | ControlRight => "Control",
        Alt | AltGr => "Alt",
        MetaLeft | MetaRight => "Meta",

        // Fallback to debug string for others
        _ => return format!("{:?}", key),
    }
    .to_string()
}
