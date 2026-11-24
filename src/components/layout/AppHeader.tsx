import { useEffect, useState } from "react";
import {
  ArrowUpCircle,
  Keyboard,
  Languages,
  Loader2,
  Monitor,
  Moon,
  Pin,
  PinOff,
  Search,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/keyboard-hint";
import { useUpdateState } from "@/hooks/useAutoUpdates";
import { showUpdateDialog } from "@/lib/updates";
import { useI18n, type Locale } from "@/lib/i18n";
import type { AppRoute } from "@/lib/routing";
import { useSettings } from "@/lib/settings-context";
import { useTheme, type ThemeMode } from "@/lib/theme";

type Props = {
  onNavigate?: (route: AppRoute) => void;
};

function useWide(query = "(min-width: 1200px)") {
  const [wide, setWide] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return wide;
}

const THEME_ICON: Record<ThemeMode, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };

/** Global utilities toolbar (spec §3). Page titles live in each page's PageHeader. */
export function AppHeader(_props: Props) {
  const { t, locale, setLocale } = useI18n();
  const { mode, theme, setMode } = useTheme();
  const { settings, updateSettings } = useSettings();
  const wide = useWide();
  const update = useUpdateState();
  const updateChip =
    update.status === "available"
      ? t.updateChipAvailable.replace("{version}", update.info.version)
      : update.status === "downloading"
        ? t.updateChipDownloading.replace(
            "{percent}",
            update.percent != null ? `${update.percent}%` : "…",
          )
        : update.status === "installing"
          ? t.updateChipInstalling
          : null;

  const themeName: Record<ThemeMode, string> = {
    light: t.themeLight,
    dark: t.themeDark,
    system: t.themeSystem,
  };
  const langName: Record<Locale, string> = { vi: "Tiếng Việt", en: "English" };
  const ThemeIcon = THEME_ICON[mode];
  const openShortcuts = () => window.dispatchEvent(new CustomEvent("dn-open-shortcuts"));

  const themeItems = (
    <DropdownMenuRadioGroup value={mode} onValueChange={(v) => setMode(v as ThemeMode)}>
      {(["light", "dark", "system"] as ThemeMode[]).map((m) => {
        const Icon = THEME_ICON[m];
        return (
          <DropdownMenuRadioItem key={m} value={m}>
            <Icon className="size-4" />
            {themeName[m]}
            {m === "system" && (
              <span className="ml-auto text-caption text-text-3">{themeName[theme]}</span>
            )}
          </DropdownMenuRadioItem>
        );
      })}
    </DropdownMenuRadioGroup>
  );

  const langItems = (
    <DropdownMenuRadioGroup value={locale} onValueChange={(v) => setLocale(v as Locale)}>
      {(["vi", "en"] as Locale[]).map((l) => (
        <DropdownMenuRadioItem key={l} value={l}>
          {langName[l]}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );

  return (
    <header className="flex min-w-0 items-center justify-between gap-2 border-b px-4 [@media(min-width:1200px)]:px-6">
      <Button
        variant="outline"
        className="min-w-0 gap-2 text-text-2"
        onClick={() => window.dispatchEvent(new CustomEvent("dn-open-palette"))}
      >
        <Search />
        <span className="truncate">{t.toolbarCommands}</span>
        <Kbd className="ml-4">Ctrl+K</Kbd>
      </Button>

      <div className="flex items-center gap-1">
        {updateChip && (
          <Button variant="secondary" className="text-accent-foreground" onClick={showUpdateDialog}>
            {update.status === "available" ? (
              <ArrowUpCircle />
            ) : (
              <Loader2 className="animate-spin motion-reduce:animate-none" />
            )}
            {updateChip}
          </Button>
        )}
        <Button
          variant={settings.alwaysOnTop ? "secondary" : "ghost"}
          aria-pressed={settings.alwaysOnTop}
          onClick={() => void updateSettings({ alwaysOnTop: !settings.alwaysOnTop })}
        >
          {settings.alwaysOnTop ? <Pin /> : <PinOff />}
          {settings.alwaysOnTop ? t.toolbarPinOn : t.toolbarPinOff}
        </Button>

        {wide ? (
          <>
            <Button variant="ghost" onClick={openShortcuts}>
              <Keyboard />
              {t.shortcuts}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" aria-label={t.language}>
                  <Languages />
                  {langName[locale]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">{langItems}</DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">
                  <ThemeIcon />
                  {t.toolbarThemeValue.replace("{mode}", themeName[mode])}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">{themeItems}</DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost">
                <SlidersHorizontal />
                {t.toolbarOptions}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="text-caption text-text-3">{t.theme}</DropdownMenuLabel>
              {themeItems}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-caption text-text-3">
                {t.language}
              </DropdownMenuLabel>
              {langItems}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={openShortcuts}>
                <Keyboard />
                {t.shortcuts}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
