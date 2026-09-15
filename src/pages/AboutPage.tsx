import { useEffect, useRef, useState } from "react";
import { animate, createScope } from "animejs";
import {
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Clock3,
  CloudSun,
  Code2,
  Coins,
  ExternalLink,
  Info,
  KeyRound,
  Monitor,
  Network,
  NotebookPen,
  Shield,
  Sparkles,
  Timer,
  Flame,
  Keyboard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n";
import { APP_VERSION } from "@/lib/settings";
import { useSettings } from "@/lib/settings-context";
import type { AppRoute } from "@/lib/routing";
import logoUrl from "@/assets/logo.png";

const REPO_URL = "https://github.com/devnguyen0111/DN-Assistants";

type OsInfo = {
  platform: string;
  version: string;
  arch: string;
};

type Props = {
  onNavigate?: (route: AppRoute) => void;
};

async function loadOsInfo(): Promise<OsInfo | null> {
  try {
    const os = await import("@tauri-apps/plugin-os");
    return {
      platform: os.platform(),
      version: os.version(),
      arch: os.arch(),
    };
  } catch {
    return null;
  }
}

async function loadAppVersion(): Promise<string> {
  try {
    const { getVersion } = await import("@tauri-apps/api/app");
    return await getVersion();
  } catch {
    return APP_VERSION;
  }
}

const CATALOG: { route: AppRoute; icon: typeof Clock3; group: "main" | "tools" | "system" }[] = [
  { route: "home", icon: Sparkles, group: "main" },
  { route: "clock", icon: Clock3, group: "main" },
  { route: "calendar", icon: CalendarDays, group: "main" },
  { route: "calculator", icon: Coins, group: "tools" },
  { route: "currency", icon: Coins, group: "tools" },
  { route: "devtools", icon: Code2, group: "tools" },
  { route: "notes", icon: NotebookPen, group: "tools" },
  { route: "todo", icon: CheckSquare, group: "tools" },
  { route: "clipboard", icon: ClipboardList, group: "tools" },
  { route: "passwords", icon: KeyRound, group: "tools" },
  { route: "focus", icon: Timer, group: "tools" },
  { route: "tiktok", icon: Flame, group: "tools" },
  { route: "system", icon: Monitor, group: "system" },
  { route: "network", icon: Network, group: "system" },
  { route: "weather", icon: CloudSun, group: "system" },
];

export function AboutPage({ onNavigate }: Props) {
  const { t } = useI18n();
  const { updateSettings } = useSettings();
  const root = useRef<HTMLDivElement>(null);
  const scope = useRef<ReturnType<typeof createScope> | null>(null);
  const [osInfo, setOsInfo] = useState<OsInfo | null>(null);
  const [version, setVersion] = useState("…");

  useEffect(() => {
    void loadOsInfo().then(setOsInfo);
    void loadAppVersion().then(setVersion);
  }, []);

  useEffect(() => {
    if (!root.current) return;
    scope.current = createScope({ root }).add(() => {
      animate(".page-enter", {
        opacity: [0, 1],
        y: [16, 0],
        duration: 420,
        ease: "outCubic",
      });
    });
    return () => scope.current?.revert();
  }, []);

  const labelFor = (route: AppRoute) => {
    const map: Partial<Record<AppRoute, string>> = {
      home: t.navHome,
      clock: t.navClock,
      calendar: t.navCalendar,
      calculator: t.navCalculator,
      currency: t.navCurrency,
      devtools: t.navDevTools,
      notes: t.navNotes,
      todo: t.navTodo,
      clipboard: t.navClipboard,
      passwords: t.navPasswords,
      focus: t.navFocus,
      tiktok: t.navTikTok,
      system: t.navSystem,
      network: t.navNetwork,
      weather: t.navWeather,
    };
    return map[route] ?? route;
  };

  return (
    <div ref={root} className="page-enter mx-auto max-w-3xl space-y-4">
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
          <img src={logoUrl} alt="" className="size-16 rounded-2xl shadow-sm" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight">{t.appName}</h2>
              <Badge variant="secondary" className="font-mono">
                v{version}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{t.aboutHeroTagline}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void updateSettings({ onboardingDone: false })}
            >
              {t.aboutReplayOnboarding}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void updateSettings({ whatsNewSeenVersion: "" })}
            >
              {t.aboutShowWhatsNew}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="size-4 text-primary" />
            {t.aboutStoryTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>{t.aboutStoryBody}</p>
          <Separator />
          <div>
            <p className="mb-1 font-medium text-foreground">{t.aboutAudienceTitle}</p>
            <p>{t.aboutAudienceBody}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.aboutCatalogTitle}</CardTitle>
          <CardDescription>{t.navGroupMain} · {t.navGroupTools} · {t.navGroupSystem}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CATALOG.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.route}
                type="button"
                className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"
                onClick={() => onNavigate?.(item.route)}
              >
                <Icon className="size-4 shrink-0 text-primary" />
                <span className="truncate font-medium">{labelFor(item.route)}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            {t.aboutPrivacyTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          {t.aboutPrivacyBody}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="size-4 text-primary" />
            {t.aboutShortcutsTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2 rounded-md border px-3 py-2">
            <span className="text-muted-foreground">{t.shortcutPalette}</span>
            <kbd className="font-mono text-xs">Ctrl+K</kbd>
          </div>
          <div className="flex justify-between gap-2 rounded-md border px-3 py-2">
            <span className="text-muted-foreground">{t.shortcutToggleWindow}</span>
            <kbd className="font-mono text-xs">Ctrl+Shift+Space</kbd>
          </div>
          <div className="flex justify-between gap-2 rounded-md border px-3 py-2">
            <span className="text-muted-foreground">{t.shortcutClipboard}</span>
            <kbd className="font-mono text-xs">Ctrl+Shift+V</kbd>
          </div>
          <div className="flex justify-between gap-2 rounded-md border px-3 py-2">
            <span className="text-muted-foreground">{t.shortcutNavigate}</span>
            <kbd className="font-mono text-xs">Alt+1…9</kbd>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            {t.aboutChangelogTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          {t.aboutChangelogBody}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.aboutTechTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t.aboutVersion}</span>
            <span className="font-mono tabular-nums">{version}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{t.aboutOs}</span>
            <span className="truncate font-mono text-right">
              {osInfo ? `${osInfo.platform} ${osInfo.version} (${osInfo.arch})` : t.unavailable}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t.aboutLicense}</span>
            <span>MIT</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t.aboutRepo}</span>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="size-3.5" />
              GitHub
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
