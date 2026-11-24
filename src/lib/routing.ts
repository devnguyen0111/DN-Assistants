export type AppRoute =
  | "home"
  | "clock"
  | "calendar"
  | "calculator"
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
  "system",
  "network",
  "weather",
  "settings",
  "about",
];

/** Routes for Alt+1..9 quick nav — follows the sidebar order of the most used pages. */
export const SHORTCUT_ROUTES: AppRoute[] = [
  "home",
  "calendar",
  "todo",
  "habits",
  "focus",
  "notes",
  "calculator",
  "devtools",
  "system",
];

/** Pages removed in v0.5 and where their content lives now. */
const LEGACY_ROUTES: Record<string, AppRoute> = {
  currency: "calculator",
  tiktok: "habits",
};

/** Map any stored/linked route name (including retired ones) to a current route. */
export function normalizeRoute(raw: string | null | undefined): AppRoute | null {
  const key = (raw ?? "").toLowerCase();
  if (ROUTES.includes(key as AppRoute)) return key as AppRoute;
  return LEGACY_ROUTES[key] ?? null;
}

export function parseHashRoute(hash = window.location.hash): AppRoute {
  const raw = hash.replace(/^#\/?/, "").split("/")[0] ?? "";
  return normalizeRoute(raw) ?? "home";
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
