import type { ReactNode } from "react";
import {
  Calculator,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Clock3,
  CloudSun,
  Code2,
  Coins,
  Home,
  Info,
  Monitor,
  Network,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Settings,
  Star,
  Timer,
  Flame,
  KeyRound,
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n";
import { navLabel } from "@/lib/page-meta";
import { useSettings } from "@/lib/settings-context";
import type { AppRoute } from "@/lib/routing";
import { cn } from "@/lib/utils";
import logoUrl from "@/assets/logo.png";

type AppShellProps = {
  route: AppRoute;
  onNavigate: (route: AppRoute) => void;
  children: ReactNode;
};

type NavItem = {
  route: AppRoute;
  icon: typeof Clock3;
};

type NavGroup = {
  labelKey: "navGroupMain" | "navGroupTools" | "navGroupSystem" | "navGroupFavorites";
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "navGroupMain",
    items: [
      { route: "home", icon: Home },
      { route: "clock", icon: Clock3 },
      { route: "calendar", icon: CalendarDays },
    ],
  },
  {
    labelKey: "navGroupTools",
    items: [
      { route: "calculator", icon: Calculator },
      { route: "currency", icon: Coins },
      { route: "devtools", icon: Code2 },
      { route: "notes", icon: NotebookPen },
      { route: "todo", icon: CheckSquare },
      { route: "clipboard", icon: ClipboardList },
      { route: "passwords", icon: KeyRound },
      { route: "focus", icon: Timer },
      { route: "tiktok", icon: Flame },
    ],
  },
  {
    labelKey: "navGroupSystem",
    items: [
      { route: "system", icon: Monitor },
      { route: "network", icon: Network },
      { route: "weather", icon: CloudSun },
      { route: "settings", icon: Settings },
      { route: "about", icon: Info },
    ],
  },
];

const ROUTE_ICON: Record<AppRoute, typeof Home> = {
  home: Home,
  clock: Clock3,
  calendar: CalendarDays,
  calculator: Calculator,
  currency: Coins,
  devtools: Code2,
  notes: NotebookPen,
  todo: CheckSquare,
  clipboard: ClipboardList,
  passwords: KeyRound,
  focus: Timer,
  tiktok: Flame,
  system: Monitor,
  network: Network,
  weather: CloudSun,
  settings: Settings,
  about: Info,
};

export function AppShell({ route, onNavigate, children }: AppShellProps) {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();
  const collapsed = settings.sidebarCollapsed;
  const favorites = settings.favoriteRoutes;

  const toggleFavorite = (r: AppRoute) => {
    const next = favorites.includes(r) ? favorites.filter((x) => x !== r) : [...favorites, r];
    void updateSettings({ favoriteRoutes: next });
  };

  const renderItem = (item: NavItem, showPin = true) => {
    const Icon = item.icon;
    const active = route === item.route;
    const label = navLabel(t, item.route);
    const isFav = favorites.includes(item.route);
    const btn = (
      <div
        key={item.route}
        className={cn("group relative flex", collapsed ? "justify-center" : "")}
      >
        <Button
          variant={active ? "secondary" : "ghost"}
          className={cn(
            "h-10 gap-2",
            collapsed ? "w-11 justify-center px-0" : "w-full justify-start pr-8",
            active && "border-l-2 border-l-primary bg-primary/15 text-foreground",
          )}
          onClick={() => onNavigate(item.route)}
          title={label}
          aria-current={active ? "page" : undefined}
        >
          <Icon className="size-4 shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
        </Button>
        {!collapsed && showPin && item.route !== "home" && (
          <button
            type="button"
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100",
              isFav && "opacity-100 text-primary",
            )}
            title={isFav ? t.unpinFavorite : t.pinFavorite}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(item.route);
            }}
          >
            {isFav ? <Star className="size-3.5 fill-current" /> : <Pin className="size-3.5" />}
          </button>
        )}
      </div>
    );
    if (!collapsed) return btn;
    return (
      <Tooltip key={item.route} delayDuration={200}>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "sticky top-0 flex h-screen shrink-0 flex-col border-r bg-card/60 py-4 backdrop-blur transition-[width] duration-200",
          collapsed ? "w-[72px] items-center px-2" : "w-52 items-stretch px-3",
        )}
      >
        <div
          className={cn("mb-3 flex items-center gap-2", collapsed ? "justify-center px-0" : "px-2")}
        >
          <img src={logoUrl} alt="" className="size-9 shrink-0 rounded-lg" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">{t.appName}</p>
              <p className="truncate text-[11px] text-muted-foreground">{t.appTagline}</p>
            </div>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {favorites.length > 0 && (
            <div className="flex flex-col gap-1">
              {!collapsed && (
                <p className="px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.navGroupFavorites}
                </p>
              )}
              {collapsed && <Separator className="my-1" />}
              {favorites.map((r) => renderItem({ route: r, icon: ROUTE_ICON[r] }, false))}
            </div>
          )}
          {NAV_GROUPS.map((group) => (
            <div key={group.labelKey} className="flex flex-col gap-1">
              {!collapsed && (
                <p className="px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t[group.labelKey]}
                </p>
              )}
              {collapsed && <Separator className="my-1" />}
              {group.items.map((item) => renderItem(item))}
            </div>
          ))}
        </nav>

        <Button
          variant="ghost"
          size="sm"
          className={cn("mt-2", collapsed ? "w-11 px-0" : "w-full justify-start")}
          onClick={() => void updateSettings({ sidebarCollapsed: !collapsed })}
          title={collapsed ? t.expandSidebar : t.collapseSidebar}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <>
              <PanelLeftClose className="size-4" />
              <span>{t.collapseSidebar}</span>
            </>
          )}
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 lg:px-8">
          <AppHeader route={route} onNavigate={onNavigate} />
          <main className="min-h-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
