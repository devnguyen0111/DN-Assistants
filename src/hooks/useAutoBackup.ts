import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-context";

const CHECK_EVERY_MS = 15 * 60 * 1000;
const FIRST_CHECK_DELAY_MS = 60 * 1000;

/** Writes a scheduled encrypted backup when one is due (main window only). */
export function useAutoBackup() {
  const { settings, updateSettings, ready } = useSettings();
  const { t } = useI18n();
  const running = useRef(false);
  const latest = useRef(settings);
  latest.current = settings;

  useEffect(() => {
    if (!ready || !settings.autoBackupEnabled) return;

    const tick = async () => {
      const s = latest.current;
      if (running.current || !s.autoBackupDir || !s.autoBackupPassword.trim()) return;
      const last = s.lastAutoBackupAt ? Date.parse(s.lastAutoBackupAt) : 0;
      if (Date.now() - last < s.autoBackupIntervalHours * 3600_000) return;
      running.current = true;
      try {
        const { runAutoBackup } = await import("@/lib/backup");
        await runAutoBackup(s.autoBackupDir, s.autoBackupPassword, s.autoBackupKeep);
        await updateSettings({ lastAutoBackupAt: new Date().toISOString() });
      } catch (err) {
        toast.error(`${t.autoBackupFailed}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        running.current = false;
      }
    };

    const first = window.setTimeout(() => void tick(), FIRST_CHECK_DELAY_MS);
    const timer = window.setInterval(() => void tick(), CHECK_EVERY_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [ready, settings.autoBackupEnabled, updateSettings, t]);
}
