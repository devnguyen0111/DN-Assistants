import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { onChange } from "@/lib/db";
import { getAllHabitsWithStats, type HabitStats } from "@/lib/habits";
import { useI18n } from "@/lib/i18n";
import {
  hasFired,
  markFired,
  playReminderChime,
  pruneFiredKeys,
  showOsNotification,
} from "@/lib/notify";
import { localDateKey } from "@/lib/utils";

function hmToMinutes(value: string): number | null {
  const m = value.match(/^(\d{2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * Daily habit reminders: a gentle reminder at `remind_at`, and a "streak at risk" nudge at
 * `nudge_at` — both only while the habit is not checked in today. Each fires once per day.
 */
export function useHabitReminders() {
  const { t } = useI18n();
  const itemsRef = useRef<HabitStats[]>([]);

  useEffect(() => {
    pruneFiredKeys();
    let cancelled = false;

    const load = async () => {
      try {
        const rows = await getAllHabitsWithStats();
        if (!cancelled) itemsRef.current = rows;
      } catch {
        // database not ready yet
      }
    };

    const tick = () => {
      const now = new Date();
      const today = localDateKey(now);
      const minutes = now.getHours() * 60 + now.getMinutes();
      for (const stat of itemsRef.current) {
        if (stat.completedToday) continue;
        const { habit } = stat;
        // Nudge first: once it is due, the plain reminder is redundant.
        const candidates: Array<["nudge" | "remind", string]> = [
          ["nudge", habit.nudge_at],
          ["remind", habit.remind_at],
        ];
        for (const [kind, at] of candidates) {
          const target = at ? hmToMinutes(at) : null;
          if (target == null || minutes < target) continue;
          const key = `habit:${habit.id}:${today}:${kind}`;
          if (hasFired(key)) break;
          markFired(key, now.getTime());
          const body = (kind === "nudge" ? t.habitNudge : t.habitReminder)
            .replace("{name}", habit.title)
            .replace("{n}", String(stat.currentStreak));
          toast(body);
          playReminderChime();
          void showOsNotification(t.navHabits, body);
          break;
        }
      }
    };

    void load().then(tick);
    const reloadId = window.setInterval(() => void load(), 60_000);
    const tickId = window.setInterval(tick, 15_000);
    const offChange = onChange("habits", () => void load());

    return () => {
      cancelled = true;
      window.clearInterval(reloadId);
      window.clearInterval(tickId);
      offChange();
    };
  }, [t]);
}
