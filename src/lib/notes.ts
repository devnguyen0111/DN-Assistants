import Database from "@tauri-apps/plugin-sql";

export type Note = {
  id: string;
  title: string;
  body: string;
  updated_at: string;
  created_at: string;
};

export type NoteInput = {
  title: string;
  body?: string;
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
  window.dispatchEvent(new Event("dn-notes-changed"));
}

function newId() {
  return crypto.randomUUID();
}

export async function listNotes(): Promise<Note[]> {
  const db = await getDb();
  return db.select<Note[]>("SELECT * FROM notes ORDER BY updated_at DESC");
}

export async function getNote(id: string): Promise<Note | null> {
  const db = await getDb();
  const rows = await db.select<Note[]>("SELECT * FROM notes WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createNote(input: NoteInput): Promise<Note> {
  const db = await getDb();
  const now = new Date().toISOString();
  const note: Note = {
    id: newId(),
    title: input.title,
    body: input.body ?? "",
    created_at: now,
    updated_at: now,
  };
  await db.execute(
    `INSERT INTO notes (id, title, body, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [note.id, note.title, note.body, note.created_at, note.updated_at],
  );
  notifyChanged();
  return note;
}

export async function updateNote(id: string, input: NoteInput): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE notes SET title = $1, body = $2, updated_at = $3 WHERE id = $4`,
    [input.title, input.body ?? "", now, id],
  );
  notifyChanged();
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM notes WHERE id = $1", [id]);
  notifyChanged();
}

export async function searchNotes(query: string): Promise<Note[]> {
  const q = query.trim();
  if (!q) return listNotes();
  const db = await getDb();
  const like = `%${q}%`;
  return db.select<Note[]>(
    `SELECT * FROM notes WHERE title LIKE $1 OR body LIKE $1 ORDER BY updated_at DESC`,
    [like],
  );
}
