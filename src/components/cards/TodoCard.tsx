import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Link2Off, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState, LoadingState } from "@/components/ui/state-block";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { localeTag, useI18n } from "@/lib/i18n";
import {
  createTodo,
  deleteTodo,
  listTodos,
  toggleTodo,
  updateTodo,
  type Todo,
  type TodoPriority,
  type TodoRepeat,
} from "@/lib/todos";
import {
  createEvent,
  listEvents,
  listUpcoming,
  type CalendarEvent,
} from "@/lib/events";
import { cn } from "@/lib/utils";

const PRIORITY_ORDER: Record<TodoPriority, number> = { high: 0, medium: 1, low: 2 };

const PRIORITY_BADGE: Record<TodoPriority, string> = {
  high: "border-transparent bg-destructive/15 text-destructive",
  medium: "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400",
  low: "border-transparent bg-muted text-muted-foreground",
};

export function TodoCard() {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<TodoPriority>("medium");
  const [newDue, setNewDue] = useState("");
  const [newRepeat, setNewRepeat] = useState<TodoRepeat>("none");
  const [filter, setFilter] = useState<"active" | "completed">("active");

  const refresh = async () => {
    setLoading(true);
    try {
      setTodos(await listTodos());
    } catch {
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshEvents = async () => {
    try {
      const upcoming = await listUpcoming(40);
      const all = upcoming.length > 0 ? upcoming : await listEvents();
      setEvents(all);
    } catch {
      setEvents([]);
    }
  };

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
  }, []);

  const eventById = useMemo(() => {
    const map = new Map<string, CalendarEvent>();
    for (const event of events) map.set(String(event.id), event);
    return map;
  }, [events]);

  const priorityLabel = (p: TodoPriority) =>
    p === "high" ? t.todoPriorityHigh : p === "medium" ? t.todoPriorityMedium : t.todoPriorityLow;

  const repeatLabel = (r: TodoRepeat) =>
    r === "daily" ? t.repeatDaily : r === "weekly" ? t.repeatWeekly : t.repeatNone;

  const filtered = useMemo(
    () =>
      todos
        .filter((todo) => (filter === "active" ? todo.done === 0 : todo.done === 1))
        .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
    [todos, filter],
  );

  const add = async () => {
    if (!newTitle.trim()) return;
    try {
      await createTodo({
        title: newTitle.trim(),
        priority: newPriority,
        due_at: newDue ? new Date(newDue).toISOString() : null,
        repeat: newRepeat,
      });
      setNewTitle("");
      setNewDue("");
      setNewRepeat("none");
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

  const linkEvent = async (todo: Todo, eventId: string) => {
    try {
      await updateTodo(todo.id, { event_id: eventId === "none" ? null : eventId });
      toast.success(t.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const unlinkEvent = async (todo: Todo) => {
    try {
      await updateTodo(todo.id, { event_id: null });
      toast.success(t.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const createFromDue = async (todo: Todo) => {
    if (!todo.due_at) return;
    try {
      const start = new Date(todo.due_at).getTime();
      const id = await createEvent({
        title: todo.title,
        start_at: start,
        end_at: start + 60 * 60 * 1000,
        all_day: false,
        remind_minutes: 0,
        repeat: todo.repeat === "daily" || todo.repeat === "weekly" ? todo.repeat : "none",
      });
      await updateTodo(todo.id, { event_id: String(id) });
      window.dispatchEvent(new Event("dn-events-changed"));
      await refreshEvents();
      toast.success(t.saved);
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

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="size-4 text-primary" />
          {t.todoTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_8rem_8rem_8rem_auto]">
          <Input
            placeholder={t.todoAdd}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void add();
            }}
          />
          <Select value={newPriority} onValueChange={(v) => setNewPriority(v as TodoPriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{t.todoPriorityLow}</SelectItem>
              <SelectItem value="medium">{t.todoPriorityMedium}</SelectItem>
              <SelectItem value="high">{t.todoPriorityHigh}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="datetime-local"
            value={newDue}
            onChange={(e) => setNewDue(e.target.value)}
          />
          <Select value={newRepeat} onValueChange={(v) => setNewRepeat(v as TodoRepeat)}>
            <SelectTrigger>
              <SelectValue placeholder={t.repeat} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t.repeatNone}</SelectItem>
              <SelectItem value="daily">{t.repeatDaily}</SelectItem>
              <SelectItem value="weekly">{t.repeatWeekly}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => void add()}>
            <Plus className="size-4" />
            {t.todoAdd}
          </Button>
        </div>

        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant={filter === "active" ? "secondary" : "ghost"}
            onClick={() => setFilter("active")}
          >
            {t.todoActive}
          </Button>
          <Button
            size="sm"
            variant={filter === "completed" ? "secondary" : "ghost"}
            onClick={() => setFilter("completed")}
          >
            {t.todoCompleted}
          </Button>
        </div>

        <ScrollArea className="h-[360px] pr-2">
          {loading ? (
            <LoadingState />
          ) : filtered.length === 0 ? (
            <EmptyState title={t.todoEmpty} />
          ) : (
            <div className="space-y-1.5">
              {filtered.map((todo) => {
                const linked = todo.event_id ? eventById.get(todo.event_id) : undefined;
                return (
                  <div
                    key={todo.id}
                    className="flex items-start gap-2 rounded-lg border border-border/60 px-3 py-2"
                  >
                    <Checkbox
                      checked={todo.done === 1}
                      onCheckedChange={() => void toggle(todo)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p
                        className={cn(
                          "truncate text-sm font-medium",
                          todo.done === 1 && "text-muted-foreground line-through",
                        )}
                      >
                        {todo.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className={PRIORITY_BADGE[todo.priority]}>
                          {priorityLabel(todo.priority)}
                        </Badge>
                        {todo.repeat && todo.repeat !== "none" && (
                          <Badge variant="secondary">{repeatLabel(todo.repeat)}</Badge>
                        )}
                        {todo.due_at && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {t.todoDue}:{" "}
                            {new Intl.DateTimeFormat(tag, {
                              dateStyle: "short",
                              timeStyle: "short",
                            }).format(new Date(todo.due_at))}
                          </span>
                        )}
                        {linked && (
                          <Badge variant="outline" className="max-w-[10rem] truncate">
                            {linked.title}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Select
                          value={todo.event_id ?? "none"}
                          onValueChange={(v) => void linkEvent(todo, v)}
                        >
                          <SelectTrigger className="h-7 w-[11rem] text-xs">
                            <SelectValue placeholder={t.linkEvent} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t.linkEvent}</SelectItem>
                            {events.map((event) => (
                              <SelectItem key={event.id} value={String(event.id)}>
                                {event.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={todo.repeat ?? "none"}
                          onValueChange={(v) => void setRepeat(todo, v as TodoRepeat)}
                        >
                          <SelectTrigger className="h-7 w-[8rem] text-xs">
                            <SelectValue placeholder={t.repeat} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t.repeatNone}</SelectItem>
                            <SelectItem value="daily">{t.repeatDaily}</SelectItem>
                            <SelectItem value="weekly">{t.repeatWeekly}</SelectItem>
                          </SelectContent>
                        </Select>
                        {todo.event_id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => void unlinkEvent(todo)}
                          >
                            <Link2Off className="size-3.5" />
                            {t.unlinkEvent}
                          </Button>
                        )}
                        {todo.due_at && !todo.event_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => void createFromDue(todo)}
                          >
                            {t.createEventFromDue}
                          </Button>
                        )}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 shrink-0"
                      onClick={() => void remove(todo.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
