// Event recording and playback module

use parking_lot::Mutex;
use rdev::{Event, EventType};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, UNIX_EPOCH};

use crate::types::{MacroEvent, MouseButton, RecordingSettings};

pub struct Recorder {
    events: Arc<Mutex<Vec<MacroEvent>>>,
    is_recording: Arc<Mutex<bool>>,
    settings: RecordingSettings,
}

impl Recorder {
    pub fn new(settings: RecordingSettings) -> Self {
        Self {
            events: Arc::new(Mutex::new(Vec::new())),
            is_recording: Arc::new(Mutex::new(false)),
            settings,
        }
    }

    pub fn start(&mut self) -> Result<(), String> {
        *self.is_recording.lock() = true;
        self.events.lock().clear();

        let events = Arc::clone(&self.events);
        let is_recording = Arc::clone(&self.is_recording);
        let settings = self.settings.clone();

        // Spawn listener thread
        thread::spawn(move || {
            let callback = move |event: Event| {
                if !*is_recording.lock() {
                    return;
                }

                if let Some(macro_event) = convert_rdev_event(event, &settings) {
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
                        "key": format!("{:?}", key),
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
                        "key": format!("{:?}", key),
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
