export type AppRoute =
  | "home"
  | "clock"
  | "calendar"
  | "calculator"
  | "currency"
  | "devtools"
  | "notes"
  | "todo"
  | "clipboard"
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
  "currency",
  "devtools",
  "notes",
  "todo",
  "clipboard",
  "focus",
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

export function routeHash(route: AppRoute): string {
  return `#/${route}`;
}

export function setHashRoute(route: AppRoute) {
  const next = routeHash(route);
  if (window.location.hash !== next) {
    window.location.hash = next;
  }
}
