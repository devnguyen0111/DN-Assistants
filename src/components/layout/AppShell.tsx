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
  Settings,
  Timer,
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n";
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
  labelKey:
    | "navHome"
    | "navClock"
    | "navCalendar"
    | "navCalculator"
    | "navCurrency"
    | "navDevTools"
    | "navNotes"
    | "navTodo"
    | "navClipboard"
    | "navFocus"
    | "navSystem"
    | "navNetwork"
    | "navWeather"
    | "navSettings"
    | "navAbout";
};

type NavGroup = {
  labelKey: "navGroupMain" | "navGroupTools" | "navGroupSystem";
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "navGroupMain",
    items: [
      { route: "home", icon: Home, labelKey: "navHome" },
      { route: "clock", icon: Clock3, labelKey: "navClock" },
      { route: "calendar", icon: CalendarDays, labelKey: "navCalendar" },
    ],
  },
  {
    labelKey: "navGroupTools",
    items: [
      { route: "calculator", icon: Calculator, labelKey: "navCalculator" },
      { route: "currency", icon: Coins, labelKey: "navCurrency" },
      { route: "devtools", icon: Code2, labelKey: "navDevTools" },
      { route: "notes", icon: NotebookPen, labelKey: "navNotes" },
      { route: "todo", icon: CheckSquare, labelKey: "navTodo" },
      { route: "clipboard", icon: ClipboardList, labelKey: "navClipboard" },
      { route: "focus", icon: Timer, labelKey: "navFocus" },
    ],
  },
  {
    labelKey: "navGroupSystem",
    items: [
      { route: "system", icon: Monitor, labelKey: "navSystem" },
      { route: "network", icon: Network, labelKey: "navNetwork" },
      { route: "weather", icon: CloudSun, labelKey: "navWeather" },
      { route: "settings", icon: Settings, labelKey: "navSettings" },
      { route: "about", icon: Info, labelKey: "navAbout" },
    ],
  },
];

export function AppShell({ route, onNavigate, children }: AppShellProps) {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();
  const collapsed = settings.sidebarCollapsed;

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "sticky top-0 flex h-screen shrink-0 flex-col border-r bg-card/60 py-4 backdrop-blur transition-[width] duration-200",
          collapsed ? "w-[72px] items-center px-2" : "w-52 items-stretch px-3",
        )}
      >
        <div className={cn("mb-3 flex items-center gap-2", collapsed ? "justify-center px-0" : "px-2")}>
          <img src={logoUrl} alt="" className="size-9 shrink-0 rounded-lg" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">{t.appName}</p>
              <p className="truncate text-[11px] text-muted-foreground">{t.appTagline}</p>
            </div>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.labelKey} className="flex flex-col gap-1">
              {!collapsed && (
                <p className="px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t[group.labelKey]}
                </p>
              )}
              {collapsed && <Separator className="my-1" />}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = route === item.route;
                const label = t[item.labelKey];
                const btn = (
                  <Button
                    key={item.route}
                    variant={active ? "secondary" : "ghost"}
                    className={cn(
                      "h-10 gap-2",
                      collapsed ? "w-11 justify-center px-0" : "w-full justify-start",
                      active && "bg-primary/15 text-foreground",
                    )}
                    onClick={() => onNavigate(item.route)}
                    title={label}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="size-4 shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Button>
                );
                if (!collapsed) return btn;
                return (
                  <Tooltip key={item.route} delayDuration={200}>
                    <TooltipTrigger asChild>{btn}</TooltipTrigger>
                    <TooltipContent side="right">{label}</TooltipContent>
                  </Tooltip>
                );
              })}
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
          <AppHeader onNavigate={onNavigate} />
          <main className="min-h-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
