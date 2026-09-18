import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { listEvents, startOfDay, type CalendarEvent } from "@/lib/events";
import { useI18n } from "@/lib/i18n";
import {
  hasFired,
  markFired,
  playReminderChime,
  pruneFiredKeys,
  showOsNotification,
} from "@/lib/notify";
import { formatTimeHm } from "@/lib/utils";

function minuteKey(ms: number) {
  return Math.floor(ms / 60_000);
}

function reminderAt(event: CalendarEvent): number {
  if (event.all_day === 1) {
    // Fire once when the app is open on that calendar day (at start of day minute).
    return startOfDay(event.start_at);
  }
  const offset = (event.remind_minutes ?? 0) * 60_000;
  return event.start_at - offset;
}

function shouldFire(event: CalendarEvent, now: number, bootMinute: number): boolean {
  const remindMs = reminderAt(event);
  const remindMin = minuteKey(remindMs);
  const nowMin = minuteKey(now);

  if (event.all_day === 1) {
    // All-day: fire once when the app is open on that calendar day.
    if (startOfDay(now) !== startOfDay(event.start_at)) return false;
    const key = `${event.id}:${remindMin}`;
    return !hasFired(key);
  }

  // Timed: only fire during the exact remind minute; skip minutes already past at boot.
  if (nowMin !== remindMin) return false;
  if (remindMin < bootMinute) return false;
  const key = `${event.id}:${remindMin}`;
  return !hasFired(key);
}

export function useEventReminders(enabled = true) {
  const { t } = useI18n();
  const bootMinute = useRef(minuteKey(Date.now()));
  const eventsRef = useRef<CalendarEvent[]>([]);

  useEffect(() => {
    if (!enabled) return;
    pruneFiredKeys();
    let cancelled = false;

    const load = async () => {
      try {
        const rows = await listEvents();
        if (!cancelled) eventsRef.current = rows;
      } catch {
        // ignore
      }
    };

    void load();
    const reloadId = window.setInterval(() => void load(), 60_000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("dn-events-changed", onFocus);

    const tick = () => {
      const now = Date.now();
      for (const event of eventsRef.current) {
        if (!shouldFire(event, now, bootMinute.current)) continue;
        const remindMs = reminderAt(event);
        const key = `${event.id}:${minuteKey(remindMs)}`;
        markFired(key, now);

        const timeLabel = event.all_day === 1 ? t.allDay : formatTimeHm(event.start_at);
        const body = `${timeLabel} — ${event.title}`;
        toast(t.eventReminder, { description: body });
        playReminderChime();
        void showOsNotification(t.eventReminder, body);
      }
    };

    tick();
    const tickId = window.setInterval(tick, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(reloadId);
      window.clearInterval(tickId);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("dn-events-changed", onFocus);
    };
  }, [enabled, t]);
}
