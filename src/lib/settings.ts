import { windowId } from "@/lib/db";
import { normalizeRoute, type AppRoute } from "@/lib/routing";

export type AccentColor = "teal" | "blue" | "violet" | "rose" | "amber" | "emerald";

export type Density = "comfortable" | "compact";

export type AppSettings = {
  closeToTray: boolean;
  primaryTimezone: string;
  soundMuted: boolean;
  weatherCity: string;
  weatherLat: number;
  weatherLon: number;
  temperatureUnit: "celsius" | "fahrenheit";
  sidebarCollapsed: boolean;
  accent: AccentColor;
  density: Density;
  clipboardHistoryEnabled: boolean;
  focusWorkMinutes: number;
  focusBreakMinutes: number;
  focusLongBreakMinutes: number;
  onboardingDone: boolean;
  whatsNewSeenVersion: string;
  favoriteRoutes: AppRoute[];
  /** Modules the user chose to hide from the sidebar (still reachable via Ctrl+K). */
  hiddenRoutes: AppRoute[];
  alwaysOnTop: boolean;
  scratchpad: string;
  vaultAutoLockMinutes: number;
  /** Seconds before a copied vault secret is wiped from the clipboard (0 = never). */
  vaultClipboardClearSeconds: number;
  hotkeyToggleWindow: string;
  hotkeyClipboard: string;
  hotkeyScratchpad: string;
  /** Opens the command palette from anywhere (shows the window if hidden). */
  hotkeyLauncher: string;
  clipboardTemplates: string[];
  lastRoute: AppRoute;
  morningBriefEnabled: boolean;
  hibpCheckEnabled: boolean;
  autoCheckUpdates: boolean;
  skippedUpdateVersion: string;
  /** "Remind me later": no automatic update prompt before this epoch ms. */
  updateSnoozedUntil: number;
  /** Scheduled encrypted backups (device-only, never exported in backups). */
  autoBackupEnabled: boolean;
  autoBackupDir: string;
  /** Stored locally like the rest of the app data; protects the file once copied elsewhere. */
  autoBackupPassword: string;
  autoBackupIntervalHours: number;
  autoBackupKeep: number;
  lastAutoBackupAt: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  closeToTray: true,
  primaryTimezone: "Asia/Ho_Chi_Minh",
  soundMuted: false,
  weatherCity: "Ho Chi Minh City",
  weatherLat: 10.8231,
  weatherLon: 106.6297,
  temperatureUnit: "celsius",
  sidebarCollapsed: false,
  accent: "teal",
  density: "comfortable",
  clipboardHistoryEnabled: false,
  focusWorkMinutes: 25,
  focusBreakMinutes: 5,
  focusLongBreakMinutes: 15,
  onboardingDone: false,
  whatsNewSeenVersion: "",
  favoriteRoutes: [],
  hiddenRoutes: [],
  alwaysOnTop: false,
  scratchpad: "",
  vaultAutoLockMinutes: 15,
  vaultClipboardClearSeconds: 30,
  hotkeyToggleWindow: "CommandOrControl+Shift+Space",
  hotkeyClipboard: "CommandOrControl+Shift+V",
  hotkeyScratchpad: "CommandOrControl+Shift+N",
  hotkeyLauncher: "CommandOrControl+Alt+K",
  clipboardTemplates: [],
  lastRoute: "home",
  morningBriefEnabled: false,
  hibpCheckEnabled: false,
  autoCheckUpdates: true,
  skippedUpdateVersion: "",
  updateSnoozedUntil: 0,
  autoBackupEnabled: false,
  autoBackupDir: "",
  autoBackupPassword: "",
  autoBackupIntervalHours: 24,
  autoBackupKeep: 7,
  lastAutoBackupAt: "",
};

/** Machine-specific or secret settings: never written to exports, backups or diagnostics. */
export const DEVICE_SETTINGS = [
  "autoBackupEnabled",
  "autoBackupDir",
  "autoBackupPassword",
  "autoBackupIntervalHours",
  "autoBackupKeep",
  "lastAutoBackupAt",
] as const satisfies readonly (keyof AppSettings)[];

/** Copy of settings that is safe to put in a file the user may share or sync. */
export function exportableSettings(settings: AppSettings): Partial<AppSettings> {
  const copy: Partial<AppSettings> = { ...settings };
  for (const key of DEVICE_SETTINGS) delete copy[key];
  return copy;
}

export const ACCENT_OPTIONS: AccentColor[] = ["teal", "blue", "violet", "rose", "amber", "emerald"];

/** Single source of truth: package.json (injected by Vite). */
export const APP_VERSION = __APP_VERSION__;

const LS_KEY = "dn-assistant-settings";
const STORE_FILE = "settings.json";

type StoreLike = {
  get: <T>(key: string) => Promise<T | undefined>;
  set: (key: string, value: unknown) => Promise<void>;
  save: () => Promise<void>;
};

let storePromise: Promise<StoreLike | null> | null = null;

async function getStore(): Promise<StoreLike | null> {
  if (!storePromise) {
    storePromise = (async () => {
      try {
        const { Store } = await import("@tauri-apps/plugin-store");
        return await Store.load(STORE_FILE);
      } catch {
        return null;
      }
    })();
  }
  return storePromise;
}

function readLocal(): Partial<AppSettings> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<AppSettings>;
  } catch {
    return {};
  }
}

function writeLocal(settings: AppSettings) {
  localStorage.setItem(LS_KEY, JSON.stringify(settings));
}

function sanitize(partial: Partial<AppSettings>): Partial<AppSettings> {
  const next = { ...partial };
  // Routes may come from older versions (e.g. "tiktok", "currency"); map or drop them.
  const routeList = (list: unknown): AppRoute[] | undefined =>
    Array.isArray(list)
      ? [...new Set(list.map((r) => normalizeRoute(String(r))).filter((r): r is AppRoute => !!r))]
      : undefined;
  if (next.favoriteRoutes) {
    next.favoriteRoutes = (routeList(next.favoriteRoutes) ?? []).filter(
      (r) => r !== "settings" && r !== "about",
    );
  }
  if (next.hiddenRoutes) {
    next.hiddenRoutes = (routeList(next.hiddenRoutes) ?? []).filter(
      (r) => r !== "home" && r !== "settings" && r !== "about",
    );
  }
  if (next.lastRoute !== undefined) next.lastRoute = normalizeRoute(next.lastRoute) ?? "home";
  if (next.clipboardTemplates) {
    next.clipboardTemplates = next.clipboardTemplates.filter((t) => t.trim().length > 0);
  }
  return next;
}

export function loadSettingsSync(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...sanitize(readLocal()) };
}

export async function loadSettings(): Promise<AppSettings> {
  const local = loadSettingsSync();
  try {
    const store = await getStore();
    if (!store) return local;
    const stored = await store.get<Partial<AppSettings>>("app");
    if (!stored) return local;
    const merged = { ...DEFAULT_SETTINGS, ...local, ...sanitize(stored) };
    writeLocal(merged);
    return merged;
  } catch {
    return local;
  }
}

async function applyAlwaysOnTop(enabled: boolean) {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().setAlwaysOnTop(enabled);
  } catch {
    // ignore outside Tauri
  }
}

let storeSaveTimer: number | null = null;
let pendingStoreSettings: AppSettings | null = null;

async function flushStoreSave() {
  if (storeSaveTimer != null) {
    window.clearTimeout(storeSaveTimer);
    storeSaveTimer = null;
  }
  if (!pendingStoreSettings) return;
  const toSave = pendingStoreSettings;
  pendingStoreSettings = null;
  try {
    const store = await getStore();
    if (store) {
      await store.set("app", toSave);
      await store.save();
    }
  } catch {
    // browser / plugin unavailable
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    void flushStoreSave();
  });
}

/** Write any debounced settings now (e.g. before the updater terminates the process). */
export async function flushPendingSettings(): Promise<void> {
  await flushStoreSave();
}

function queueStoreSave(settings: AppSettings) {
  pendingStoreSettings = settings;
  if (storeSaveTimer != null) {
    window.clearTimeout(storeSaveTimer);
  }
  storeSaveTimer = window.setTimeout(() => {
    void flushStoreSave();
  }, 350);
}

export async function saveSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const next = { ...loadSettingsSync(), ...sanitize(partial) };
  writeLocal(next);
  queueStoreSave(next);
  if (partial.closeToTray !== undefined) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("set_close_to_tray", { enabled: next.closeToTray });
    } catch {
      // ignore outside Tauri
    }
  }
  if (partial.clipboardHistoryEnabled !== undefined) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("set_clipboard_watching", { enabled: next.clipboardHistoryEnabled });
    } catch {
      // ignore outside Tauri
    }
  }
  if (partial.alwaysOnTop !== undefined && !isWidgetWindow()) {
    await applyAlwaysOnTop(next.alwaysOnTop);
  }
  window.dispatchEvent(new CustomEvent("dn-settings-changed", { detail: next }));
  void broadcastSettings(next);
  return next;
}

const SETTINGS_SYNC_EVENT = "dn-settings-sync";
type SettingsSyncPayload = { settings: AppSettings; from: string };

async function broadcastSettings(settings: AppSettings) {
  try {
    const { emit } = await import("@tauri-apps/api/event");
    await emit(SETTINGS_SYNC_EVENT, { settings, from: windowId() } satisfies SettingsSyncPayload);
  } catch {
    // browser preview
  }
}

let settingsSyncStarted = false;

/**
 * Keep this window's settings in step with changes saved by other windows (e.g. the sticky
 * widget editing the scratchpad) so a later save here does not overwrite them with stale values.
 */
export async function startSettingsSync(): Promise<void> {
  if (settingsSyncStarted) return;
  settingsSyncStarted = true;
  try {
    const { listen } = await import("@tauri-apps/api/event");
    await listen<SettingsSyncPayload>(SETTINGS_SYNC_EVENT, (e) => {
      if (e.payload.from === windowId()) return;
      writeLocal(e.payload.settings);
      window.dispatchEvent(new CustomEvent("dn-settings-changed", { detail: e.payload.settings }));
    });
  } catch {
    settingsSyncStarted = false;
  }
}

export function subscribeSettings(cb: (s: AppSettings) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<AppSettings>).detail;
    if (detail) cb(detail);
  };
  window.addEventListener("dn-settings-changed", handler);
  return () => window.removeEventListener("dn-settings-changed", handler);
}

/** Expose store helper for currency cache and other modules. */
export async function getAppStore(): Promise<StoreLike | null> {
  return getStore();
}

/** Apply window flags that must run after Tauri is ready. */
export async function applyDesktopWindowPrefs(settings: AppSettings) {
  // Floating widgets manage their own always-on-top flag; only the main window follows settings.
  if (isWidgetWindow()) return;
  await applyAlwaysOnTop(settings.alwaysOnTop);
}

function isWidgetWindow(): boolean {
  return /^#\/?widget\//i.test(window.location.hash);
}
