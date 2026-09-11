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
