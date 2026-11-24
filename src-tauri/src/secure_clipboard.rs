//! Copying secrets (vault passwords, usernames, TOTP codes) to the clipboard.
//!
//! - On Windows the data is tagged with the standard "do not record" formats so Windows
//!   clipboard history (Win+V), cloud clipboard and clipboard managers — including our own
//!   watcher — ignore it.
//! - On every platform the value is remembered by hash so our watcher skips it, and the
//!   clipboard is cleared after a timeout if it still holds the secret.

use sha2::{Digest, Sha256};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;

static SENSITIVE_HASH: Mutex<Option<String>> = Mutex::new(None);
static GENERATION: AtomicU64 = AtomicU64::new(0);

fn hash_text(text: &str) -> String {
    Sha256::digest(text.as_bytes())
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect()
}

/// True when `text` is the secret most recently copied through [`copy_sensitive`].
pub fn is_sensitive(text: &str) -> bool {
    let guard = SENSITIVE_HASH.lock().unwrap_or_else(|e| e.into_inner());
    guard.as_deref() == Some(hash_text(text).as_str())
}

#[tauri::command]
pub async fn copy_sensitive(
    app: AppHandle,
    text: String,
    clear_after_secs: u32,
) -> Result<(), String> {
    *SENSITIVE_HASH.lock().unwrap_or_else(|e| e.into_inner()) = Some(hash_text(&text));
    let generation = GENERATION.fetch_add(1, Ordering::SeqCst) + 1;

    #[cfg(windows)]
    win::write_excluded_text(&text)?;
    #[cfg(not(windows))]
    app.clipboard()
        .write_text(text.clone())
        .map_err(|e| e.to_string())?;

    if clear_after_secs > 0 {
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_secs(u64::from(clear_after_secs)));
            // A newer secret was copied meanwhile; that copy owns the timer.
            if GENERATION.load(Ordering::SeqCst) != generation {
                return;
            }
            // Only clear if the user has not copied something else in the meantime.
            if app.clipboard().read_text().ok().as_deref() == Some(text.as_str()) {
                let _ = app.clipboard().clear();
            }
        });
    }
    Ok(())
}

#[cfg(windows)]
pub mod win {
    use windows_sys::Win32::Foundation::GlobalFree;
    use windows_sys::Win32::System::DataExchange::{
        CloseClipboard, EmptyClipboard, GetClipboardSequenceNumber, IsClipboardFormatAvailable,
        OpenClipboard, RegisterClipboardFormatW, SetClipboardData,
    };
    use windows_sys::Win32::System::Memory::{
        GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE,
    };
    use windows_sys::Win32::System::Ole::CF_UNICODETEXT;

    const EXCLUDE_FORMAT: &str = "ExcludeClipboardContentFromMonitorProcessing";

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    fn register(name: &str) -> u32 {
        let w = wide(name);
        unsafe { RegisterClipboardFormatW(w.as_ptr()) }
    }

    /// Changes whenever any process writes to the clipboard. Cheap to call.
    pub fn sequence_number() -> u32 {
        unsafe { GetClipboardSequenceNumber() }
    }

    /// True when the current clipboard content was flagged as "do not record" by its owner
    /// (password managers such as KeePass, Bitwarden, 1Password, or this app).
    pub fn content_is_excluded() -> bool {
        let fmt = register(EXCLUDE_FORMAT);
        fmt != 0 && unsafe { IsClipboardFormatAvailable(fmt) } != 0
    }

    /// Copies `bytes` into a movable global block and hands it to the clipboard.
    unsafe fn set_bytes(format: u32, bytes: &[u8]) -> bool {
        let handle = GlobalAlloc(GMEM_MOVEABLE, bytes.len().max(1));
        if handle.is_null() {
            return false;
        }
        let ptr = GlobalLock(handle) as *mut u8;
        if ptr.is_null() {
            GlobalFree(handle);
            return false;
        }
        std::ptr::copy_nonoverlapping(bytes.as_ptr(), ptr, bytes.len());
        GlobalUnlock(handle);
        if SetClipboardData(format, handle).is_null() {
            GlobalFree(handle);
            return false;
        }
        true // ownership moved to the clipboard
    }

    pub fn write_excluded_text(text: &str) -> Result<(), String> {
        let utf16: Vec<u8> = wide(text).iter().flat_map(|c| c.to_le_bytes()).collect();
        let zero = 0u32.to_le_bytes();
        unsafe {
            // Another process may briefly hold the clipboard; retry a few times.
            let mut opened = false;
            for _ in 0..10 {
                if OpenClipboard(std::ptr::null_mut()) != 0 {
                    opened = true;
                    break;
                }
                std::thread::sleep(std::time::Duration::from_millis(15));
            }
            if !opened {
                return Err("Clipboard is busy, try again".into());
            }
            EmptyClipboard();
            let ok = set_bytes(u32::from(CF_UNICODETEXT), &utf16);
            set_bytes(register(EXCLUDE_FORMAT), &zero);
            set_bytes(register("CanIncludeInClipboardHistory"), &zero);
            set_bytes(register("CanUploadToCloudClipboard"), &zero);
            CloseClipboard();
            if ok {
                Ok(())
            } else {
                Err("Failed to write to clipboard".into())
            }
        }
    }
}
