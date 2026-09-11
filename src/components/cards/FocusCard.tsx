import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward, Timer as TimerIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-context";
import { playReminderChime, showOsNotification } from "@/lib/notify";
import {
  addSession,
  clearTimerState,
  countSessionsToday,
  loadTimerState,
  saveTimerState,
  type FocusKind,
} from "@/lib/focus";
import { cn } from "@/lib/utils";

const NEXT_KIND: Record<FocusKind, FocusKind> = {
  work: "break",
  break: "work",
  long_break: "work",
};

const WORK_CYCLES_BEFORE_LONG_BREAK = 4;

export function FocusCard() {
  const { t } = useI18n();
  const { settings } = useSettings();

  const minutesFor = useCallback(
    (kind: FocusKind) =>
      kind === "work"
        ? settings.focusWorkMinutes
        : kind === "break"
          ? settings.focusBreakMinutes
          : settings.focusLongBreakMinutes,
    [settings.focusWorkMinutes, settings.focusBreakMinutes, settings.focusLongBreakMinutes],
  );

  const [kind, setKind] = useState<FocusKind>("work");
  const [remaining, setRemaining] = useState(() => minutesFor("work") * 60);
  const [running, setRunning] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [workCycles, setWorkCycles] = useState(0);
  const intervalRef = useRef<number | null>(null);

  // Restore persisted timer state on mount.
  useEffect(() => {
    const saved = loadTimerState();
    if (saved) {
      setKind(saved.kind);
      setRemaining(saved.remainingSeconds);
      setRunning(false);
    }
    void countSessionsToday().then(setSessionsToday);
  }, []);

  // Persist state on changes.
  useEffect(() => {
    saveTimerState({ kind, remainingSeconds: remaining, running, updatedAt: Date.now() });
  }, [kind, remaining, running]);

  const finishSession = useCallback(async () => {
    setRunning(false);
    playReminderChime();
    void showOsNotification(t.focusTitle, t.focusDone);
    try {
      await addSession(kind, minutesFor(kind));
      setSessionsToday((n) => n + 1);
    } catch {
      // ignore persistence failure
    }
    toast.success(t.focusDone);

    if (kind === "work") {
      const nextCycles = workCycles + 1;
      setWorkCycles(nextCycles);
      const nextKind: FocusKind =
        nextCycles % WORK_CYCLES_BEFORE_LONG_BREAK === 0 ? "long_break" : "break";
      setKind(nextKind);
      setRemaining(minutesFor(nextKind) * 60);
    } else {
      setKind("work");
      setRemaining(minutesFor("work") * 60);
    }
  }, [kind, minutesFor, t.focusTitle, t.focusDone, workCycles]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          void finishSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [running, finishSession]);

  const reset = () => {
    setRunning(false);
    setRemaining(minutesFor(kind) * 60);
    clearTimerState();
  };

  const skip = () => {
    setRunning(false);
    const next = NEXT_KIND[kind];
    setKind(next);
    setRemaining(minutesFor(next) * 60);
  };

  const switchKind = (next: FocusKind) => {
    setRunning(false);
    setKind(next);
    setRemaining(minutesFor(next) * 60);
  };

  const mm = Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");

  const total = minutesFor(kind) * 60;
  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0;

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <TimerIcon className="size-4 text-primary" />
          {t.focusTitle}
        </CardTitle>
        <Badge variant="secondary" className="font-mono tabular-nums">
          {t.focusSessionsToday}: {sessionsToday}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 py-6">
        <div className="flex gap-1.5">
          {(["work", "break", "long_break"] as FocusKind[]).map((k) => (
            <Button
              key={k}
              size="sm"
              variant={kind === k ? "secondary" : "ghost"}
              onClick={() => switchKind(k)}
            >
              {k === "work" ? t.focusWork : k === "break" ? t.focusBreak : t.focusLongBreak}
            </Button>
          ))}
        </div>

        <div className="relative flex size-56 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              className="fill-none stroke-muted"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              className={cn(
                "fill-none stroke-primary transition-[stroke-dashoffset] duration-1000 ease-linear",
              )}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
            />
          </svg>
          <div className="text-center">
            <p className="font-mono text-5xl font-semibold tabular-nums tracking-tight">
              {mm}:{ss}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {minutesFor(kind)} {t.focusMinutes}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="lg" onClick={() => setRunning((r) => !r)}>
            {running ? <Pause className="size-4" /> : <Play className="size-4" />}
            {running ? t.focusPause : t.focusStart}
          </Button>
          <Button size="lg" variant="outline" onClick={reset}>
            <RotateCcw className="size-4" />
            {t.focusReset}
          </Button>
          <Button size="lg" variant="ghost" onClick={skip}>
            <SkipForward className="size-4" />
            {t.focusSkip}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
