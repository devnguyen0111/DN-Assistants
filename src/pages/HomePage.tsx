import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckSquare, Clock3, Cpu, MemoryStick, NotebookPen } from "lucide-react";
import { BentoGrid, BentoItem } from "@/components/bento/BentoGrid";
import { WeatherCard } from "@/components/cards/WeatherCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state-block";
import { Skeleton } from "@/components/ui/skeleton";
import { useSystemStats } from "@/hooks/useSystemStats";
import { formatEventRange, listUpcoming, type CalendarEvent } from "@/lib/events";
import { listNotes, type Note } from "@/lib/notes";
import { listTodos, type Todo } from "@/lib/todos";
import { localeTag, useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-context";
import { pad2, formatPercent, formatBytes } from "@/lib/utils";
import { zonedParts } from "@/lib/timezones";
import type { AppRoute } from "@/lib/routing";

type Props = {
  onNavigate: (route: AppRoute) => void;
};

export function HomePage({ onNavigate }: Props) {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const { settings } = useSettings();
  const [now, setNow] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
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
  }, []);

  const primary = useMemo(
    () => zonedParts(now, settings.primaryTimezone),
    [now, settings.primaryTimezone],
  );

  const ramPct =
    stats && stats.memory.total > 0
      ? (stats.memory.used / stats.memory.total) * 100
      : 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t.homeWelcome}</h2>
        <p className="text-sm text-muted-foreground">{t.homeWelcomeDesc}</p>
      </div>

      <BentoGrid className="xl:grid-cols-2">
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
                  {stats ? formatPercent(stats.global_cpu_usage, tag) : <Skeleton className="inline-block h-7 w-16" />}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MemoryStick className="size-3" />
                  {t.ram}
                </div>
                <p className="font-mono text-xl font-semibold tabular-nums">
                  {stats ? formatPercent(ramPct, tag) : <Skeleton className="inline-block h-7 w-16" />}
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
            </CardHeader>
            <CardContent className="space-y-1.5">
              {todos.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.todoEmpty}</p>
              ) : (
                todos.map((todo) => (
                  <p key={todo.id} className="truncate text-sm">
                    {todo.title}
                  </p>
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
      </BentoGrid>
    </div>
  );
}
