import { useEffect } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { showOsNotification } from "@/lib/notify";
import { cancelPowerAction, POWER_ACTION_LABEL, type PowerSchedule } from "@/lib/power";

/** Last-chance warning ~60s before a scheduled shutdown/restart/sleep, from any page. */
export function usePowerWarnings() {
  const { t } = useI18n();

  useEffect(() => {
    const unlisteners: Array<() => void> = [];
    let disposed = false;
    void (async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        const offWarn = await listen<PowerSchedule | null>("power-action-warning", (e) => {
          if (!e.payload) return;
          const label = t[POWER_ACTION_LABEL[e.payload.action]];
          const body = t.powerWarning.replace("{action}", label);
          void showOsNotification(t.powerTitle, body);
          toast.warning(body, {
            duration: 60_000,
            action: {
              label: t.cancel,
              onClick: () => {
                void cancelPowerAction().then(() => toast.success(t.powerCancelled));
              },
            },
          });
        });
        const offFail = await listen<string>("power-action-failed", (e) => {
          toast.error(`${t.powerFailed}: ${e.payload}`);
        });
        if (disposed) {
          offWarn();
          offFail();
        } else unlisteners.push(offWarn, offFail);
      } catch {
        // browser preview
      }
    })();
    return () => {
      disposed = true;
      unlisteners.forEach((off) => off());
    };
  }, [t]);
}
