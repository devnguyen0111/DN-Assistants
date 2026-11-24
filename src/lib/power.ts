/** Shutdown timer: thin wrappers around the Rust `power` commands. */

import type { TranslationKey } from "@/lib/i18n";

export type PowerAction = "shutdown" | "restart" | "sleep" | "hibernate" | "lock" | "signout";

export const POWER_ACTIONS: PowerAction[] = [
  "shutdown",
  "restart",
  "sleep",
  "hibernate",
  "lock",
  "signout",
];

export const POWER_ACTION_LABEL: Record<PowerAction, TranslationKey> = {
  shutdown: "powerShutdown",
  restart: "powerRestart",
  sleep: "powerSleep",
  hibernate: "powerHibernate",
  lock: "powerLock",
  signout: "powerSignout",
};

export type PowerSchedule = { action: PowerAction; deadline_ms: number };

async function core() {
  return import("@tauri-apps/api/core");
}

export async function schedulePowerAction(
  action: PowerAction,
  delaySecs: number,
): Promise<PowerSchedule> {
  const { invoke } = await core();
  return invoke<PowerSchedule>("schedule_power_action", {
    action,
    delaySecs: Math.max(0, Math.round(delaySecs)),
  });
}

export async function cancelPowerAction(): Promise<void> {
  const { invoke } = await core();
  await invoke("cancel_power_action");
}

export async function getPowerSchedule(): Promise<PowerSchedule | null> {
  try {
    const { invoke } = await core();
    return await invoke<PowerSchedule | null>("get_power_schedule");
  } catch {
    return null;
  }
}

/** Seconds from now until the next occurrence of local "HH:MM" (today or tomorrow). */
export function secondsUntilTime(hm: string, now = new Date()): number | null {
  const m = hm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const target = new Date(now);
  target.setHours(Number(m[1]), Number(m[2]), 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return Math.round((target.getTime() - now.getTime()) / 1000);
}

export function formatCountdown(totalSecs: number): string {
  const s = Math.max(0, Math.floor(totalSecs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
