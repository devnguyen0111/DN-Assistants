import { useEffect } from "react";
import { useSettings } from "@/lib/settings-context";
import { syncGlobalHotkeys, unregisterAllGlobalHotkeys } from "@/lib/global-hotkeys";
import { parseWidgetKind, type AppRoute } from "@/lib/routing";

type Options = {
  onNavigate?: (route: AppRoute) => void;
};

/**
 * Registers desktop global shortcuts from settings and wires clipboard/scratchpad events.
 */
export function useDesktopHotkeys(options: Options = {}) {
  const { settings, ready } = useSettings();
  const { onNavigate } = options;

  useEffect(() => {
    if (!ready) return;
    if (parseWidgetKind()) return;
    void syncGlobalHotkeys(settings);
    return () => {
      void unregisterAllGlobalHotkeys();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, settings.hotkeyToggleWindow, settings.hotkeyClipboard, settings.hotkeyScratchpad]);

  useEffect(() => {
    const onClipboard = () => onNavigate?.("clipboard");
    const onScratchpad = () => {
      onNavigate?.("home");
      window.setTimeout(() => {
        document.getElementById("dn-scratchpad")?.focus();
      }, 80);
    };
    window.addEventListener("dn-hotkey-clipboard", onClipboard);
    window.addEventListener("dn-hotkey-scratchpad", onScratchpad);
    return () => {
      window.removeEventListener("dn-hotkey-clipboard", onClipboard);
      window.removeEventListener("dn-hotkey-scratchpad", onScratchpad);
    };
  }, [onNavigate]);
}
