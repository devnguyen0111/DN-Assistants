import Database from "@tauri-apps/plugin-sql";

export type TodoPriority = "low" | "medium" | "high";

export type Todo = {
  id: string;
  title: string;
  done: number;
  due_at: string | null;
  priority: TodoPriority;
  event_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TodoInput = {
  title: string;
  due_at?: string | null;
  priority?: TodoPriority;
  event_id?: string | null;
};

const DB_URL = "sqlite:dn-assistant.db";
let dbPromise: Promise<Database> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}

function notifyChanged() {
  window.dispatchEvent(new Event("dn-todos-changed"));
}

function newId() {
  return crypto.randomUUID();
}

export async function listTodos(): Promise<Todo[]> {
  const db = await getDb();
  return db.select<Todo[]>(
    `SELECT * FROM todos ORDER BY done ASC, due_at IS NULL, due_at ASC, created_at DESC`,
  );
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
    created_at: now,
    updated_at: now,
  };
  await db.execute(
    `INSERT INTO todos (id, title, done, due_at, priority, event_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      todo.id,
      todo.title,
      todo.done,
      todo.due_at,
      todo.priority,
      todo.event_id,
      todo.created_at,
      todo.updated_at,
    ],
  );
  notifyChanged();
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
  };
  await db.execute(
    `UPDATE todos SET title = $1, due_at = $2, priority = $3, event_id = $4, updated_at = $5
     WHERE id = $6`,
    [next.title, next.due_at, next.priority, next.event_id, now, id],
  );
  notifyChanged();
}

export async function deleteTodo(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM todos WHERE id = $1", [id]);
  notifyChanged();
}

export async function toggleTodo(id: string, done: boolean): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.execute("UPDATE todos SET done = $1, updated_at = $2 WHERE id = $3", [
    done ? 1 : 0,
    now,
    id,
  ]);
  notifyChanged();
}
