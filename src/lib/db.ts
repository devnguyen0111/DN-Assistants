import Database from "@tauri-apps/plugin-sql";

/** Shared SQLite handle, id generation and change notifications for every data module. */

export const DB_URL = "sqlite:dn-assistant.db";

let dbPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL).catch((err: unknown) => {
      // Allow a retry on the next call instead of caching the failure forever.
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export function newId(): string {
  return crypto.randomUUID();
}

export type DataTopic =
  "events" | "notes" | "todos" | "habits" | "snippets" | "clipboard" | "focus" | "vault";

export function topicEventName(topic: DataTopic): string {
  return `dn-${topic}-changed`;
}

const WINDOW_ID = newId();

/** Random id of this webview, used to ignore our own cross-window broadcasts. */
export function windowId(): string {
  return WINDOW_ID;
}
const CROSS_WINDOW_EVENT = "dn-data-changed";

type CrossWindowPayload = { topic: DataTopic; from: string };

/**
 * Notify listeners in this window that `topic` changed, and broadcast to the other app
 * windows (floating widgets, main window) so they refresh too.
 */
export function emitChange(topic: DataTopic): void {
  window.dispatchEvent(new Event(topicEventName(topic)));
  void (async () => {
    try {
      const { emit } = await import("@tauri-apps/api/event");
      await emit(CROSS_WINDOW_EVENT, { topic, from: WINDOW_ID } satisfies CrossWindowPayload);
    } catch {
      // browser preview
    }
  })();
}

/** Subscribe to `topic` changes (from this or any other window). Returns an unsubscribe fn. */
export function onChange(topic: DataTopic, cb: () => void): () => void {
  const name = topicEventName(topic);
  window.addEventListener(name, cb);
  return () => window.removeEventListener(name, cb);
}

let crossWindowStarted = false;

/** Re-dispatch data changes made in other windows as local DOM events. Call once per window. */
export async function startCrossWindowSync(): Promise<void> {
  if (crossWindowStarted) return;
  crossWindowStarted = true;
  try {
    const { listen } = await import("@tauri-apps/api/event");
    await listen<CrossWindowPayload>(CROSS_WINDOW_EVENT, (e) => {
      if (e.payload.from === WINDOW_ID) return;
      window.dispatchEvent(new Event(topicEventName(e.payload.topic)));
    });
  } catch {
    crossWindowStarted = false;
  }
}
