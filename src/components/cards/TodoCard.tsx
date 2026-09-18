import { useCallback, useEffect, useMemo, useState } from "react";
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
  high: "border-transparent bg-destructive/15 text-destructive",
  medium: "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400",
  low: "border-transparent bg-muted text-muted-foreground",
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
  const [newDue, setNewDue] = useState("");
  const [newRepeat, setNewRepeat] = useState<TodoRepeat>("none");
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

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="size-4 text-primary" />
            {t.todoTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_7.5rem_11.5rem_8.5rem_auto]">
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

          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm"
                variant={filter === "all" ? "secondary" : "ghost"}
                className="h-7 text-xs"
                onClick={() => setFilter("all")}
              >
                {t.todoFilterAll}
              </Button>
              <Button
                size="sm"
                variant={filter === "active" ? "secondary" : "ghost"}
                className="h-7 text-xs"
                onClick={() => setFilter("active")}
              >
                {t.todoFilterActive}
              </Button>
              <Button
                size="sm"
                variant={filter === "due" ? "secondary" : "ghost"}
                className="h-7 text-xs"
                onClick={() => setFilter("due")}
              >
                {t.todoFilterDue}
              </Button>
              <Button
                size="sm"
                variant={filter === "completed" ? "secondary" : "ghost"}
                className="h-7 text-xs"
                onClick={() => setFilter("completed")}
              >
                {t.todoFilterDone}
              </Button>
            </div>

            {completedCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-destructive gap-1"
                onClick={() => setConfirmClearCompleted(true)}
              >
                <Trash2 className="size-3" />
                {t.clearCompleted} ({completedCount})
              </Button>
            )}
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
