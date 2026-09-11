import Database from "@tauri-apps/plugin-sql";

export type CalendarEvent = {
  id: number;
  title: string;
  note: string | null;
  start_at: number;
  end_at: number | null;
  all_day: number;
  color: string | null;
  created_at: number;
  updated_at: number;
};

export type EventInput = {
  title: string;
  note?: string;
  start_at: number;
  end_at?: number | null;
  all_day?: boolean;
  color?: string;
};

const DB_URL = "sqlite:dn-assistant.db";
let dbPromise: Promise<Database> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}

export async function listEvents(): Promise<CalendarEvent[]> {
  const db = await getDb();
  return db.select<CalendarEvent[]>("SELECT * FROM events ORDER BY start_at ASC");
}

export async function listUpcoming(limit = 8): Promise<CalendarEvent[]> {
  const db = await getDb();
  const now = Date.now();
  return db.select<CalendarEvent[]>(
    "SELECT * FROM events WHERE start_at >= $1 OR (all_day = 1 AND start_at >= $2) ORDER BY start_at ASC LIMIT $3",
    [now, startOfDay(now), limit],
  );
}

export async function createEvent(input: EventInput): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.execute(
    `INSERT INTO events (title, note, start_at, end_at, all_day, color, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      input.title,
      input.note ?? null,
      input.start_at,
      input.end_at ?? null,
      input.all_day ? 1 : 0,
      input.color ?? "#38bdf8",
      now,
      now,
    ],
  );
}

export async function updateEvent(id: number, input: EventInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE events
     SET title = $1, note = $2, start_at = $3, end_at = $4, all_day = $5, color = $6, updated_at = $7
     WHERE id = $8`,
    [
      input.title,
      input.note ?? null,
      input.start_at,
      input.end_at ?? null,
      input.all_day ? 1 : 0,
      input.color ?? "#38bdf8",
      Date.now(),
      id,
    ],
  );
}

export async function deleteEvent(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM events WHERE id = $1", [id]);
}

export function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function sameDay(a: number, b: number) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}
