import { useEffect, useMemo, useState } from "react";
import { Cpu, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSystemStats } from "@/hooks/useSystemStats";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-context";
import type { WidgetKind } from "@/lib/routing";
import { pad2, formatPercent } from "@/lib/utils";
import { zonedParts } from "@/lib/timezones";
import { loadTimerState } from "@/lib/focus";

type Props = { kind: WidgetKind };

export function WidgetPage({ kind }: Props) {
  const { t, locale } = useI18n();
  const { settings } = useSettings();
  const [now, setNow] = useState(() => new Date());
  const { stats } = useSystemStats(kind === "cpu" ? 2000 : 10_000);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (kind !== "focus") return;
    const tick = () => {
      const state = loadTimerState();
      if (!state) {
        setRemaining(0);
        return;
      }
      if (state.running) {
        const elapsed = Math.floor((Date.now() - state.updatedAt) / 1000);
        setRemaining(Math.max(0, state.remainingSeconds - elapsed));
      } else {
        setRemaining(state.remainingSeconds);
      }
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [kind]);

  const primary = useMemo(
    () => zonedParts(now, settings.primaryTimezone),
    [now, settings.primaryTimezone],
  );

  const close = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch {
      // ignore
    }
  };

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  return (
    <div className="flex h-screen flex-col bg-background/95 p-3 text-foreground backdrop-blur">
      <div className="mb-1 flex items-center justify-between" data-tauri-drag-region>
        <span className="text-xs font-medium text-muted-foreground">
          {kind === "clock" ? t.widgetClock : kind === "focus" ? t.widgetFocus : t.widgetCpu}
        </span>
        <Button size="icon" variant="ghost" className="size-6" onClick={() => void close()}>
          <X className="size-3.5" />
        </Button>
      </div>
      {kind === "clock" && (
        <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight">
          {pad2(Number(primary.hours))}:{pad2(Number(primary.minutes))}
          <span className="text-xl text-muted-foreground">:{pad2(Number(primary.seconds))}</span>
        </p>
      )}
      {kind === "focus" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-1">
          <Timer className="size-5 text-primary" />
          <p className="font-mono text-4xl font-semibold tabular-nums">
            {pad2(mm)}:{pad2(ss)}
          </p>
        </div>
      )}
      {kind === "cpu" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-1">
          <Cpu className="size-5 text-primary" />
          <p className="font-mono text-3xl font-semibold tabular-nums">
            {stats
              ? formatPercent(stats.global_cpu_usage, locale === "vi" ? "vi-VN" : "en-US")
              : "…"}
          </p>
        </div>
      )}
    </div>
  );
}
