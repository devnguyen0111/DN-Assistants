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
  "CHF",
  "HKD",
  "TWD",
  "MYR",
  "IDR",
  "INR",
  "PHP",
  "NZD",
  "BRL",
  "RUB",
  "AED",
  "SAR",
  "TRY",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "ILS",
  "MXN",
] as const;

export type CurrencyInfo = {
  code: string;
  name: string;
  nameVi: string;
  symbol: string;
  flag: string;
};

export const CURRENCY_INFO: Record<string, CurrencyInfo> = {
  USD: { code: "USD", name: "US Dollar", nameVi: "Đô la Mỹ", symbol: "$", flag: "🇺🇸" },
  VND: { code: "VND", name: "Vietnamese Dong", nameVi: "Đồng Việt Nam", symbol: "₫", flag: "🇻🇳" },
  EUR: { code: "EUR", name: "Euro", nameVi: "Euro", symbol: "€", flag: "🇪🇺" },
  GBP: { code: "GBP", name: "British Pound", nameVi: "Bảng Anh", symbol: "£", flag: "🇬🇧" },
  JPY: { code: "JPY", name: "Japanese Yen", nameVi: "Yên Nhật", symbol: "¥", flag: "🇯🇵" },
  CNY: { code: "CNY", name: "Chinese Yuan", nameVi: "Nhân dân tệ", symbol: "¥", flag: "🇨🇳" },
  KRW: { code: "KRW", name: "South Korean Won", nameVi: "Won Hàn Quốc", symbol: "₩", flag: "🇰🇷" },
  THB: { code: "THB", name: "Thai Baht", nameVi: "Baht Thái", symbol: "฿", flag: "🇹🇭" },
  SGD: { code: "SGD", name: "Singapore Dollar", nameVi: "Đô la Singapore", symbol: "S$", flag: "🇸🇬" },
  AUD: { code: "AUD", name: "Australian Dollar", nameVi: "Đô la Úc", symbol: "A$", flag: "🇦🇺" },
  CAD: { code: "CAD", name: "Canadian Dollar", nameVi: "Đô la Canada", symbol: "C$", flag: "🇨🇦" },
  CHF: { code: "CHF", name: "Swiss Franc", nameVi: "Franc Thụy Sĩ", symbol: "CHF", flag: "🇨🇭" },
  HKD: { code: "HKD", name: "Hong Kong Dollar", nameVi: "Đô la Hồng Kông", symbol: "HK$", flag: "🇭🇰" },
  TWD: { code: "TWD", name: "New Taiwan Dollar", nameVi: "Tân Đài tệ", symbol: "NT$", flag: "🇹🇼" },
  MYR: { code: "MYR", name: "Malaysian Ringgit", nameVi: "Ringgit Malaysia", symbol: "RM", flag: "🇲🇾" },
  IDR: { code: "IDR", name: "Indonesian Rupiah", nameVi: "Rupiah Indonesia", symbol: "Rp", flag: "🇮🇩" },
  INR: { code: "INR", name: "Indian Rupee", nameVi: "Rupee Ấn Độ", symbol: "₹", flag: "🇮🇳" },
  PHP: { code: "PHP", name: "Philippine Peso", nameVi: "Peso Philippines", symbol: "₱", flag: "🇵🇭" },
  NZD: { code: "NZD", name: "New Zealand Dollar", nameVi: "Đô la New Zealand", symbol: "NZ$", flag: "🇳🇿" },
  BRL: { code: "BRL", name: "Brazilian Real", nameVi: "Real Brazil", symbol: "R$", flag: "🇧🇷" },
  RUB: { code: "RUB", name: "Russian Ruble", nameVi: "Rúp Nga", symbol: "₽", flag: "🇷🇺" },
  AED: { code: "AED", name: "UAE Dirham", nameVi: "Dirham UAE", symbol: "AED", flag: "🇦🇪" },
  SAR: { code: "SAR", name: "Saudi Riyal", nameVi: "Riyal Ả Rập Xê Út", symbol: "SAR", flag: "🇸🇦" },
  TRY: { code: "TRY", name: "Turkish Lira", nameVi: "Lira Thổ Nhĩ Kỳ", symbol: "₺", flag: "🇹🇷" },
  SEK: { code: "SEK", name: "Swedish Krona", nameVi: "Krona Thụy Điển", symbol: "kr", flag: "🇸🇪" },
  NOK: { code: "NOK", name: "Norwegian Krone", nameVi: "Krone Na Uy", symbol: "kr", flag: "🇳🇴" },
  DKK: { code: "DKK", name: "Danish Krone", nameVi: "Krone Đan Mạch", symbol: "kr", flag: "🇩🇰" },
  PLN: { code: "PLN", name: "Polish Zloty", nameVi: "Zloty Ba Lan", symbol: "zł", flag: "🇵🇱" },
  CZK: { code: "CZK", name: "Czech Koruna", nameVi: "Koruna Séc", symbol: "Kč", flag: "🇨🇿" },
  HUF: { code: "HUF", name: "Hungarian Forint", nameVi: "Forint Hungary", symbol: "Ft", flag: "🇭🇺" },
  ILS: { code: "ILS", name: "Israeli Shekel", nameVi: "Shekel Israel", symbol: "₪", flag: "🇮🇱" },
  MXN: { code: "MXN", name: "Mexican Peso", nameVi: "Peso Mexico", symbol: "Mex$", flag: "🇲🇽" },
};

export function getCurrencyInfo(code: string): CurrencyInfo {
  const upper = code.toUpperCase();
  return (
    CURRENCY_INFO[upper] ?? {
      code: upper,
      name: upper,
      nameVi: upper,
      symbol: upper,
      flag: "🌐",
    }
  );
}

export function searchCurrencies(
  query: string,
  list: string[],
  _locale: "vi" | "en" = "vi",
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((code) => {
    const info = getCurrencyInfo(code);
    return (
      info.code.toLowerCase().includes(q) ||
      info.symbol.toLowerCase().includes(q) ||
      info.name.toLowerCase().includes(q) ||
      info.nameVi.toLowerCase().includes(q)
    );
  });
}

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
export async function fetchRates(force = false): Promise<RatesPayload & { fromCache: boolean }> {
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

const SYMBOL_TO_CODE: Record<string, string> = {
  "$": "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₫": "VND",
  "₩": "KRW",
  "฿": "THB",
  "₹": "INR",
  "C$": "CAD",
  "A$": "AUD",
  "S$": "SGD",
};

/** Parse queries like "100 usd to vnd", "$100 to vnd", "500k vnd sang usd", or "đổi 100$ sang vnd". */
export function parseCurrencyQuery(
  query: string,
): { amount: number; from: string; to: string } | null {
  const trimmed = query.trim().toLowerCase();

  // Pattern 1: $100 to vnd or €50 to usd
  const symbolPrefixMatch = trimmed.match(
    /^(?:đổi\s+)?([$€£¥₫₩฿₹])\s*([\d.,]+(?:[km]|tr|triệu|nghìn)?)\s*(?:to|sang|in|into|→|->|=)\s*([a-z]{3}|[$€£¥₫₩฿₹])$/i,
  );
  if (symbolPrefixMatch) {
    const from = SYMBOL_TO_CODE[symbolPrefixMatch[1]] ?? "USD";
    const amount = parseAmountWithUnit(symbolPrefixMatch[2]);
    const toRaw = symbolPrefixMatch[3];
    const to = (SYMBOL_TO_CODE[toRaw] ?? toRaw).toUpperCase();
    if (Number.isFinite(amount) && to.length === 3) {
      return { amount, from, to };
    }
  }

  // Pattern 2: 100$ to vnd or 100 usd to vnd
  const generalMatch = trimmed.match(
    /^(?:đổi\s+)?([\d.,]+(?:[km]|tr|triệu|nghìn)?)\s*([a-z]{3}|[$€£¥₫₩฿₹])\s*(?:to|sang|in|into|→|->|=)\s*([a-z]{3}|[$€£¥₫₩฿₹])$/i,
  );
  if (generalMatch) {
    const amount = parseAmountWithUnit(generalMatch[1]);
    const fromRaw = generalMatch[2];
    const toRaw = generalMatch[3];
    const from = (SYMBOL_TO_CODE[fromRaw] ?? fromRaw).toUpperCase();
    const to = (SYMBOL_TO_CODE[toRaw] ?? toRaw).toUpperCase();
    if (Number.isFinite(amount) && from.length === 3 && to.length === 3) {
      return { amount, from, to };
    }
  }

  return null;
}

function parseAmountWithUnit(raw: string): number {
  let s = raw.trim().toLowerCase();
  let multiplier = 1;
  if (s.endsWith("triệu") || s.endsWith("trieu")) {
    multiplier = 1_000_000;
    s = s.replace(/(?:triệu|trieu)/g, "");
  } else if (s.endsWith("nghìn") || s.endsWith("nghin")) {
    multiplier = 1_000;
    s = s.replace(/(?:nghìn|nghin)/g, "");
  } else if (s.endsWith("m")) {
    multiplier = 1_000_000;
    s = s.slice(0, -1);
  } else if (s.endsWith("tr")) {
    multiplier = 1_000_000;
    s = s.slice(0, -2);
  } else if (s.endsWith("k")) {
    multiplier = 1_000;
    s = s.slice(0, -1);
  }
  const base = parseAmount(s);
  return Number.isFinite(base) ? base * multiplier : NaN;
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
export const WATCHLIST_STORAGE_KEY = "dn-assistant-currency-watchlist";
export const DEFAULT_WATCHLIST = [
  "VND",
  "USD",
  "EUR",
  "JPY",
  "GBP",
  "CNY",
  "KRW",
  "SGD",
  "THB",
  "AUD",
  "CAD",
];

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

export function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return DEFAULT_WATCHLIST;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((s) => String(s).toUpperCase());
    }
    return DEFAULT_WATCHLIST;
  } catch {
    return DEFAULT_WATCHLIST;
  }
}

export function saveWatchlist(list: string[]) {
  localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(list));
}

export type FeeCalculationResult = {
  grossAmount: number;
  feePercent: number;
  feeAmount: number;
  netAmount: number;
  rawRate: number;
  effectiveRate: number;
};

export function calculateWithFee(
  convertedAmount: number,
  feePercent: number,
  fromAmount: number,
): FeeCalculationResult {
  const safeFee = Math.max(0, feePercent);
  const feeAmount = (convertedAmount * safeFee) / 100;
  const netAmount = Math.max(0, convertedAmount - feeAmount);
  const rawRate = fromAmount > 0 ? convertedAmount / fromAmount : 0;
  const effectiveRate = fromAmount > 0 ? netAmount / fromAmount : 0;
  return {
    grossAmount: convertedAmount,
    feePercent: safeFee,
    feeAmount,
    netAmount,
    rawRate,
    effectiveRate,
  };
}

export type QuickConversionRow = {
  unit: number;
  forward: number;
  backward: number;
};

export function getQuickConversions(
  from: string,
  to: string,
  rates: Record<string, number>,
): QuickConversionRow[] {
  const units = [1, 5, 10, 25, 50, 100, 500, 1000];
  const rateFwd = convert(1, from, to, rates);
  const rateBwd = convert(1, to, from, rates);
  if (!Number.isFinite(rateFwd) || !Number.isFinite(rateBwd)) return [];
  return units.map((u) => ({
    unit: u,
    forward: u * rateFwd,
    backward: u * rateBwd,
  }));
}
