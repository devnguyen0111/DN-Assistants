import { createHabit, upsertHabitLog } from "@/lib/habits";
import { newId } from "@/lib/db";
import { getAppStore } from "@/lib/settings";
import { localDateKey } from "@/lib/utils";

/**
 * One-time migration: the old "TikTok Streaks" page (v0.4 and earlier) is now part of Habits.
 * Each streak becomes a habit with the same reminder/nudge times, and its current streak is
 * rebuilt as daily check-ins so the streak count carries over.
 */

type LegacyStreak = {
  name?: string;
  username?: string;
  enabled?: boolean;
  remindAt?: string;
  nudgeAt?: string;
  lastDoneDate?: string | null;
  streakCount?: number;
  createdAt?: string;
};

const LS_KEY = "dn-assistant-tiktok-streaks";
const STORE_KEY = "tiktok-streaks";
const DONE_KEY = "tiktok-migrated-to-habits";

function shiftKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + days);
  return localDateKey(dt);
}

async function readLegacy(): Promise<LegacyStreak[]> {
  try {
    const store = await getAppStore();
    const stored = store ? await store.get<LegacyStreak[]>(STORE_KEY) : undefined;
    if (Array.isArray(stored) && stored.length > 0) return stored;
  } catch {
    // fall back to localStorage
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? (parsed as LegacyStreak[]) : [];
  } catch {
    return [];
  }
}

/** Returns the number of streaks migrated (0 when there was nothing to do). */
export async function migrateTikTokStreaksToHabits(): Promise<number> {
  if (localStorage.getItem(DONE_KEY) === "1") return 0;
  const store = await getAppStore().catch(() => null);
  if (store && (await store.get<boolean>(DONE_KEY))) {
    localStorage.setItem(DONE_KEY, "1");
    return 0;
  }

  const items = (await readLegacy()).filter((i) => i.name?.trim());
  for (const item of items) {
    const handle = item.username?.trim().replace(/^@+/, "");
    const enabled = item.enabled !== false;
    const habit = await createHabit(
      {
        title: handle ? `${item.name!.trim()} (@${handle})` : item.name!.trim(),
        category: "general",
        color: "rose",
        remind_at: enabled ? (item.remindAt ?? "") : "",
        nudge_at: enabled ? (item.nudgeAt ?? "") : "",
      },
      item.createdAt,
    );
    if (item.lastDoneDate) {
      const days = Math.max(1, Math.min(item.streakCount ?? 1, 3650));
      for (let i = 0; i < days; i++) {
        await upsertHabitLog({
          id: newId(),
          habit_id: habit.id,
          date: shiftKey(item.lastDoneDate, -i),
          completed: 1,
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  localStorage.setItem(DONE_KEY, "1");
  localStorage.removeItem(LS_KEY);
  if (store) {
    await store.set(DONE_KEY, true);
    await store.set(STORE_KEY, []);
    await store.save();
  }
  return items.length;
}
