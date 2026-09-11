import { Keyboard, Languages, Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import type { AppRoute } from "@/lib/routing";

type Props = {
  onNavigate?: (route: AppRoute) => void;
  onOpenShortcuts?: () => void;
};

export function AppHeader({ onNavigate, onOpenShortcuts }: Props) {
  const { t, locale, toggleLocale } = useI18n();
  const { mode, theme, toggleTheme } = useTheme();

  return (
    <header className="mb-6 flex flex-wrap items-center justify-end gap-3 md:justify-between">
      <div className="hidden md:block">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t.appName}</h1>
        <p className="text-sm text-muted-foreground">{t.appTagline}</p>
      </div>
      <div className="flex items-center gap-2 rounded-xl border bg-card/70 p-1.5 backdrop-blur">
        <Button
          variant="ghost"
          size="sm"
          className="font-mono text-xs text-muted-foreground"
          onClick={() => window.dispatchEvent(new CustomEvent("dn-open-palette"))}
          title={t.commandPalette}
        >
          {t.commandHint}
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (onOpenShortcuts) onOpenShortcuts();
            else window.dispatchEvent(new CustomEvent("dn-open-shortcuts"));
          }}
          title={t.shortcuts}
        >
          <Keyboard className="size-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={toggleLocale} title={t.language}>
          <Languages className="size-4" />
          {locale.toUpperCase()}
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          title={t.theme}
          onContextMenu={(e) => {
            e.preventDefault();
            onNavigate?.("settings");
          }}
        >
          {mode === "system" ? (
            <Monitor className="size-4" />
          ) : theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
          {mode === "system" ? t.themeSystem : theme === "dark" ? t.themeLight : t.themeDark}
        </Button>
      </div>
    </header>
  );
}
