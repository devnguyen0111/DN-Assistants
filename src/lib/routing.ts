export type AppRoute =
  | "home"
  | "clock"
  | "calendar"
  | "calculator"
  | "currency"
  | "devtools"
  | "notes"
  | "todo"
  | "habits"
  | "snippets"
  | "colors"
  | "filetools"
  | "clipboard"
  | "passwords"
  | "focus"
  | "tiktok"
  | "system"
  | "network"
  | "weather"
  | "settings"
  | "about";

export const ROUTES: AppRoute[] = [
  "home",
  "clock",
  "calendar",
  "calculator",
  "currency",
  "devtools",
  "notes",
  "todo",
  "habits",
  "snippets",
  "colors",
  "filetools",
  "clipboard",
  "passwords",
  "focus",
  "tiktok",
  "system",
  "network",
  "weather",
  "settings",
  "about",
];

/** Routes for Alt+1..9 quick nav (first 9 primary destinations). */
export const SHORTCUT_ROUTES: AppRoute[] = [
  "home",
  "clock",
  "calendar",
  "calculator",
  "system",
  "weather",
  "notes",
  "todo",
  "focus",
];

export function parseHashRoute(hash = window.location.hash): AppRoute {
  const raw = hash.replace(/^#\/?/, "").split("/")[0]?.toLowerCase() ?? "";
  if (ROUTES.includes(raw as AppRoute)) return raw as AppRoute;
  return "home";
}

export type WidgetKind = "clock" | "focus" | "cpu" | "sticky";

export function parseWidgetKind(hash = window.location.hash): WidgetKind | null {
  const parts = hash.replace(/^#\/?/, "").split("/");
  if (parts[0]?.toLowerCase() !== "widget") return null;
  const kind = parts[1]?.toLowerCase();
  if (kind === "clock" || kind === "focus" || kind === "cpu" || kind === "sticky") return kind;
  return null;
}

export function routeHash(route: AppRoute): string {
  return `#/${route}`;
}

export async function openWidgetWindow(kind: WidgetKind) {
  try {
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const label = `widget-${kind}`;
    const existing = await WebviewWindow.getByLabel(label);
    if (existing) {
      await existing.show();
      await existing.setFocus();
      return;
    }
    const sizes = {
      clock: { width: 280, height: 140 },
      focus: { width: 260, height: 180 },
      cpu: { width: 220, height: 120 },
      sticky: { width: 320, height: 260 },
    }[kind];
    new WebviewWindow(label, {
      url: `index.html#/widget/${kind}`,
      title: `DN ${kind}`,
      width: sizes.width,
      height: sizes.height,
      decorations: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
      center: true,
    });
  } catch (err) {
    console.error(err);
  }
}

export function setHashRoute(route: AppRoute) {
  const next = routeHash(route);
  if (window.location.hash !== next) {
    window.location.hash = next;
  }
}
