import Database from "@tauri-apps/plugin-sql";

export type ClipboardItem = {
  id: string;
  content: string;
  hash: string;
  pinned: number;
  created_at: string;
};

const DB_URL = "sqlite:dn-assistant.db";
const MAX_ITEMS = 200;
let dbPromise: Promise<Database> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}

function notifyChanged() {
  window.dispatchEvent(new Event("dn-clipboard-changed"));
}

function newId() {
  return crypto.randomUUID();
}

export async function hashContent(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function listClipboardItems(limit = MAX_ITEMS): Promise<ClipboardItem[]> {
  const db = await getDb();
  return db.select<ClipboardItem[]>(
    `SELECT * FROM clipboard_items ORDER BY pinned DESC, created_at DESC LIMIT $1`,
    [limit],
  );
}

export async function pinItem(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE clipboard_items SET pinned = 1 WHERE id = $1", [id]);
  notifyChanged();
}

export async function unpinItem(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE clipboard_items SET pinned = 0 WHERE id = $1", [id]);
  notifyChanged();
}

export async function deleteItem(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM clipboard_items WHERE id = $1", [id]);
  notifyChanged();
}

export async function clearClipboardHistory(keepPinned = true): Promise<void> {
  const db = await getDb();
  if (keepPinned) {
    await db.execute("DELETE FROM clipboard_items WHERE pinned = 0");
  } else {
    await db.execute("DELETE FROM clipboard_items");
  }
  notifyChanged();
}

/** Insert new clipboard content, deduping by hash and capping unpinned history at MAX_ITEMS. */
export async function upsertClipboardItem(content: string): Promise<ClipboardItem | null> {
  const trimmed = content.trim();
  if (!trimmed) return null;
  const db = await getDb();
  const hash = await hashContent(trimmed);

  const existing = await db.select<ClipboardItem[]>(
    "SELECT * FROM clipboard_items WHERE hash = $1",
    [hash],
  );
  const now = new Date().toISOString();

  if (existing.length > 0) {
    const item = existing[0];
    await db.execute("UPDATE clipboard_items SET created_at = $1 WHERE id = $2", [
      now,
      item.id,
    ]);
    notifyChanged();
    return { ...item, created_at: now };
  }

  const item: ClipboardItem = {
    id: newId(),
    content: trimmed,
    hash,
    pinned: 0,
    created_at: now,
  };
  await db.execute(
    `INSERT INTO clipboard_items (id, content, hash, pinned, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [item.id, item.content, item.hash, item.pinned, item.created_at],
  );

  const countRows = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM clipboard_items WHERE pinned = 0",
  );
  const count = countRows[0]?.count ?? 0;
  if (count > MAX_ITEMS) {
    await db.execute(
      `DELETE FROM clipboard_items WHERE id IN (
         SELECT id FROM clipboard_items WHERE pinned = 0
         ORDER BY created_at ASC LIMIT $1
       )`,
      [count - MAX_ITEMS],
    );
  }

  notifyChanged();
  return item;
}
