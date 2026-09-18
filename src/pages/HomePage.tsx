import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckSquare,
  ClipboardList,
  Clock3,
  Cpu,
  Flame,
  MemoryStick,
  NotebookPen,
  Timer,
} from "lucide-react";
import { BentoGrid, BentoItem } from "@/components/bento/BentoGrid";
import { WeatherCard } from "@/components/cards/WeatherCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state-block";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useSystemStats } from "@/hooks/useSystemStats";
import { formatEventRange, listUpcoming, type CalendarEvent } from "@/lib/events";
import { createNote, listNotes, type Note } from "@/lib/notes";
import { listTodos, type Todo } from "@/lib/todos";
import { isDoneToday, listTikTokStreaks, type TikTokStreak } from "@/lib/tiktok-streaks";
import { localeTag, useI18n } from "@/lib/i18n";
import { navLabel } from "@/lib/page-meta";
import { useSettings } from "@/lib/settings-context";
import { pad2, formatPercent, formatBytes } from "@/lib/utils";
import { zonedParts } from "@/lib/timezones";
import type { AppRoute } from "@/lib/routing";
import { toast } from "sonner";

type Props = {
  onNavigate: (route: AppRoute) => void;
};

function greetingKey(hour: number): "greetingMorning" | "greetingAfternoon" | "greetingEvening" {
  if (hour < 12) return "greetingMorning";
  if (hour < 18) return "greetingAfternoon";
  return "greetingEvening";
}

export function HomePage({ onNavigate }: Props) {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const { settings, updateSettings } = useSettings();
  const [now, setNow] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [streaks, setStreaks] = useState<TikTokStreak[]>([]);
  const { stats } = useSystemStats(3000);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    void listUpcoming(5)
      .then((rows) => {
        setEvents(rows);
        setEventsError(null);
      })
      .catch((err) => setEventsError(err instanceof Error ? err.message : String(err)))
      .finally(() => setEventsLoading(false));
    void listTodos()
      .then((rows) => setTodos(rows.filter((x) => !x.done).slice(0, 5)))
      .catch(() => setTodos([]));
    void listNotes()
      .then((rows) => setNotes(rows.slice(0, 4)))
      .catch(() => setNotes([]));
    void listTikTokStreaks()
      .then(setStreaks)
      .catch(() => setStreaks([]));
  }, []);

  const primary = useMemo(
    () => zonedParts(now, settings.primaryTimezone),
    [now, settings.primaryTimezone],
  );

  const ramPct =
    stats && stats.memory.total > 0 ? (stats.memory.used / stats.memory.total) * 100 : 0;

  const greet = t[greetingKey(Number(primary.hours))];

  const saveScratch = async () => {
    const body = settings.scratchpad.trim();
    if (!body) return;
    try {
      await createNote({
        title: body.split("\n")[0]?.slice(0, 60) || t.homeScratchpad,
        body,
      });
      await updateSettings({ scratchpad: "" });
      toast.success(t.saved);
      onNavigate("notes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold tracking-tight">
            {greet} · {t.homeWelcome}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.homeIntro}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onNavigate("about")}>
          {t.homeLearnMore}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="self-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t.homeQuickActions}
        </span>
        <Button size="sm" variant="secondary" onClick={() => onNavigate("notes")}>
          <NotebookPen className="size-3.5" />
          {t.homeNewNote}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onNavigate("todo")}>
          <CheckSquare className="size-3.5" />
          {t.homeOpenTodo}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onNavigate("clipboard")}>
          <ClipboardList className="size-3.5" />
          {t.homeOpenClipboard}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onNavigate("focus")}>
          <Timer className="size-3.5" />
          {t.homeOpenFocus}
        </Button>
      </div>

      {settings.favoriteRoutes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t.homeFavorites}
          </span>
          {settings.favoriteRoutes.map((r) => (
            <Button key={r} size="sm" variant="outline" onClick={() => onNavigate(r)}>
              {navLabel(t, r)}
            </Button>
          ))}
        </div>
      )}

      <BentoGrid className="xl:grid-cols-2">
        <BentoItem>
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <NotebookPen className="size-4 text-primary" />
                {t.homeScratchpad}
              </CardTitle>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => void saveScratch()}>
                  {t.homeScratchpadSave}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void updateSettings({ scratchpad: "" })}
                >
                  {t.homeScratchpadClear}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-xs text-muted-foreground">{t.homeScratchpadHint}</p>
              <Textarea
                id="dn-scratchpad"
                value={settings.scratchpad}
                onChange={(e) => void updateSettings({ scratchpad: e.target.value })}
                placeholder={t.noteBodyPlaceholder}
                className="min-h-24"
              />
            </CardContent>
          </Card>
        </BentoItem>

        <BentoItem>
          <Card
            className="h-full cursor-pointer transition-colors hover:bg-accent/30"
            onClick={() => onNavigate("clock")}
          >
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="size-4 text-primary" />
                {t.clock}
              </CardTitle>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {settings.primaryTimezone}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight">
                {pad2(Number(primary.hours))}:{pad2(Number(primary.minutes))}
                <span className="text-2xl text-muted-foreground">
                  :{pad2(Number(primary.seconds))}
                </span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {new Intl.DateTimeFormat(tag, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: settings.primaryTimezone,
                }).format(now)}
              </p>
            </CardContent>
          </Card>
        </BentoItem>

        <BentoItem>
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-4 text-primary" />
                {t.agenda}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onNavigate("calendar")}>
                {t.openCalendar}
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {eventsLoading && <LoadingState title={t.loading} className="py-4" />}
              {!eventsLoading && eventsError && (
                <ErrorState title={t.errorTitle} description={eventsError} className="py-4" />
              )}
              {!eventsLoading && !eventsError && events.length === 0 && (
                <EmptyState title={t.noEvents} className="py-4" />
              )}
              {!eventsLoading &&
                !eventsError &&
                events.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className="flex w-full items-start gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-left transition-colors hover:bg-muted/40"
                    onClick={() => onNavigate("calendar")}
                  >
                    <span
                      className="mt-1.5 size-2 shrink-0 rounded-full"
                      style={{ background: event.color ?? "#38bdf8" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{event.title}</p>
                      <p className="font-mono text-xs text-muted-foreground tabular-nums">
                        {formatEventRange(event, t.allDay)}
                      </p>
                    </div>
                  </button>
                ))}
            </CardContent>
          </Card>
        </BentoItem>

        <BentoItem>
          <Card
            className="h-full cursor-pointer transition-colors hover:bg-accent/30"
            onClick={() => onNavigate("system")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="size-4 text-primary" />
                {t.navSystem}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Cpu className="size-3" />
                  {t.cpu}
                </div>
                <p className="font-mono text-xl font-semibold tabular-nums">
                  {stats ? (
                    formatPercent(stats.global_cpu_usage, tag)
                  ) : (
                    <Skeleton className="inline-block h-7 w-16" />
                  )}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MemoryStick className="size-3" />
                  {t.ram}
                </div>
                <p className="font-mono text-xl font-semibold tabular-nums">
                  {stats ? (
                    formatPercent(ramPct, tag)
                  ) : (
                    <Skeleton className="inline-block h-7 w-16" />
                  )}
                </p>
                {stats && (
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
                    {formatBytes(stats.memory.used, tag)} / {formatBytes(stats.memory.total, tag)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </BentoItem>

        <BentoItem>
          <div
            className="h-full cursor-pointer"
            onClick={() => onNavigate("weather")}
            onKeyDown={(e) => {
              if (e.key === "Enter") onNavigate("weather");
            }}
            role="link"
            tabIndex={0}
          >
            <WeatherCard compact />
          </div>
        </BentoItem>

        <BentoItem>
          <Card
            className="h-full cursor-pointer transition-colors hover:bg-accent/30"
            onClick={() => onNavigate("todo")}
          >
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="size-4 text-primary" />
                {t.homeTodos}
              </CardTitle>
              <Badge variant="secondary">{todos.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {todos.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.todoEmpty}</p>
              ) : (
                todos.map((todo) => (
                  <div key={todo.id} className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm">{todo.title}</p>
                    <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                      {todo.priority}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </BentoItem>

        <BentoItem>
          <Card
            className="h-full cursor-pointer transition-colors hover:bg-accent/30"
            onClick={() => onNavigate("notes")}
          >
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <NotebookPen className="size-4 text-primary" />
                {t.homeNotes}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.notesEmpty}</p>
              ) : (
                notes.map((note) => (
                  <p key={note.id} className="truncate text-sm">
                    {note.title || t.noteTitlePlaceholder}
                  </p>
                ))
              )}
            </CardContent>
          </Card>
        </BentoItem>
        <BentoItem>
          <Card
            className="h-full cursor-pointer transition-colors hover:bg-accent/30"
            onClick={() => onNavigate("tiktok")}
          >
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Flame className="size-4 text-primary" />
                {t.tiktokTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {streaks.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.tiktokEmpty}</p>
              ) : (
                streaks.slice(0, 5).map((item) => {
                  const done = isDoneToday(item);
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm">{item.name}</p>
                      <span
                        className={
                          done
                            ? "shrink-0 text-[11px] text-emerald-600 dark:text-emerald-400"
                            : "shrink-0 text-[11px] text-amber-600 dark:text-amber-400"
                        }
                      >
                        {done ? t.tiktokDoneToday : t.tiktokPending}
                      </span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </BentoItem>
      </BentoGrid>
    </div>
  );
}
