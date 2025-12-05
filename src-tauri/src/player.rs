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
                    // Note: Proper key conversion needed - this is a simplified version
                    self.enigo
                        .text(key_str)
                        .map_err(|e| format!("Key press error: {:?}", e))?;
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
}

fn convert_to_enigo_button(button_str: &str) -> Button {
    match button_str {
        "Left" => Button::Left,
        "Right" => Button::Right,
        "Middle" => Button::Middle,
        _ => Button::Left,
    }
}
