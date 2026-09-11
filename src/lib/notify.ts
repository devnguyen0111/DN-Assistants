const MUTE_KEY = "dn-assistant-sound-muted";
const FIRED_KEY = "dn-assistant-reminders-fired";

export function isSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

export function setSoundMuted(muted: boolean) {
  window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

export function playReminderChime() {
  if (isSoundMuted()) return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const tones = [880, 1174.7];
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02 + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28 + i * 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + 0.35 + i * 0.12);
    });
    window.setTimeout(() => void ctx.close(), 800);
  } catch {
    // ignore audio errors
  }
}

function loadFired(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(FIRED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveFired(map: Record<string, number>) {
  window.localStorage.setItem(FIRED_KEY, JSON.stringify(map));
}

/** Keep only keys from the last 7 days. */
export function pruneFiredKeys(now = Date.now()) {
  const map = loadFired();
  const cutoff = now - 7 * 24 * 60 * 60 * 1000;
  let changed = false;
  for (const [key, ts] of Object.entries(map)) {
    if (ts < cutoff) {
      delete map[key];
      changed = true;
    }
  }
  if (changed) saveFired(map);
  return map;
}

export function hasFired(key: string): boolean {
  return key in loadFired();
}

export function markFired(key: string, now = Date.now()) {
  const map = loadFired();
  map[key] = now;
  saveFired(map);
}

export async function showOsNotification(title: string, body: string) {
  try {
    const mod = await import("@tauri-apps/plugin-notification");
    let permitted = await mod.isPermissionGranted();
    if (!permitted) {
      const result = await mod.requestPermission();
      permitted = result === "granted";
    }
    if (!permitted) return;
    await mod.sendNotification({ title, body });
  } catch {
    // Plugin may be unavailable in browser-only preview.
  }
}
