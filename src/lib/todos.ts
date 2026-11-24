import { emitChange, getDb, newId } from "@/lib/db";

export type TodoPriority = "low" | "medium" | "high";
export type TodoRepeat = "none" | "daily" | "weekly";

export type Todo = {
  id: string;
  title: string;
  done: number;
  due_at: string | null;
  priority: TodoPriority;
  event_id: string | null;
  repeat: TodoRepeat;
  repeat_until: string | null;
  /** Minutes before `due_at` to notify (0 = at due time), or null for no reminder. */
  remind_minutes: number | null;
  created_at: string;
  updated_at: string;
};

export type TodoInput = {
  title: string;
  due_at?: string | null;
  priority?: TodoPriority;
  event_id?: string | null;
  repeat?: TodoRepeat;
  repeat_until?: string | null;
  remind_minutes?: number | null;
};

/** Reminder choices offered in the UI (minutes before due). */
export const TODO_REMIND_OPTIONS = [0, 5, 15, 30, 60, 1440] as const;

function normalizeRemind(value: unknown): number | null {
  const n = typeof value === "number" ? value : value == null ? NaN : Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

function normalizeRepeat(value: unknown): TodoRepeat {
  if (value === "daily" || value === "weekly") return value;
  return "none";
}

function normalizeTodo(row: Todo): Todo {
  return {
    ...row,
    repeat: normalizeRepeat(row.repeat),
    repeat_until: row.repeat_until ?? null,
    remind_minutes: normalizeRemind(row.remind_minutes),
  };
}

export async function listTodos(): Promise<Todo[]> {
  const db = await getDb();
  const rows = await db.select<Todo[]>(
    `SELECT * FROM todos ORDER BY done ASC, due_at IS NULL, due_at ASC, created_at DESC`,
  );
  return rows.map(normalizeTodo);
}

export async function createTodo(input: TodoInput): Promise<Todo> {
  const db = await getDb();
  const now = new Date().toISOString();
  const todo: Todo = {
    id: newId(),
    title: input.title,
    done: 0,
    due_at: input.due_at ?? null,
    priority: input.priority ?? "medium",
    event_id: input.event_id ?? null,
    repeat: input.repeat ?? "none",
    repeat_until: input.repeat_until ?? null,
    remind_minutes: normalizeRemind(input.remind_minutes),
    created_at: now,
    updated_at: now,
  };
  await db.execute(
    `INSERT INTO todos (id, title, done, due_at, priority, event_id, repeat, repeat_until, remind_minutes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      todo.id,
      todo.title,
      todo.done,
      todo.due_at,
      todo.priority,
      todo.event_id,
      todo.repeat,
      todo.repeat_until,
      todo.remind_minutes,
      todo.created_at,
      todo.updated_at,
    ],
  );
  emitChange("todos");
  return todo;
}

export async function updateTodo(id: string, input: Partial<TodoInput>): Promise<void> {
  const db = await getDb();
  const existingRows = await db.select<Todo[]>("SELECT * FROM todos WHERE id = $1", [id]);
  const existing = existingRows[0];
  if (!existing) return;
  const now = new Date().toISOString();
  const next = {
    title: input.title ?? existing.title,
    due_at: input.due_at !== undefined ? input.due_at : existing.due_at,
    priority: input.priority ?? existing.priority,
    event_id: input.event_id !== undefined ? input.event_id : existing.event_id,
    repeat: input.repeat !== undefined ? input.repeat : normalizeRepeat(existing.repeat),
    repeat_until:
      input.repeat_until !== undefined ? input.repeat_until : (existing.repeat_until ?? null),
    remind_minutes:
      input.remind_minutes !== undefined
        ? normalizeRemind(input.remind_minutes)
        : normalizeRemind(existing.remind_minutes),
  };
  await db.execute(
    `UPDATE todos SET title = $1, due_at = $2, priority = $3, event_id = $4,
       repeat = $5, repeat_until = $6, remind_minutes = $7, updated_at = $8
     WHERE id = $9`,
    [
      next.title,
      next.due_at,
      next.priority,
      next.event_id,
      next.repeat,
      next.repeat_until,
      next.remind_minutes,
      now,
      id,
    ],
  );
  emitChange("todos");
}

export async function upsertTodo(todo: Todo): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO todos (id, title, done, due_at, priority, event_id, repeat, repeat_until, remind_minutes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       done = excluded.done,
       due_at = excluded.due_at,
       priority = excluded.priority,
       event_id = excluded.event_id,
       repeat = excluded.repeat,
       repeat_until = excluded.repeat_until,
       remind_minutes = excluded.remind_minutes,
       updated_at = excluded.updated_at`,
    [
      todo.id,
      todo.title,
      todo.done ?? 0,
      todo.due_at ?? null,
      todo.priority ?? "medium",
      todo.event_id ?? null,
      normalizeRepeat(todo.repeat),
      todo.repeat_until ?? null,
      normalizeRemind(todo.remind_minutes),
      todo.created_at,
      todo.updated_at,
    ],
  );
  emitChange("todos");
}

export async function deleteTodo(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM todos WHERE id = $1", [id]);
  emitChange("todos");
}

export async function toggleTodo(id: string, done: boolean): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.execute("UPDATE todos SET done = $1, updated_at = $2 WHERE id = $3", [
    done ? 1 : 0,
    now,
    id,
  ]);
  emitChange("todos");
}
