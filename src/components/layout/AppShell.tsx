import type { ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen, Star } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n";
import { NAV_GROUPS, ROUTE_ICON, UNFAVORITABLE_ROUTES, type NavItem } from "@/lib/nav";
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

/**
 * Viewport grid: sidebar (brand · scrolling nav · fixed footer) + toolbar + scrolling page.
 * Spec §3 — the footer (Settings, About, Collapse) never overlaps or scrolls away.
 */
export function AppShell({ route, onNavigate, children }: AppShellProps) {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();
  const collapsed = settings.sidebarCollapsed;
  const hidden = new Set(settings.hiddenRoutes);
  const favorites = settings.favoriteRoutes.filter(
    (r) => !hidden.has(r) && !UNFAVORITABLE_ROUTES.includes(r),
  );
  const favoriteSet = new Set(favorites);

  const toggleFavorite = (r: AppRoute) => {
    const next = settings.favoriteRoutes.includes(r)
      ? settings.favoriteRoutes.filter((x) => x !== r)
      : [...settings.favoriteRoutes, r];
    void updateSettings({ favoriteRoutes: next });
  };

  const renderItem = (item: NavItem, opts: { star?: boolean } = {}) => {
    const Icon = item.icon;
    const active = route === item.route;
    const label = navLabel(t, item.route);
    const isFav = favoriteSet.has(item.route);
    const showStar =
      !collapsed && opts.star !== false && !UNFAVORITABLE_ROUTES.includes(item.route);

    const link = (
      <button
        type="button"
        onClick={() => onNavigate(item.route)}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? label : undefined}
        className={cn(
          "relative flex h-[var(--density-nav-h)] w-full items-center gap-2 rounded-sm px-2 text-body transition-colors duration-100",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
          collapsed && "justify-center px-0",
          showStar && "pr-9",
          active
            ? "bg-accent font-medium text-accent-foreground before:absolute before:left-0 before:top-1/2 before:h-[18px] before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-primary"
            : "text-text-2 hover:bg-surface-3 hover:text-text-1",
        )}
      >
        <Icon className="size-4 shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
      </button>
    );

    return (
      <li key={item.route} className="group/nav relative">
        {collapsed ? (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        ) : (
          link
        )}
        {showStar && (
          <button
            type="button"
            aria-pressed={isFav}
            aria-label={`${isFav ? t.unpinFavorite : t.pinFavorite}: ${label}`}
            title={isFav ? t.unpinFavorite : t.pinFavorite}
            onClick={() => toggleFavorite(item.route)}
            className={cn(
              "absolute right-1 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-text-3 transition-opacity hover:bg-surface-3 hover:text-text-1",
              "focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring",
              isFav
                ? "text-accent-foreground opacity-100"
                : "opacity-0 group-hover/nav:opacity-100 group-focus-within/nav:opacity-100",
            )}
          >
            <Star className={cn("size-3.5", isFav && "fill-current")} />
          </button>
        )}
      </li>
    );
  };

  const groupLabel = (text: string) =>
    collapsed ? (
      <div role="separator" className="mx-2 my-2 h-px bg-border" />
    ) : (
      <p className="px-2 pb-1 pt-3 text-caption font-semibold text-text-3">{text}</p>
    );

  const mainGroups = NAV_GROUPS.filter((g) => g.labelKey !== "navGroupApp");
  const appGroup = NAV_GROUPS.find((g) => g.labelKey === "navGroupApp");

  return (
    <div
      className="grid h-full overflow-hidden"
      style={{
        gridTemplateColumns: `${collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-expanded)"} minmax(0, 1fr)`,
      }}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[90] focus:rounded-sm focus:bg-elevated focus:px-3 focus:py-2 focus:shadow-popover"
      >
        {t.skipToMain}
      </a>

      <aside className="grid min-h-0 grid-rows-[64px_minmax(0,1fr)_auto] border-r bg-sidebar px-2">
        <div className={cn("flex items-center gap-2", collapsed ? "justify-center" : "px-2")}>
          <img src={logoUrl} alt="" className="size-8 shrink-0 rounded-md" />
          {!collapsed && <span className="truncate text-label text-text-1">{t.appName}</span>}
        </div>

        <nav
          aria-label={t.navMain}
          className="min-h-0 overflow-y-auto overscroll-contain pb-2 [scrollbar-gutter:stable]"
        >
          {favorites.length > 0 && (
            <div>
              {groupLabel(t.navGroupFavorites)}
              <ul className="space-y-0.5">
                {favorites.map((r) => renderItem({ route: r, icon: ROUTE_ICON[r] }))}
              </ul>
            </div>
          )}
          {mainGroups.map((group) => {
            // Hidden modules stay reachable via Ctrl+K; the current page is always shown.
            const items = group.items.filter(
              (i) => (!hidden.has(i.route) || i.route === route) && !favoriteSet.has(i.route),
            );
            if (items.length === 0) return null;
            return (
              <div key={group.labelKey}>
                {groupLabel(t[group.labelKey])}
                <ul className="space-y-0.5">{items.map((item) => renderItem(item))}</ul>
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t bg-sidebar py-2">
          {!collapsed && appGroup && (
            <p className="px-2 pb-1 text-caption font-semibold text-text-3">
              {t[appGroup.labelKey]}
            </p>
          )}
          <ul className="space-y-0.5">
            {appGroup?.items.map((item) => renderItem(item, { star: false }))}
            <li>
              <button
                type="button"
                onClick={() => void updateSettings({ sidebarCollapsed: !collapsed })}
                aria-label={collapsed ? t.expandSidebar : t.collapseSidebar}
                aria-expanded={!collapsed}
                className={cn(
                  "flex h-[var(--density-nav-h)] w-full items-center gap-2 rounded-sm px-2 text-body text-text-2 hover:bg-surface-3 hover:text-text-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  collapsed && "justify-center px-0",
                )}
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-4" />
                ) : (
                  <PanelLeftClose className="size-4" />
                )}
                {!collapsed && <span>{t.collapseSidebar}</span>}
              </button>
            </li>
          </ul>
        </div>
      </aside>

      <div className="grid min-h-0 min-w-0 grid-rows-[var(--app-toolbar-h)_minmax(0,1fr)]">
        <AppHeader onNavigate={onNavigate} />
        <main
          id="main-content"
          tabIndex={-1}
          className="min-h-0 min-w-0 overflow-y-auto px-4 outline-none [@media(min-width:1200px)]:px-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
