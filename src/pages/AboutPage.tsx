import { useEffect, useRef, useState } from "react";
import { animate, createScope } from "animejs";
import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

const APP_VERSION = "0.1.0";
const REPO_URL = "https://github.com/";

type OsInfo = {
  platform: string;
  version: string;
  arch: string;
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

export function AboutPage() {
  const { t } = useI18n();
  const root = useRef<HTMLDivElement>(null);
  const scope = useRef<ReturnType<typeof createScope> | null>(null);
  const [osInfo, setOsInfo] = useState<OsInfo | null>(null);

  useEffect(() => {
    void loadOsInfo().then(setOsInfo);
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

  return (
    <div ref={root} className="page-enter mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="size-4 text-primary" />
            {t.aboutTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t.aboutVersion}</span>
            <span className="font-mono tabular-nums">{APP_VERSION}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t.aboutOs}</span>
            <span className="font-mono">
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
              className="truncate text-primary underline-offset-4 hover:underline"
            >
              {REPO_URL}
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
