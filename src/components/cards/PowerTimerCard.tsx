import { useEffect, useState } from "react";
import { Loader2, Power, TimerOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { localeTag, useI18n } from "@/lib/i18n";
import {
  cancelPowerAction,
  formatCountdown,
  getPowerSchedule,
  POWER_ACTION_LABEL,
  POWER_ACTIONS,
  schedulePowerAction,
  secondsUntilTime,
  type PowerAction,
  type PowerSchedule,
} from "@/lib/power";

const PRESETS_MIN = [15, 30, 60, 90, 120];

function errorText(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

/** Shutdown timer: run a power action after a delay or at a clock time. */
export function PowerTimerCard() {
  const { t, locale } = useI18n();
  const [action, setAction] = useState<PowerAction>("shutdown");
  const [mode, setMode] = useState<"after" | "at">("after");
  const [minutes, setMinutes] = useState("30");
  const [atTime, setAtTime] = useState("23:00");
  const [schedule, setSchedule] = useState<PowerSchedule | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    void getPowerSchedule().then(setSchedule);
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/event")
      .then(({ listen }) =>
        listen<PowerSchedule | null>("power-schedule-changed", (e) => setSchedule(e.payload)),
      )
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => undefined);
    return () => unlisten?.();
  }, []);

  useEffect(() => {
    if (!schedule) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [schedule]);

  const delaySecs = (): number | null => {
    if (mode === "at") return secondsUntilTime(atTime);
    const m = Number(minutes);
    return Number.isFinite(m) && m > 0 && m <= 7 * 24 * 60 ? Math.round(m * 60) : null;
  };

  const start = async (secs = delaySecs()) => {
    if (secs == null) {
      toast.error(t.powerInvalidTime);
      return;
    }
    setBusy(true);
    try {
      setSchedule(await schedulePowerAction(action, secs));
      toast.success(t.powerScheduled);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setCancelling(true);
    try {
      await cancelPowerAction();
      setSchedule(null);
      toast.success(t.powerCancelled);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setCancelling(false);
    }
  };

  // Concrete preview: action + local date/time, so "23:00" past today clearly means tomorrow.
  const previewSecs = delaySecs();
  const previewAt = previewSecs != null ? new Date(Date.now() + previewSecs * 1000) : null;
  const previewText = previewAt
    ? t.powerPreview.replace("{action}", t[POWER_ACTION_LABEL[action]]).replace(
        "{when}",
        new Intl.DateTimeFormat(localeTag(locale), {
          weekday: "long",
          day: "numeric",
          month: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(previewAt),
      )
    : null;
  const needsConfirm = action === "shutdown" || action === "restart" || action === "signout";

  const remaining = schedule ? (schedule.deadline_ms - now) / 1000 : 0;
  const at = schedule
    ? new Date(schedule.deadline_ms).toLocaleTimeString(localeTag(locale), {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Power className="size-4 text-primary" />
          {t.powerTitle}
        </CardTitle>
        <CardDescription>{t.powerDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {schedule ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/10 p-3">
            <div>
              <p className="text-sm font-medium">
                {t[POWER_ACTION_LABEL[schedule.action]]} · {at}
              </p>
              <p className="font-mono text-2xl font-semibold tabular-nums">
                {formatCountdown(remaining)}
              </p>
            </div>
            <Button
              variant="outline"
              className="gap-1.5"
              disabled={cancelling}
              aria-busy={cancelling}
              onClick={() => void cancel()}
            >
              <TimerOff className="size-4" />
              {t.powerCancelTimer}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t.powerAction}</Label>
                <Select value={action} onValueChange={(v) => setAction(v as PowerAction)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POWER_ACTIONS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {t[POWER_ACTION_LABEL[a]]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t.powerWhen}</Label>
                <SegmentedControl
                  label={t.powerWhen}
                  value={mode}
                  onValueChange={setMode}
                  className="flex w-full"
                  options={[
                    { value: "after", label: t.powerAfter },
                    { value: "at", label: t.powerAt },
                  ]}
                />
              </div>
            </div>

            {mode === "after" ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    className="w-28"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    aria-label={t.powerMinutes}
                  />
                  <span className="text-sm text-muted-foreground">{t.powerMinutes}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS_MIN.map((m) => (
                    <Button
                      key={m}
                      size="sm"
                      variant={minutes === String(m) ? "secondary" : "outline"}
                      onClick={() => setMinutes(String(m))}
                    >
                      {m >= 60 ? `${m / 60}h` : `${m}m`}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <Input
                type="time"
                className="w-36"
                value={atTime}
                onChange={(e) => setAtTime(e.target.value)}
                aria-label={t.powerAt}
              />
            )}

            {previewText && (
              <p
                className="rounded-md bg-surface-2 px-3 py-2 text-body text-text-2"
                aria-live="polite"
              >
                {previewText}
              </p>
            )}
            <Button
              disabled={busy || previewSecs == null}
              aria-busy={busy}
              className="w-full gap-1.5"
              onClick={() => (needsConfirm ? setConfirmOpen(true) : void start())}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Power className="size-4" />}
              {t.powerStart}
            </Button>
          </>
        )}
        <p className="text-xs text-muted-foreground">{t.powerNote}</p>
      </CardContent>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{previewText}</AlertDialogTitle>
            <AlertDialogDescription>{t.powerNote}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                void start();
              }}
            >
              {t.powerStart}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
