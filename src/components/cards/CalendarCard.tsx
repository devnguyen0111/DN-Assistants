import { useEffect, useMemo, useRef, useState } from "react";
import { animate, createScope } from "animejs";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { localeTag, useI18n } from "@/lib/i18n";
import {
  createEvent,
  deleteEvent,
  listEvents,
  sameDay,
  startOfDay,
  updateEvent,
  type CalendarEvent,
} from "@/lib/events";
import { cn } from "@/lib/utils";

type Props = {
  onEventsChanged?: () => void;
};

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function toLocalInputValue(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CalendarCard({ onEventsChanged }: Props) {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [startValue, setStartValue] = useState("");
  const [endValue, setEndValue] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  const scope = useRef<ReturnType<typeof createScope> | null>(null);

  const refresh = async () => {
    try {
      setEvents(await listEvents());
      onEventsChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!gridRef.current) return;
    scope.current?.revert();
    scope.current = createScope({ root: gridRef }).add(() => {
      animate(".cal-cell", {
        opacity: [0, 1],
        y: [8, 0],
        delay: (_el: unknown, i = 0) => i * 8,
        duration: 280,
        ease: "outQuad",
      });
    });
    return () => scope.current?.revert();
  }, [cursor]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(tag, { month: "long", year: "numeric" }).format(cursor),
    [cursor, tag],
  );

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(tag, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) => {
      // Jan 7 2024 is a Sunday — build a Sunday-based week label set.
      const day = new Date(Date.UTC(2024, 0, 7 + i));
      return formatter.format(day);
    });
  }, [tag]);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const total = daysInMonth(year, month);
    const items: Array<{ date: Date | null; key: string }> = [];
    for (let i = 0; i < firstWeekday; i += 1) items.push({ date: null, key: `e-${i}` });
    for (let day = 1; day <= total; day += 1) {
      items.push({ date: new Date(year, month, day), key: `d-${day}` });
    }
    while (items.length % 7 !== 0) {
      items.push({ date: null, key: `t-${items.length}` });
    }
    return items;
  }, [cursor]);

  const openCreate = (date: Date) => {
    setEditing(null);
    setSelectedDay(date);
    setTitle("");
    setNote("");
    setAllDay(true);
    const start = startOfDay(date.getTime());
    setStartValue(toLocalInputValue(start));
    setEndValue(toLocalInputValue(start + 60 * 60 * 1000));
    setOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setEditing(event);
    setSelectedDay(new Date(event.start_at));
    setTitle(event.title);
    setNote(event.note ?? "");
    setAllDay(event.all_day === 1);
    setStartValue(toLocalInputValue(event.start_at));
    setEndValue(toLocalInputValue(event.end_at ?? event.start_at + 60 * 60 * 1000));
    setOpen(true);
  };

  const save = async () => {
    if (!title.trim()) return;
    const start_at = new Date(startValue).getTime();
    const end_at = allDay ? null : new Date(endValue).getTime();
    const payload = {
      title: title.trim(),
      note: note.trim() || undefined,
      start_at: allDay ? startOfDay(start_at) : start_at,
      end_at,
      all_day: allDay,
    };
    try {
      if (editing) await updateEvent(editing.id, payload);
      else await createEvent(payload);
      setOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const remove = async () => {
    if (!editing) return;
    try {
      await deleteEvent(editing.id);
      setOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const today = startOfDay(Date.now());

  return (
    <>
      <Card className="h-full">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>{t.calendar}</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-32 text-center text-sm font-medium capitalize">{monthLabel}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="ml-1"
              onClick={() => openCreate(new Date())}
            >
              <Plus className="size-4" />
              {t.addEvent}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
            {weekdayLabels.map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>
          <div ref={gridRef} className="grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              if (!cell.date) {
                return <div key={cell.key} className="cal-cell aspect-square rounded-md" />;
              }
              const dayEvents = events.filter((event) =>
                sameDay(event.start_at, cell.date!.getTime()),
              );
              const isToday = startOfDay(cell.date.getTime()) === today;
              return (
                <button
                  key={cell.key}
                  type="button"
                  className={cn(
                    "cal-cell flex aspect-square flex-col items-center justify-start rounded-md border border-transparent p-1 text-xs transition-colors hover:border-border hover:bg-accent",
                    isToday && "border-primary/40 bg-primary/10",
                    selectedDay &&
                      sameDay(selectedDay.getTime(), cell.date.getTime()) &&
                      "ring-1 ring-ring",
                  )}
                  onClick={() => {
                    if (dayEvents[0]) openEdit(dayEvents[0]);
                    else openCreate(cell.date!);
                  }}
                >
                  <span className="font-medium">{cell.date.getDate()}</span>
                  <div className="mt-auto flex gap-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <span
                        key={event.id}
                        className="size-1.5 rounded-full"
                        style={{ background: event.color ?? "#38bdf8" }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
          {selectedDay && (
            <div className="mt-3 space-y-1">
              {events
                .filter((event) => sameDay(event.start_at, selectedDay.getTime()))
                .map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => openEdit(event)}
                  >
                    <span className="truncate">{event.title}</span>
                    <Badge variant="secondary">{event.all_day ? t.allDay : "timed"}</Badge>
                  </button>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t.editEvent : t.addEvent}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t.title}</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t.note}</label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
              />
              {t.allDay}
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t.start}</label>
                <Input
                  type="datetime-local"
                  value={startValue}
                  onChange={(e) => setStartValue(e.target.value)}
                />
              </div>
              {!allDay && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t.end}</label>
                  <Input
                    type="datetime-local"
                    value={endValue}
                    onChange={(e) => setEndValue(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            {editing && (
              <Button variant="destructive" onClick={() => void remove()}>
                {t.delete}
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={() => void save()}>{t.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
