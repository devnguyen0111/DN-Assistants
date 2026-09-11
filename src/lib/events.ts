import Database from "@tauri-apps/plugin-sql";

export type CalendarEvent = {
  id: number;
  title: string;
  note: string | null;
  start_at: number;
  end_at: number | null;
  all_day: number;
  color: string | null;
  remind_minutes: number;
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
  remind_minutes?: number;
};

const DB_URL = "sqlite:dn-assistant.db";
let dbPromise: Promise<Database> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}

function normalizeEvent(row: CalendarEvent): CalendarEvent {
  return {
    ...row,
    remind_minutes: row.remind_minutes ?? 0,
  };
}

export async function listEvents(): Promise<CalendarEvent[]> {
  const db = await getDb();
  const rows = await db.select<CalendarEvent[]>("SELECT * FROM events ORDER BY start_at ASC");
  return rows.map(normalizeEvent);
}

/** Upcoming + currently in-progress events. */
export async function listUpcoming(limit = 12): Promise<CalendarEvent[]> {
  const db = await getDb();
  const now = Date.now();
  const todayStart = startOfDay(now);
  const rows = await db.select<CalendarEvent[]>(
    `SELECT * FROM events
     WHERE
       (all_day = 1 AND start_at >= $1 AND start_at < $2)
       OR (all_day = 0 AND start_at >= $3)
       OR (all_day = 0 AND end_at IS NOT NULL AND start_at <= $3 AND end_at >= $3)
     ORDER BY start_at ASC
     LIMIT $4`,
    [todayStart, todayStart + 24 * 60 * 60 * 1000, now, limit],
  );
  return rows.map(normalizeEvent);
}

export async function createEvent(input: EventInput): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.execute(
    `INSERT INTO events (title, note, start_at, end_at, all_day, color, remind_minutes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      input.title,
      input.note ?? null,
      input.start_at,
      input.end_at ?? null,
      input.all_day ? 1 : 0,
      input.color ?? "#38bdf8",
      input.remind_minutes ?? 0,
      now,
      now,
    ],
  );
}

export async function updateEvent(id: number, input: EventInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE events
     SET title = $1, note = $2, start_at = $3, end_at = $4, all_day = $5, color = $6,
         remind_minutes = $7, updated_at = $8
     WHERE id = $9`,
    [
      input.title,
      input.note ?? null,
      input.start_at,
      input.end_at ?? null,
      input.all_day ? 1 : 0,
      input.color ?? "#38bdf8",
      input.remind_minutes ?? 0,
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

export function formatEventRange(
  event: CalendarEvent,
  allDayLabel: string,
): string {
  if (event.all_day === 1) return allDayLabel;
  const start = formatHm(event.start_at);
  if (event.end_at != null) {
    return `${start} – ${formatHm(event.end_at)}`;
  }
  return start;
}

function formatHm(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
