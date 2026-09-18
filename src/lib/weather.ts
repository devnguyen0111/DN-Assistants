export type WeatherLocation = {
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
};

export type CurrentWeather = {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
};

export type DailyForecast = {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
};

export type WeatherPayload = {
  current: CurrentWeather;
  daily: DailyForecast[];
  timezone: string;
};

type GeocodeResult = {
  results?: Array<{
    name: string;
    country?: string;
    admin1?: string;
    latitude: number;
    longitude: number;
  }>;
};

type ForecastResult = {
  timezone?: string;
  current?: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    is_day: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
};

export async function searchCities(query: string, language = "en"): Promise<WeatherLocation[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", q);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", language);
  url.searchParams.set("format", "json");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const data = (await res.json()) as GeocodeResult;
  return (data.results ?? []).map((r) => ({
    name: r.name,
    country: r.country ?? "",
    admin1: r.admin1,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
type CachedWeather = {
  data: WeatherPayload;
  timestamp: number;
};
const weatherCache = new Map<string, CachedWeather>();

export async function fetchWeather(
  latitude: number,
  longitude: number,
  temperatureUnit: "celsius" | "fahrenheit" = "celsius",
): Promise<WeatherPayload> {
  const cacheKey = `${latitude.toFixed(3)}:${longitude.toFixed(3)}:${temperatureUnit}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < WEATHER_CACHE_TTL_MS) {
    return cached.data;
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m",
  );
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("temperature_unit", temperatureUnit);
  url.searchParams.set("wind_speed_unit", "kmh");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather failed (${res.status})`);
  const data = (await res.json()) as ForecastResult;
  if (!data.current || !data.daily) throw new Error("Malformed weather response");

  const daily: DailyForecast[] = data.daily.time.map((date, i) => ({
    date,
    weatherCode: data.daily!.weather_code[i] ?? 0,
    tempMax: data.daily!.temperature_2m_max[i] ?? 0,
    tempMin: data.daily!.temperature_2m_min[i] ?? 0,
  }));

  const payload: WeatherPayload = {
    timezone: data.timezone ?? "auto",
    current: {
      temperature: data.current.temperature_2m,
      apparentTemperature: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      weatherCode: data.current.weather_code,
      isDay: data.current.is_day === 1,
    },
    daily,
  };

  weatherCache.set(cacheKey, { data: payload, timestamp: Date.now() });
  return payload;
}

/** WMO weather interpretation codes → short label keys we map in UI. */
export function weatherCodeLabel(code: number, locale: "vi" | "en"): string {
  const map: Record<number, { en: string; vi: string }> = {
    0: { en: "Clear", vi: "Quang đãng" },
    1: { en: "Mainly clear", vi: "Ít mây" },
    2: { en: "Partly cloudy", vi: "Có mây" },
    3: { en: "Overcast", vi: "U ám" },
    45: { en: "Fog", vi: "Sương mù" },
    48: { en: "Rime fog", vi: "Sương muối" },
    51: { en: "Light drizzle", vi: "Mưa phùn nhẹ" },
    53: { en: "Drizzle", vi: "Mưa phùn" },
    55: { en: "Dense drizzle", vi: "Mưa phùn dày" },
    61: { en: "Slight rain", vi: "Mưa nhẹ" },
    63: { en: "Rain", vi: "Mưa" },
    65: { en: "Heavy rain", vi: "Mưa to" },
    71: { en: "Slight snow", vi: "Tuyết nhẹ" },
    73: { en: "Snow", vi: "Tuyết" },
    75: { en: "Heavy snow", vi: "Tuyết dày" },
    80: { en: "Rain showers", vi: "Mưa rào" },
    81: { en: "Rain showers", vi: "Mưa rào" },
    82: { en: "Violent showers", vi: "Mưa rào mạnh" },
    95: { en: "Thunderstorm", vi: "Dông" },
    96: { en: "Thunderstorm", vi: "Dông" },
    99: { en: "Thunderstorm", vi: "Dông" },
  };
  const entry = map[code] ?? { en: "Unknown", vi: "Không rõ" };
  return locale === "vi" ? entry.vi : entry.en;
}

export function weatherEmoji(code: number, isDay = true): string {
  if (code === 0) return isDay ? "☀️" : "🌙";
  if (code <= 2) return isDay ? "🌤️" : "☁️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}
