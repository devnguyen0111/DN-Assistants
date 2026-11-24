import { useEffect, useState } from "react";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BackupSection } from "@/components/settings/BackupSection";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { PageLayout } from "@/components/layout/PageLayout";
import { ModulesSection } from "@/components/settings/ModulesSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { emitChange } from "@/lib/db";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { useSettings } from "@/lib/settings-context";
import {
  ACCENT_OPTIONS,
  DEFAULT_SETTINGS,
  exportableSettings,
  type AccentColor,
  type Density,
} from "@/lib/settings";
import { PRIMARY_IANA, POPULAR_IANA, getZoneById, zoneLabel } from "@/lib/timezones";
import { clearClipboardHistory } from "@/lib/clipboard-history";
import {
  checkForAppUpdate,
  openGitHubReleasePage,
  showUpdateDialog,
  type UpdateInfo,
} from "@/lib/updates";
import { Loader2, ArrowUpCircle, ExternalLink } from "lucide-react";
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
import type { CalendarEvent } from "@/lib/events";
import type { Note } from "@/lib/notes";
import type { Todo } from "@/lib/todos";

export function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { mode, setMode } = useTheme();
  const { settings, updateSettings } = useSettings();
  const [autostart, setAutostart] = useState(false);
  const [autostartReady, setAutostartReady] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [pendingImportPath, setPendingImportPath] = useState<string | null>(null);

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

  const accentLabel = (a: AccentColor) => {
    const map: Record<AccentColor, string> = {
      teal: t.accentTeal,
      blue: t.accentBlue,
      violet: t.accentViolet,
      rose: t.accentRose,
      amber: t.accentAmber,
      emerald: t.accentEmerald,
    };
    return map[a] ?? a;
  };

  const checkUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus(null);
    setAvailableUpdate(null);
    try {
      const result = await checkForAppUpdate();
      if (result.status === "unavailable") {
        setUpdateStatus(t.unavailable);
        return;
      }
      if (result.status === "error") {
        setUpdateStatus(result.message);
        return;
      }
      if (result.status === "up-to-date") {
        setUpdateStatus(t.upToDate);
        return;
      }
      setAvailableUpdate(result.info);
      setUpdateStatus(`${t.updateAvailable}: v${result.info.version}`);
      showUpdateDialog();
    } catch (err) {
      setUpdateStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCheckingUpdate(false);
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
        settings: exportableSettings(settings),
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

  const pickImportFile = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const path = await open({
        multiple: false,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!path || typeof path !== "string") return;
      setPendingImportPath(path);
      setImportConfirmOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const runImport = async () => {
    if (!pendingImportPath) return;
    setImportConfirmOpen(false);
    try {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const { upsertEventFromImport } = await import("@/lib/events");
      const { upsertNote } = await import("@/lib/notes");
      const { upsertTodo } = await import("@/lib/todos");
      const raw = await readTextFile(pendingImportPath);
      const data = JSON.parse(raw) as {
        settings?: Partial<typeof settings>;
        events?: CalendarEvent[];
        notes?: Note[];
        todos?: Todo[];
      };

      if (data.settings) await updateSettings(data.settings);

      let events = 0;
      let notes = 0;
      let todos = 0;

      for (const event of data.events ?? []) {
        await upsertEventFromImport(event);
        events += 1;
      }
      for (const note of data.notes ?? []) {
        await upsertNote(note);
        notes += 1;
      }
      for (const todo of data.todos ?? []) {
        await upsertTodo(todo);
        todos += 1;
      }

      emitChange("events");
      emitChange("notes");
      emitChange("todos");

      toast.success(
        t.importResult
          .replace("{events}", String(events))
          .replace("{notes}", String(notes))
          .replace("{todos}", String(todos)),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setPendingImportPath(null);
    }
  };

  return (
    <PageLayout route="settings" description={null}>
      <div className="@container">
        <div className="grid gap-6 @[1000px]:grid-cols-[176px_minmax(0,760px)]">
          <SettingsNav
            sections={[
              { id: "settings-appearance", label: t.settingsAppearance },
              { id: "settings-modules", label: t.settingsModules },
              { id: "settings-general", label: t.settingsGeneral },
              { id: "settings-desktop", label: t.settingsDesktop },
              { id: "settings-shortcuts", label: t.settingsHotkeys },
              { id: "settings-reminders", label: t.settingsReminders },
              { id: "settings-weather", label: t.settingsWeather },
              { id: "settings-privacy", label: t.settingsPrivacy },
              { id: "settings-backup", label: t.backupSectionTitle },
              { id: "settings-updates", label: t.settingsUpdates },
            ]}
          />
          <div className="min-w-0 space-y-6">
            <Card id="settings-appearance" className="scroll-mt-4">
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
                          {accentLabel(a)}
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

            <div id="settings-modules" className="scroll-mt-4">
              <ModulesSection />
            </div>

            <Card id="settings-general" className="scroll-mt-4">
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

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="morning-brief">{t.morningBrief}</Label>
                    <p className="text-xs text-muted-foreground">{t.morningBriefHint}</p>
                  </div>
                  <Switch
                    id="morning-brief"
                    checked={settings.morningBriefEnabled}
                    onCheckedChange={(v) => void updateSettings({ morningBriefEnabled: v })}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="hibp-check">{t.vaultHibpCheck}</Label>
                    <p className="text-xs text-muted-foreground">{t.vaultHibpHint}</p>
                  </div>
                  <Switch
                    id="hibp-check"
                    checked={settings.hibpCheckEnabled}
                    onCheckedChange={(v) => void updateSettings({ hibpCheckEnabled: v })}
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void updateSettings({ onboardingDone: false })}
                >
                  {t.aboutReplayOnboarding}
                </Button>
              </CardContent>
            </Card>

            <Card id="settings-desktop" className="scroll-mt-4">
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
                    <Label htmlFor="always-on-top">{t.alwaysOnTop}</Label>
                    <p className="text-xs text-muted-foreground">{t.alwaysOnTopHint}</p>
                  </div>
                  <Switch
                    id="always-on-top"
                    checked={settings.alwaysOnTop}
                    onCheckedChange={(v) => void updateSettings({ alwaysOnTop: v })}
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

            <Card id="settings-shortcuts" className="scroll-mt-4">
              <CardHeader>
                <CardTitle>{t.settingsHotkeys}</CardTitle>
                <CardDescription>{t.settingsHotkeysDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="hotkey-toggle">{t.hotkeyToggleLabel}</Label>
                  <Input
                    id="hotkey-toggle"
                    value={settings.hotkeyToggleWindow}
                    onChange={(e) => void updateSettings({ hotkeyToggleWindow: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hotkey-clipboard">{t.hotkeyClipboardLabel}</Label>
                  <Input
                    id="hotkey-clipboard"
                    value={settings.hotkeyClipboard}
                    onChange={(e) => void updateSettings({ hotkeyClipboard: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hotkey-scratch">{t.hotkeyScratchpadLabel}</Label>
                  <Input
                    id="hotkey-scratch"
                    value={settings.hotkeyScratchpad}
                    onChange={(e) => void updateSettings({ hotkeyScratchpad: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hotkey-launcher">{t.hotkeyLauncherLabel}</Label>
                  <p className="text-xs text-muted-foreground">{t.hotkeyLauncherHint}</p>
                  <Input
                    id="hotkey-launcher"
                    value={settings.hotkeyLauncher}
                    onChange={(e) => void updateSettings({ hotkeyLauncher: e.target.value })}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void updateSettings({
                      hotkeyToggleWindow: DEFAULT_SETTINGS.hotkeyToggleWindow,
                      hotkeyClipboard: DEFAULT_SETTINGS.hotkeyClipboard,
                      hotkeyScratchpad: DEFAULT_SETTINGS.hotkeyScratchpad,
                      hotkeyLauncher: DEFAULT_SETTINGS.hotkeyLauncher,
                    })
                  }
                >
                  {t.hotkeyReset}
                </Button>
              </CardContent>
            </Card>

            <Card id="settings-reminders" className="scroll-mt-4">
              <CardHeader>
                <CardTitle>{t.settingsReminders}</CardTitle>
                <CardDescription>{t.settingsRemindersDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
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

                <div className="space-y-1.5">
                  <Label htmlFor="vault-autolock">{t.vaultAutoLock}</Label>
                  <p className="text-xs text-muted-foreground">{t.vaultAutoLockHint}</p>
                  <Input
                    id="vault-autolock"
                    type="number"
                    min={0}
                    className="w-32"
                    value={settings.vaultAutoLockMinutes}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n) || n < 0) return;
                      void updateSettings({ vaultAutoLockMinutes: Math.floor(n) });
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="vault-clip-clear">{t.vaultClipboardClear}</Label>
                  <p className="text-xs text-muted-foreground">{t.vaultClipboardClearHint}</p>
                  <Input
                    id="vault-clip-clear"
                    type="number"
                    min={0}
                    max={600}
                    className="w-32"
                    value={settings.vaultClipboardClearSeconds}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n) || n < 0) return;
                      void updateSettings({
                        vaultClipboardClearSeconds: Math.min(600, Math.floor(n)),
                      });
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card id="settings-weather" className="scroll-mt-4">
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

            <Card id="settings-privacy" className="scroll-mt-4">
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
                  <Button variant="outline" size="sm" onClick={() => void pickImportFile()}>
                    {t.importData}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void import("@/lib/diagnostics")
                        .then(({ exportDiagnostics }) => exportDiagnostics())
                        .then(() => toast.success(t.diagnosticsSuccess))
                        .catch((e) => toast.error(String(e)));
                    }}
                  >
                    {t.diagnosticsExport}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div id="settings-backup" className="scroll-mt-4">
              <BackupSection />
            </div>

            <Card id="settings-updates" className="scroll-mt-4">
              <CardHeader>
                <CardTitle>{t.settingsUpdates}</CardTitle>
                <CardDescription>{t.settingsUpdatesDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{t.settingsAutoCheckUpdates}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t.settingsAutoCheckUpdatesDesc}
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoCheckUpdates}
                    onCheckedChange={(v) => void updateSettings({ autoCheckUpdates: v })}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => void checkUpdates()}
                    disabled={isCheckingUpdate}
                    className="gap-1.5"
                  >
                    {isCheckingUpdate ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {t.checkingForUpdates}
                      </>
                    ) : (
                      t.checkForUpdates
                    )}
                  </Button>

                  {availableUpdate && (
                    <Button
                      variant="outline"
                      onClick={() => showUpdateDialog()}
                      className="gap-1.5"
                    >
                      <ArrowUpCircle className="size-4 text-primary" />
                      {t.updateViewDetails} (v{availableUpdate.version})
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => void openGitHubReleasePage()}
                    className="gap-1.5"
                  >
                    <ExternalLink className="size-4" />
                    {t.updateViaBrowser}
                  </Button>
                </div>

                {updateStatus && <p className="text-sm text-muted-foreground">{updateStatus}</p>}
              </CardContent>
            </Card>

            <AlertDialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.importData}</AlertDialogTitle>
                  <AlertDialogDescription>{t.importConfirm}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => {
                      setPendingImportPath(null);
                    }}
                  >
                    {t.cancel}
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={() => void runImport()}>
                    {t.importData}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
