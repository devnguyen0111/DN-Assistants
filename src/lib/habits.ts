import Database from "@tauri-apps/plugin-sql";

export type HabitCategory = "health" | "productivity" | "learning" | "fitness" | "mindset" | "general";
export type HabitColor = "teal" | "blue" | "violet" | "rose" | "amber" | "emerald";

export type Habit = {
  id: string;
  title: string;
  category: HabitCategory;
  color: HabitColor;
  target_days_per_week: number;
  created_at: string;
};

export type HabitLog = {
  id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  completed: number;
  created_at: string;
};

export type HabitStats = {
  habit: Habit;
  currentStreak: number;
  bestStreak: number;
  completedToday: boolean;
  completedThisWeek: number;
  last30Days: Record<string, boolean>;
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
  window.dispatchEvent(new Event("dn-habits-changed"));
}

function newId() {
  return crypto.randomUUID();
}

export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function listHabits(): Promise<Habit[]> {
  const db = await getDb();
  return db.select<Habit[]>("SELECT * FROM habits ORDER BY created_at ASC");
}

export async function createHabit(input: {
  title: string;
  category?: HabitCategory;
  color?: HabitColor;
  target_days_per_week?: number;
}): Promise<Habit> {
  const db = await getDb();
  const habit: Habit = {
    id: newId(),
    title: input.title.trim(),
    category: input.category ?? "general",
    color: input.color ?? "teal",
    target_days_per_week: Math.min(7, Math.max(1, input.target_days_per_week ?? 7)),
    created_at: new Date().toISOString(),
  };

  await db.execute(
    `INSERT INTO habits (id, title, category, color, target_days_per_week, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      habit.id,
      habit.title,
      habit.category,
      habit.color,
      habit.target_days_per_week,
      habit.created_at,
    ],
  );
  notifyChanged();
  return habit;
}

export async function updateHabit(
  id: string,
  input: Partial<{
    title: string;
    category: HabitCategory;
    color: HabitColor;
    target_days_per_week: number;
  }>,
): Promise<void> {
  const db = await getDb();
  const existing = await db.select<Habit[]>("SELECT * FROM habits WHERE id = $1", [id]);
  if (!existing[0]) return;

  const title = input.title !== undefined ? input.title.trim() : existing[0].title;
  const category = input.category ?? existing[0].category;
  const color = input.color ?? existing[0].color;
  const targetDays =
    input.target_days_per_week !== undefined
      ? Math.min(7, Math.max(1, input.target_days_per_week))
      : existing[0].target_days_per_week;

  await db.execute(
    `UPDATE habits SET title = $1, category = $2, color = $3, target_days_per_week = $4 WHERE id = $5`,
    [title, category, color, targetDays, id],
  );
  notifyChanged();
}

export async function deleteHabit(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM habit_logs WHERE habit_id = $1", [id]);
  await db.execute("DELETE FROM habits WHERE id = $1", [id]);
  notifyChanged();
}

export async function getHabitLogs(habitId?: string): Promise<HabitLog[]> {
  const db = await getDb();
  if (habitId) {
    return db.select<HabitLog[]>(
      "SELECT * FROM habit_logs WHERE habit_id = $1 ORDER BY date DESC",
      [habitId],
    );
  }
  return db.select<HabitLog[]>("SELECT * FROM habit_logs ORDER BY date DESC");
}

export async function toggleHabitDate(habitId: string, dateStr: string): Promise<boolean> {
  const db = await getDb();
  const existing = await db.select<HabitLog[]>(
    "SELECT * FROM habit_logs WHERE habit_id = $1 AND date = $2",
    [habitId, dateStr],
  );

  if (existing.length > 0) {
    await db.execute("DELETE FROM habit_logs WHERE habit_id = $1 AND date = $2", [
      habitId,
      dateStr,
    ]);
    notifyChanged();
    return false;
  } else {
    const log: HabitLog = {
      id: newId(),
      habit_id: habitId,
      date: dateStr,
      completed: 1,
      created_at: new Date().toISOString(),
    };
    await db.execute(
      `INSERT INTO habit_logs (id, habit_id, date, completed, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [log.id, log.habit_id, log.date, log.completed, log.created_at],
    );
    notifyChanged();
    return true;
  }
}

export function computeHabitStats(habit: Habit, logs: HabitLog[]): HabitStats {
  const completedDates = new Set(logs.filter((l) => l.completed === 1).map((l) => l.date));
  const today = new Date();
  const todayKey = formatDateKey(today);
  const completedToday = completedDates.has(todayKey);

  // Calculate current streak
  let currentStreak = 0;
  const cursor = new Date(today);
  
  // If not completed today, check from yesterday
  if (!completedToday) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const key = formatDateKey(cursor);
    if (completedDates.has(key)) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate best streak
  const sortedDates = Array.from(completedDates).sort();
  let bestStreak = 0;
  let tempStreak = 0;
  let lastDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const d = new Date(dateStr + "T00:00:00");
    if (!lastDate) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((d.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    lastDate = d;
    if (tempStreak > bestStreak) bestStreak = tempStreak;
  }
  if (currentStreak > bestStreak) bestStreak = currentStreak;

  // Completed this week (Monday through Sunday)
  const dayOfWeek = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek);

  let completedThisWeek = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    if (completedDates.has(formatDateKey(d))) {
      completedThisWeek++;
    }
  }

  // Last 30 days
  const last30Days: Record<string, boolean> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const k = formatDateKey(d);
    last30Days[k] = completedDates.has(k);
  }

  return {
    habit,
    currentStreak,
    bestStreak,
    completedToday,
    completedThisWeek,
    last30Days,
  };
}

export async function getAllHabitsWithStats(): Promise<HabitStats[]> {
  const habits = await listHabits();
  if (habits.length === 0) return [];
  const allLogs = await getHabitLogs();

  const logsByHabit = new Map<string, HabitLog[]>();
  for (const log of allLogs) {
    const list = logsByHabit.get(log.habit_id) ?? [];
    list.push(log);
    logsByHabit.set(log.habit_id, list);
  }

  return habits.map((h) => computeHabitStats(h, logsByHabit.get(h.id) ?? []));
}

export async function upsertHabit(habit: Habit): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO habits (id, title, category, color, target_days_per_week, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       category = excluded.category,
       color = excluded.color,
       target_days_per_week = excluded.target_days_per_week`,
    [
      habit.id,
      habit.title,
      habit.category,
      habit.color,
      habit.target_days_per_week,
      habit.created_at,
    ],
  );
  notifyChanged();
}

export async function upsertHabitLog(log: HabitLog): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO habit_logs (id, habit_id, date, completed, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT(id) DO UPDATE SET
       completed = excluded.completed`,
    [log.id, log.habit_id, log.date, log.completed, log.created_at],
  );
  notifyChanged();
}
