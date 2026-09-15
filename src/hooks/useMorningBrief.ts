import { useEffect, useRef } from "react";
import { listUpcoming } from "@/lib/events";
import { showOsNotification } from "@/lib/notify";
import { listTodos } from "@/lib/todos";
import { useSettings } from "@/lib/settings-context";

const LS_KEY = "dn-morning-brief-day";

/** Once per local day, notify agenda + due todos if enabled. */
export function useMorningBrief() {
  const { settings, ready } = useSettings();
  const ran = useRef(false);

  useEffect(() => {
    if (!ready || !settings.morningBriefEnabled || ran.current) return;
    const hour = new Date().getHours();
    if (hour < 5 || hour > 11) return;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(LS_KEY) === today) return;
    ran.current = true;
    void (async () => {
      try {
        const [events, todos] = await Promise.all([listUpcoming(5), listTodos()]);
        const due = todos.filter((t) => !t.done && t.due_at && t.due_at.slice(0, 10) <= today);
        const lines = [
          ...events.map((e) => `• ${e.title}`),
          ...due.slice(0, 5).map((t) => `☐ ${t.title}`),
        ];
        if (lines.length === 0) {
          localStorage.setItem(LS_KEY, today);
          return;
        }
        await showOsNotification("DN Assistant", lines.join("\n"));
        localStorage.setItem(LS_KEY, today);
      } catch {
        // ignore
      }
    })();
  }, [ready, settings.morningBriefEnabled]);
}
