import { useCallback, useEffect, useMemo, useState } from "react";
import { Link2Off, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Section } from "@/components/layout/Section";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/state-block";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { localeTag, useI18n } from "@/lib/i18n";
import {
  createTodo,
  TODO_REMIND_OPTIONS,
  deleteTodo,
  listTodos,
  toggleTodo,
  updateTodo,
  type Todo,
  type TodoPriority,
  type TodoRepeat,
} from "@/lib/todos";
import { createEvent, listEvents, listUpcoming, type CalendarEvent } from "@/lib/events";
import { cn } from "@/lib/utils";

const PRIORITY_ORDER: Record<TodoPriority, number> = { high: 0, medium: 1, low: 2 };

const PRIORITY_BADGE: Record<TodoPriority, string> = {
  high: "bg-danger-soft text-danger",
  medium: "bg-warning-soft text-warning",
  low: "bg-surface-3 text-text-2",
};

type TodoFilter = "all" | "active" | "due" | "completed";

export function TodoCard() {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<TodoPriority>("medium");
  const [newDue, setNewDue] = useState<Date | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newRepeat, setNewRepeat] = useState<TodoRepeat>("none");
  const [newRemind, setNewRemind] = useState<string>("none");
  const [filter, setFilter] = useState<TodoFilter>("active");
  const [confirmClearCompleted, setConfirmClearCompleted] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setTodos(await listTodos());
    } catch {
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshEvents = useCallback(async () => {
    try {
      const upcoming = await listUpcoming(40);
      const all = upcoming.length > 0 ? upcoming : await listEvents();
      setEvents(all);
    } catch {
      setEvents([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
    void refreshEvents();
    const onTodos = () => void refresh();
    const onEvents = () => void refreshEvents();
    window.addEventListener("dn-todos-changed", onTodos);
    window.addEventListener("dn-events-changed", onEvents);
    return () => {
      window.removeEventListener("dn-todos-changed", onTodos);
      window.removeEventListener("dn-events-changed", onEvents);
    };
  }, [refresh, refreshEvents]);

  const eventById = useMemo(() => {
    const map = new Map<string, CalendarEvent>();
    for (const event of events) map.set(String(event.id), event);
    return map;
  }, [events]);

  const priorityLabel = (p: TodoPriority) =>
    p === "high" ? t.todoPriorityHigh : p === "medium" ? t.todoPriorityMedium : t.todoPriorityLow;

  const repeatLabel = (r: TodoRepeat) =>
    r === "daily" ? t.repeatDaily : r === "weekly" ? t.repeatWeekly : t.repeatNone;

  const filtered = useMemo(() => {
    return todos
      .filter((todo) => {
        if (filter === "all") return true;
        if (filter === "active") return todo.done === 0;
        if (filter === "completed") return todo.done === 1;
        if (filter === "due") {
          return todo.done === 0 && Boolean(todo.due_at);
        }
        return true;
      })
      .sort((a, b) => {
        if (a.done !== b.done) return a.done - b.done;
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      });
  }, [todos, filter]);

  const completedCount = useMemo(() => {
    return todos.filter((t) => t.done === 1).length;
  }, [todos]);

  const add = async () => {
    if (!newTitle.trim()) return;
    try {
      await createTodo({
        title: newTitle.trim(),
        priority: newPriority,
        due_at: newDue ? newDue.toISOString() : null,
        repeat: newRepeat,
        remind_minutes: newDue && newRemind !== "none" ? Number(newRemind) : null,
      });
      setNewTitle("");
      setNewDue(null);
      setNewRepeat("none");
      setNewRemind("none");
      toast.success(t.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const toggle = async (todo: Todo) => {
    try {
      await toggleTodo(todo.id, todo.done === 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteTodo(id);
      toast.success(t.deleted);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const clearAllCompleted = async () => {
    try {
      const completed = todos.filter((t) => t.done === 1);
      await Promise.all(completed.map((t) => deleteTodo(t.id)));
      toast.success(t.deleted);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setConfirmClearCompleted(false);
    }
  };

  const linkEvent = async (todo: Todo, eventId: string) => {
    try {
      await updateTodo(todo.id, { event_id: eventId === "none" ? null : eventId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const unlinkEvent = async (todo: Todo) => {
    try {
      await updateTodo(todo.id, { event_id: null });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const setRepeat = async (todo: Todo, repeat: TodoRepeat) => {
    try {
      await updateTodo(todo.id, { repeat });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const setRemind = async (todo: Todo, value: string) => {
    try {
      await updateTodo(todo.id, { remind_minutes: value === "none" ? null : Number(value) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const remindLabel = (m: number) =>
    m === 0
      ? t.todoRemindAtDue
      : m >= 1440
        ? t.todoRemindDayBefore
        : t.todoRemindBefore.replace("{n}", String(m));

  const createFromDue = async (todo: Todo) => {
    if (!todo.due_at) return;
    try {
      const startAt = new Date(todo.due_at).getTime();
      const event = await createEvent({
        title: todo.title,
        note: `Todo: ${todo.title}`,
        start_at: startAt,
        end_at: startAt + 30 * 60 * 1000,
        all_day: false,
        color: todo.priority === "high" ? "#ef4444" : "#3b82f6",
        remind_minutes: 15,
        repeat: todo.repeat ?? "none",
      });
      await updateTodo(todo.id, { event_id: String(event) });
      toast.success(t.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const now = Date.now();
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const endToday = startToday.getTime() + 86_400_000;
  const groupOf = (todo: Todo): "overdue" | "today" | "upcoming" | "nodate" | "done" => {
    if (todo.done === 1) return "done";
    if (!todo.due_at) return "nodate";
    const due = Date.parse(todo.due_at);
    if (due < now) return "overdue";
    if (due < endToday) return "today";
    return "upcoming";
  };
  const GROUPS: { key: ReturnType<typeof groupOf>; label: string }[] = [
    { key: "overdue", label: t.todoGroupOverdue },
    { key: "today", label: t.todoGroupToday },
    { key: "upcoming", label: t.todoGroupUpcoming },
    { key: "nodate", label: t.todoGroupNoDate },
    { key: "done", label: t.todoFilterDone },
  ];
  const fmtDue = new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeStyle: "short" });

  const renderRow = (todo: Todo) => {
    const linked = todo.event_id ? eventById.get(todo.event_id) : undefined;
    const open = expanded === todo.id;
    const overdue = groupOf(todo) === "overdue";
    return (
      <li key={todo.id} className="border-b last:border-b-0">
        <div className="flex min-h-row items-start gap-3 px-3 py-2 hover:bg-surface-2">
          <Checkbox
            checked={todo.done === 1}
            onCheckedChange={() => void toggle(todo)}
            aria-label={todo.title}
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "line-clamp-2 text-body text-text-1",
                todo.done === 1 && "text-text-3 line-through",
              )}
            >
              {todo.title}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-3">
              <Badge className={PRIORITY_BADGE[todo.priority]}>
                {priorityLabel(todo.priority)}
              </Badge>
              {todo.due_at && (
                <span className={cn("tabular", overdue && "font-medium text-danger")}>
                  {overdue ? `${t.todoOverdue} · ` : ""}
                  {fmtDue.format(new Date(todo.due_at))}
                </span>
              )}
              {todo.repeat && todo.repeat !== "none" && <span>{repeatLabel(todo.repeat)}</span>}
              {todo.remind_minutes != null && todo.due_at && (
                <span>🔔 {remindLabel(todo.remind_minutes)}</span>
              )}
              {linked && <span className="max-w-[12rem] truncate">📅 {linked.title}</span>}
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            aria-expanded={open}
            onClick={() => setExpanded(open ? null : todo.id)}
          >
            {t.todoDetails}
          </Button>
          <Button
            size="icon"
            variant="ghost-danger"
            className="size-7"
            aria-label={`${t.delete}: ${todo.title}`}
            onClick={() => void remove(todo.id)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
        {open && (
          <div className="grid gap-3 border-t bg-surface-2 px-3 py-3 pl-10 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-caption text-text-3">{t.repeat}</Label>
              <Select
                value={todo.repeat ?? "none"}
                onValueChange={(v) => void setRepeat(todo, v as TodoRepeat)}
              >
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
            <div className="space-y-1">
              <Label className="text-caption text-text-3">{t.todoReminder}</Label>
              <Select
                disabled={!todo.due_at}
                value={todo.remind_minutes == null ? "none" : String(todo.remind_minutes)}
                onValueChange={(v) => void setRemind(todo, v)}
              >
                <SelectTrigger title={todo.due_at ? undefined : t.todoRemindNeedsDue}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.todoRemindNone}</SelectItem>
                  {TODO_REMIND_OPTIONS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {remindLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!todo.due_at && <p className="text-caption text-text-3">{t.todoRemindNeedsDue}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-caption text-text-3">{t.linkEvent}</Label>
              <div className="flex gap-2">
                <Select
                  value={todo.event_id ?? "none"}
                  onValueChange={(v) => void linkEvent(todo, v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={String(event.id)}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {todo.event_id ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t.unlinkEvent}
                    onClick={() => void unlinkEvent(todo)}
                  >
                    <Link2Off />
                  </Button>
                ) : todo.due_at ? (
                  <Button variant="outline" onClick={() => void createFromDue(todo)}>
                    {t.createEventFromDue}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </li>
    );
  };

  return (
    <>
      <div className="space-y-6">
        <section
          aria-label={t.todoAdd}
          className="space-y-3 rounded-lg border bg-surface-1 p-panel shadow-panel"
        >
          <div className="flex flex-wrap gap-2">
            <Input
              aria-label={t.todoAdd}
              placeholder={t.todoAdd}
              className="min-w-60 flex-1"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void add();
              }}
            />
            <Button onClick={() => void add()} disabled={!newTitle.trim()}>
              <Plus />
              {t.todoAdd}
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-56 space-y-1">
              <Label htmlFor="todo-due" className="text-caption text-text-3">
                {t.todoDue}
              </Label>
              <DateTimePicker
                id="todo-due"
                value={newDue}
                onChange={setNewDue}
                aria-label={t.todoDue}
              />
            </div>
            <div className="w-36 space-y-1">
              <Label className="text-caption text-text-3">{t.todoPriority}</Label>
              <Select value={newPriority} onValueChange={(v) => setNewPriority(v as TodoPriority)}>
                <SelectTrigger aria-label={t.todoPriority}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t.todoPriorityLow}</SelectItem>
                  <SelectItem value="medium">{t.todoPriorityMedium}</SelectItem>
                  <SelectItem value="high">{t.todoPriorityHigh}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" aria-expanded={showMore} onClick={() => setShowMore((v) => !v)}>
              {showMore ? t.todoLessDetails : t.todoMoreDetails}
            </Button>
          </div>
          {showMore && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-40 space-y-1">
                <Label className="text-caption text-text-3">{t.repeat}</Label>
                <Select value={newRepeat} onValueChange={(v) => setNewRepeat(v as TodoRepeat)}>
                  <SelectTrigger aria-label={t.repeat}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.repeatNone}</SelectItem>
                    <SelectItem value="daily">{t.repeatDaily}</SelectItem>
                    <SelectItem value="weekly">{t.repeatWeekly}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-44 space-y-1">
                <Label className="text-caption text-text-3">{t.todoReminder}</Label>
                <Select value={newRemind} onValueChange={setNewRemind} disabled={!newDue}>
                  <SelectTrigger aria-label={t.todoReminder}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.todoRemindNone}</SelectItem>
                    {TODO_REMIND_OPTIONS.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {remindLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!newDue && <p className="pb-2 text-caption text-text-3">{t.todoRemindNeedsDue}</p>}
            </div>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            label={t.todoFilterLabel}
            value={filter}
            onValueChange={setFilter}
            options={[
              { value: "all", label: t.todoFilterAll },
              { value: "active", label: t.todoFilterActive },
              { value: "due", label: t.todoFilterDue },
              { value: "completed", label: t.todoFilterDone },
            ]}
          />
          {completedCount > 0 && (
            <Button variant="ghost-danger" onClick={() => setConfirmClearCompleted(true)}>
              <Trash2 />
              {t.clearCompleted} ({completedCount})
            </Button>
          )}
        </div>

        {loading ? (
          <LoadingState rows={4} />
        ) : filtered.length === 0 ? (
          <EmptyState size="page" title={t.todoEmpty} />
        ) : (
          GROUPS.map(({ key, label }) => {
            const rows = filtered.filter((todo) => groupOf(todo) === key);
            if (rows.length === 0) return null;
            return (
              <Section key={key} title={`${label} (${rows.length})`}>
                <ul className="overflow-hidden rounded-lg border bg-surface-1">
                  {rows.map(renderRow)}
                </ul>
              </Section>
            );
          })
        )}
      </div>

      <AlertDialog open={confirmClearCompleted} onOpenChange={setConfirmClearCompleted}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.clearCompletedConfirm}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void clearAllCompleted()}>
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
