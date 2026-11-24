import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppShell } from "@/components/layout/AppShell";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { OnboardingDialog } from "@/components/layout/OnboardingDialog";
import { ShortcutsDialog } from "@/components/layout/ShortcutsDialog";
import { WhatsNewDialog } from "@/components/layout/WhatsNewDialog";
import { UpdateDialog } from "@/components/layout/UpdateDialog";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEventReminders } from "@/hooks/useEventReminders";
import { useDesktopHotkeys } from "@/hooks/useDesktopHotkeys";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { useHabitReminders } from "@/hooks/useHabitReminders";
import { useVaultAutoLock } from "@/hooks/useVaultAutoLock";
import { useMorningBrief } from "@/hooks/useMorningBrief";
import { useClipboardWatcher } from "@/hooks/useClipboardWatcher";
import { useAutoBackup } from "@/hooks/useAutoBackup";
import { usePowerWarnings } from "@/hooks/usePowerWarnings";
import { useTodoReminders } from "@/hooks/useTodoReminders";
import { useAutoUpdates } from "@/hooks/useAutoUpdates";
import { useHashRoute } from "@/hooks/useHashRoute";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { parseWidgetKind } from "@/lib/routing";
import { SettingsProvider, useSettings } from "@/lib/settings-context";
import { ThemeProvider } from "@/lib/theme";
import { HomePage } from "@/pages/HomePage";

// Lazy load secondary routes for instant startup and optimal memory
const AboutPage = lazy(() => import("@/pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const CalculatorPage = lazy(() =>
  import("@/pages/CalculatorPage").then((m) => ({ default: m.CalculatorPage })),
);
const CalendarPage = lazy(() =>
  import("@/pages/CalendarPage").then((m) => ({ default: m.CalendarPage })),
);
const ClipboardPage = lazy(() =>
  import("@/pages/ClipboardPage").then((m) => ({ default: m.ClipboardPage })),
);
const ClockPage = lazy(() => import("@/pages/ClockPage").then((m) => ({ default: m.ClockPage })));
const DevToolsPage = lazy(() =>
  import("@/pages/DevToolsPage").then((m) => ({ default: m.DevToolsPage })),
);
const FocusPage = lazy(() => import("@/pages/FocusPage").then((m) => ({ default: m.FocusPage })));
const HabitsPage = lazy(() =>
  import("@/pages/HabitsPage").then((m) => ({ default: m.HabitsPage })),
);
const SnippetsPage = lazy(() =>
  import("@/pages/SnippetsPage").then((m) => ({ default: m.SnippetsPage })),
);
const ColorsPage = lazy(() =>
  import("@/pages/ColorsPage").then((m) => ({ default: m.ColorsPage })),
);
const FileToolsPage = lazy(() =>
  import("@/pages/FileToolsPage").then((m) => ({ default: m.FileToolsPage })),
);
const NetworkPage = lazy(() =>
  import("@/pages/NetworkPage").then((m) => ({ default: m.NetworkPage })),
);
const NotesPage = lazy(() => import("@/pages/NotesPage").then((m) => ({ default: m.NotesPage })));
const PasswordsPage = lazy(() =>
  import("@/pages/PasswordsPage").then((m) => ({ default: m.PasswordsPage })),
);
const SettingsPage = lazy(() =>
  import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const SystemPage = lazy(() =>
  import("@/pages/SystemPage").then((m) => ({ default: m.SystemPage })),
);
const TodoPage = lazy(() => import("@/pages/TodoPage").then((m) => ({ default: m.TodoPage })));
const WeatherPage = lazy(() =>
  import("@/pages/WeatherPage").then((m) => ({ default: m.WeatherPage })),
);
const WidgetPage = lazy(() =>
  import("@/pages/WidgetPage").then((m) => ({ default: m.WidgetPage })),
);

function MainApp() {
  const { route, setRoute } = useHashRoute();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { settings, updateSettings, ready } = useSettings();
  const { t } = useI18n();

  useEventReminders();
  useHabitReminders();
  useVaultAutoLock();
  useMorningBrief();
  useClipboardWatcher();
  useAutoBackup();
  usePowerWarnings();
  useTodoReminders();
  useAutoUpdates();

  // Launcher hotkey: palette opened over a previously hidden window. If the user closes it
  // without going anywhere, put the window back where it was.
  const launcherSession = useRef<{ hideOnClose: boolean; navigated: boolean } | null>(null);

  const onNavigate = useCallback(
    (r: typeof route) => {
      setRoute(r);
      if (launcherSession.current) launcherSession.current.navigated = true;
      void updateSettings({ lastRoute: r });
    },
    [setRoute, updateSettings],
  );

  const onPaletteOpenChange = useCallback((open: boolean) => {
    setPaletteOpen(open);
    if (open) return;
    const session = launcherSession.current;
    launcherSession.current = null;
    if (session?.hideOnClose && !session.navigated) {
      void import("@/lib/global-hotkeys").then(({ hideMainWindow }) => hideMainWindow());
    }
  }, []);

  useEffect(() => {
    const onLauncher = (e: Event) => {
      const wasVisible = (e as CustomEvent<{ wasVisible: boolean }>).detail?.wasVisible ?? true;
      launcherSession.current = { hideOnClose: !wasVisible, navigated: false };
      setPaletteOpen(true);
    };
    window.addEventListener("dn-hotkey-launcher", onLauncher);
    return () => window.removeEventListener("dn-hotkey-launcher", onLauncher);
  }, []);
  const onTogglePalette = useCallback(() => setPaletteOpen((o) => !o), []);
  const onOpenShortcuts = useCallback(() => setShortcutsOpen(true), []);

  useGlobalShortcuts({
    onNavigate,
    onTogglePalette,
    onOpenShortcuts,
  });
  useDesktopHotkeys({ onNavigate });

  useEffect(() => {
    if (!ready) return;
    if (settings.lastRoute && settings.lastRoute !== route && !window.location.hash) {
      setRoute(settings.lastRoute);
    }
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready) return;
    void import("@/lib/tiktok-migration")
      .then(({ migrateTikTokStreaksToHabits }) => migrateTikTokStreaksToHabits())
      .then((n) => {
        if (n > 0) toast.success(t.habitMigrated.replace("{n}", String(n)));
      })
      .catch(() => undefined);
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppShell route={route} onNavigate={onNavigate}>
      <Suspense fallback={<PageSkeleton />}>
        {route === "home" && <HomePage onNavigate={onNavigate} />}
        {route === "clock" && <ClockPage />}
        {route === "calendar" && <CalendarPage />}
        {route === "calculator" && <CalculatorPage />}
        {route === "devtools" && <DevToolsPage />}
        {route === "habits" && <HabitsPage />}
        {route === "snippets" && <SnippetsPage />}
        {route === "colors" && <ColorsPage />}
        {route === "filetools" && <FileToolsPage />}
        {route === "notes" && <NotesPage />}
        {route === "todo" && <TodoPage />}
        {route === "clipboard" && <ClipboardPage />}
        {route === "passwords" && <PasswordsPage />}
        {route === "focus" && <FocusPage />}
        {route === "system" && <SystemPage />}
        {route === "network" && <NetworkPage />}
        {route === "weather" && <WeatherPage />}
        {route === "settings" && <SettingsPage />}
        {route === "about" && <AboutPage onNavigate={onNavigate} />}
      </Suspense>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={onPaletteOpenChange}
        onNavigate={onNavigate}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <OnboardingDialog onNavigate={onNavigate} />
      <WhatsNewDialog />
      <UpdateDialog />
      <Toaster richColors position="bottom-right" />
    </AppShell>
  );
}

function AppRoutes() {
  const widgetKind = parseWidgetKind();

  if (widgetKind) {
    return (
      <Suspense fallback={<div className="h-screen w-screen bg-background" />}>
        <WidgetPage kind={widgetKind} />
        <Toaster richColors position="bottom-right" />
      </Suspense>
    );
  }

  return <MainApp />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <I18nProvider>
          <SettingsProvider>
            <TooltipProvider>
              <AppRoutes />
            </TooltipProvider>
          </SettingsProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
