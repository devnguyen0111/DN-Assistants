import { LayoutGrid } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { NAV_GROUPS, UNHIDEABLE_ROUTES } from "@/lib/nav";
import { navLabel } from "@/lib/page-meta";
import type { AppRoute } from "@/lib/routing";
import { useSettings } from "@/lib/settings-context";

/** Choose which modules appear in the sidebar. Hidden ones stay reachable via Ctrl+K. */
export function ModulesSection() {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();
  const hidden = new Set(settings.hiddenRoutes);

  const toggle = (route: AppRoute, visible: boolean) => {
    const next = new Set(hidden);
    if (visible) next.delete(route);
    else next.add(route);
    void updateSettings({ hiddenRoutes: [...next] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="size-4 text-primary" />
          {t.settingsModules}
        </CardTitle>
        <CardDescription>{t.settingsModulesDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.labelKey} className="space-y-1.5">
            <p className="text-caption font-semibold text-text-3">{t[group.labelKey]}</p>
            <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {group.items.map(({ route, icon: Icon }) => {
                const locked = UNHIDEABLE_ROUTES.includes(route);
                return (
                  <label
                    key={route}
                    className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" />
                      {navLabel(t, route)}
                    </span>
                    <Switch
                      checked={locked || !hidden.has(route)}
                      disabled={locked}
                      onCheckedChange={(v) => toggle(route, v)}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
