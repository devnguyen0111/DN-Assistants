import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/lib/settings-context";
import {
  getUpdateState,
  promptUpdateIfAvailable,
  subscribeUpdateState,
  UPDATE_CHECK_INTERVAL_MS,
  type UpdateState,
} from "@/lib/updates";

const FIRST_CHECK_DELAY_MS = 2500;

/** Checks shortly after launch and then every 6 hours while the app runs (incl. tray). */
export function useAutoUpdates() {
  const { settings, ready } = useSettings();
  const latest = useRef(settings);
  latest.current = settings;

  useEffect(() => {
    if (!ready || !settings.autoCheckUpdates) return;
    const run = () =>
      void promptUpdateIfAvailable({
        skippedVersion: latest.current.skippedUpdateVersion,
        snoozedUntil: latest.current.updateSnoozedUntil,
      });
    const first = window.setTimeout(run, FIRST_CHECK_DELAY_MS);
    const every = window.setInterval(run, UPDATE_CHECK_INTERVAL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
    };
  }, [ready, settings.autoCheckUpdates]);
}

/** Subscribe a component to the shared updater state. */
export function useUpdateState(): UpdateState {
  const [state, setState] = useState<UpdateState>(getUpdateState);
  useEffect(() => subscribeUpdateState(setState), []);
  return state;
}
