use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;

const POLL_INTERVAL: Duration = Duration::from_millis(700);
const MAX_IMAGE_BYTES: usize = 8 * 1024 * 1024;

/// Whether the clipboard watcher should currently poll and emit changes.
/// Defaults to off; the frontend enables it once clipboard history is turned on.
pub static CLIPBOARD_WATCHING: AtomicBool = AtomicBool::new(false);

#[derive(Clone, serde::Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum ClipboardPayload {
    Text {
        content: String,
    },
    Image {
        id: String,
        path: String,
        hash: String,
        width: u32,
        height: u32,
    },
}

#[tauri::command]
pub fn set_clipboard_watching(enabled: bool) {
    CLIPBOARD_WATCHING.store(enabled, Ordering::Relaxed);
}

#[tauri::command]
pub fn is_clipboard_watching() -> bool {
    CLIPBOARD_WATCHING.load(Ordering::Relaxed)
}

fn images_dir(app: &AppHandle) -> Option<PathBuf> {
    let dir = app.path().app_data_dir().ok()?.join("clipboard-images");
    fs::create_dir_all(&dir).ok()?;
    Some(dir)
}

fn hash_bytes(data: &[u8]) -> String {
    let digest = Sha256::digest(data);
    digest.iter().map(|b| format!("{b:02x}")).collect()
}

fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

/// Spawns a background thread that polls the system clipboard and emits a
/// `clipboard-changed` event whenever text or image content changes, while
/// `CLIPBOARD_WATCHING` is enabled.
pub fn start_clipboard_watcher(app: AppHandle) {
    std::thread::spawn(move || {
        let mut last_text: Option<String> = None;
        let mut last_image_hash: Option<String> = None;

        loop {
            std::thread::sleep(POLL_INTERVAL);

            if !CLIPBOARD_WATCHING.load(Ordering::Relaxed) {
                continue;
            }

            // Prefer image when present (Snipping Tool / copy image).
            if let Ok(image) = app.clipboard().read_image() {
                let rgba = image.rgba();
                let width = image.width();
                let height = image.height();
                if width > 0 && height > 0 && !rgba.is_empty() {
                    let hash = hash_bytes(rgba);
                    if last_image_hash.as_deref() != Some(hash.as_str()) {
                        if let Some(dir) = images_dir(&app) {
                            let id = new_id();
                            let path = dir.join(format!("{id}.png"));
                            let encoded = image::RgbaImage::from_raw(width, height, rgba.to_vec())
                                .and_then(|img| {
                                    let mut buf = Vec::new();
                                    let dyn_img = image::DynamicImage::ImageRgba8(img);
                                    dyn_img
                                        .write_to(
                                            &mut std::io::Cursor::new(&mut buf),
                                            image::ImageFormat::Png,
                                        )
                                        .ok()?;
                                    Some(buf)
                                });

                            if let Some(png) = encoded {
                                if png.len() <= MAX_IMAGE_BYTES && fs::write(&path, &png).is_ok() {
                                    last_image_hash = Some(hash.clone());
                                    let _ = app.emit(
                                        "clipboard-changed",
                                        ClipboardPayload::Image {
                                            id,
                                            path: path.to_string_lossy().into_owned(),
                                            hash,
                                            width,
                                            height,
                                        },
                                    );
                                }
                            }
                        }
                    }
                }
            }

            if let Ok(text) = app.clipboard().read_text() {
                if !text.trim().is_empty() && last_text.as_deref() != Some(text.as_str()) {
                    last_text = Some(text.clone());
                    let _ = app.emit(
                        "clipboard-changed",
                        ClipboardPayload::Text { content: text },
                    );
                }
            }
        }
    });
}
