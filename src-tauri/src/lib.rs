mod clipboard_watch;
mod monitor;
mod network_cmds;

use clipboard_watch::{is_clipboard_watching, set_clipboard_watching, start_clipboard_watcher};
use monitor::{get_system_stats, kill_process, set_metrics_paused, start_metrics_emitter, Monitor};
use network_cmds::{check_port, dns_lookup, get_public_ip, ping_host};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use tauri_plugin_sql::{Migration, MigrationKind};

pub struct AppPrefs {
    pub close_to_tray: AtomicBool,
}

impl Default for AppPrefs {
    fn default() -> Self {
        Self {
            close_to_tray: AtomicBool::new(true),
        }
    }
}

#[tauri::command]
fn set_close_to_tray(prefs: tauri::State<'_, AppPrefs>, enabled: bool) {
    prefs.close_to_tray.store(enabled, Ordering::Relaxed);
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn hide_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_events_table",
            sql: "CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            note TEXT,
            start_at INTEGER NOT NULL,
            end_at INTEGER,
            all_day INTEGER NOT NULL DEFAULT 0,
            color TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_remind_minutes",
            sql: "ALTER TABLE events ADD COLUMN remind_minutes INTEGER NOT NULL DEFAULT 0;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_notes_and_todos_tables",
            sql: "CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL DEFAULT '',
            body TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS todos (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            done INTEGER NOT NULL DEFAULT 0,
            due_at TEXT,
            priority TEXT NOT NULL DEFAULT 'medium',
            event_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_clipboard_items_table",
            sql: "CREATE TABLE IF NOT EXISTS clipboard_items (
            id TEXT PRIMARY KEY NOT NULL,
            content TEXT NOT NULL,
            hash TEXT NOT NULL,
            pinned INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_clipboard_hash ON clipboard_items(hash);
        CREATE INDEX IF NOT EXISTS idx_clipboard_created ON clipboard_items(created_at);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create_focus_sessions_table",
            sql: "CREATE TABLE IF NOT EXISTS focus_sessions (
            id TEXT PRIMARY KEY NOT NULL,
            kind TEXT NOT NULL,
            minutes INTEGER NOT NULL,
            completed_at TEXT NOT NULL
        );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "clipboard_items_image_columns",
            sql: "ALTER TABLE clipboard_items ADD COLUMN kind TEXT NOT NULL DEFAULT 'text';
        ALTER TABLE clipboard_items ADD COLUMN mime TEXT;
        ALTER TABLE clipboard_items ADD COLUMN width INTEGER;
        ALTER TABLE clipboard_items ADD COLUMN height INTEGER;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "create_vault_entries_table",
            sql: "CREATE TABLE IF NOT EXISTS vault_entries (
            id TEXT PRIMARY KEY NOT NULL,
            nonce TEXT NOT NULL,
            ciphertext TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "notes_tags_pinned_and_repeat_columns",
            sql: "ALTER TABLE notes ADD COLUMN tags TEXT NOT NULL DEFAULT '';
        ALTER TABLE notes ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE events ADD COLUMN repeat TEXT NOT NULL DEFAULT 'none';
        ALTER TABLE events ADD COLUMN repeat_until INTEGER;
        ALTER TABLE todos ADD COLUMN repeat TEXT NOT NULL DEFAULT 'none';
        ALTER TABLE todos ADD COLUMN repeat_until TEXT;",
            kind: MigrationKind::Up,
        },
    ];

    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }));
    }

    builder
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:dn-assistant.db", migrations)
                .build(),
        )
        .manage(Mutex::new(Monitor::new()))
        .manage(AppPrefs::default())
        .invoke_handler(tauri::generate_handler![
            get_system_stats,
            kill_process,
            set_close_to_tray,
            get_public_ip,
            ping_host,
            check_port,
            dns_lookup,
            set_clipboard_watching,
            is_clipboard_watching,
            set_metrics_paused,
        ])
        .setup(|app| {
            start_metrics_emitter(app.handle().clone());
            start_clipboard_watcher(app.handle().clone());

            #[cfg(desktop)]
            {
                init_desktop_shell(app);
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let close_to_tray = window
                    .try_state::<AppPrefs>()
                    .map(|p| p.close_to_tray.load(Ordering::Relaxed))
                    .unwrap_or(true);
                if close_to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .unwrap_or_else(|err| {
            eprintln!("DN Assistant failed to start: {err}");
        });
}

/// Desktop plugins/tray must not abort the process. 0.1.1 used `?` + `panic=abort`,
/// which Windows Event Viewer reports as 0xc0000409 when a plugin or tray init fails.
#[cfg(desktop)]
fn init_desktop_shell(app: &mut tauri::App) {
    let handle = app.handle().clone();
    if let Err(err) = handle.plugin(tauri_plugin_process::init()) {
        eprintln!("process plugin: {err}");
    }
    if let Err(err) = handle.plugin(tauri_plugin_updater::Builder::new().build()) {
        eprintln!("updater plugin: {err}");
    }
    if let Err(err) = handle.plugin(tauri_plugin_window_state::Builder::default().build()) {
        eprintln!("window-state plugin: {err}");
    }
    if let Err(err) = handle.plugin(tauri_plugin_store::Builder::default().build()) {
        eprintln!("store plugin: {err}");
    }
    if let Err(err) = handle.plugin(tauri_plugin_autostart::init(
        tauri_plugin_autostart::MacosLauncher::LaunchAgent,
        None,
    )) {
        eprintln!("autostart plugin: {err}");
    }
    // Shortcuts are registered from the frontend (syncGlobalHotkeys).
    if let Err(err) = handle.plugin(tauri_plugin_global_shortcut::Builder::new().build()) {
        eprintln!("global-shortcut plugin: {err}");
    }

    let Ok(show_i) = MenuItem::with_id(app, "show", "Show", true, None::<&str>) else {
        return;
    };
    let Ok(hide_i) = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>) else {
        return;
    };
    let Ok(quit_i) = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>) else {
        return;
    };
    let Ok(menu) = Menu::with_items(app, &[&show_i, &hide_i, &quit_i]) else {
        return;
    };

    let mut tray = TrayIconBuilder::with_id("main-tray")
        .menu(&menu)
        .tooltip("DN Assistant")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main_window(app),
            "hide" => hide_main_window(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }

    if let Err(err) = tray.build(app) {
        eprintln!("tray icon: {err}");
    }
}
