import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { onChange } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import {
  hasFired,
  markFired,
  playReminderChime,
  pruneFiredKeys,
  showOsNotification,
} from "@/lib/notify";
import { isReminderDue, loadSnoozes, snoozeTodo, todoReminderAt } from "@/lib/todo-reminders";
import { listTodos, toggleTodo, type Todo } from "@/lib/todos";
import { formatTimeHm } from "@/lib/utils";

/** Notifies before todo due times, with "Done" and "Snooze 10 min" actions. */
export function useTodoReminders() {
  const { t } = useI18n();
  const todosRef = useRef<Todo[]>([]);

  useEffect(() => {
    pruneFiredKeys();
    let cancelled = false;

    const load = async () => {
      try {
        const rows = await listTodos();
        if (!cancelled) todosRef.current = rows.filter((x) => !x.done && x.remind_minutes != null);
      } catch {
        // database not ready yet
      }
    };

    const tick = () => {
      const now = Date.now();
      const snoozes = loadSnoozes();
      for (const todo of todosRef.current) {
        const at = todoReminderAt(todo, snoozes[todo.id]);
        if (!isReminderDue(at, now)) continue;
        const key = `todo:${todo.id}:${at}`;
        if (hasFired(key)) continue;
        markFired(key, now);

        const due = todo.due_at ? formatTimeHm(Date.parse(todo.due_at)) : "";
        const body = `${due} — ${todo.title}`;
        playReminderChime();
        void showOsNotification(t.todoReminder, body);
        toast(t.todoReminder, {
          description: body,
          duration: 60_000,
          action: {
            label: t.todoReminderDone,
            onClick: () => void toggleTodo(todo.id, true),
          },
          cancel: {
            label: t.todoReminderSnooze,
            onClick: () => {
              snoozeTodo(todo.id);
            },
          },
        });
      }
    };

    void load().then(tick);
    const reloadId = window.setInterval(() => void load(), 60_000);
    const tickId = window.setInterval(tick, 5_000);
    const offChange = onChange("todos", () => void load());
    return () => {
      cancelled = true;
      window.clearInterval(reloadId);
      window.clearInterval(tickId);
      offChange();
    };
  }, [t]);
}
