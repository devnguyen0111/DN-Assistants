import Database from "@tauri-apps/plugin-sql";

export type ClipboardKind = "text" | "image";

export type ClipboardItem = {
  id: string;
  content: string;
  hash: string;
  pinned: number;
  created_at: string;
  kind: ClipboardKind;
  mime: string | null;
  width: number | null;
  height: number | null;
};

export type ClipboardChangedPayload =
  | { kind: "text"; content: string }
  | {
      kind: "image";
      id: string;
      path: string;
      hash: string;
      width: number;
      height: number;
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

function normalizeItem(row: ClipboardItem): ClipboardItem {
  return {
    ...row,
    kind: row.kind === "image" ? "image" : "text",
    mime: row.mime ?? null,
    width: row.width ?? null,
    height: row.height ?? null,
  };
}

export async function listClipboardItems(limit = MAX_ITEMS): Promise<ClipboardItem[]> {
  const db = await getDb();
  const rows = await db.select<ClipboardItem[]>(
    `SELECT * FROM clipboard_items ORDER BY pinned DESC, created_at DESC LIMIT $1`,
    [limit],
  );
  return rows.map(normalizeItem);
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

async function removeImageFile(path: string) {
  try {
    const { remove } = await import("@tauri-apps/plugin-fs");
    await remove(path);
  } catch {
    // file may already be gone
  }
}

export async function deleteItem(id: string): Promise<void> {
  const db = await getDb();
  const rows = await db.select<ClipboardItem[]>(
    "SELECT * FROM clipboard_items WHERE id = $1",
    [id],
  );
  const item = rows[0];
  await db.execute("DELETE FROM clipboard_items WHERE id = $1", [id]);
  if (item && item.kind === "image" && item.content) {
    await removeImageFile(item.content);
  }
  notifyChanged();
}

export async function clearClipboardHistory(keepPinned = true): Promise<void> {
  const db = await getDb();
  const rows = await db.select<ClipboardItem[]>(
    keepPinned
      ? "SELECT * FROM clipboard_items WHERE pinned = 0 AND kind = 'image'"
      : "SELECT * FROM clipboard_items WHERE kind = 'image'",
  );
  if (keepPinned) {
    await db.execute("DELETE FROM clipboard_items WHERE pinned = 0");
  } else {
    await db.execute("DELETE FROM clipboard_items");
  }
  await Promise.all(
    rows.map((row) => (row.content ? removeImageFile(row.content) : Promise.resolve())),
  );
  notifyChanged();
}

async function trimUnpinned(db: Database) {
  const countRows = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM clipboard_items WHERE pinned = 0",
  );
  const count = countRows[0]?.count ?? 0;
  if (count <= MAX_ITEMS) return;

  const overflow = await db.select<ClipboardItem[]>(
    `SELECT * FROM clipboard_items WHERE pinned = 0
     ORDER BY created_at ASC LIMIT $1`,
    [count - MAX_ITEMS],
  );
  await db.execute(
    `DELETE FROM clipboard_items WHERE id IN (
       SELECT id FROM clipboard_items WHERE pinned = 0
       ORDER BY created_at ASC LIMIT $1
     )`,
    [count - MAX_ITEMS],
  );
  await Promise.all(
    overflow
      .filter((row) => row.kind === "image" && row.content)
      .map((row) => removeImageFile(row.content)),
  );
}

/** Insert new clipboard text, deduping by hash and capping unpinned history at MAX_ITEMS. */
export async function upsertClipboardItem(content: string): Promise<ClipboardItem | null> {
  const trimmed = content.trim();
  if (!trimmed) return null;
  const db = await getDb();
  const hash = await hashContent(trimmed);
  const now = new Date().toISOString();

  const existing = await db.select<ClipboardItem[]>(
    "SELECT * FROM clipboard_items WHERE hash = $1 AND kind = 'text'",
    [hash],
  );

  if (existing.length > 0) {
    const item = existing[0];
    await db.execute("UPDATE clipboard_items SET created_at = $1 WHERE id = $2", [
      now,
      item.id,
    ]);
    notifyChanged();
    return normalizeItem({ ...item, created_at: now });
  }

  const item: ClipboardItem = {
    id: newId(),
    content: trimmed,
    hash,
    pinned: 0,
    created_at: now,
    kind: "text",
    mime: "text/plain",
    width: null,
    height: null,
  };
  await db.execute(
    `INSERT INTO clipboard_items (id, content, hash, pinned, created_at, kind, mime, width, height)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      item.id,
      item.content,
      item.hash,
      item.pinned,
      item.created_at,
      item.kind,
      item.mime,
      item.width,
      item.height,
    ],
  );

  await trimUnpinned(db);
  notifyChanged();
  return item;
}

/** Insert a clipboard image entry (file already written by the Rust watcher). */
export async function upsertClipboardImage(payload: {
  id: string;
  path: string;
  hash: string;
  width: number;
  height: number;
}): Promise<ClipboardItem | null> {
  const db = await getDb();
  const now = new Date().toISOString();

  const existing = await db.select<ClipboardItem[]>(
    "SELECT * FROM clipboard_items WHERE hash = $1 AND kind = 'image'",
    [payload.hash],
  );

  if (existing.length > 0) {
    const item = existing[0];
    await db.execute("UPDATE clipboard_items SET created_at = $1 WHERE id = $2", [
      now,
      item.id,
    ]);
    // Drop the newly written duplicate file if path differs.
    if (payload.path && payload.path !== item.content) {
      await removeImageFile(payload.path);
    }
    notifyChanged();
    return normalizeItem({ ...item, created_at: now });
  }

  const item: ClipboardItem = {
    id: payload.id,
    content: payload.path,
    hash: payload.hash,
    pinned: 0,
    created_at: now,
    kind: "image",
    mime: "image/png",
    width: payload.width,
    height: payload.height,
  };
  await db.execute(
    `INSERT INTO clipboard_items (id, content, hash, pinned, created_at, kind, mime, width, height)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      item.id,
      item.content,
      item.hash,
      item.pinned,
      item.created_at,
      item.kind,
      item.mime,
      item.width,
      item.height,
    ],
  );

  await trimUnpinned(db);
  notifyChanged();
  return item;
}

export async function copyClipboardItem(item: ClipboardItem): Promise<void> {
  if (item.kind === "image") {
    const { writeImage } = await import("@tauri-apps/plugin-clipboard-manager");
    const { readFile } = await import("@tauri-apps/plugin-fs");
    const { Image } = await import("@tauri-apps/api/image");
    const bytes = await readFile(item.content);
    const img = await Image.fromBytes(bytes);
    await writeImage(img);
    return;
  }
  const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
  await writeText(item.content);
}

export async function clipboardImageSrc(path: string): Promise<string> {
  try {
    const { convertFileSrc } = await import("@tauri-apps/api/core");
    return convertFileSrc(path);
  } catch {
    return path;
  }
}
