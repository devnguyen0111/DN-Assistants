import {
  Calculator,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Clock3,
  CloudSun,
  Code2,
  FileCode2,
  Home,
  Info,
  KeyRound,
  Monitor,
  Network,
  NotebookPen,
  Palette,
  Settings,
  Timer,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { AppRoute } from "@/lib/routing";

/** Single source of truth for sidebar, command palette and About page navigation. */

export type NavGroupKey =
  "navGroupToday" | "navGroupLibrary" | "navGroupTools" | "navGroupSystem" | "navGroupApp";

export type NavItem = { route: AppRoute; icon: LucideIcon };

export const NAV_GROUPS: { labelKey: NavGroupKey; items: NavItem[] }[] = [
  {
    labelKey: "navGroupToday",
    items: [
      { route: "home", icon: Home },
      { route: "calendar", icon: CalendarDays },
      { route: "todo", icon: CheckSquare },
      { route: "habits", icon: CheckCircle2 },
      { route: "focus", icon: Timer },
    ],
  },
  {
    labelKey: "navGroupLibrary",
    items: [
      { route: "notes", icon: NotebookPen },
      { route: "snippets", icon: FileCode2 },
      { route: "clipboard", icon: ClipboardList },
      { route: "passwords", icon: KeyRound },
    ],
  },
  {
    labelKey: "navGroupTools",
    items: [
      { route: "calculator", icon: Calculator },
      { route: "devtools", icon: Code2 },
      { route: "filetools", icon: Wrench },
      { route: "colors", icon: Palette },
      { route: "clock", icon: Clock3 },
    ],
  },
  {
    labelKey: "navGroupSystem",
    items: [
      { route: "system", icon: Monitor },
      { route: "network", icon: Network },
      { route: "weather", icon: CloudSun },
    ],
  },
  {
    labelKey: "navGroupApp",
    items: [
      { route: "settings", icon: Settings },
      { route: "about", icon: Info },
    ],
  },
];

export const ROUTE_ICON = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.route, i.icon])),
) as Record<AppRoute, LucideIcon>;

/** Routes that must always stay reachable from the sidebar. */
export const UNHIDEABLE_ROUTES: AppRoute[] = ["home", "settings", "about"];

/** App-footer destinations are always visible, so they are never favorites. */
export const UNFAVORITABLE_ROUTES: AppRoute[] = ["settings", "about"];
