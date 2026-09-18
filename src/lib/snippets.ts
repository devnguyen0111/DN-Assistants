import Database from "@tauri-apps/plugin-sql";

export type SnippetLanguage =
  | "text"
  | "javascript"
  | "typescript"
  | "python"
  | "rust"
  | "sql"
  | "html"
  | "css"
  | "markdown"
  | "shell"
  | "json";

export type Snippet = {
  id: string;
  title: string;
  content: string;
  category: string;
  language: SnippetLanguage;
  tags: string;
  pinned: number;
  created_at: string;
  updated_at: string;
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
  window.dispatchEvent(new Event("dn-snippets-changed"));
}

function newId() {
  return crypto.randomUUID();
}

function normalize(row: Snippet): Snippet {
  return {
    ...row,
    tags: row.tags ?? "",
    pinned: row.pinned ?? 0,
    language: (row.language ?? "text") as SnippetLanguage,
    category: row.category ?? "general",
  };
}

export async function expandPlaceholders(template: string): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8);
  const yearStr = String(now.getFullYear());
  const uuidStr = crypto.randomUUID();

  let clipboardText = "";
  try {
    clipboardText = await navigator.clipboard.readText();
  } catch {
    // ignore
  }

  return template
    .replace(/\{\{date\}\}/gi, dateStr)
    .replace(/\{\{time\}\}/gi, timeStr)
    .replace(/\{\{datetime\}\}/gi, `${dateStr} ${timeStr}`)
    .replace(/\{\{year\}\}/gi, yearStr)
    .replace(/\{\{uuid\}\}/gi, uuidStr)
    .replace(/\{\{clipboard\}\}/gi, clipboardText);
}

export async function listSnippets(): Promise<Snippet[]> {
  const db = await getDb();
  const rows = await db.select<Snippet[]>(
    "SELECT * FROM snippets ORDER BY pinned DESC, updated_at DESC",
  );
  return rows.map(normalize);
}

export async function getSnippet(id: string): Promise<Snippet | null> {
  const db = await getDb();
  const rows = await db.select<Snippet[]>("SELECT * FROM snippets WHERE id = $1", [id]);
  return rows[0] ? normalize(rows[0]) : null;
}

export async function createSnippet(input: {
  title: string;
  content: string;
  category?: string;
  language?: SnippetLanguage;
  tags?: string;
  pinned?: boolean;
}): Promise<Snippet> {
  const db = await getDb();
  const now = new Date().toISOString();
  const snippet: Snippet = {
    id: newId(),
    title: input.title.trim(),
    content: input.content,
    category: input.category?.trim() || "general",
    language: input.language || "text",
    tags: input.tags?.trim() || "",
    pinned: input.pinned ? 1 : 0,
    created_at: now,
    updated_at: now,
  };

  await db.execute(
    `INSERT INTO snippets (id, title, content, category, language, tags, pinned, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      snippet.id,
      snippet.title,
      snippet.content,
      snippet.category,
      snippet.language,
      snippet.tags,
      snippet.pinned,
      snippet.created_at,
      snippet.updated_at,
    ],
  );
  notifyChanged();
  return snippet;
}

export async function updateSnippet(
  id: string,
  input: Partial<{
    title: string;
    content: string;
    category: string;
    language: SnippetLanguage;
    tags: string;
    pinned: boolean;
  }>,
): Promise<void> {
  const db = await getDb();
  const existing = await getSnippet(id);
  if (!existing) return;

  const now = new Date().toISOString();
  const title = input.title !== undefined ? input.title.trim() : existing.title;
  const content = input.content !== undefined ? input.content : existing.content;
  const category = input.category !== undefined ? input.category.trim() : existing.category;
  const language = input.language ?? existing.language;
  const tags = input.tags !== undefined ? input.tags.trim() : existing.tags;
  const pinned = input.pinned !== undefined ? (input.pinned ? 1 : 0) : existing.pinned;

  await db.execute(
    `UPDATE snippets SET title = $1, content = $2, category = $3, language = $4, tags = $5, pinned = $6, updated_at = $7 WHERE id = $8`,
    [title, content, category, language, tags, pinned, now, id],
  );
  notifyChanged();
}

export async function deleteSnippet(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM snippets WHERE id = $1", [id]);
  notifyChanged();
}

export async function searchSnippets(query: string): Promise<Snippet[]> {
  const q = query.trim();
  if (!q) return listSnippets();
  const db = await getDb();
  const like = `%${q}%`;
  const rows = await db.select<Snippet[]>(
    `SELECT * FROM snippets
     WHERE title LIKE $1 OR content LIKE $1 OR category LIKE $1 OR tags LIKE $1
     ORDER BY pinned DESC, updated_at DESC`,
    [like],
  );
  return rows.map(normalize);
}

export async function upsertSnippet(snippet: Snippet): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO snippets (id, title, content, category, language, tags, pinned, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       content = excluded.content,
       category = excluded.category,
       language = excluded.language,
       tags = excluded.tags,
       pinned = excluded.pinned,
       updated_at = excluded.updated_at`,
    [
      snippet.id,
      snippet.title,
      snippet.content,
      snippet.category,
      snippet.language,
      snippet.tags,
      snippet.pinned,
      snippet.created_at,
      snippet.updated_at,
    ],
  );
  notifyChanged();
}
