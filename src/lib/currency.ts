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
] as const;

export type CurrencyCode = string;

export type RatesPayload = {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
};

const STORE_KEY = "currency-rates";
const BASE = "USD";

type CachedRates = {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
};

async function readCache(): Promise<CachedRates | null> {
  try {
    const store = await getAppStore();
    if (!store) return null;
    const cached = await store.get<CachedRates>(STORE_KEY);
    return cached ?? null;
  } catch {
    return null;
  }
}

async function writeCache(payload: CachedRates): Promise<void> {
  try {
    const store = await getAppStore();
    if (!store) return;
    await store.set(STORE_KEY, payload);
    await store.save();
  } catch {
    // ignore outside Tauri
  }
}

type FrankfurterResponse = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

/**
 * Fetch latest USD-based exchange rates from the Frankfurter API, caching the
 * result for offline fallback. Returns { rates, fetchedAt, fromCache }.
 */
export async function fetchRates(): Promise<RatesPayload & { fromCache: boolean }> {
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${BASE}`);
    if (!res.ok) throw new Error(`Rates request failed (${res.status})`);
    const data = (await res.json()) as FrankfurterResponse;
    const rates = { ...data.rates, [BASE]: 1 };
    const fetchedAt = Date.now();
    await writeCache({ base: BASE, rates, fetchedAt });
    return { base: BASE, rates, fetchedAt, fromCache: false };
  } catch (err) {
    const cached = await readCache();
    if (cached) {
      return { ...cached, fromCache: true };
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/** Convert an amount between two currency codes using cached/fetched USD-based rates. */
export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Record<string, number>,
): number {
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return NaN;
  // rates are USD-based: amount_in_usd = amount / fromRate
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
  const result = convert(amount, from.toUpperCase(), to.toUpperCase(), rates);
  if (Number.isNaN(result)) throw new Error(`Unsupported currency pair ${from}/${to}`);
  return result;
}

/** Parse queries like "100 usd to vnd". */
export function parseCurrencyQuery(
  query: string,
): { amount: number; from: string; to: string } | null {
  const m = query
    .trim()
    .match(/^([\d.,]+)\s*([a-z]{3})\s*(?:to|→|->)\s*([a-z]{3})$/i);
  if (!m) return null;
  const amount = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(amount)) return null;
  return { amount, from: m[2].toUpperCase(), to: m[3].toUpperCase() };
}
