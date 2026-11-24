import type { Todo } from "@/lib/todos";

/** Reminders older than this are considered stale (e.g. app was closed) and are skipped. */
export const STALE_AFTER_MS = 6 * 60 * 60 * 1000;
export const SNOOZE_MS = 10 * 60 * 1000;

const SNOOZE_KEY = "dn-todo-snoozes";

/** When the reminder for `todo` should fire (ms), honoring a snooze, or null for none. */
export function todoReminderAt(todo: Todo, snoozedUntil?: number): number | null {
  if (todo.done || !todo.due_at || todo.remind_minutes == null) return null;
  const due = Date.parse(todo.due_at);
  if (!Number.isFinite(due)) return null;
  const at = due - todo.remind_minutes * 60_000;
  return snoozedUntil && snoozedUntil > at ? snoozedUntil : at;
}

/** True when the reminder is due now and not too old to be useful. */
export function isReminderDue(at: number | null, now: number): boolean {
  return at != null && now >= at && now - at < STALE_AFTER_MS;
}

export function loadSnoozes(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? "{}") as Record<string, number>;
    const now = Date.now();
    // Drop snoozes that are long past.
    return Object.fromEntries(
      Object.entries(raw).filter(([, until]) => until > now - STALE_AFTER_MS),
    );
  } catch {
    return {};
  }
}

export function snoozeTodo(id: string, now = Date.now()): number {
  const map = loadSnoozes();
  map[id] = now + SNOOZE_MS;
  try {
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
  return map[id]!;
}
