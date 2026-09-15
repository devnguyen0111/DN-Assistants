import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyDesktopWindowPrefs,
  DEFAULT_SETTINGS,
  loadSettings,
  loadSettingsSync,
  saveSettings,
  subscribeSettings,
  type AppSettings,
} from "@/lib/settings";
import { setSoundMuted } from "@/lib/notify";

type SettingsContextValue = {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  ready: boolean;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettingsSync);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadSettings();
      if (cancelled) return;
      setSettings(loaded);
      setSoundMuted(loaded.soundMuted);
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("set_close_to_tray", { enabled: loaded.closeToTray });
        await invoke("set_clipboard_watching", {
          enabled: loaded.clipboardHistoryEnabled,
        });
      } catch {
        // browser preview
      }
      await applyDesktopWindowPrefs(loaded);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => subscribeSettings(setSettings), []);

  useEffect(() => {
    document.documentElement.dataset.accent = settings.accent;
    document.documentElement.dataset.density = settings.density;
  }, [settings.accent, settings.density]);

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    if (partial.soundMuted !== undefined) {
      setSoundMuted(partial.soundMuted);
    }
    const next = await saveSettings(partial);
    setSettings(next);
  }, []);

  const value = useMemo(
    () => ({ settings, updateSettings, ready }),
    [settings, updateSettings, ready],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

export { DEFAULT_SETTINGS };
