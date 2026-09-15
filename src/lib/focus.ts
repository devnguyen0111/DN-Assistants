import Database from "@tauri-apps/plugin-sql";

export type FocusKind = "work" | "break" | "long_break";

export type FocusSession = {
  id: string;
  kind: FocusKind;
  minutes: number;
  completed_at: string;
};

const DB_URL = "sqlite:dn-assistant.db";
let dbPromise: Promise<Database> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}

function newId() {
  return crypto.randomUUID();
}

function todayStartIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function addSession(kind: FocusKind, minutes: number): Promise<FocusSession> {
  const db = await getDb();
  const session: FocusSession = {
    id: newId(),
    kind,
    minutes,
    completed_at: new Date().toISOString(),
  };
  await db.execute(
    `INSERT INTO focus_sessions (id, kind, minutes, completed_at) VALUES ($1, $2, $3, $4)`,
    [session.id, session.kind, session.minutes, session.completed_at],
  );
  window.dispatchEvent(new Event("dn-focus-changed"));
  return session;
}

export async function listSessionsToday(): Promise<FocusSession[]> {
  const db = await getDb();
  return db.select<FocusSession[]>(
    `SELECT * FROM focus_sessions WHERE completed_at >= $1 ORDER BY completed_at DESC`,
    [todayStartIso()],
  );
}

export async function countSessionsToday(kind?: FocusKind): Promise<number> {
  const sessions = await listSessionsToday();
  return kind ? sessions.filter((s) => s.kind === kind).length : sessions.length;
}

/** Work sessions completed on or after the given ISO timestamp. */
export async function listSessionsSince(iso: string): Promise<FocusSession[]> {
  const db = await getDb();
  return db.select<FocusSession[]>(
    `SELECT * FROM focus_sessions
     WHERE completed_at >= $1 AND kind = 'work'
     ORDER BY completed_at DESC`,
    [iso],
  );
}

/** Aggregate work focus minutes per local calendar day for the last N days. */
export async function focusMinutesByDay(
  days: number,
): Promise<{ date: string; minutes: number }[]> {
  const n = Math.max(1, Math.floor(days));
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (n - 1));

  const sessions = await listSessionsSince(start.toISOString());
  const byDate = new Map<string, number>();

  for (let i = 0; i < n; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    byDate.set(localDateKey(d), 0);
  }

  for (const session of sessions) {
    const key = localDateKey(new Date(session.completed_at));
    if (!byDate.has(key)) continue;
    byDate.set(key, (byDate.get(key) ?? 0) + session.minutes);
  }

  return Array.from(byDate.entries()).map(([date, minutes]) => ({ date, minutes }));
}

function localDateKey(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ---- Timer state persistence (survives reload, not shared across devices) ---- */

export type TimerState = {
  kind: FocusKind;
  remainingSeconds: number;
  running: boolean;
  updatedAt: number;
};

const TIMER_KEY = "dn-assistant-focus-timer";

export function loadTimerState(): TimerState | null {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TimerState;
  } catch {
    return null;
  }
}

export function saveTimerState(state: TimerState) {
  localStorage.setItem(TIMER_KEY, JSON.stringify(state));
}

export function clearTimerState() {
  localStorage.removeItem(TIMER_KEY);
}
