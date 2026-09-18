import { useEffect, useMemo, useRef, useState } from "react";
import { animate, createScope } from "animejs";
import { Clock3, MoonStar, Search, Sun, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { localeTag, useI18n } from "@/lib/i18n";
import {
  dayOfYear,
  getCanChiDay,
  getCanChiHour,
  getCanChiMonth,
  getCanChiYear,
  solarToLunar,
  weekNumber,
} from "@/lib/lunar";
import {
  PRIMARY_IANA,
  dayDeltaLabel,
  formatZonedDate,
  getZoneById,
  getZoneCatalog,
  liveGmtLabel,
  loadWatchZoneIds,
  saveWatchZoneIds,
  searchZones,
  zoneLabel,
  zonedParts,
} from "@/lib/timezones";
import { useSettings } from "@/lib/settings-context";
import { cn, pad2 } from "@/lib/utils";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function ClockCard() {
  const { locale, t } = useI18n();
  const { settings } = useSettings();
  const tag = localeTag(locale);
  const [now, setNow] = useState(() => new Date());
  const [watchIds, setWatchIds] = useState<string[]>(() => loadWatchZoneIds());
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const scope = useRef<ReturnType<typeof createScope> | null>(null);
  const prevSecond = useRef(-1);

  const primaryZone = getZoneById(settings.primaryTimezone) ??
    getZoneById(PRIMARY_IANA) ?? {
      id: PRIMARY_IANA,
      iana: PRIMARY_IANA,
      labelEn: "Vietnam (Ho Chi Minh)",
      labelVi: "Việt Nam (Hồ Chí Minh)",
      gmt: "GMT+7",
      region: "Asia",
      city: "Ho Chi Minh",
    };

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const primary = useMemo(
    () => zonedParts(now, settings.primaryTimezone),
    [now, settings.primaryTimezone],
  );

  useEffect(() => {
    if (!timeRef.current) return;
    const sec = Number(primary.seconds);
    if (prevSecond.current === sec) return;
    prevSecond.current = sec;
    scope.current?.revert();
    scope.current = createScope({ root: timeRef }).add(() => {
      animate(".clock-digit", {
        y: [
          { to: -6, duration: 80 },
          { to: 0, duration: 180 },
        ],
        opacity: [
          { to: 0.55, duration: 80 },
          { to: 1, duration: 180 },
        ],
        ease: "outQuad",
      });
    });
    return () => scope.current?.revert();
  }, [primary.seconds]);

  const weekday = useMemo(
    () =>
      new Intl.DateTimeFormat(tag, {
        timeZone: settings.primaryTimezone,
        weekday: "long",
      }).format(now),
    [now, tag, settings.primaryTimezone],
  );
  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(tag, {
        timeZone: settings.primaryTimezone,
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(now),
    [now, tag, settings.primaryTimezone],
  );

  const dayKey = `${primary.year}-${primary.month}-${primary.day}`;
  const hour = Number(primary.hours);

  const lunar = useMemo(() => {
    return solarToLunar(primary.day, primary.month, primary.year, 7);
  }, [dayKey, primary.day, primary.month, primary.year]);

  const lunarLabel = useMemo(() => {
    const leap = lunar.leap ? ` (${t.leapMonth})` : "";
    return `${pad2(lunar.day)}/${pad2(lunar.month)}${leap}/${lunar.year}`;
  }, [lunar, t.leapMonth]);

  const canChi = useMemo(
    () => ({
      year: getCanChiYear(lunar.year, locale),
      month: getCanChiMonth(lunar.month, lunar.year, locale),
      day: getCanChiDay(lunar.jd, locale),
      hour: getCanChiHour(hour, lunar.jd, locale),
    }),
    [lunar, locale, hour],
  );

  const primaryDateForMeta = useMemo(
    () => new Date(primary.year, primary.month - 1, primary.day),
    [primary.year, primary.month, primary.day],
  );

  const catalog = useMemo(() => getZoneCatalog(), []);

  const watchZones = useMemo(
    () => watchIds.map((id) => getZoneById(id)).filter(Boolean),
    [watchIds],
  );

  const availableToAdd = useMemo(
    () => catalog.filter((z) => z.iana !== settings.primaryTimezone && !watchIds.includes(z.id)),
    [catalog, watchIds, settings.primaryTimezone],
  );

  const filteredZones = useMemo(
    () => searchZones(availableToAdd, query, locale),
    [availableToAdd, query, locale],
  );

  const persist = (ids: string[]) => {
    setWatchIds(ids);
    saveWatchZoneIds(ids);
  };

  const addZone = (id: string) => {
    if (!id || watchIds.includes(id) || watchIds.length >= 8) return;
    persist([...watchIds, id]);
    setQuery("");
    setSearchOpen(false);
  };

  const removeZone = (id: string) => {
    persist(watchIds.filter((x) => x !== id));
  };

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Clock3 className="size-4 text-primary" />
          {t.clock}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void import("@/lib/routing").then((m) => m.openWidgetWindow("clock"))}
          >
            {t.openWidget}
          </Button>
          <Badge variant="secondary">{t.primaryZone}</Badge>
          <Badge variant="outline">{liveGmtLabel(now, settings.primaryTimezone)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col justify-center gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            {zoneLabel(primaryZone, locale)} · {settings.primaryTimezone}
          </p>
          <div
            ref={timeRef}
            className="font-mono text-4xl font-semibold tracking-tight tabular-nums md:text-5xl"
          >
            <span className="inline-block w-[2ch] overflow-hidden text-center align-bottom">
              <span className="clock-digit inline-block">{primary.hours}</span>
            </span>
            <span className="mx-1 text-muted-foreground">:</span>
            <span className="inline-block w-[2ch] overflow-hidden text-center align-bottom">
              <span className="clock-digit inline-block">{primary.minutes}</span>
            </span>
            <span className="mx-1 text-muted-foreground">:</span>
            <span className="inline-block w-[2ch] overflow-hidden text-center align-bottom text-primary">
              <span className="clock-digit inline-block">{primary.seconds}</span>
            </span>
          </div>
          <div>
            <p className="text-base font-medium capitalize">{weekday}</p>
            <p className="text-sm text-muted-foreground">{dateLabel}</p>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Sun className="size-3.5" />
              {t.solarDate}
            </p>
            <InfoRow label={t.solarDate} value={dateLabel} />
            <InfoRow label={t.weekOfYear} value={String(weekNumber(primaryDateForMeta))} />
            <InfoRow label={t.dayOfYear} value={String(dayOfYear(primaryDateForMeta))} />
            <InfoRow label={t.utcOffset} value={liveGmtLabel(now, settings.primaryTimezone)} />
          </div>

          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MoonStar className="size-3.5" />
              {t.lunarDate}
            </p>
            <InfoRow label={t.lunarDate} value={lunarLabel} />
            <InfoRow label={t.canChiYear} value={canChi.year} />
            <InfoRow label={t.canChiMonth} value={canChi.month} />
            <InfoRow label={t.canChiDay} value={canChi.day} />
            <InfoRow label={t.canChiHour} value={canChi.hour} />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">{t.worldClocks}</p>
            <p className="text-[11px] text-muted-foreground">{t.maxTimezones}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Popover
              open={searchOpen}
              onOpenChange={(open) => {
                setSearchOpen(open);
                if (!open) setQuery("");
                if (open) {
                  window.setTimeout(() => searchInputRef.current?.focus(), 0);
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={availableToAdd.length === 0 || watchIds.length >= 8}
                >
                  <Search className="size-4" />
                  {t.searchTimezone}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[360px] p-2">
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t.searchTimezonePlaceholder}
                    className="h-9 pl-8"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && filteredZones[0]) {
                        e.preventDefault();
                        addZone(filteredZones[0].id);
                      }
                    }}
                  />
                </div>
                <p className="mb-1.5 px-1 text-[11px] text-muted-foreground">
                  {t.allTimezonesHint} · {availableToAdd.length}
                </p>
                <ScrollArea className="h-72">
                  {filteredZones.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                      {t.noTimezoneResults}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-0.5 pr-2">
                      {filteredZones.map((z) => (
                        <button
                          key={z.id}
                          type="button"
                          className="flex w-full items-start justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                          onClick={() => addZone(z.id)}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {zoneLabel(z, locale)}
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {z.iana}
                            </span>
                          </span>
                          <span className="shrink-0 pt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                            {z.gmt}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>

          {watchZones.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.addTimezone}</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {watchZones.map((zone) => {
                if (!zone) return null;
                const parts = zonedParts(now, zone.iana);
                const delta = dayDeltaLabel(primary, parts, t.yesterday, t.tomorrow);
                return (
                  <div key={zone.id} className="relative rounded-lg border bg-card/60 px-3 py-2.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 size-7"
                      title={t.removeTimezone}
                      onClick={() => removeZone(zone.id)}
                    >
                      <X className="size-3.5" />
                    </Button>
                    <div className="pr-7">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-medium">{zoneLabel(zone, locale)}</p>
                        <Badge variant="outline" className="font-mono text-[10px] tabular-nums">
                          {liveGmtLabel(now, zone.iana)}
                        </Badge>
                        {delta && (
                          <Badge
                            variant="secondary"
                            className={cn("text-[10px]", delta && "shrink-0")}
                          >
                            {delta}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight">
                        <span className="inline-block min-w-[8ch]">
                          {parts.hours}:{parts.minutes}
                          <span className="text-base text-muted-foreground">:{parts.seconds}</span>
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatZonedDate(now, zone.iana, tag)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
