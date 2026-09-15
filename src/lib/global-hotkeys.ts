import type { AppSettings } from "@/lib/settings";

let registered: string[] = [];

async function toggleMainWindow() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const win = getCurrentWindow();
  const visible = await win.isVisible();
  if (visible) {
    await win.hide();
  } else {
    await win.show();
    await win.unminimize();
    await win.setFocus();
  }
}

async function showMainWindow() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const win = getCurrentWindow();
  await win.show();
  await win.unminimize();
  await win.setFocus();
}

export async function unregisterAllGlobalHotkeys(): Promise<void> {
  try {
    const { unregisterAll } = await import("@tauri-apps/plugin-global-shortcut");
    await unregisterAll();
    registered = [];
  } catch {
    // browser preview / plugin unavailable
  }
}

export async function syncGlobalHotkeys(settings: AppSettings): Promise<void> {
  try {
    const { register, unregisterAll } = await import(
      "@tauri-apps/plugin-global-shortcut"
    );
    await unregisterAll();
    registered = [];

    const toggle = settings.hotkeyToggleWindow.trim();
    const clipboard = settings.hotkeyClipboard.trim();
    const scratchpad = settings.hotkeyScratchpad.trim();

    const unique = new Map<string, "toggle" | "clipboard" | "scratchpad">();
    if (toggle) unique.set(toggle, "toggle");
    if (clipboard) unique.set(clipboard, "clipboard");
    if (scratchpad) unique.set(scratchpad, "scratchpad");

    for (const [shortcut, action] of unique) {
      await register(shortcut, (event) => {
        if (event.state !== "Pressed") return;
        void (async () => {
          if (action === "toggle") {
            await toggleMainWindow();
            return;
          }
          await showMainWindow();
          if (action === "clipboard") {
            window.dispatchEvent(new Event("dn-hotkey-clipboard"));
            return;
          }
          window.dispatchEvent(new Event("dn-hotkey-scratchpad"));
          window.setTimeout(() => {
            document.getElementById("dn-scratchpad")?.focus();
          }, 50);
        })();
      });
      registered.push(shortcut);
    }
  } catch {
    // browser preview / plugin unavailable
  }
}
