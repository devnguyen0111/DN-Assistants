import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, locale = "en"): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0.0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)} ${units[unit]}`;
}

/** Always pads to 3 digit chars before % so "9%" and "100%" share width with tabular-nums. */
export function formatPercent(value: number, _locale = "en"): string {
  const n = Math.round(Math.min(Math.max(value, 0), 999));
  return `${n.toString().padStart(3, "\u2007")}%`;
}

export function formatRate(bytesPerSec: number, locale = "en"): string {
  return `${formatBytes(bytesPerSec, locale)}/s`;
}

export function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

export function formatTimeHm(ms: number) {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
