import { useEffect, useState } from "react";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { useSettings } from "@/lib/settings-context";
import { ACCENT_OPTIONS, type AccentColor, type Density } from "@/lib/settings";
import { PRIMARY_IANA, POPULAR_IANA, getZoneById, zoneLabel } from "@/lib/timezones";
import { clearClipboardHistory } from "@/lib/clipboard-history";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { mode, setMode } = useTheme();
  const { settings, updateSettings } = useSettings();
  const [autostart, setAutostart] = useState(false);
  const [autostartReady, setAutostartReady] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const enabled = await isEnabled();
        if (!cancelled) {
          setAutostart(enabled);
          setAutostartReady(true);
        }
      } catch {
        if (!cancelled) setAutostartReady(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const timezoneOptions = Array.from(new Set([PRIMARY_IANA, ...POPULAR_IANA]));

  const checkUpdates = async () => {
    setUpdateStatus(null);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (!update) {
        setUpdateStatus(t.upToDate);
        return;
      }
      setUpdateStatus(`${t.updateAvailable}: ${update.version}`);
      await update.downloadAndInstall();
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (err) {
      setUpdateStatus(err instanceof Error ? err.message : String(err));
    }
  };

  const exportData = async () => {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const { listEvents } = await import("@/lib/events");
      const { listNotes } = await import("@/lib/notes");
      const { listTodos } = await import("@/lib/todos");
      const path = await save({
        defaultPath: "dn-assistant-export.json",
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!path) return;
      const payload = {
        exportedAt: new Date().toISOString(),
        settings,
        events: await listEvents(),
        notes: await listNotes(),
        todos: await listTodos(),
      };
      await writeTextFile(path, JSON.stringify(payload, null, 2));
      toast.success(t.exportSuccess);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const importData = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await open({
        multiple: false,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!path || typeof path !== "string") return;
      if (!window.confirm(t.importConfirm)) return;
      const raw = await readTextFile(path);
      const data = JSON.parse(raw) as {
        settings?: Partial<typeof settings>;
        events?: unknown[];
        notes?: unknown[];
        todos?: unknown[];
      };
      if (data.settings) await updateSettings(data.settings);
      toast.success(t.importSuccess);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.settingsAppearance}</CardTitle>
          <CardDescription>{t.settingsAppearanceDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>{t.theme}</Label>
              <p className="text-xs text-muted-foreground">{t.settingsThemeHint}</p>
            </div>
            <Select value={mode} onValueChange={(v) => setMode(v as ThemeMode)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">{t.themeDark}</SelectItem>
                <SelectItem value="light">{t.themeLight}</SelectItem>
                <SelectItem value="system">{t.themeSystem}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>{t.accentColor}</Label>
            </div>
            <Select
              value={settings.accent}
              onValueChange={(v) => void updateSettings({ accent: v as AccentColor })}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCENT_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>{t.density}</Label>
            </div>
            <Select
              value={settings.density}
              onValueChange={(v) => void updateSettings({ density: v as Density })}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">{t.densityComfortable}</SelectItem>
                <SelectItem value="compact">{t.densityCompact}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settingsGeneral}</CardTitle>
          <CardDescription>{t.settingsGeneralDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>{t.language}</Label>
              <p className="text-xs text-muted-foreground">{t.settingsLanguageHint}</p>
            </div>
            <Select value={locale} onValueChange={(v) => setLocale(v as "vi" | "en")}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vi">Tiếng Việt</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>{t.primaryTimezone}</Label>
              <p className="text-xs text-muted-foreground">{t.settingsTimezoneHint}</p>
            </div>
            <Select
              value={settings.primaryTimezone}
              onValueChange={(v) => void updateSettings({ primaryTimezone: v })}
            >
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezoneOptions.map((id) => {
                  const zone = getZoneById(id);
                  return (
                    <SelectItem key={id} value={id}>
                      {zone ? zoneLabel(zone, locale) : id}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settingsDesktop}</CardTitle>
          <CardDescription>{t.settingsDesktopDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="close-to-tray">{t.closeToTray}</Label>
              <p className="text-xs text-muted-foreground">{t.closeToTrayHint}</p>
            </div>
            <Switch
              id="close-to-tray"
              checked={settings.closeToTray}
              onCheckedChange={(v) => void updateSettings({ closeToTray: v })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="autostart">{t.autostart}</Label>
              <p className="text-xs text-muted-foreground">{t.autostartHint}</p>
            </div>
            <Switch
              id="autostart"
              disabled={!autostartReady}
              checked={autostart}
              onCheckedChange={(v) => {
                void (async () => {
                  try {
                    if (v) await enable();
                    else await disable();
                    setAutostart(v);
                  } catch {
                    toast.error(t.autostartFailed);
                  }
                })();
              }}
            />
          </div>

          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {t.globalHotkeyHint}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settingsReminders}</CardTitle>
          <CardDescription>{t.settingsRemindersDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="sound-muted">{t.muteReminders}</Label>
              <p className="text-xs text-muted-foreground">{t.muteRemindersHint}</p>
            </div>
            <Switch
              id="sound-muted"
              checked={settings.soundMuted}
              onCheckedChange={(v) => void updateSettings({ soundMuted: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settingsWeather}</CardTitle>
          <CardDescription>{t.settingsWeatherDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>{t.temperatureUnit}</Label>
              <p className="text-xs text-muted-foreground">{t.temperatureUnitHint}</p>
            </div>
            <Select
              value={settings.temperatureUnit}
              onValueChange={(v) =>
                void updateSettings({ temperatureUnit: v as "celsius" | "fahrenheit" })
              }
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="celsius">°C</SelectItem>
                <SelectItem value="fahrenheit">°F</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settingsPrivacy}</CardTitle>
          <CardDescription>{t.settingsPrivacyDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="clipboard-hist">{t.clipboardEnabled}</Label>
              <p className="text-xs text-muted-foreground">{t.clipboardEnabledHint}</p>
            </div>
            <Switch
              id="clipboard-hist"
              checked={settings.clipboardHistoryEnabled}
              onCheckedChange={(v) => void updateSettings({ clipboardHistoryEnabled: v })}
            />
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                {t.clipboardClear}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.clipboardClear}</AlertDialogTitle>
                <AlertDialogDescription>{t.clipboardClearConfirm}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    void clearClipboardHistory()
                      .then(() => toast.success(t.deleted))
                      .catch((e) => toast.error(String(e)));
                  }}
                >
                  {t.delete}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void exportData()}>
              {t.exportData}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void importData()}>
              {t.importData}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settingsUpdates}</CardTitle>
          <CardDescription>{t.settingsUpdatesDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={() => void checkUpdates()}>{t.checkForUpdates}</Button>
          {updateStatus && (
            <p className="text-sm text-muted-foreground">{updateStatus}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
