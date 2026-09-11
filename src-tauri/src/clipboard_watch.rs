use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tauri_plugin_clipboard_manager::ClipboardExt;

const POLL_INTERVAL: Duration = Duration::from_millis(700);

/// Whether the clipboard watcher should currently poll and emit changes.
/// Defaults to off; the frontend enables it once clipboard history is turned on.
pub static CLIPBOARD_WATCHING: AtomicBool = AtomicBool::new(false);

#[tauri::command]
pub fn set_clipboard_watching(enabled: bool) {
    CLIPBOARD_WATCHING.store(enabled, Ordering::Relaxed);
}

#[tauri::command]
pub fn is_clipboard_watching() -> bool {
    CLIPBOARD_WATCHING.load(Ordering::Relaxed)
}

/// Spawns a background thread that polls the system clipboard and emits a
/// `clipboard-changed` event with the new text whenever it changes, while
/// `CLIPBOARD_WATCHING` is enabled.
pub fn start_clipboard_watcher(app: AppHandle) {
    std::thread::spawn(move || {
        let mut last_seen: Option<String> = None;
        loop {
            std::thread::sleep(POLL_INTERVAL);

            if !CLIPBOARD_WATCHING.load(Ordering::Relaxed) {
                continue;
            }

            let Ok(text) = app.clipboard().read_text() else {
                continue;
            };
            if text.trim().is_empty() {
                continue;
            }
            if last_seen.as_deref() == Some(text.as_str()) {
                continue;
            }

            last_seen = Some(text.clone());
            let _ = app.emit("clipboard-changed", text);
        }
    });
}
