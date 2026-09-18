import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import {
  hasFired,
  markFired,
  playReminderChime,
  pruneFiredKeys,
  showOsNotification,
} from "@/lib/notify";
import {
  hmToMinutes,
  isDoneToday,
  listTikTokStreaks,
  localDateKey,
  type TikTokStreak,
} from "@/lib/tiktok-streaks";

function currentMinutes(now = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

function shouldNotify(item: TikTokStreak, kind: "remind" | "nudge", now: Date): boolean {
  if (!item.enabled || isDoneToday(item)) return false;
  const today = localDateKey(now);
  const key = `tiktok:${item.id}:${today}:${kind}`;
  if (hasFired(key)) return false;
  const target = hmToMinutes(kind === "remind" ? item.remindAt : item.nudgeAt);
  if (target == null) return false;
  return currentMinutes(now) >= target;
}

export function useTikTokStreakReminders() {
  const { t } = useI18n();
  const itemsRef = useRef<TikTokStreak[]>([]);

  useEffect(() => {
    pruneFiredKeys();
    let cancelled = false;

    const load = async () => {
      try {
        const rows = await listTikTokStreaks();
        if (!cancelled) itemsRef.current = rows;
      } catch {
        // ignore
      }
    };

    void load();
    const reloadId = window.setInterval(() => void load(), 15_000);
    const onChanged = () => void load();
    window.addEventListener("focus", onChanged);
    window.addEventListener("dn-tiktok-streaks-changed", onChanged);

    const tick = () => {
      const now = new Date();
      const today = localDateKey(now);
      for (const item of itemsRef.current) {
        const kinds: Array<"nudge" | "remind"> = ["nudge", "remind"];
        for (const kind of kinds) {
          if (!shouldNotify(item, kind, now)) continue;
          const key = `tiktok:${item.id}:${today}:${kind}`;
          markFired(key, now.getTime());
          const title = kind === "nudge" ? t.tiktokNudge : t.tiktokReminder;
          const body = title.replace("{name}", item.name).replace("{n}", String(item.streakCount));
          toast(body, { description: t.tiktokDisclaimer });
          playReminderChime();
          void showOsNotification(t.tiktokTitle, body);
          break;
        }
      }
    };

    tick();
    const tickId = window.setInterval(tick, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(reloadId);
      window.clearInterval(tickId);
      window.removeEventListener("focus", onChanged);
      window.removeEventListener("dn-tiktok-streaks-changed", onChanged);
    };
  }, [t]);
}
