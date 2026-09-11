export type ZoneOption = {
  /** IANA timezone id, also used as storage key */
  id: string;
  iana: string;
  labelVi: string;
  labelEn: string;
  /** Current offset snapshot, e.g. GMT+7 */
  gmt: string;
  region: string;
  city: string;
};

/** Primary clock is always Vietnam / GMT+7. */
export const PRIMARY_IANA = "Asia/Ho_Chi_Minh";

const FRIENDLY: Record<string, { en: string; vi: string }> = {
  "Asia/Ho_Chi_Minh": { en: "Vietnam (Ho Chi Minh)", vi: "Việt Nam (Hồ Chí Minh)" },
  "Asia/Bangkok": { en: "Bangkok", vi: "Bangkok" },
  "Asia/Jakarta": { en: "Jakarta", vi: "Jakarta" },
  "Asia/Singapore": { en: "Singapore", vi: "Singapore" },
  "Asia/Shanghai": { en: "Shanghai", vi: "Thượng Hải" },
  "Asia/Hong_Kong": { en: "Hong Kong", vi: "Hồng Kông" },
  "Asia/Taipei": { en: "Taipei", vi: "Đài Bắc" },
  "Asia/Tokyo": { en: "Tokyo", vi: "Tokyo" },
  "Asia/Seoul": { en: "Seoul", vi: "Seoul" },
  "Asia/Kolkata": { en: "New Delhi / Kolkata", vi: "New Delhi / Kolkata" },
  "Asia/Dubai": { en: "Dubai", vi: "Dubai" },
  "Asia/Riyadh": { en: "Riyadh", vi: "Riyadh" },
  "Europe/London": { en: "London", vi: "London" },
  "Europe/Paris": { en: "Paris", vi: "Paris" },
  "Europe/Berlin": { en: "Berlin", vi: "Berlin" },
  "Europe/Moscow": { en: "Moscow", vi: "Moscow" },
  "Europe/Istanbul": { en: "Istanbul", vi: "Istanbul" },
  "Europe/Rome": { en: "Rome", vi: "Rome" },
  "Europe/Madrid": { en: "Madrid", vi: "Madrid" },
  "Europe/Amsterdam": { en: "Amsterdam", vi: "Amsterdam" },
  "America/New_York": { en: "New York", vi: "New York" },
  "America/Chicago": { en: "Chicago", vi: "Chicago" },
  "America/Denver": { en: "Denver", vi: "Denver" },
  "America/Los_Angeles": { en: "Los Angeles", vi: "Los Angeles" },
  "America/Toronto": { en: "Toronto", vi: "Toronto" },
  "America/Sao_Paulo": { en: "São Paulo", vi: "São Paulo" },
  "America/Mexico_City": { en: "Mexico City", vi: "Mexico City" },
  "Australia/Sydney": { en: "Sydney", vi: "Sydney" },
  "Australia/Melbourne": { en: "Melbourne", vi: "Melbourne" },
  "Pacific/Auckland": { en: "Auckland", vi: "Auckland" },
  UTC: { en: "UTC", vi: "UTC" },
};

/** Popular zones shown first when search is empty. */
export const POPULAR_IANA = [
  "UTC",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Bangkok",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

/** Old short ids → IANA (migrate localStorage). */
const LEGACY_ID_MAP: Record<string, string> = {
  vn: PRIMARY_IANA,
  utc: "UTC",
  tokyo: "Asia/Tokyo",
  seoul: "Asia/Seoul",
  shanghai: "Asia/Shanghai",
  singapore: "Asia/Singapore",
  bangkok: "Asia/Bangkok",
  jakarta: "Asia/Jakarta",
  delhi: "Asia/Kolkata",
  dubai: "Asia/Dubai",
  moscow: "Europe/Moscow",
  istanbul: "Europe/Istanbul",
  berlin: "Europe/Berlin",
  paris: "Europe/Paris",
  london: "Europe/London",
  ny: "America/New_York",
  chicago: "America/Chicago",
  denver: "America/Denver",
  la: "America/Los_Angeles",
  sao_paulo: "America/Sao_Paulo",
  sydney: "Australia/Sydney",
  auckland: "Pacific/Auckland",
};

function titleCaseCity(raw: string) {
  return raw
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function splitIana(iana: string) {
  if (iana === "UTC" || iana === "GMT") {
    return { region: "Etc", city: "UTC" };
  }
  const parts = iana.split("/");
  if (parts.length === 1) {
    return { region: "Other", city: titleCaseCity(parts[0]!) };
  }
  const region = parts[0]!;
  const city = titleCaseCity(parts.slice(1).join(" / "));
  return { region, city };
}

export function liveGmtLabel(date: Date, iana: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: iana,
      timeZoneName: "shortOffset",
    }).formatToParts(date);
    const name = parts.find((p) => p.type === "timeZoneName")?.value;
    if (name) return name.replace(/^UTC/, "GMT");
  } catch {
    // fall through
  }
  return iana;
}

function makeZone(iana: string, now: Date): ZoneOption {
  const { region, city } = splitIana(iana);
  const friendly = FRIENDLY[iana];
  const labelEn = friendly?.en ?? `${city} (${region})`;
  const labelVi = friendly?.vi ?? `${city} (${region})`;
  return {
    id: iana,
    iana,
    labelEn,
    labelVi,
    gmt: liveGmtLabel(now, iana),
    region,
    city,
  };
}

function listIanaZones(): string[] {
  try {
    if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
      return (Intl as typeof Intl & { supportedValuesOf(k: string): string[] }).supportedValuesOf(
        "timeZone",
      );
    }
  } catch {
    // fall through
  }
  return Array.from(
    new Set([PRIMARY_IANA, ...POPULAR_IANA, ...Object.keys(FRIENDLY)]),
  ).sort((a, b) => a.localeCompare(b));
}

let catalogCache: ZoneOption[] | null = null;

/** Full IANA timezone catalog (~400 zones). */
export function getZoneCatalog(now = new Date()): ZoneOption[] {
  if (catalogCache) {
    // Refresh offset labels lightly — rebuild if day rolled (DST rare mid-session)
    return catalogCache;
  }
  const zones = listIanaZones().map((iana) => makeZone(iana, now));
  zones.sort((a, b) => a.iana.localeCompare(b.iana));
  catalogCache = zones;
  return zones;
}

export const PRIMARY_ZONE: ZoneOption = makeZone(PRIMARY_IANA, new Date());

/** Prefer `getZoneCatalog()` — catalog is built lazily on first use. */

const STORAGE_KEY = "dn-assistant-watch-zones";
const DEFAULT_WATCH = [
  "UTC",
  "Europe/London",
  "America/New_York",
  "Asia/Tokyo",
];

export function normalizeZoneId(id: string): string | null {
  const mapped = LEGACY_ID_MAP[id] ?? id;
  if (mapped === PRIMARY_IANA) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: mapped }).format(new Date());
    return mapped;
  } catch {
    return null;
  }
}

export function getZoneById(id: string): ZoneOption | undefined {
  const normalized = LEGACY_ID_MAP[id] ?? id;
  try {
    // Fast path: build a single zone without scanning the full IANA catalog.
    // Intl throws if the id is invalid.
    new Intl.DateTimeFormat("en-US", { timeZone: normalized }).format(new Date());
    return makeZone(normalized, new Date());
  } catch {
    return getZoneCatalog().find((z) => z.id === normalized || z.iana === normalized);
  }
}

export function loadWatchZoneIds(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WATCH;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_WATCH;
    const ids: string[] = [];
    for (const item of parsed) {
      if (typeof item !== "string") continue;
      const id = normalizeZoneId(item);
      if (id && !ids.includes(id)) ids.push(id);
    }
    return ids.slice(0, 8);
  } catch {
    return DEFAULT_WATCH;
  }
}

export function saveWatchZoneIds(ids: string[]) {
  const cleaned: string[] = [];
  for (const raw of ids) {
    const id = normalizeZoneId(raw);
    if (id && !cleaned.includes(id)) cleaned.push(id);
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned.slice(0, 8)));
}

export function zoneLabel(zone: ZoneOption, locale: "vi" | "en") {
  return locale === "vi" ? zone.labelVi : zone.labelEn;
}

export function searchZones(
  zones: ZoneOption[],
  query: string,
  locale: "vi" | "en",
): ZoneOption[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    const popular = POPULAR_IANA.map((iana) => zones.find((z) => z.iana === iana)).filter(
      (z): z is ZoneOption => !!z,
    );
    const rest = zones.filter((z) => !(POPULAR_IANA as readonly string[]).includes(z.iana));
    return [...popular, ...rest];
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  const scored: Array<{ zone: ZoneOption; score: number }> = [];

  for (const zone of zones) {
    const hay = [
      zone.id,
      zone.iana,
      zone.gmt,
      zone.region,
      zone.city,
      zone.labelEn,
      zone.labelVi,
      zoneLabel(zone, locale),
      zone.iana.replace(/[_/]/g, " "),
    ]
      .join(" ")
      .toLowerCase();

    if (!tokens.every((t) => hay.includes(t))) continue;

    let score = 0;
    const label = zoneLabel(zone, locale).toLowerCase();
    const city = zone.city.toLowerCase();
    if (city.startsWith(q) || label.startsWith(q)) score += 40;
    if (zone.iana.toLowerCase().includes(q)) score += 20;
    if ((POPULAR_IANA as readonly string[]).includes(zone.iana)) score += 10;
    if (zone.gmt.toLowerCase().includes(q) || zone.gmt.toLowerCase().replace("gmt", "").includes(q)) {
      score += 15;
    }
    scored.push({ zone, score });
  }

  scored.sort((a, b) => b.score - a.score || a.zone.iana.localeCompare(b.zone.iana));
  return scored.map((s) => s.zone);
}

/** Parts of `date` in a given IANA timezone. */
export function zonedParts(date: Date, iana: string) {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: iana,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(date).map((p) => [p.type, p.value]),
    ) as Record<string, string>;
    return {
      hours: parts.hour ?? "00",
      minutes: parts.minute ?? "00",
      seconds: parts.second ?? "00",
      day: Number(parts.day),
      month: Number(parts.month),
      year: Number(parts.year),
      weekday: parts.weekday ?? "",
    };
  } catch {
    if (iana !== "UTC") return zonedParts(date, "UTC");
    return {
      hours: String(date.getHours()).padStart(2, "0"),
      minutes: String(date.getMinutes()).padStart(2, "0"),
      seconds: String(date.getSeconds()).padStart(2, "0"),
      day: date.getDate(),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      weekday: "",
    };
  }
}

export function formatZonedTime(date: Date, iana: string) {
  const p = zonedParts(date, iana);
  return `${p.hours}:${p.minutes}:${p.seconds}`;
}

export function formatZonedDate(date: Date, iana: string, localeTag: string) {
  return new Intl.DateTimeFormat(localeTag, {
    timeZone: iana,
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function dayDeltaLabel(
  primary: ReturnType<typeof zonedParts>,
  other: ReturnType<typeof zonedParts>,
  yesterday: string,
  tomorrow: string,
): string | null {
  const a = Date.UTC(primary.year, primary.month - 1, primary.day);
  const b = Date.UTC(other.year, other.month - 1, other.day);
  const diff = Math.round((b - a) / 86_400_000);
  if (diff === -1) return yesterday;
  if (diff === 1) return tomorrow;
  if (diff < -1) return `${diff}d`;
  if (diff > 1) return `+${diff}d`;
  return null;
}
