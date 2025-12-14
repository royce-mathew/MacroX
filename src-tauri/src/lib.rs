// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod player;
mod recorder;
mod types;

use parking_lot::Mutex;
use player::Player;
use recorder::Recorder;
use std::sync::Arc;
use tauri::{Emitter, Manager, State};
use tauri_plugin_global_shortcut::GlobalShortcutExt;
use tauri_plugin_store::StoreExt;
use types::*;

const SETTINGS_FILENAME: &str = "settings.json";
const MACROS_FILENAME: &str = "macros.json";

fn load_hotkeys_from_store(app: &tauri::AppHandle) -> HotkeySettings {
    let store = app.store(SETTINGS_FILENAME).expect("failed to get store");

    // Attempt to load settings
    let _ = store.reload();

    if let Some(value) = store.get("hotkeys") {
        if let Ok(settings) = serde_json::from_value(value) {
            return settings;
        }
    }

    // Default if not found or invalid
    let default_settings = HotkeySettings::default();
    // Save defaults
    let _ = store.set(
        "hotkeys".to_string(),
        serde_json::to_value(&default_settings).unwrap(),
    );
    let _ = store.save();

    default_settings
}

fn load_app_settings_from_store(app: &tauri::AppHandle) -> AppSettings {
    let store = app.store(SETTINGS_FILENAME).expect("failed to get store");
    let _ = store.reload();

    if let Some(value) = store.get("app_settings") {
        if let Ok(settings) = serde_json::from_value(value) {
            return settings;
        }
    }

    let default_settings = AppSettings::default();
    let _ = store.set(
        "app_settings".to_string(),
        serde_json::to_value(&default_settings).unwrap(),
    );
    let _ = store.save();

    default_settings
}

fn load_macros_from_store(app: &tauri::AppHandle) -> Vec<Macro> {
    let store = app.store(MACROS_FILENAME).expect("failed to get store");
    let _ = store.reload();

    if let Some(value) = store.get("macros") {
        if let Ok(macros) = serde_json::from_value(value) {
            return macros;
        }
    }
    Vec::new()
}

fn save_macros_to_store(app: &tauri::AppHandle, macros: &Vec<Macro>) {
    let store = app.store(MACROS_FILENAME).expect("failed to get store");
    let _ = store.set("macros".to_string(), serde_json::to_value(macros).unwrap());
    let _ = store.save();
}

/// Application state for managing macros and recording
pub struct AppState {
    macros: Arc<Mutex<Vec<Macro>>>,
    recorder: Arc<Mutex<Option<Recorder>>>,
    app_handle: tauri::AppHandle,
}

/// Start recording macro events
#[tauri::command]
fn start_recording(settings: RecordingSettings, state: State<'_, AppState>) -> Result<(), String> {
    let mut recorder_lock = state.recorder.lock();

    // Stop any existing recording
    if recorder_lock.is_some() {
        return Err("Recording already in progress".to_string());
    }

    let app = state.app_handle.clone();

    // Pass app_handle to Recorder
    let mut recorder = Recorder::new(settings, Some(app.clone()));

    // Load hotkeys to pass to recorder for filtering
    let hotkeys = load_hotkeys_from_store(&app);

    // Start with hotkeys
    recorder.start(hotkeys)?;

    *recorder_lock = Some(recorder);

    println!("Recording started");
    Ok(())
}

/// Stop recording and return captured events
#[tauri::command]
fn stop_recording(state: State<'_, AppState>) -> Result<Vec<MacroEvent>, String> {
    let mut recorder_lock = state.recorder.lock();

    if let Some(mut recorder) = recorder_lock.take() {
        let events = recorder.stop();
        println!("Recording stopped. Captured {} events", events.len());
        Ok(events)
    } else {
        Err("No active recording".to_string())
    }
}

/// Check if recording is currently in progress
#[tauri::command]
fn is_recording(state: State<'_, AppState>) -> bool {
    state.recorder.lock().is_some()
}

/// Play a macro
#[tauri::command]
fn play_macro(macro_data: Macro) -> Result<(), String> {
    println!(
        "Playing macro: {} with {} events",
        macro_data.name,
        macro_data.events.len()
    );

    let mut player = Player::new()?;
    player.play_macro(&macro_data)?;

    println!("Playback completed");
    Ok(())
}

/// Save a macro to the in-memory store
#[tauri::command]
fn save_macro(macro_data: Macro, state: State<'_, AppState>) -> Result<(), String> {
    let mut macros = state.macros.lock();

    // Check if macro exists and update it, or add new
    if let Some(pos) = macros.iter().position(|m| m.id == macro_data.id) {
        macros[pos] = macro_data.clone();
    } else {
        macros.push(macro_data.clone());
    }

    println!("Saved macro: {}", macro_data.name);

    // Persist changes
    save_macros_to_store(&state.app_handle, &macros);

    Ok(())
}

/// Load all macros
#[tauri::command]
fn load_all_macros(state: State<'_, AppState>) -> Result<Vec<Macro>, String> {
    let macros = state.macros.lock();
    Ok(macros.clone())
}

/// Delete a macro by ID
#[tauri::command]
fn delete_macro(macro_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut macros = state.macros.lock();
    macros.retain(|m| m.id != macro_id);

    println!("Deleted macro: {}", macro_id);

    // Persist changes
    save_macros_to_store(&state.app_handle, &macros);

    Ok(())
}

/// Export a macro (stub - would show save dialog)
#[tauri::command]
fn export_macro(macro_data: Macro) -> Result<(), String> {
    // TODO: Implement file dialog and JSON export
    println!("Exporting macro: {}", macro_data.name);
    Ok(())
}

/// Import a macro (stub - would show open dialog)
#[tauri::command]
fn import_macro() -> Result<Option<Macro>, String> {
    // TODO: Implement file dialog and JSON import
    println!("Import macro requested");
    Ok(None)
}

/// Update global hotkeys
#[tauri::command]
fn update_hotkeys(
    app: tauri::AppHandle,
    record_start: String,
    record_stop: String,
    playback_start: String,
    playback_stop: String,
) -> Result<(), String> {
    use tauri_plugin_global_shortcut::ShortcutState;

    // Unregister all existing shortcuts
    app.global_shortcut()
        .unregister_all()
        .map_err(|e| format!("Failed to unregister shortcuts: {:?}", e))?;

    // Register new shortcuts
    let handle = app.clone();
    app.global_shortcut()
        .on_shortcut(record_start.as_str(), move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                let _ = handle.emit("hotkey:record-start", ());
            }
        })
        .map_err(|e| format!("Failed to register record start: {:?}", e))?;

    let handle = app.clone();
    app.global_shortcut()
        .on_shortcut(record_stop.as_str(), move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                let _ = handle.emit("hotkey:record-stop", ());
            }
        })
        .map_err(|e| format!("Failed to register record stop: {:?}", e))?;

    let handle = app.clone();
    app.global_shortcut()
        .on_shortcut(playback_start.as_str(), move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                let _ = handle.emit("hotkey:playback-start", ());
            }
        })
        .map_err(|e| format!("Failed to register playback start: {:?}", e))?;

    let handle = app.clone();
    app.global_shortcut()
        .on_shortcut(playback_stop.as_str(), move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                let _ = handle.emit("hotkey:playback-stop", ());
            }
        })
        .map_err(|e| format!("Failed to register playback stop: {:?}", e))?;

    println!("Hotkeys updated and saved successfully");

    // Save to store
    let store = app.store(SETTINGS_FILENAME).map_err(|e| e.to_string())?;
    let _ = store.reload();

    let settings = HotkeySettings {
        record_start: record_start.clone(),
        record_stop: record_stop.clone(),
        playback_start: playback_start.clone(),
        playback_stop: playback_stop.clone(),
    };

    let _ = store.set(
        "hotkeys".to_string(),
        serde_json::to_value(&settings).map_err(|e| e.to_string())?,
    );
    let _ = store.save();

    Ok(())
}

/// Get current hotkeys
#[tauri::command]
fn get_hotkeys(app: tauri::AppHandle) -> Result<HotkeySettings, String> {
    Ok(load_hotkeys_from_store(&app))
}

/// Update app settings
#[tauri::command]
fn update_app_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
    let store = app.store(SETTINGS_FILENAME).map_err(|e| e.to_string())?;

    // Update window state immediately
    if let Some(window) = app.get_webview_window("main") {
        window
            .set_always_on_top(settings.always_on_top)
            .map_err(|e| e.to_string())?;
    }

    let _ = store.set(
        "app_settings".to_string(),
        serde_json::to_value(&settings).map_err(|e| e.to_string())?,
    );
    let _ = store.save();

    Ok(())
}

/// Get current app settings
#[tauri::command]
fn get_app_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    Ok(load_app_settings_from_store(&app))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            use tauri_plugin_global_shortcut::ShortcutState;

            // Try to unregister any existing shortcuts first
            let _ = app.global_shortcut().unregister_all();

            // Load saved hotkeys
            let hotkeys = load_hotkeys_from_store(app.handle());
            println!("Loaded hotkeys: {:?}", hotkeys);

            // Load and apply app settings
            let app_settings = load_app_settings_from_store(app.handle());
            println!("Loaded app settings: {:?}", app_settings);

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_always_on_top(app_settings.always_on_top);
            }

            // Register global shortcuts
            let handle = app.handle().clone();
            app.global_shortcut()
                .on_shortcut(
                    hotkeys.record_start.as_str(),
                    move |_app, _shortcut, event| {
                        if event.state == ShortcutState::Pressed {
                            println!("Record Start Hotkey Pressed");
                            let _ = handle.emit("hotkey:record-start", ());
                        }
                    },
                )
                .unwrap_or_else(|e| eprintln!("Failed to register record start hotkey: {}", e));

            let handle = app.handle().clone();
            app.global_shortcut()
                .on_shortcut(
                    hotkeys.record_stop.as_str(),
                    move |_app, _shortcut, event| {
                        if event.state == ShortcutState::Pressed {
                            println!("Record Stop Hotkey Pressed");
                            let _ = handle.emit("hotkey:record-stop", ());
                        }
                    },
                )
                .unwrap_or_else(|e| eprintln!("Failed to register record stop hotkey: {}", e));

            let handle = app.handle().clone();
            app.global_shortcut()
                .on_shortcut(
                    hotkeys.playback_start.as_str(),
                    move |_app, _shortcut, event| {
                        if event.state == ShortcutState::Pressed {
                            println!("Playback Start Hotkey Pressed");
                            let _ = handle.emit("hotkey:playback-start", ());
                        }
                    },
                )
                .unwrap_or_else(|e| eprintln!("Failed to register playback start hotkey: {}", e));

            let handle = app.handle().clone();
            app.global_shortcut()
                .on_shortcut(
                    hotkeys.playback_stop.as_str(),
                    move |_app, _shortcut, event| {
                        if event.state == ShortcutState::Pressed {
                            println!("Playback Stop Hotkey Pressed");
                            let _ = handle.emit("hotkey:playback-stop", ());
                        }
                    },
                )
                .unwrap_or_else(|e| eprintln!("Failed to register playback stop hotkey: {}", e));

            println!("Hotkey setup completed");

            // Load macros
            let loaded_macros = load_macros_from_store(app.handle());
            println!("Loaded {} macros from store", loaded_macros.len());

            app.manage(AppState {
                macros: Arc::new(Mutex::new(loaded_macros)),
                recorder: Arc::new(Mutex::new(None)),
                app_handle: app.handle().clone(),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_recording,
            stop_recording,
            is_recording,
            play_macro,
            save_macro,
            load_all_macros,
            delete_macro,
            export_macro,
            import_macro,
            update_hotkeys,
            get_hotkeys,
            update_app_settings,
            get_app_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
