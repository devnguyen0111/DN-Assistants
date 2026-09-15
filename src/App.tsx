import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppShell } from "@/components/layout/AppShell";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { ShortcutsDialog } from "@/components/layout/ShortcutsDialog";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEventReminders } from "@/hooks/useEventReminders";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { useTikTokStreakReminders } from "@/hooks/useTikTokStreakReminders";
import { useHashRoute } from "@/hooks/useHashRoute";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { SettingsProvider } from "@/lib/settings-context";
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

function AppRoutes() {
  const { route, setRoute } = useHashRoute();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  useEventReminders();
  useTikTokStreakReminders();
  const { t } = useI18n();

  const onNavigate = useCallback((r: typeof route) => setRoute(r), [setRoute]);
  const onTogglePalette = useCallback(() => setPaletteOpen((o) => !o), []);
  const onOpenShortcuts = useCallback(() => setShortcutsOpen(true), []);

  useGlobalShortcuts({
    onNavigate,
    onTogglePalette,
    onOpenShortcuts,
  });

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen("open-clipboard", () => {
      onNavigate("clipboard");
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, [onNavigate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void promptUpdateIfAvailable({
        updateAvailable: t.updateAvailable,
        installUpdate: t.installUpdate,
      });
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [t.installUpdate, t.updateAvailable]);

  return (
    <AppShell route={route} onNavigate={onNavigate}>
      {route === "home" && <HomePage onNavigate={onNavigate} />}
      {route === "clock" && <ClockPage />}
      {route === "calendar" && <CalendarPage />}
      {route === "calculator" && <CalculatorPage />}
      {route === "currency" && <CurrencyPage />}
      {route === "devtools" && <DevToolsPage />}
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
      {route === "about" && <AboutPage />}
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onNavigate={onNavigate}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
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
