import { useCallback, useEffect, useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppShell } from "@/components/layout/AppShell";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { OnboardingDialog } from "@/components/layout/OnboardingDialog";
import { ShortcutsDialog } from "@/components/layout/ShortcutsDialog";
import { WhatsNewDialog } from "@/components/layout/WhatsNewDialog";
import { UpdateDialog } from "@/components/layout/UpdateDialog";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEventReminders } from "@/hooks/useEventReminders";
import { useDesktopHotkeys } from "@/hooks/useDesktopHotkeys";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { useTikTokStreakReminders } from "@/hooks/useTikTokStreakReminders";
import { useVaultAutoLock } from "@/hooks/useVaultAutoLock";
import { useMorningBrief } from "@/hooks/useMorningBrief";
import { useHashRoute } from "@/hooks/useHashRoute";
import { I18nProvider } from "@/lib/i18n";
import { parseWidgetKind } from "@/lib/routing";
import { SettingsProvider, useSettings } from "@/lib/settings-context";
import { ThemeProvider } from "@/lib/theme";
import { promptUpdateIfAvailable } from "@/lib/updates";
import { AboutPage } from "@/pages/AboutPage";
import { CalculatorPage } from "@/pages/CalculatorPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { ClipboardPage } from "@/pages/ClipboardPage";
import { ClockPage } from "@/pages/ClockPage";
import { CurrencyPage } from "@/pages/CurrencyPage";
import { DevToolsPage } from "@/pages/DevToolsPage";
import { FocusPage } from "@/pages/FocusPage";
import { HomePage } from "@/pages/HomePage";
import { NetworkPage } from "@/pages/NetworkPage";
import { NotesPage } from "@/pages/NotesPage";
import { PasswordsPage } from "@/pages/PasswordsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SystemPage } from "@/pages/SystemPage";
import { TikTokPage } from "@/pages/TikTokPage";
import { TodoPage } from "@/pages/TodoPage";
import { WeatherPage } from "@/pages/WeatherPage";
import { WidgetPage } from "@/pages/WidgetPage";
import { HabitsPage } from "@/pages/HabitsPage";
import { SnippetsPage } from "@/pages/SnippetsPage";
import { ColorsPage } from "@/pages/ColorsPage";
import { FileToolsPage } from "@/pages/FileToolsPage";

function AppRoutes() {
  const { route, setRoute } = useHashRoute();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { settings, updateSettings, ready } = useSettings();
  const widgetKind = parseWidgetKind();
  useEventReminders();
  useTikTokStreakReminders();
  useVaultAutoLock();
  useMorningBrief();

  const onNavigate = useCallback(
    (r: typeof route) => {
      setRoute(r);
      void updateSettings({ lastRoute: r });
    },
    [setRoute, updateSettings],
  );
  const onTogglePalette = useCallback(() => setPaletteOpen((o) => !o), []);
  const onOpenShortcuts = useCallback(() => setShortcutsOpen(true), []);

  useGlobalShortcuts({
    onNavigate,
    onTogglePalette,
    onOpenShortcuts,
  });
  useDesktopHotkeys({ onNavigate });

  useEffect(() => {
    if (!ready || widgetKind) return;
    if (settings.lastRoute && settings.lastRoute !== route && !window.location.hash) {
      setRoute(settings.lastRoute);
    }
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready || widgetKind || !settings.autoCheckUpdates) return;
    const timer = window.setTimeout(() => {
      void promptUpdateIfAvailable({
        skippedVersion: settings.skippedUpdateVersion,
      });
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [ready, settings.autoCheckUpdates, settings.skippedUpdateVersion, widgetKind]);

  if (widgetKind) {
    return (
      <>
        <WidgetPage kind={widgetKind} />
        <Toaster richColors position="bottom-right" />
      </>
    );
  }

  return (
    <AppShell route={route} onNavigate={onNavigate}>
      {route === "home" && <HomePage onNavigate={onNavigate} />}
      {route === "clock" && <ClockPage />}
      {route === "calendar" && <CalendarPage />}
      {route === "calculator" && <CalculatorPage />}
      {route === "currency" && <CurrencyPage />}
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
      {route === "tiktok" && <TikTokPage />}
      {route === "system" && <SystemPage />}
      {route === "network" && <NetworkPage />}
      {route === "weather" && <WeatherPage />}
      {route === "settings" && <SettingsPage />}
      {route === "about" && <AboutPage onNavigate={onNavigate} />}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onNavigate={onNavigate} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <OnboardingDialog onNavigate={onNavigate} />
      <WhatsNewDialog />
      <UpdateDialog />
      <Toaster richColors position="bottom-right" />
    </AppShell>
  );
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
