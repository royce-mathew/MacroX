// Event playback module

use enigo::{Axis, Button, Coordinate, Direction, Enigo, Keyboard, Mouse, Settings};
use std::thread;
use std::time::Duration;

use crate::types::Macro;

pub struct Player {
    enigo: Enigo,
}

impl Player {
    pub fn new() -> Result<Self, String> {
        let enigo = Enigo::new(&Settings::default())
            .map_err(|e| format!("Failed to create Enigo: {:?}", e))?;

        Ok(Self { enigo })
    }

    pub fn play_macro(&mut self, macro_data: &Macro) -> Result<(), String> {
        let events = &macro_data.events;
        let settings = &macro_data.playback_settings;

        if events.is_empty() {
            return Ok(());
        }

        let repeat_count = match settings.repeat_mode.as_str() {
            "once" => 1,
            "count" => settings.repeat_count,
            "infinite" => u32::MAX, // Will need external stop mechanism
            _ => 1,
        };

        for iteration in 0..repeat_count {
            println!("Playing macro iteration {}", iteration + 1);

            for i in 0..events.len() {
                let event = &events[i];

                // Calculate delay
                if i > 0 {
                    let prev_event = &events[i - 1];
                    let delay_ms = event.timestamp.saturating_sub(prev_event.timestamp);
                    let adjusted_delay = (delay_ms as f64 / settings.speed) as u64;

                    if adjusted_delay > 0 {
                        thread::sleep(Duration::from_millis(adjusted_delay));
                    }
                }

                self.simulate_event(event)?;
            }

            // Small delay between repetitions
            if iteration < repeat_count - 1 {
                thread::sleep(Duration::from_millis(500));
            }
        }

        Ok(())
    }

    fn simulate_event(&mut self, event: &crate::types::MacroEvent) -> Result<(), String> {
        match event.event_type.as_str() {
            "MouseMove" => {
                if let (Some(x), Some(y)) = (
                    event.data.get("x").and_then(|v| v.as_i64()),
                    event.data.get("y").and_then(|v| v.as_i64()),
                ) {
                    self.enigo
                        .move_mouse(x as i32, y as i32, Coordinate::Abs)
                        .map_err(|e| format!("Mouse move error: {:?}", e))?;
                }
            }
            "MouseDown" => {
                if let Some(button_str) = event.data.get("button").and_then(|v| v.as_str()) {
                    let button = convert_to_enigo_button(button_str);
                    self.enigo
                        .button(button, Direction::Press)
                        .map_err(|e| format!("Mouse button press error: {:?}", e))?;
                }
            }
            "MouseUp" => {
                if let Some(button_str) = event.data.get("button").and_then(|v| v.as_str()) {
                    let button = convert_to_enigo_button(button_str);
                    self.enigo
                        .button(button, Direction::Release)
                        .map_err(|e| format!("Mouse button release error: {:?}", e))?;
                }
            }
            "KeyDown" => {
                if let Some(key_str) = event.data.get("key").and_then(|v| v.as_str()) {
                    self.simulate_key(key_str, Direction::Press)?;
                }
            }
            "KeyUp" => {
                if let Some(key_str) = event.data.get("key").and_then(|v| v.as_str()) {
                    self.simulate_key(key_str, Direction::Release)?;
                }
            }
            "MouseWheel" => {
                if let Some(delta_y) = event.data.get("delta_y").and_then(|v| v.as_i64()) {
                    let scroll_amount = delta_y as i32;
                    self.enigo
                        .scroll(scroll_amount, Axis::Vertical)
                        .map_err(|e| format!("Mouse wheel error: {:?}", e))?;
                }
            }
            _ => {
                println!("Unknown event type: {}", event.event_type);
            }
        }

        Ok(())
    }

    // Helper to simulate key press/release
    fn simulate_key(&mut self, key_str: &str, direction: Direction) -> Result<(), String> {
        // Handle single character keys (alphanumeric, symbols)
        if key_str.len() == 1 {
            let ch = key_str.chars().next().unwrap();
            // For single chars, we handle modifiers correctly by respecting the event direction.
            // We use Key::Unicode to ensure the specific character is targeted.
            let key = enigo::Key::Unicode(ch);
            self.enigo
                .key(key, direction)
                .map_err(|e| format!("Key {:?} error: {:?}", direction, e))?;
            return Ok(());
        }

        // Handle special Named keys
        let key = string_to_enigo_key(key_str);
        self.enigo
            .key(key, direction)
            .map_err(|e| format!("Key {:?} error: {:?}", direction, e))?;

        Ok(())
    }
}

fn convert_to_enigo_button(button_str: &str) -> Button {
    match button_str {
        "Left" => Button::Left,
        "Right" => Button::Right,
        "Middle" => Button::Middle,
        _ => Button::Left,
    }
}

fn string_to_enigo_key(key_str: &str) -> enigo::Key {
    use enigo::Key::*;
    match key_str {
        "Enter" => Return,
        "Space" => Space,
        "Backspace" => Backspace,
        "Tab" => Tab,
        "Escape" => Escape,
        "Shift" => Shift,
        "Control" => Control,
        "Alt" => Alt,
        "Meta" => Meta,
        "CapsLock" => CapsLock,
        // Add other keys as needed
        _ => {
            // Fallback for unknown keys or ignore
            eprintln!("Unknown key string: {}", key_str);
            // Default safe fallback (Escape usually safe to spam?) or just Layout
            // Ideally we shouldn't hit this if recorder handles it.
            // Returning a innocuous key
            enigo::Key::Unicode(key_str.chars().next().unwrap_or('?'))
        }
    }
}
