import { getAppStore } from "@/lib/settings";

export const POPULAR_CURRENCIES = [
  "USD",
  "VND",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "KRW",
  "THB",
  "SGD",
  "AUD",
  "CAD",
  "HKD",
  "TWD",
  "MYR",
  "IDR",
  "INR",
  "PHP",
] as const;

export type CurrencyCode = string;

export type RatesPayload = {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
  source: string;
};

const STORE_KEY = "currency-rates";
const BASE = "USD";
const CACHE_TTL_MS = 60 * 60 * 1000;

const ZERO_DECIMAL = new Set([
  "VND",
  "JPY",
  "KRW",
  "IDR",
  "CLP",
  "ISK",
  "HUF",
  "TWD",
  "PYG",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

type CachedRates = RatesPayload;

let memoryCache: CachedRates | null = null;

async function readCache(): Promise<CachedRates | null> {
  if (memoryCache) return memoryCache;
  try {
    const store = await getAppStore();
    if (!store) return null;
    const cached = await store.get<CachedRates>(STORE_KEY);
    if (cached) memoryCache = cached;
    return cached ?? null;
  } catch {
    return null;
  }
}

async function writeCache(payload: CachedRates): Promise<void> {
  memoryCache = payload;
  try {
    const store = await getAppStore();
    if (!store) return;
    await store.set(STORE_KEY, payload);
    await store.save();
  } catch {
    // ignore outside Tauri
  }
}

function normalizeRates(raw: Record<string, number>, base: string): Record<string, number> {
  const rates: Record<string, number> = {};
  for (const [code, value] of Object.entries(raw)) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) continue;
    rates[code.toUpperCase()] = value;
  }
  rates[base.toUpperCase()] = 1;
  return rates;
}

type OpenErApiResponse = {
  result?: string;
  base_code?: string;
  rates?: Record<string, number>;
};

type FawazResponse = {
  date?: string;
} & Record<string, Record<string, number> | string>;

type FrankfurterResponse = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Rates request failed (${res.status})`);
  return (await res.json()) as T;
}

async function fetchFromOpenErApi(): Promise<CachedRates> {
  const data = await fetchJson<OpenErApiResponse>("https://open.er-api.com/v6/latest/USD");
  if (data.result && data.result !== "success") {
    throw new Error("ExchangeRate-API returned an error");
  }
  if (!data.rates) throw new Error("ExchangeRate-API missing rates");
  const base = (data.base_code ?? BASE).toUpperCase();
  return {
    base,
    rates: normalizeRates(data.rates, base),
    fetchedAt: Date.now(),
    source: "open.er-api.com",
  };
}

async function fetchFromFawaz(): Promise<CachedRates> {
  const data = await fetchJson<FawazResponse>(
    "https://latest.currency-api.pages.dev/v1/currencies/usd.json",
  );
  const usd = data.usd;
  if (!usd || typeof usd !== "object") throw new Error("currency-api missing usd table");
  const raw: Record<string, number> = {};
  for (const [code, value] of Object.entries(usd)) {
    if (typeof value === "number") raw[code] = value;
  }
  return {
    base: BASE,
    rates: normalizeRates(raw, BASE),
    fetchedAt: Date.now(),
    source: "currency-api",
  };
}

async function fetchFromFrankfurter(): Promise<CachedRates> {
  const data = await fetchJson<FrankfurterResponse>(
    `https://api.frankfurter.app/latest?from=${BASE}`,
  );
  return {
    base: BASE,
    rates: normalizeRates(data.rates, BASE),
    fetchedAt: Date.now(),
    source: "frankfurter.app",
  };
}

const SOURCES = [fetchFromOpenErApi, fetchFromFawaz, fetchFromFrankfurter];

/**
 * Fetch latest USD-based exchange rates, caching the result for offline fallback.
 * Primary source includes VND (Frankfurter/ECB does not).
 */
export async function fetchRates(
  force = false,
): Promise<RatesPayload & { fromCache: boolean }> {
  if (!force) {
    const cached = await readCache();
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS && cached.rates.VND) {
      return { ...cached, fromCache: true };
    }
  }

  const errors: string[] = [];
  for (const source of SOURCES) {
    try {
      const payload = await source();
      await writeCache(payload);
      return { ...payload, fromCache: false };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  const cached = await readCache();
  if (cached) {
    return { ...cached, fromCache: true };
  }
  throw new Error(errors[0] || "Could not load exchange rates");
}

/** Convert an amount between two currency codes using cached/fetched USD-based rates. */
export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Record<string, number>,
): number {
  const fromRate = rates[from.toUpperCase()];
  const toRate = rates[to.toUpperCase()];
  if (!fromRate || !toRate) return NaN;
  const usd = amount / fromRate;
  return usd * toRate;
}

/** Async convert that fetches/caches rates then converts. */
export async function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
): Promise<number> {
  const { rates } = await fetchRates();
  const result = convert(amount, from, to, rates);
  if (Number.isNaN(result)) throw new Error(`Unsupported currency pair ${from}/${to}`);
  return result;
}

export function parseAmount(raw: string): number {
  const s = raw.trim().replace(/\s/g, "");
  if (!s) return NaN;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      return Number(s.replace(/\./g, "").replace(",", "."));
    }
    return Number(s.replace(/,/g, ""));
  }
  if (lastComma >= 0) {
    const parts = s.split(",");
    if (parts.length > 2 || (parts[1]?.length === 3 && parts[0] !== "")) {
      return Number(s.replace(/,/g, ""));
    }
    return Number(s.replace(",", "."));
  }
  return Number(s);
}

/** Parse queries like "100 usd to vnd" or "100 usd sang vnd". */
export function parseCurrencyQuery(
  query: string,
): { amount: number; from: string; to: string } | null {
  const m = query
    .trim()
    .match(/^(?:đổi\s+)?([\d.,]+)\s*([a-z]{3})\s*(?:to|sang|→|->|=)\s*([a-z]{3})$/i);
  if (!m) return null;
  const amount = parseAmount(m[1]);
  if (!Number.isFinite(amount)) return null;
  return { amount, from: m[2].toUpperCase(), to: m[3].toUpperCase() };
}

export function formatConverted(amount: number, code: string, locale: string): string {
  if (!Number.isFinite(amount)) return "—";
  const upper = code.toUpperCase();
  const zero = ZERO_DECIMAL.has(upper);
  const abs = Math.abs(amount);
  let maxFrac: number;
  if (zero) maxFrac = abs >= 1 ? 0 : 4;
  else if (abs >= 1) maxFrac = 2;
  else if (abs >= 0.01) maxFrac = 4;
  else maxFrac = 8;
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: maxFrac,
    minimumFractionDigits: zero && abs >= 1 ? 0 : abs >= 1 ? 2 : undefined,
  }).format(amount);
}

export function formatRate(rate: number, locale: string): string {
  if (!Number.isFinite(rate)) return "—";
  const abs = Math.abs(rate);
  const maxFrac = abs >= 1 ? 4 : abs >= 0.01 ? 6 : 8;
  return new Intl.NumberFormat(locale, { maximumFractionDigits: maxFrac }).format(rate);
}

export const PAIR_STORAGE_KEY = "dn-assistant-currency-pair";

export function loadSavedPair(): { from: string; to: string } | null {
  try {
    const raw = localStorage.getItem(PAIR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { from?: string; to?: string };
    if (typeof parsed.from === "string" && typeof parsed.to === "string") {
      return { from: parsed.from.toUpperCase(), to: parsed.to.toUpperCase() };
    }
    return null;
  } catch {
    return null;
  }
}

export function savePair(from: string, to: string) {
  localStorage.setItem(PAIR_STORAGE_KEY, JSON.stringify({ from, to }));
}
