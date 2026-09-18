import Database from "@tauri-apps/plugin-sql";

export type Note = {
  id: string;
  title: string;
  body: string;
  tags: string;
  pinned: number;
  updated_at: string;
  created_at: string;
};

export type NoteInput = {
  title: string;
  body?: string;
  tags?: string;
  pinned?: boolean;
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

function normalize(row: Note): Note {
  return {
    ...row,
    tags: row.tags ?? "",
    pinned: row.pinned ?? 0,
  };
}

export async function listNotes(): Promise<Note[]> {
  const db = await getDb();
  const rows = await db.select<Note[]>("SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC");
  return rows.map(normalize);
}

export async function getNote(id: string): Promise<Note | null> {
  const db = await getDb();
  const rows = await db.select<Note[]>("SELECT * FROM notes WHERE id = $1", [id]);
  return rows[0] ? normalize(rows[0]) : null;
}

export async function createNote(input: NoteInput): Promise<Note> {
  const db = await getDb();
  const now = new Date().toISOString();
  const note: Note = {
    id: newId(),
    title: input.title,
    body: input.body ?? "",
    tags: input.tags ?? "",
    pinned: input.pinned ? 1 : 0,
    created_at: now,
    updated_at: now,
  };
  await db.execute(
    `INSERT INTO notes (id, title, body, tags, pinned, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [note.id, note.title, note.body, note.tags, note.pinned, note.created_at, note.updated_at],
  );
  notifyChanged();
  return note;
}

export async function updateNote(id: string, input: NoteInput): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const existing = await getNote(id);
  await db.execute(
    `UPDATE notes SET title = $1, body = $2, tags = $3, pinned = $4, updated_at = $5 WHERE id = $6`,
    [
      input.title,
      input.body ?? "",
      input.tags ?? existing?.tags ?? "",
      input.pinned !== undefined ? (input.pinned ? 1 : 0) : (existing?.pinned ?? 0),
      now,
      id,
    ],
  );
  notifyChanged();
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM notes WHERE id = $1", [id]);
  notifyChanged();
}

export async function upsertNote(note: Note): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO notes (id, title, body, tags, pinned, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       body = excluded.body,
       tags = excluded.tags,
       pinned = excluded.pinned,
       updated_at = excluded.updated_at`,
    [
      note.id,
      note.title,
      note.body,
      note.tags ?? "",
      note.pinned ?? 0,
      note.created_at,
      note.updated_at,
    ],
  );
  notifyChanged();
}

export async function searchNotes(query: string): Promise<Note[]> {
  const q = query.trim();
  if (!q) return listNotes();
  const db = await getDb();
  const like = `%${q}%`;
  const rows = await db.select<Note[]>(
    `SELECT * FROM notes
     WHERE title LIKE $1 OR body LIKE $1 OR tags LIKE $1
     ORDER BY pinned DESC, updated_at DESC`,
    [like],
  );
  return rows.map(normalize);
}
