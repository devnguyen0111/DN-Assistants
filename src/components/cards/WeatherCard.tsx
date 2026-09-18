import { useCallback, useEffect, useState } from "react";
import { CloudSun, Droplets, Search, Wind } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { localeTag, useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-context";
import {
  fetchWeather,
  searchCities,
  weatherCodeLabel,
  weatherEmoji,
  type WeatherLocation,
  type WeatherPayload,
} from "@/lib/weather";
import { cn } from "@/lib/utils";

type Props = {
  compact?: boolean;
  className?: string;
};

export function WeatherCard({ compact = false, className }: Props) {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const { settings, updateSettings } = useSettings();
  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WeatherLocation[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWeather(
        settings.weatherLat,
        settings.weatherLon,
        settings.temperatureUnit,
      );
      setWeather(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }, [settings.weatherLat, settings.weatherLon, settings.temperatureUnit]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          setResults(await searchCities(query, locale));
        } catch {
          setResults([]);
        } finally {
          setSearching(false);
        }
      })();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, locale]);

  const unit = settings.temperatureUnit === "celsius" ? "°C" : "°F";
  const fmtTemp = (n: number) =>
    `${new Intl.NumberFormat(tag, { maximumFractionDigits: 0 }).format(n)}${unit}`;

  const pickCity = async (loc: WeatherLocation) => {
    const label = [loc.name, loc.admin1, loc.country].filter(Boolean).join(", ");
    await updateSettings({
      weatherCity: label,
      weatherLat: loc.latitude,
      weatherLon: loc.longitude,
    });
    setQuery("");
    setResults([]);
  };

  if (compact) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <CloudSun className="size-4 text-primary" />
            {t.weather}
          </CardTitle>
          <Badge variant="secondary" className="max-w-[12rem] truncate font-normal">
            {settings.weatherCity}
          </Badge>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">{t.loading}</p>}
          {error && <p className="text-sm text-destructive">{t.weatherError}</p>}
          {weather && !loading && (
            <div className="flex items-end gap-3">
              <span className="text-4xl leading-none">
                {weatherEmoji(weather.current.weatherCode, weather.current.isDay)}
              </span>
              <div>
                <p className="font-mono text-3xl font-semibold tabular-nums">
                  {fmtTemp(weather.current.temperature)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {weatherCodeLabel(weather.current.weatherCode, locale)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudSun className="size-4 text-primary" />
            {t.weather}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder={t.weatherSearchPlaceholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label={t.weatherSearch}
                />
              </div>
              <Button variant="outline" onClick={() => void load()} disabled={loading}>
                {t.refresh}
              </Button>
            </div>
            {(results.length > 0 || searching) && query.trim().length >= 2 && (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-md">
                {searching && (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">{t.loading}</p>
                )}
                {!searching && results.length === 0 && (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">{t.weatherNoResults}</p>
                )}
                {results.map((loc) => {
                  const label = [loc.name, loc.admin1, loc.country].filter(Boolean).join(", ");
                  return (
                    <button
                      key={`${loc.latitude}-${loc.longitude}-${label}`}
                      type="button"
                      className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => void pickCity(loc)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">{settings.weatherCity}</p>

          {loading && <p className="text-sm text-muted-foreground">{t.loading}</p>}
          {error && (
            <p className="text-sm text-destructive">
              {t.weatherError}: {error}
            </p>
          )}

          {weather && !loading && (
            <>
              <div className="flex flex-wrap items-end gap-4">
                <span className="text-5xl leading-none">
                  {weatherEmoji(weather.current.weatherCode, weather.current.isDay)}
                </span>
                <div>
                  <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight">
                    {fmtTemp(weather.current.temperature)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {weatherCodeLabel(weather.current.weatherCode, locale)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">{t.weatherFeelsLike}</p>
                  <p className="font-mono font-medium tabular-nums">
                    {fmtTemp(weather.current.apparentTemperature)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Droplets className="size-3" />
                    {t.weatherHumidity}
                  </p>
                  <p className="font-mono font-medium tabular-nums">{weather.current.humidity}%</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Wind className="size-3" />
                    {t.weatherWind}
                  </p>
                  <p className="font-mono font-medium tabular-nums">
                    {new Intl.NumberFormat(tag, { maximumFractionDigits: 0 }).format(
                      weather.current.windSpeed,
                    )}{" "}
                    km/h
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {weather && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>{t.weatherForecast}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
              {weather.daily.map((day) => {
                const label = new Intl.DateTimeFormat(tag, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                }).format(new Date(`${day.date}T12:00:00`));
                return (
                  <div
                    key={day.date}
                    className="flex flex-col items-center gap-1 rounded-lg border bg-muted/20 px-2 py-3 text-center"
                  >
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                    <span className="text-2xl">{weatherEmoji(day.weatherCode)}</span>
                    <p className="text-[11px] text-muted-foreground">
                      {weatherCodeLabel(day.weatherCode, locale)}
                    </p>
                    <p className="font-mono text-xs tabular-nums">
                      {fmtTemp(day.tempMax)} / {fmtTemp(day.tempMin)}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground">{t.weatherAttribution}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
