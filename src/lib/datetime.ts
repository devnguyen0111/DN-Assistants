import type { Locale } from "@/lib/i18n";

/**
 * Locale-aware numeric date/time entry for the shared DateTimePicker (spec §4).
 * vi: dd/mm/yyyy, week starts Monday · en: mm/dd/yyyy, week starts Sunday · 24h time.
 */

const pad = (n: number) => String(n).padStart(2, "0");

export function datePattern(locale: Locale): string {
  return locale === "vi" ? "dd/mm/yyyy" : "mm/dd/yyyy";
}

export function weekStartsOn(locale: Locale): 0 | 1 {
  return locale === "vi" ? 1 : 0;
}

export function formatDateNumeric(d: Date, locale: Locale): string {
  return locale === "vi"
    ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
    : `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

export function formatTime24(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse a typed numeric date in the locale's order. Returns null when invalid (e.g. 31/02). */
export function parseDateNumeric(text: string, locale: Locale): Date | null {
  const m = text.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const year = Number(m[3]);
  const [day, month] = locale === "vi" ? [a, b] : [b, a];
  if (month < 1 || month > 12 || day < 1) return null;
  const d = new Date(year, month - 1, day);
  // Reject overflow such as 31/02 rolling into March.
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

/** Parse "H:mm"/"HH:mm" (24h). */
export function parseTime24(text: string): { hours: number; minutes: number } | null {
  const m = text.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

/** Combine a calendar date with a local time. */
export function withTime(date: Date, hours: number, minutes: number): Date {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** 6×7 grid of dates for the month containing `month`, starting on the locale's week start. */
export function monthGrid(month: Date, locale: Locale): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() - weekStartsOn(locale) + 7) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}
