import { useEffect } from "react";
import { SHORTCUT_ROUTES, type AppRoute } from "@/lib/routing";

type Options = {
  onNavigate: (route: AppRoute) => void;
  onTogglePalette: () => void;
  onOpenShortcuts: () => void;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function useGlobalShortcuts({ onNavigate, onTogglePalette, onOpenShortcuts }: Options) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const typing = isTypingTarget(event.target);

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onTogglePalette();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === ",") {
        event.preventDefault();
        onNavigate("settings");
        return;
      }

      if (!typing && event.key === "?" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        onOpenShortcuts();
        return;
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey && !typing) {
        const num = Number(event.key);
        if (num >= 1 && num <= 9) {
          const route = SHORTCUT_ROUTES[num - 1];
          if (route) {
            event.preventDefault();
            onNavigate(route);
          }
        }
      }
    };

    const onOpenPalette = () => onTogglePalette();
    const onOpenShortcutsEv = () => onOpenShortcuts();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("dn-open-palette", onOpenPalette);
    window.addEventListener("dn-open-shortcuts", onOpenShortcutsEv);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("dn-open-palette", onOpenPalette);
      window.removeEventListener("dn-open-shortcuts", onOpenShortcutsEv);
    };
  }, [onNavigate, onTogglePalette, onOpenShortcuts]);
}
