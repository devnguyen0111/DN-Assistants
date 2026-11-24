import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Timer } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state-block";
import { Textarea } from "@/components/ui/textarea";
import { useSystemStats } from "@/hooks/useSystemStats";
import { onChange } from "@/lib/db";
import { formatEventRange, listUpcoming, type CalendarEvent } from "@/lib/events";
import { loadTimerState } from "@/lib/focus";
import { getAllHabitsWithStats, toggleHabitDate, type HabitStats } from "@/lib/habits";
import { localeTag, useI18n } from "@/lib/i18n";
import { createNote } from "@/lib/notes";
import { openWidgetWindow, type AppRoute, type WidgetKind } from "@/lib/routing";
import { useSettings } from "@/lib/settings-context";
import { getZoneById, zoneLabel } from "@/lib/timezones";
import { createTodo, listTodos, toggleTodo, type Todo } from "@/lib/todos";
import { cn, formatPercent, localDateKey } from "@/lib/utils";
import { fetchWeather, weatherCodeLabel, weatherEmoji, type WeatherPayload } from "@/lib/weather";

type Props = { onNavigate: (route: AppRoute) => void };

/** Panel header link to the module's full page. */
function ViewAll({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="link" size="sm" className="h-auto min-h-0 px-0" onClick={onClick}>
      {label}
    </Button>
  );
}

/** "Today at a glance" — agenda and due work first (spec §5 Home). */
export function HomePage({ onNavigate }: Props) {
  const { t, locale } = useI18n();
  const tag = localeTag(locale);
  const { settings, updateSettings } = useSettings();

  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [todos, setTodos] = useState<Todo[] | null>(null);
  const [habits, setHabits] = useState<HabitStats[] | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);

  const loadEvents = () =>
    void listUpcoming(8)
      .then((rows) => {
        setEvents(rows);
        setEventsError(null);
      })
      .catch((err) => setEventsError(err instanceof Error ? err.message : String(err)));
  const loadTodos = () =>
    void listTodos()
      .then(setTodos)
      .catch(() => setTodos([]));
  const loadHabits = () =>
    void getAllHabitsWithStats()
      .then(setHabits)
      .catch(() => setHabits([]));

  useEffect(() => {
    loadEvents();
    loadTodos();
    loadHabits();
    const offs = [
      onChange("events", loadEvents),
      onChange("todos", loadTodos),
      onChange("habits", loadHabits),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  const todayLabel = new Intl.DateTimeFormat(tag, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  // Agenda: today's events, else hint at the next upcoming one.
  const todayKey = localDateKey();
  const todayEvents = (events ?? []).filter((e) => localDateKey(new Date(e.start_at)) === todayKey);
  const nextEvent = (events ?? []).find((e) => e.start_at > Date.now());

  // Due tasks: overdue first, then due today.
  const dueTasks = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return (todos ?? [])
      .filter((x) => !x.done && x.due_at && Date.parse(x.due_at) <= end.getTime())
      .sort((a, b) => Date.parse(a.due_at!) - Date.parse(b.due_at!));
  }, [todos]);
  const overdueCount = dueTasks.filter((x) => Date.parse(x.due_at!) < Date.now()).length;
  const fmtTime = new Intl.DateTimeFormat(tag, { hour: "2-digit", minute: "2-digit" });
  const fmtShort = new Intl.DateTimeFormat(tag, { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="pb-6">
      <PageHeader
        title={t.homeTitleToday}
        description={<span className="capitalize">{todayLabel}</span>}
        actions={
          <>
            <Button onClick={() => setTaskOpen(true)}>
              <Plus />
              {t.homeAddTask}
            </Button>
            <Button variant="outline" onClick={() => onNavigate("calendar")}>
              {t.addEvent}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">
                  {t.more}
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(["clock", "focus", "cpu", "sticky"] as WidgetKind[]).map((k) => (
                  <DropdownMenuItem key={k} onSelect={() => void openWidgetWindow(k)}>
                    {t.homeOpenWidget.replace("{name}", widgetName(t, k))}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="@container">
        <div className="grid grid-cols-1 items-start gap-4 @[680px]:grid-cols-2 @[1000px]:grid-cols-12">
          <Card className="@[1000px]:col-span-7">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{t.homeAgendaToday}</CardTitle>
              <ViewAll label={t.viewAll} onClick={() => onNavigate("calendar")} />
            </CardHeader>
            <CardContent>
              {eventsError ? (
                <ErrorState
                  title={t.errorTitle}
                  details={eventsError}
                  action={
                    <Button size="sm" variant="outline" onClick={loadEvents}>
                      {t.retry}
                    </Button>
                  }
                />
              ) : events === null ? (
                <LoadingState rows={2} />
              ) : todayEvents.length === 0 ? (
                <EmptyState
                  title={t.homeNothingToday}
                  description={
                    nextEvent
                      ? `${t.homeNextEvent}: ${nextEvent.title} · ${fmtShort.format(new Date(nextEvent.start_at))}`
                      : undefined
                  }
                  action={
                    <Button size="sm" variant="outline" onClick={() => onNavigate("calendar")}>
                      {t.addEvent}
                    </Button>
                  }
                />
              ) : (
                <ul className="divide-y">
                  {todayEvents.slice(0, 4).map((e) => (
                    <li key={e.id} className="flex min-h-row items-center gap-3 py-2">
                      <span className="w-28 shrink-0 text-caption tabular text-text-3">
                        {formatEventRange(e, t.allDay)}
                      </span>
                      <span className="truncate text-body">{e.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="@[1000px]:col-span-5">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>
                {t.homeDueTasks}
                {overdueCount > 0 && (
                  <span className="ml-2 text-caption font-normal text-danger">
                    {t.homeOverdueCount.replace("{n}", String(overdueCount))}
                  </span>
                )}
              </CardTitle>
              <ViewAll label={t.viewAll} onClick={() => onNavigate("todo")} />
            </CardHeader>
            <CardContent>
              {todos === null ? (
                <LoadingState rows={2} />
              ) : dueTasks.length === 0 ? (
                <EmptyState title={t.homeNoDueTasks} />
              ) : (
                <ul className="divide-y">
                  {dueTasks.slice(0, 5).map((task) => {
                    const overdue = Date.parse(task.due_at!) < Date.now();
                    return (
                      <li key={task.id} className="flex min-h-row items-center gap-3 py-2">
                        <Checkbox
                          aria-label={task.title}
                          onCheckedChange={() =>
                            void toggleTodo(task.id, true).catch((err) => toast.error(String(err)))
                          }
                        />
                        <span className="min-w-0 flex-1 truncate text-body">{task.title}</span>
                        <span
                          className={cn(
                            "shrink-0 text-caption tabular",
                            overdue ? "text-danger" : "text-text-3",
                          )}
                        >
                          {overdue ? t.todoOverdue : fmtTime.format(new Date(task.due_at!))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="@[1000px]:col-span-7">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>
                {t.navHabits}
                {habits && habits.length > 0 && (
                  <span className="ml-2 text-caption font-normal text-text-3">
                    {t.homeHabitsDone
                      .replace("{done}", String(habits.filter((h) => h.completedToday).length))
                      .replace("{total}", String(habits.length))}
                  </span>
                )}
              </CardTitle>
              <ViewAll label={t.viewAll} onClick={() => onNavigate("habits")} />
            </CardHeader>
            <CardContent>
              {habits === null ? (
                <LoadingState rows={2} />
              ) : habits.length === 0 ? (
                <EmptyState
                  title={t.noHabitsYet}
                  action={
                    <Button size="sm" variant="outline" onClick={() => onNavigate("habits")}>
                      {t.addHabit}
                    </Button>
                  }
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {habits.slice(0, 6).map((h) => (
                    <button
                      key={h.habit.id}
                      type="button"
                      aria-pressed={h.completedToday}
                      onClick={() => void toggleHabitDate(h.habit.id, localDateKey())}
                      className={cn(
                        "inline-flex min-h-control items-center gap-2 rounded-sm border px-3 text-body transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                        h.completedToday
                          ? "border-primary bg-accent text-accent-foreground"
                          : "border-control bg-surface-1 hover:bg-surface-2",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex size-4 items-center justify-center rounded-xs border",
                          h.completedToday
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-control",
                        )}
                      >
                        {h.completedToday && <Check className="size-3" />}
                      </span>
                      {h.habit.title}
                      {h.currentStreak > 1 && (
                        <span className="text-caption text-text-3">🔥 {h.currentStreak}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <FocusPreview
            onOpen={() => onNavigate("focus")}
            workMinutes={settings.focusWorkMinutes}
          />

          <ScratchpadPanel
            value={settings.scratchpad}
            onSave={(v) => void updateSettings({ scratchpad: v })}
            onSavedAsNote={() => onNavigate("notes")}
          />

          <UtilitiesPanel onNavigate={onNavigate} />
        </div>
      </div>

      <QuickTaskDialog open={taskOpen} onOpenChange={setTaskOpen} />
    </div>
  );
}

function widgetName(t: ReturnType<typeof useI18n>["t"], k: WidgetKind) {
  return { clock: t.navClock, focus: t.navFocus, cpu: "CPU", sticky: t.homeScratchpad }[k];
}

function FocusPreview({ onOpen, workMinutes }: { onOpen: () => void; workMinutes: number }) {
  const { t } = useI18n();
  const state = loadTimerState();
  const secs = state ? state.remainingSeconds : workMinutes * 60;
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return (
    <Card className="@[1000px]:col-span-5">
      <CardHeader>
        <CardTitle>{t.navFocus}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <p className="text-numeral tabular">
            {mm}:{ss}
          </p>
          <p className="text-caption text-text-3">
            {state?.running ? t.homeFocusRunning : t.homeFocusIdle}
          </p>
        </div>
        <Button onClick={onOpen}>
          <Timer />
          {state?.running ? t.homeFocusOpen : t.homeFocusStart}
        </Button>
      </CardContent>
    </Card>
  );
}

function ScratchpadPanel({
  value,
  onSave,
  onSavedAsNote,
}: {
  value: string;
  onSave: (v: string) => void;
  onSavedAsNote: () => void;
}) {
  const { t } = useI18n();
  const [text, setText] = useState(value);
  const [saving, setSaving] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => setText(value), [value]);
  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    },
    [],
  );

  const change = (v: string) => {
    setText(v);
    setSaving(true);
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      onSave(v);
      setSaving(false);
    }, 400);
  };

  const saveAsNote = async () => {
    const body = text.trim();
    if (!body) return;
    try {
      await createNote({ title: body.split("\n")[0]?.slice(0, 60) || t.homeScratchpad, body });
      if (timer.current != null) window.clearTimeout(timer.current);
      setText("");
      onSave("");
      toast.success(t.saved);
      onSavedAsNote();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Card className="@[1000px]:col-span-8">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{t.homeScratchpad}</CardTitle>
        <span className="text-caption text-text-3" aria-live="polite">
          {saving ? t.homeSaving : t.homeSavedLocally}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          id="dn-scratchpad"
          aria-label={t.homeScratchpad}
          className="min-h-[120px]"
          placeholder={t.stickyPlaceholder}
          value={text}
          onChange={(e) => change(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!text.trim()}
            onClick={() => void saveAsNote()}
          >
            {t.homeSaveAsNote}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void openWidgetWindow("sticky")}>
            {t.homeOpenWidget.replace("{name}", t.homeScratchpad)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UtilitiesPanel({ onNavigate }: { onNavigate: (route: AppRoute) => void }) {
  const { t, locale } = useI18n();
  const { settings } = useSettings();
  const { stats } = useSystemStats(3000);
  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    void fetchWeather(settings.weatherLat, settings.weatherLon, settings.temperatureUnit)
      .then(setWeather)
      .catch(() => setWeather(null));
  }, [settings.weatherLat, settings.weatherLon, settings.temperatureUnit]);

  const zone = getZoneById(settings.primaryTimezone);
  const time = new Intl.DateTimeFormat(localeTag(locale), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: settings.primaryTimezone,
  }).format(now);
  const ram =
    stats && stats.memory.total > 0 ? (stats.memory.used / stats.memory.total) * 100 : null;
  const unit = settings.temperatureUnit === "fahrenheit" ? "°F" : "°C";

  const row = (label: string, value: string, route: AppRoute, title?: string) => (
    <button
      type="button"
      onClick={() => onNavigate(route)}
      title={title}
      className="flex w-full items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-left hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <span className="text-caption text-text-3">{label}</span>
      <span className="truncate text-body tabular">{value}</span>
    </button>
  );

  return (
    <Card className="@[1000px]:col-span-4">
      <CardHeader>
        <CardTitle>{t.homeUtilities}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0.5">
        {row(
          t.navClock,
          `${time} · ${zone ? zoneLabel(zone, locale) : settings.primaryTimezone}`,
          "clock",
          settings.primaryTimezone,
        )}
        {row(
          t.navWeather,
          weather
            ? `${weatherEmoji(weather.current.weatherCode, weather.current.isDay)} ${Math.round(weather.current.temperature)}${unit} · ${weatherCodeLabel(weather.current.weatherCode, locale)}`
            : "—",
          "weather",
        )}
        {row(
          t.navSystem,
          stats
            ? `CPU ${formatPercent(stats.global_cpu_usage)} · RAM ${ram != null ? formatPercent(ram) : "—"}`
            : "—",
          "system",
        )}
      </CardContent>
    </Card>
  );
}

function QuickTaskDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await createTodo({ title: title.trim(), due_at: due ? due.toISOString() : null });
      toast.success(t.saved);
      setTitle("");
      setDue(null);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.homeAddTask}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="quick-task-title">{t.title}</Label>
            <Input
              id="quick-task-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="quick-task-due">{t.todoDue}</Label>
            <DateTimePicker id="quick-task-due" value={due} onChange={setDue} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.cancel}
          </Button>
          <Button disabled={busy || !title.trim()} aria-busy={busy} onClick={() => void submit()}>
            {t.homeAddTask}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
