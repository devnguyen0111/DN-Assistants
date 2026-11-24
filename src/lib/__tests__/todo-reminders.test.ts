import { describe, expect, it } from "vitest";
import { isReminderDue, STALE_AFTER_MS, todoReminderAt } from "@/lib/todo-reminders";
import type { Todo } from "@/lib/todos";

const base: Todo = {
  id: "t1",
  title: "Pay rent",
  done: 0,
  due_at: "2026-11-24T10:00:00.000Z",
  priority: "medium",
  event_id: null,
  repeat: "none",
  repeat_until: null,
  remind_minutes: 15,
  created_at: "",
  updated_at: "",
};
const due = Date.parse(base.due_at!);

describe("todo reminders", () => {
  it("fires remind_minutes before the due time", () => {
    expect(todoReminderAt(base)).toBe(due - 15 * 60_000);
    expect(todoReminderAt({ ...base, remind_minutes: 0 })).toBe(due);
  });

  it("has no reminder when done, undated or not requested", () => {
    expect(todoReminderAt({ ...base, done: 1 })).toBeNull();
    expect(todoReminderAt({ ...base, due_at: null })).toBeNull();
    expect(todoReminderAt({ ...base, remind_minutes: null })).toBeNull();
  });

  it("moves to the snooze time when snoozed later", () => {
    expect(todoReminderAt(base, due + 60_000)).toBe(due + 60_000);
    expect(todoReminderAt(base, due - 60 * 60_000)).toBe(due - 15 * 60_000);
  });

  it("skips stale reminders", () => {
    expect(isReminderDue(due, due + 1000)).toBe(true);
    expect(isReminderDue(due, due - 1000)).toBe(false);
    expect(isReminderDue(due, due + STALE_AFTER_MS + 1)).toBe(false);
  });
});
