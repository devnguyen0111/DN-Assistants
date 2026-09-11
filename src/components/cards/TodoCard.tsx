import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Plus, Trash2 } from "lucide-react";
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
  type Todo,
  type TodoPriority,
} from "@/lib/todos";
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
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<TodoPriority>("medium");
  const [newDue, setNewDue] = useState("");
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

  useEffect(() => {
    void refresh();
    const onChanged = () => void refresh();
    window.addEventListener("dn-todos-changed", onChanged);
    return () => window.removeEventListener("dn-todos-changed", onChanged);
  }, []);

  const priorityLabel = (p: TodoPriority) =>
    p === "high" ? t.todoPriorityHigh : p === "medium" ? t.todoPriorityMedium : t.todoPriorityLow;

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
      });
      setNewTitle("");
      setNewDue("");
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

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="size-4 text-primary" />
          {t.todoTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_9rem_9rem_auto]">
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
              {filtered.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-start gap-2 rounded-lg border border-border/60 px-3 py-2"
                >
                  <Checkbox
                    checked={todo.done === 1}
                    onCheckedChange={() => void toggle(todo)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm font-medium",
                        todo.done === 1 && "text-muted-foreground line-through",
                      )}
                    >
                      {todo.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge className={PRIORITY_BADGE[todo.priority]}>
                        {priorityLabel(todo.priority)}
                      </Badge>
                      {todo.due_at && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {t.todoDue}:{" "}
                          {new Intl.DateTimeFormat(tag, {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(new Date(todo.due_at))}
                        </span>
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
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
