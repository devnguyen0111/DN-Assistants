import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Timer as TimerIcon,
  Volume2,
  VolumeX,
  Waves,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Sparkline } from "@/components/charts/Sparkline";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-context";
import { playReminderChime, showOsNotification } from "@/lib/notify";
import {
  addSession,
  clearTimerState,
  countSessionsToday,
  focusMinutesByDay,
  loadTimerState,
  saveTimerState,
  type FocusKind,
} from "@/lib/focus";
import {
  soundscapeEngine,
  SOUNDSCAPE_TRACKS,
} from "@/lib/soundscapes";
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
  const [stats7, setStats7] = useState<{ date: string; minutes: number }[]>([]);
  const [stats30, setStats30] = useState<{ date: string; minutes: number }[]>([]);
  const [statsRange, setStatsRange] = useState<7 | 30>(7);
  const [soundscapeOpen, setSoundscapeOpen] = useState(false);
  const [, setSoundTick] = useState(0);
  const intervalRef = useRef<number | null>(null);

  // Subscribe to soundscape engine updates
  useEffect(() => {
    return soundscapeEngine.subscribe(() => setSoundTick((n) => n + 1));
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const [d7, d30] = await Promise.all([focusMinutesByDay(7), focusMinutesByDay(30)]);
      setStats7(d7);
      setStats30(d30);
    } catch {
      setStats7([]);
      setStats30([]);
    }
  }, []);

  // Restore persisted timer state on mount.
  useEffect(() => {
    const saved = loadTimerState();
    if (saved) {
      setKind(saved.kind);
      setRemaining(saved.remainingSeconds);
      setRunning(false);
    }
    void countSessionsToday().then(setSessionsToday);
    void refreshStats();
    const onFocus = () => {
      void countSessionsToday().then(setSessionsToday);
      void refreshStats();
    };
    window.addEventListener("dn-focus-changed", onFocus);
    return () => window.removeEventListener("dn-focus-changed", onFocus);
  }, [refreshStats]);

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
      void refreshStats();
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
  }, [kind, minutesFor, t.focusTitle, t.focusDone, workCycles, refreshStats]);

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

  const activeStats = statsRange === 7 ? stats7 : stats30;
  const totalMinutes = useMemo(
    () => activeStats.reduce((sum, row) => sum + row.minutes, 0),
    [activeStats],
  );
  const sparkValues = useMemo(() => activeStats.map((row) => row.minutes), [activeStats]);
  const sparkMax = Math.max(1, ...sparkValues);

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <TimerIcon className="size-4 text-primary" />
          {t.focusTitle}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void import("@/lib/routing").then((m) => m.openWidgetWindow("focus"))}
          >
            {t.openWidget}
          </Button>
          <Badge variant="secondary" className="font-mono tabular-nums">
            {t.focusSessionsToday}: {sessionsToday}
          </Badge>
        </div>
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
            <circle cx="50" cy="50" r="45" className="fill-none stroke-muted" strokeWidth="6" />
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

        {/* Focus Soundscapes Audio Mixer */}
        <div className="w-full rounded-2xl border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Waves className="size-4 text-primary" />
              <span className="text-sm font-semibold tracking-tight">{t.soundscapes}</span>
              {soundscapeEngine.isAnyPlaying() && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-mono text-primary">
                  Playing
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {soundscapeEngine.isAnyPlaying() && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => soundscapeEngine.stopAll()}
                >
                  <VolumeX className="mr-1 size-3.5" />
                  {t.stopAllSounds}
                </Button>
              )}

              <Button
                size="sm"
                variant={soundscapeOpen ? "secondary" : "outline"}
                className="h-7 text-xs"
                onClick={() => setSoundscapeOpen((prev) => !prev)}
              >
                {soundscapeOpen ? "Hide" : "Mixer"}
              </Button>
            </div>
          </div>

          {soundscapeOpen && (
            <div className="mt-3.5 space-y-3.5 border-t pt-3">
              {/* Master volume */}
              <div className="flex items-center gap-3">
                <Volume2 className="size-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{t.masterVolume}</span>
                <Slider
                  value={[soundscapeEngine.getMasterVolume() * 100]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={(v) => soundscapeEngine.setMasterVolume((v[0] ?? 80) / 100)}
                  className="flex-1"
                />
                <span className="font-mono text-xs text-muted-foreground">
                  {Math.round(soundscapeEngine.getMasterVolume() * 100)}%
                </span>
              </div>

              {/* Tracks grid */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SOUNDSCAPE_TRACKS.map((track) => {
                  const playing = soundscapeEngine.isTrackPlaying(track.id);
                  const vol = soundscapeEngine.getTrackVolume(track.id);

                  return (
                    <div
                      key={track.id}
                      className={cn(
                        "rounded-xl border p-2.5 transition-all",
                        playing
                          ? "border-primary/40 bg-primary/10 shadow-sm"
                          : "bg-background/60 hover:bg-background",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => soundscapeEngine.toggleTrack(track.id)}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <span className="text-sm font-medium">
                          {track.icon} {t[track.nameKey as keyof typeof t] ?? track.id}
                        </span>
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            playing ? "bg-primary animate-pulse" : "bg-muted",
                          )}
                        />
                      </button>

                      {playing && (
                        <div className="mt-2 space-y-1">
                          <Slider
                            value={[vol * 100]}
                            min={5}
                            max={100}
                            step={5}
                            onValueChange={(v) =>
                              soundscapeEngine.setTrackVolume(track.id, (v[0] ?? 50) / 100)
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="w-full space-y-3 border-t pt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{t.focusStatsTitle}</p>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={statsRange === 7 ? "secondary" : "ghost"}
                onClick={() => setStatsRange(7)}
              >
                {t.focusLast7}
              </Button>
              <Button
                size="sm"
                variant={statsRange === 30 ? "secondary" : "ghost"}
                onClick={() => setStatsRange(30)}
              >
                {t.focusLast30}
              </Button>
            </div>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {t.focusMinutesTotal.replace("{n}", String(totalMinutes))}
          </p>
          <Sparkline values={sparkValues} max={sparkMax} className="h-10" />
          <div className="max-h-28 space-y-1 overflow-y-auto">
            {activeStats
              .filter((row) => row.minutes > 0)
              .slice()
              .reverse()
              .map((row) => (
                <div
                  key={row.date}
                  className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                >
                  <span className="font-mono">{row.date}</span>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(row.minutes / sparkMax) * 100}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono tabular-nums">{row.minutes}m</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
