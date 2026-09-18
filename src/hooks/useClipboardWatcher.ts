import { useEffect } from "react";
import { useSettings } from "@/lib/settings-context";
import {
  upsertClipboardImage,
  upsertClipboardItem,
  type ClipboardChangedPayload,
} from "@/lib/clipboard-history";

export function useClipboardWatcher(enabled = true) {
  const { settings } = useSettings();
  const shouldWatch = enabled && settings.clipboardHistoryEnabled;

  useEffect(() => {
    if (!shouldWatch) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        if (cancelled) return;
        unlisten = await listen<ClipboardChangedPayload | string>("clipboard-changed", (event) => {
          const payload = event.payload;
          if (typeof payload === "string") {
            void upsertClipboardItem(payload);
            return;
          }
          if (payload.kind === "image") {
            void upsertClipboardImage(payload);
          } else {
            void upsertClipboardItem(payload.content);
          }
        });
      } catch {
        // Tauri event API unavailable in browser preview
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [shouldWatch]);
}
