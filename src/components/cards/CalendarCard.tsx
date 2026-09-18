import { useEffect, useMemo, useRef, useState } from "react";
import { animate, createScope } from "animejs";
import { ChevronLeft, ChevronRight, Plus, Volume2, VolumeX } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { localeTag, useI18n } from "@/lib/i18n";
import {
  createEvent,
  deleteEvent,
  formatEventRange,
  listEvents,
  sameDay,
  startOfDay,
  updateEvent,
  type CalendarEvent,
  type EventRepeat,
} from "@/lib/events";
import { exportEventsToIcs, parseIcs } from "@/lib/ics";
import { isSoundMuted, setSoundMuted } from "@/lib/notify";
import { cn, formatTimeHm } from "@/lib/utils";

type Props = {
  onEventsChanged?: () => void;
  editEvent?: CalendarEvent | null;
  onEditConsumed?: () => void;
};

const EVENT_COLORS = ["#38bdf8", "#34d399", "#fbbf24", "#f472b6", "#a78bfa", "#fb7185"];
const REMIND_OPTIONS = [0, 5, 15, 30, 60];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function toLocalInputValue(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function chipLabel(event: CalendarEvent, allDayLabel: string) {
  if (event.all_day === 1) return `${allDayLabel} ${event.title}`;
  return `${formatTimeHm(event.start_at)} ${event.title}`;
}

export function CalendarCard({ onEventsChanged, editEvent, onEditConsumed }: Props) {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [startValue, setStartValue] = useState("");
  const [endValue, setEndValue] = useState("");
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [remindMinutes, setRemindMinutes] = useState(0);
  const [repeat, setRepeat] = useState<EventRepeat>("none");
  const [muted, setMuted] = useState(() => isSoundMuted());
  const gridRef = useRef<HTMLDivElement>(null);
  const scope = useRef<ReturnType<typeof createScope> | null>(null);

  const refresh = async () => {
    try {
      setEvents(await listEvents());
      onEventsChanged?.();
      window.dispatchEvent(new Event("dn-events-changed"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const openEdit = (event: CalendarEvent) => {
    setEditing(event);
    setSelectedDay(new Date(event.start_at));
    setTitle(event.title);
    setNote(event.note ?? "");
    setAllDay(event.all_day === 1);
    setColor(event.color ?? EVENT_COLORS[0]);
    setRemindMinutes(event.remind_minutes ?? 0);
    setRepeat(event.repeat ?? "none");
    setStartValue(toLocalInputValue(event.start_at));
    setEndValue(toLocalInputValue(event.end_at ?? event.start_at + 60 * 60 * 1000));
    setOpen(true);
  };

  useEffect(() => {
    if (!editEvent) return;
    openEdit(editEvent);
    onEditConsumed?.();
  }, [editEvent]);

  useEffect(() => {
    if (!gridRef.current) return;
    scope.current?.revert();
    scope.current = createScope({ root: gridRef }).add(() => {
      animate(".cal-cell", {
        opacity: [0, 1],
        y: [8, 0],
        delay: (_el: unknown, i = 0) => i * 6,
        duration: 260,
        ease: "outQuad",
      });
    });
    return () => scope.current?.revert();
  }, [cursor]);

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(tag, { month: "long", year: "numeric" }).format(cursor),
    [cursor, tag],
  );

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(tag, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(Date.UTC(2024, 0, 7 + i));
      return formatter.format(day);
    });
  }, [tag]);

  const selectedDayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(tag, {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(selectedDay),
    [selectedDay, tag],
  );

  /** Always 6 weeks × 7 days = 42 cells for stable height. */
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
    while (items.length < 42) {
      items.push({ date: null, key: `t-${items.length}` });
    }
    return items;
  }, [cursor]);

  const dayEvents = useMemo(
    () =>
      events
        .filter((event) => sameDay(event.start_at, selectedDay.getTime()))
        .sort((a, b) => a.start_at - b.start_at),
    [events, selectedDay],
  );

  const openCreate = (date: Date) => {
    setEditing(null);
    setSelectedDay(date);
    setTitle("");
    setNote("");
    setAllDay(false);
    setColor(EVENT_COLORS[0]);
    setRemindMinutes(0);
    setRepeat("none");
    const start = new Date(date);
    start.setHours(9, 0, 0, 0);
    setStartValue(toLocalInputValue(start.getTime()));
    setEndValue(toLocalInputValue(start.getTime() + 60 * 60 * 1000));
    setOpen(true);
  };

  const exportIcs = async () => {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await save({
        defaultPath: "dn-assistant-calendar.ics",
        filters: [{ name: "ICS", extensions: ["ics"] }],
      });
      if (!path) return;
      await writeTextFile(path, exportEventsToIcs(events));
      toast.success(t.icsSuccess);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const importIcs = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await open({
        multiple: false,
        filters: [{ name: "ICS", extensions: ["ics", "ical"] }],
      });
      if (!path || typeof path !== "string") return;
      const text = await readTextFile(path);
      const parsed = parseIcs(text);
      for (const input of parsed) {
        await createEvent(input);
      }
      await refresh();
      toast.success(t.icsSuccess);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const goToday = () => {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(now);
  };

  const toggleMute = () => {
    const next = !muted;
    setSoundMuted(next);
    setMuted(next);
    void import("@/lib/settings").then(({ saveSettings }) => saveSettings({ soundMuted: next }));
  };

  const save = async () => {
    if (!title.trim()) return;
    const start_at = new Date(startValue).getTime();
    if (!Number.isFinite(start_at)) {
      toast.error(t.invalidStartTime);
      return;
    }
    let end_at: number | null = null;
    if (!allDay) {
      end_at = new Date(endValue).getTime();
      if (!Number.isFinite(end_at) || end_at < start_at) {
        toast.error(t.invalidEndTime);
        return;
      }
    }
    const payload = {
      title: title.trim(),
      note: note.trim() || undefined,
      start_at: allDay ? startOfDay(start_at) : start_at,
      end_at,
      all_day: allDay,
      color,
      remind_minutes: remindMinutes,
      repeat,
      repeat_until: editing?.repeat_until ?? null,
    };
    try {
      if (editing) await updateEvent(editing.id, payload);
      else await createEvent(payload);
      setOpen(false);
      await refresh();
      toast.success(t.saved);
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
      toast.success(t.deleted);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const today = startOfDay(Date.now());
  const remindLabel = (n: number) =>
    n === 0 ? t.remindAtStart : t.remindMinutesBefore.replace("{n}", String(n));

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Card className="h-full">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle>{t.calendar}</CardTitle>
            <div className="flex flex-wrap items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                title={muted ? t.soundOff : t.soundOn}
              >
                {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={goToday}>
                {t.today}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-32 text-center text-sm font-medium capitalize">
                {monthLabel}
              </span>
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
                onClick={() => openCreate(selectedDay)}
              >
                <Plus className="size-4" />
                {t.addEvent}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void exportIcs()}>
                {t.icsExport}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void importIcs()}>
                {t.icsImport}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
              {weekdayLabels.map((label) => (
                <div key={label}>{label}</div>
              ))}
            </div>
            <div
              ref={gridRef}
              className="grid grid-cols-7 gap-1"
              role="grid"
              aria-label={t.calendar}
              onKeyDown={(e) => {
                const delta =
                  e.key === "ArrowLeft"
                    ? -1
                    : e.key === "ArrowRight"
                      ? 1
                      : e.key === "ArrowUp"
                        ? -7
                        : e.key === "ArrowDown"
                          ? 7
                          : 0;
                if (!delta) return;
                e.preventDefault();
                setSelectedDay((prev) => {
                  const next = new Date(prev);
                  next.setDate(next.getDate() + delta);
                  setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
                  return next;
                });
              }}
            >
              {cells.map((cell) => {
                if (!cell.date) {
                  return (
                    <div
                      key={cell.key}
                      className="cal-cell min-h-[72px] rounded-md border border-transparent bg-muted/10"
                    />
                  );
                }
                const cellEvents = events
                  .filter((event) => sameDay(event.start_at, cell.date!.getTime()))
                  .sort((a, b) => a.start_at - b.start_at);
                const isToday = startOfDay(cell.date.getTime()) === today;
                const isSelected = sameDay(selectedDay.getTime(), cell.date.getTime());
                const visible = cellEvents.slice(0, 2);
                const extra = cellEvents.length - visible.length;
                return (
                  <button
                    key={cell.key}
                    type="button"
                    className={cn(
                      "cal-cell flex min-h-[72px] flex-col items-stretch rounded-md border border-transparent p-1 text-left text-xs transition-colors hover:border-border hover:bg-accent",
                      isToday && "border-primary/40 bg-primary/10",
                      isSelected && "ring-1 ring-ring",
                    )}
                    onClick={() => setSelectedDay(cell.date!)}
                  >
                    <span className="mb-0.5 px-0.5 font-medium tabular-nums">
                      {cell.date.getDate()}
                    </span>
                    <div className="flex min-h-[36px] flex-col gap-0.5">
                      {visible.map((event) => (
                        <span
                          key={event.id}
                          className="truncate rounded px-1 py-0.5 text-[10px] leading-tight text-white"
                          style={{ background: event.color ?? "#38bdf8" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(event);
                          }}
                        >
                          {chipLabel(event, t.allDay)}
                        </span>
                      ))}
                      {extra > 0 && (
                        <span className="px-0.5 text-[10px] text-muted-foreground">
                          {t.moreEvents.replace("{n}", String(extra))}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="space-y-1">
            <CardTitle>{t.dayEvents}</CardTitle>
            <p className="text-xs capitalize text-muted-foreground">{selectedDayLabel}</p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px] pr-2">
              {dayEvents.length === 0 ? (
                <div className="flex h-[200px] flex-col items-center justify-center gap-3 text-center">
                  <p className="text-sm text-muted-foreground">{t.noDayEvents}</p>
                  <Button size="sm" variant="outline" onClick={() => openCreate(selectedDay)}>
                    <Plus className="size-4" />
                    {t.addEvent}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      className="flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left hover:bg-accent"
                      onClick={() => openEdit(event)}
                    >
                      <span
                        className="mt-1.5 size-2.5 shrink-0 rounded-full"
                        style={{ background: event.color ?? "#38bdf8" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{event.title}</p>
                        <p className="font-mono text-xs tabular-nums text-muted-foreground">
                          {formatEventRange(event, t.allDay)}
                        </p>
                        {event.note && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {event.note}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="shrink-0 font-mono tabular-nums">
                        {event.all_day === 1 ? t.allDay : formatTimeHm(event.start_at)}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

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
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t.color}</label>
              <div className="flex flex-wrap gap-2">
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "size-7 rounded-full border-2 transition-transform",
                      color === c ? "scale-110 border-foreground" : "border-transparent",
                    )}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t.remind}</label>
              <Select
                value={String(remindMinutes)}
                onValueChange={(v) => setRemindMinutes(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMIND_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {remindLabel(n)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t.repeat}</label>
              <Select value={repeat} onValueChange={(v) => setRepeat(v as EventRepeat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.repeatNone}</SelectItem>
                  <SelectItem value="daily">{t.repeatDaily}</SelectItem>
                  <SelectItem value="weekly">{t.repeatWeekly}</SelectItem>
                </SelectContent>
              </Select>
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
