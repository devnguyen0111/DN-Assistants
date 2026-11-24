import { useEffect, useState } from "react";
import {
  ExternalLink,
  Info,
  Shield,
  Sparkles,
  Keyboard,
  ArrowUpCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { promptUpdateIfAvailable } from "@/lib/updates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n";
import { NAV_GROUPS } from "@/lib/nav";
import { PageLayout } from "@/components/layout/PageLayout";
import { navLabel } from "@/lib/page-meta";
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

/** Every module except Settings/About, in sidebar order. */
const CATALOG = NAV_GROUPS.filter((g) => g.labelKey !== "navGroupApp").flatMap((g) => g.items);

export function AboutPage({ onNavigate }: Props) {
  const { t } = useI18n();
  const { updateSettings } = useSettings();
  const [osInfo, setOsInfo] = useState<OsInfo | null>(null);
  const [version, setVersion] = useState("…");
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    void loadOsInfo().then(setOsInfo);
    void loadAppVersion().then(setVersion);
  }, []);

  const labelFor = (route: AppRoute) => navLabel(t, route);

  return (
    <PageLayout route="about" width="reading">
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
              disabled={checkingUpdate}
              onClick={async () => {
                setCheckingUpdate(true);
                try {
                  const res = await promptUpdateIfAvailable({ forceShow: true });
                  if (res.status === "up-to-date") {
                    toast.success(t.upToDate);
                  } else if (res.status === "error") {
                    toast.error(res.message);
                  } else if (res.status === "unavailable") {
                    toast.info(t.unavailable);
                  }
                } finally {
                  setCheckingUpdate(false);
                }
              }}
              className="gap-1.5"
            >
              {checkingUpdate ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ArrowUpCircle className="size-3.5 text-primary" />
              )}
              {t.checkForUpdates}
            </Button>
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
          <CardDescription>
            {t.navGroupToday} · {t.navGroupLibrary} · {t.navGroupTools} · {t.navGroupSystem}
          </CardDescription>
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
    </PageLayout>
  );
}
