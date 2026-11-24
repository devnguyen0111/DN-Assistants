//! Scheduled power actions (shutdown timer).
//!
//! One schedule at a time. A background thread counts down, emits `power-action-warning`
//! shortly before the deadline (so the UI can offer a last-chance cancel) and then runs the
//! platform command. Shutdown/restart never force-close apps, so unsaved work can still
//! block them — that is deliberate.

use serde::{Deserialize, Serialize};
use std::process::Command;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

const WARNING_SECS: u64 = 60;
const MAX_DELAY_SECS: u64 = 7 * 24 * 3600;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PowerAction {
    Shutdown,
    Restart,
    Sleep,
    Hibernate,
    Lock,
    Signout,
}

#[derive(Debug, Clone, Serialize)]
pub struct PowerSchedule {
    pub action: PowerAction,
    /// Unix epoch milliseconds when the action runs.
    pub deadline_ms: u64,
}

static SCHEDULE: Mutex<Option<PowerSchedule>> = Mutex::new(None);
static GENERATION: AtomicU64 = AtomicU64::new(0);

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn set_schedule(value: Option<PowerSchedule>) {
    *SCHEDULE.lock().unwrap_or_else(|e| e.into_inner()) = value;
}

#[tauri::command]
pub fn get_power_schedule() -> Option<PowerSchedule> {
    SCHEDULE.lock().unwrap_or_else(|e| e.into_inner()).clone()
}

#[tauri::command]
pub fn cancel_power_action(app: AppHandle) {
    GENERATION.fetch_add(1, Ordering::SeqCst);
    set_schedule(None);
    let _ = app.emit("power-schedule-changed", Option::<PowerSchedule>::None);
}

#[tauri::command]
pub fn schedule_power_action(
    app: AppHandle,
    action: PowerAction,
    delay_secs: u64,
) -> Result<PowerSchedule, String> {
    if delay_secs > MAX_DELAY_SECS {
        return Err("Delay must be at most 7 days".into());
    }
    let generation = GENERATION.fetch_add(1, Ordering::SeqCst) + 1;
    let schedule = PowerSchedule {
        action,
        deadline_ms: now_ms() + delay_secs * 1000,
    };
    set_schedule(Some(schedule.clone()));
    let _ = app.emit("power-schedule-changed", Some(schedule.clone()));

    let deadline_ms = schedule.deadline_ms;
    std::thread::spawn(move || {
        let mut warned = delay_secs <= WARNING_SECS;
        loop {
            if GENERATION.load(Ordering::SeqCst) != generation {
                return; // cancelled or replaced
            }
            let now = now_ms();
            if now >= deadline_ms {
                break;
            }
            let remaining = (deadline_ms - now) / 1000;
            if !warned && remaining <= WARNING_SECS {
                warned = true;
                let _ = app.emit("power-action-warning", get_power_schedule());
            }
            // Wall-clock based, so a sleep/hibernate of the PC does not stretch the timer.
            std::thread::sleep(Duration::from_millis(500));
        }
        set_schedule(None);
        let _ = app.emit("power-schedule-changed", Option::<PowerSchedule>::None);
        if let Err(err) = run_action(action) {
            let _ = app.emit("power-action-failed", err);
        }
    });

    Ok(schedule)
}

fn run(cmd: &str, args: &[&str]) -> Result<(), String> {
    let mut command = Command::new(cmd);
    command.args(args);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    let status = command.status().map_err(|e| format!("{cmd}: {e}"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("{cmd} exited with {status}"))
    }
}

#[cfg(windows)]
fn run_action(action: PowerAction) -> Result<(), String> {
    match action {
        PowerAction::Shutdown => run("shutdown", &["/s", "/t", "0"]),
        PowerAction::Restart => run("shutdown", &["/r", "/t", "0"]),
        PowerAction::Hibernate => run("shutdown", &["/h"]),
        PowerAction::Signout => run("shutdown", &["/l"]),
        PowerAction::Lock => run("rundll32.exe", &["user32.dll,LockWorkStation"]),
        // Note: if hibernation is enabled system-wide, Windows may hibernate instead of sleep.
        PowerAction::Sleep => run("rundll32.exe", &["powrprof.dll,SetSuspendState", "0,1,0"]),
    }
}

#[cfg(target_os = "macos")]
fn run_action(action: PowerAction) -> Result<(), String> {
    let script = match action {
        PowerAction::Shutdown => "tell app \"System Events\" to shut down",
        PowerAction::Restart => "tell app \"System Events\" to restart",
        PowerAction::Signout => "tell app \"System Events\" to log out",
        PowerAction::Sleep | PowerAction::Hibernate => return run("pmset", &["sleepnow"]),
        PowerAction::Lock => return run("pmset", &["displaysleepnow"]),
    };
    run("osascript", &["-e", script])
}

#[cfg(all(unix, not(target_os = "macos")))]
fn run_action(action: PowerAction) -> Result<(), String> {
    match action {
        PowerAction::Shutdown => run("systemctl", &["poweroff"]),
        PowerAction::Restart => run("systemctl", &["reboot"]),
        PowerAction::Sleep => run("systemctl", &["suspend"]),
        PowerAction::Hibernate => run("systemctl", &["hibernate"]),
        PowerAction::Lock => run("loginctl", &["lock-session"]),
        PowerAction::Signout => run("loginctl", &["terminate-user", &whoami()]),
    }
}

#[cfg(all(unix, not(target_os = "macos")))]
fn whoami() -> String {
    std::env::var("USER").unwrap_or_default()
}
