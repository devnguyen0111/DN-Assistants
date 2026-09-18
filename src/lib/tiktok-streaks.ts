import { getAppStore } from "@/lib/settings";

export type TikTokStreak = {
  id: string;
  name: string;
  username: string;
  enabled: boolean;
  remindAt: string;
  nudgeAt: string;
  lastDoneDate: string | null;
  streakCount: number;
  longestStreak: number;
  hint: string;
  createdAt: string;
  updatedAt: string;
};

export type TikTokStreakInput = {
  name: string;
  username?: string;
  enabled?: boolean;
  remindAt?: string;
  nudgeAt?: string;
  hint?: string;
};

const LS_KEY = "dn-assistant-tiktok-streaks";
const STORE_KEY = "tiktok-streaks";
const CHANGED = "dn-tiktok-streaks-changed";

const DEFAULT_REMIND = "20:00";
const DEFAULT_NUDGE = "22:30";

function notifyChanged() {
  window.dispatchEvent(new Event(CHANGED));
}

function newId() {
  return crypto.randomUUID();
}

export function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function shiftDateKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + days);
  return localDateKey(dt);
}

export function parseHm(value: string): { hours: number; minutes: number } | null {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

export function hmToMinutes(value: string): number | null {
  const parsed = parseHm(value);
  if (!parsed) return null;
  return parsed.hours * 60 + parsed.minutes;
}

function readLocal(): TikTokStreak[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TikTokStreak[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(items: TikTokStreak[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

async function persist(items: TikTokStreak[]): Promise<void> {
  writeLocal(items);
  try {
    const store = await getAppStore();
    if (store) {
      await store.set(STORE_KEY, items);
      await store.save();
    }
  } catch {
    // browser / plugin unavailable
  }
}

function normalizeUsername(value: string): string {
  return value.trim().replace(/^@+/, "");
}

function applyDecay(item: TikTokStreak, today = localDateKey()): TikTokStreak {
  if (!item.lastDoneDate) {
    return item.streakCount === 0 ? item : { ...item, streakCount: 0 };
  }
  if (item.lastDoneDate === today || item.lastDoneDate === shiftDateKey(today, -1)) {
    return item;
  }
  if (item.streakCount === 0) return item;
  return { ...item, streakCount: 0 };
}

export function isDoneToday(item: TikTokStreak, today = localDateKey()): boolean {
  return item.lastDoneDate === today;
}

export function isStreakAtRisk(item: TikTokStreak, today = localDateKey()): boolean {
  return item.enabled && !isDoneToday(item, today);
}

export async function listTikTokStreaks(): Promise<TikTokStreak[]> {
  let items = readLocal();
  try {
    const store = await getAppStore();
    const stored = store ? await store.get<TikTokStreak[]>(STORE_KEY) : undefined;
    if (stored && Array.isArray(stored) && stored.length > 0) {
      items = stored;
    }
  } catch {
    // keep local
  }

  const today = localDateKey();
  let changed = false;
  const next = items.map((item) => {
    const decayed = applyDecay(item, today);
    if (decayed.streakCount !== item.streakCount) changed = true;
    return decayed;
  });
  if (changed) await persist(next);
  else writeLocal(next);
  return next.sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name));
}

export async function createTikTokStreak(input: TikTokStreakInput): Promise<TikTokStreak> {
  const now = new Date().toISOString();
  const item: TikTokStreak = {
    id: newId(),
    name: input.name.trim(),
    username: normalizeUsername(input.username ?? ""),
    enabled: input.enabled ?? true,
    remindAt: parseHm(input.remindAt ?? "") ? input.remindAt! : DEFAULT_REMIND,
    nudgeAt: parseHm(input.nudgeAt ?? "") ? input.nudgeAt! : DEFAULT_NUDGE,
    lastDoneDate: null,
    streakCount: 0,
    longestStreak: 0,
    hint: input.hint?.trim() ?? "",
    createdAt: now,
    updatedAt: now,
  };
  const items = await listTikTokStreaks();
  await persist([item, ...items]);
  notifyChanged();
  return item;
}

export async function updateTikTokStreak(
  id: string,
  patch: Partial<TikTokStreakInput>,
): Promise<void> {
  const items = await listTikTokStreaks();
  const next = items.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      name: patch.name !== undefined ? patch.name.trim() : item.name,
      username: patch.username !== undefined ? normalizeUsername(patch.username) : item.username,
      enabled: patch.enabled ?? item.enabled,
      remindAt: patch.remindAt && parseHm(patch.remindAt) ? patch.remindAt : item.remindAt,
      nudgeAt: patch.nudgeAt && parseHm(patch.nudgeAt) ? patch.nudgeAt : item.nudgeAt,
      hint: patch.hint !== undefined ? patch.hint.trim() : item.hint,
      updatedAt: new Date().toISOString(),
    };
  });
  await persist(next);
  notifyChanged();
}

export async function deleteTikTokStreak(id: string): Promise<void> {
  const items = await listTikTokStreaks();
  await persist(items.filter((item) => item.id !== id));
  notifyChanged();
}

export async function markTikTokStreakDone(id: string, done = true): Promise<TikTokStreak | null> {
  const today = localDateKey();
  const yesterday = shiftDateKey(today, -1);
  const items = await listTikTokStreaks();
  let updated: TikTokStreak | null = null;
  const next = items.map((item) => {
    if (item.id !== id) return item;
    if (done) {
      if (item.lastDoneDate === today) {
        updated = item;
        return item;
      }
      const streakCount = item.lastDoneDate === yesterday ? item.streakCount + 1 : 1;
      updated = {
        ...item,
        lastDoneDate: today,
        streakCount,
        longestStreak: Math.max(item.longestStreak, streakCount),
        updatedAt: new Date().toISOString(),
      };
      return updated;
    }
    if (item.lastDoneDate !== today) {
      updated = item;
      return item;
    }
    const restored = item.streakCount > 1 ? item.streakCount - 1 : 0;
    updated = {
      ...item,
      lastDoneDate: restored > 0 ? yesterday : null,
      streakCount: restored,
      updatedAt: new Date().toISOString(),
    };
    return updated;
  });
  await persist(next);
  notifyChanged();
  return updated;
}

export function tiktokProfileUrl(username: string): string {
  const handle = normalizeUsername(username);
  if (handle) return `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
  return "https://www.tiktok.com/messages";
}

export async function openTikTok(username = ""): Promise<void> {
  const url = tiktokProfileUrl(username);
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function subscribeTikTokStreaks(cb: () => void): () => void {
  window.addEventListener(CHANGED, cb);
  return () => window.removeEventListener(CHANGED, cb);
}
