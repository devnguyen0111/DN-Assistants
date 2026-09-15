import type { AppRoute } from "@/lib/routing";

export type AccentColor =
  | "teal"
  | "blue"
  | "violet"
  | "rose"
  | "amber"
  | "emerald";

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
  alwaysOnTop: boolean;
  scratchpad: string;
  vaultAutoLockMinutes: number;
  hotkeyToggleWindow: string;
  hotkeyClipboard: string;
  hotkeyScratchpad: string;
  clipboardTemplates: string[];
  lastRoute: AppRoute;
  morningBriefEnabled: boolean;
  hibpCheckEnabled: boolean;
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
  alwaysOnTop: false,
  scratchpad: "",
  vaultAutoLockMinutes: 15,
  hotkeyToggleWindow: "CommandOrControl+Shift+Space",
  hotkeyClipboard: "CommandOrControl+Shift+V",
  hotkeyScratchpad: "CommandOrControl+Shift+N",
  clipboardTemplates: [],
  lastRoute: "home",
  morningBriefEnabled: false,
  hibpCheckEnabled: false,
};

export const ACCENT_OPTIONS: AccentColor[] = [
  "teal",
  "blue",
  "violet",
  "rose",
  "amber",
  "emerald",
];

export const APP_VERSION = "0.2.0";

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
  if (next.favoriteRoutes) {
    next.favoriteRoutes = next.favoriteRoutes.filter(Boolean);
  }
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

export async function saveSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const next = { ...loadSettingsSync(), ...sanitize(partial) };
  writeLocal(next);
  try {
    const store = await getStore();
    if (store) {
      await store.set("app", next);
      await store.save();
    }
  } catch {
    // browser / plugin unavailable
  }
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
  if (partial.alwaysOnTop !== undefined) {
    await applyAlwaysOnTop(next.alwaysOnTop);
  }
  window.dispatchEvent(new CustomEvent("dn-settings-changed", { detail: next }));
  return next;
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
  await applyAlwaysOnTop(settings.alwaysOnTop);
}
