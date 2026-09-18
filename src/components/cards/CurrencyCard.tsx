import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Coins,
  Copy,
  Percent,
  RefreshCw,
  Search,
  TableProperties,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/ui/state-block";
import { localeTag, useI18n } from "@/lib/i18n";
import {
  calculateWithFee,
  convert,
  fetchRates,
  formatConverted,
  formatRate,
  getCurrencyInfo,
  getQuickConversions,
  loadSavedPair,
  loadWatchlist,
  parseAmount,
  POPULAR_CURRENCIES,
  savePair,
  saveWatchlist,
} from "@/lib/currency";

export function CurrencyCard() {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState(() => loadSavedPair()?.from ?? "USD");
  const [to, setTo] = useState(() => loadSavedPair()?.to ?? "VND");
  const [activeTab, setActiveTab] = useState("converter");

  // Watchlist state
  const [watchlist, setWatchlist] = useState<string[]>(() => loadWatchlist());
  const [newWatchlistCurrency, setNewWatchlistCurrency] = useState("");

  // Fee state
  const [feePercent, setFeePercent] = useState<number>(1.5);
  const [customFee, setCustomFee] = useState("1.5");

  // Currency search query inside dropdowns
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRates(force);
      setRates(data.rates);
      setFetchedAt(data.fetchedAt);
      setFromCache(data.fromCache);
      setSource(data.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    savePair(from, to);
  }, [from, to]);

  useEffect(() => {
    saveWatchlist(watchlist);
  }, [watchlist]);

  const allCurrencies = useMemo(() => {
    const fromRates = rates ? Object.keys(rates) : [...POPULAR_CURRENCIES];
    const preferred = POPULAR_CURRENCIES.filter((c) => fromRates.includes(c));
    const preferredSet = new Set<string>(preferred);
    const rest = fromRates.filter((c) => !preferredSet.has(c)).sort();
    return [...preferred, ...rest];
  }, [rates]);

  const filteredFromCurrencies = useMemo(() => {
    const q = fromSearch.trim().toLowerCase();
    if (!q) return allCurrencies;
    return allCurrencies.filter((c) => {
      const info = getCurrencyInfo(c);
      return (
        info.code.toLowerCase().includes(q) ||
        info.symbol.toLowerCase().includes(q) ||
        info.name.toLowerCase().includes(q) ||
        info.nameVi.toLowerCase().includes(q)
      );
    });
  }, [allCurrencies, fromSearch]);

  const filteredToCurrencies = useMemo(() => {
    const q = toSearch.trim().toLowerCase();
    if (!q) return allCurrencies;
    return allCurrencies.filter((c) => {
      const info = getCurrencyInfo(c);
      return (
        info.code.toLowerCase().includes(q) ||
        info.symbol.toLowerCase().includes(q) ||
        info.name.toLowerCase().includes(q) ||
        info.nameVi.toLowerCase().includes(q)
      );
    });
  }, [allCurrencies, toSearch]);

  const parsedAmount = parseAmount(amount);

  const result = useMemo(() => {
    if (!rates || !Number.isFinite(parsedAmount)) return null;
    return convert(parsedAmount, from, to, rates);
  }, [rates, parsedAmount, from, to]);

  const rate = useMemo(() => {
    if (!rates) return null;
    return convert(1, from, to, rates);
  }, [rates, from, to]);

  const inverse = useMemo(() => {
    if (!rates) return null;
    return convert(1, to, from, rates);
  }, [rates, from, to]);

  const fromInfo = getCurrencyInfo(from);
  const toInfo = getCurrencyInfo(to);

  const missing = rates && (!rates[from] || !rates[to]) ? (!rates[from] ? from : to) : null;

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const copyResult = () => {
    if (result == null || !Number.isFinite(result)) return;
    const text = `${formatConverted(parsedAmount, from, tag)} ${from} = ${formatConverted(result, to, tag)} ${to}`;
    void navigator.clipboard.writeText(text).then(() => toast.success(t.copied));
  };

  const copyNumberOnly = () => {
    if (result == null || !Number.isFinite(result)) return;
    const text = formatConverted(result, to, tag);
    void navigator.clipboard.writeText(text).then(() => toast.success(t.copied));
  };

  // Quick Amount presets based on currency magnitude
  const isHighDenomination = ["VND", "JPY", "KRW", "IDR"].includes(from);
  const quickAmountPresets = useMemo(() => {
    if (isHighDenomination) {
      return ["50000", "100000", "500000", "1000000", "5000000", "10000000"];
    }
    return ["10", "50", "100", "200", "500", "1000", "5000"];
  }, [isHighDenomination]);

  const applyMultiplier = (mult: number) => {
    const cur = Number.isFinite(parsedAmount) ? parsedAmount : 0;
    const next = Math.max(0, cur * mult);
    setAmount(String(next));
  };

  const applyAdd = (val: number) => {
    const cur = Number.isFinite(parsedAmount) ? parsedAmount : 0;
    const next = Math.max(0, cur + val);
    setAmount(String(next));
  };

  // Fee calculation
  const feeCalculation = useMemo(() => {
    if (result == null || !Number.isFinite(result)) return null;
    return calculateWithFee(result, feePercent, parsedAmount);
  }, [result, feePercent, parsedAmount]);

  // Quick reference matrix
  const quickConversions = useMemo(() => {
    if (!rates) return [];
    return getQuickConversions(from, to, rates);
  }, [rates, from, to]);

  // Watchlist conversion calculations
  const watchlistConversions = useMemo(() => {
    if (!rates || !Number.isFinite(parsedAmount)) return [];
    return watchlist.map((code) => {
      const val = convert(parsedAmount, from, code, rates);
      const r = convert(1, from, code, rates);
      return {
        code,
        info: getCurrencyInfo(code),
        val,
        rate: r,
      };
    });
  }, [rates, parsedAmount, from, watchlist]);

  const addWatchlistCurrency = (code: string) => {
    if (!code || watchlist.includes(code)) return;
    setWatchlist((prev) => [...prev, code]);
    setNewWatchlistCurrency("");
    toast.success(`${t.currencyAddToWatchlist}: ${code}`);
  };

  const removeWatchlistCurrency = (code: string) => {
    setWatchlist((prev) => prev.filter((c) => c !== code));
    toast.success(`${t.currencyRemoveFromWatchlist}: ${code}`);
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Coins className="size-4 text-primary" />
          {t.currencyTitle}
        </CardTitle>
        <div className="flex items-center gap-2">
          {fetchedAt && (
            <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline-block">
              {new Intl.DateTimeFormat(tag, { dateStyle: "short", timeStyle: "short" }).format(
                new Date(fetchedAt),
              )}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void load(true)}
            disabled={loading}
            title={t.refresh}
          >
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && !rates ? (
          <LoadingState />
        ) : error && !rates ? (
          <p className="text-sm text-destructive">
            {t.currencyError}: {error}
          </p>
        ) : (
          <>
            {/* Primary Input & Currencies Row */}
            <div className="space-y-3 rounded-xl border bg-card p-3 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">{t.currencyAmount}</p>
                  <span className="font-mono text-xs text-muted-foreground">
                    {fromInfo.flag} {fromInfo.symbol} ({from})
                  </span>
                </div>
                <Input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-mono text-xl font-semibold tracking-tight"
                  placeholder="100"
                />
              </div>

              {/* Quick Amount Chips & Multipliers */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {quickAmountPresets.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className="rounded-md border bg-muted/40 px-2 py-0.5 font-mono text-xs font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary active:scale-95"
                  >
                    {isHighDenomination && Number(val) >= 1_000_000
                      ? `${Number(val) / 1_000_000}M`
                      : isHighDenomination && Number(val) >= 1_000
                        ? `${Number(val) / 1_000}k`
                        : val}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => applyMultiplier(10)}
                    className="rounded border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] font-semibold hover:bg-muted"
                    title="Multiply by 10"
                  >
                    ×10
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMultiplier(0.1)}
                    className="rounded border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] font-semibold hover:bg-muted"
                    title="Divide by 10"
                  >
                    ÷10
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAdd(isHighDenomination ? 100000 : 100)}
                    className="rounded border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] font-semibold hover:bg-muted"
                    title={`Add ${isHighDenomination ? "100k" : "100"}`}
                  >
                    +{isHighDenomination ? "100k" : "100"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount("")}
                    className="rounded border bg-destructive/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-destructive hover:bg-destructive/20"
                    title="Clear"
                  >
                    C
                  </button>
                </div>
              </div>

              {/* From / Swap / To Selectors */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 pt-1">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t.from}</p>
                  <Select value={from} onValueChange={setFrom}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        <span className="flex items-center gap-1.5 truncate">
                          <span>{fromInfo.flag}</span>
                          <span className="font-semibold">{from}</span>
                          <span className="hidden text-xs text-muted-foreground sm:inline">
                            {locale === "vi" ? fromInfo.nameVi : fromInfo.name}
                          </span>
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <div className="sticky top-0 z-10 bg-popover px-2 pb-2 pt-1">
                        <div className="flex items-center gap-1 rounded-md border px-2 py-1">
                          <Search className="size-3.5 text-muted-foreground" />
                          <input
                            value={fromSearch}
                            onChange={(e) => setFromSearch(e.target.value)}
                            placeholder={t.currencySearchPlaceholder}
                            className="w-full bg-transparent text-xs outline-hidden"
                          />
                        </div>
                      </div>
                      {filteredFromCurrencies.map((c) => {
                        const info = getCurrencyInfo(c);
                        return (
                          <SelectItem key={c} value={c}>
                            <span className="flex items-center gap-2">
                              <span>{info.flag}</span>
                              <span className="font-semibold">{c}</span>
                              <span className="text-xs text-muted-foreground">
                                ({info.symbol}) {locale === "vi" ? info.nameVi : info.name}
                              </span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={swap}
                  className="mb-0.5 transition-transform hover:rotate-180 duration-200"
                  title="Swap currencies"
                >
                  <ArrowLeftRight className="size-4" />
                </Button>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t.to}</p>
                  <Select value={to} onValueChange={setTo}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        <span className="flex items-center gap-1.5 truncate">
                          <span>{toInfo.flag}</span>
                          <span className="font-semibold">{to}</span>
                          <span className="hidden text-xs text-muted-foreground sm:inline">
                            {locale === "vi" ? toInfo.nameVi : toInfo.name}
                          </span>
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <div className="sticky top-0 z-10 bg-popover px-2 pb-2 pt-1">
                        <div className="flex items-center gap-1 rounded-md border px-2 py-1">
                          <Search className="size-3.5 text-muted-foreground" />
                          <input
                            value={toSearch}
                            onChange={(e) => setToSearch(e.target.value)}
                            placeholder={t.currencySearchPlaceholder}
                            className="w-full bg-transparent text-xs outline-hidden"
                          />
                        </div>
                      </div>
                      {filteredToCurrencies.map((c) => {
                        const info = getCurrencyInfo(c);
                        return (
                          <SelectItem key={c} value={c}>
                            <span className="flex items-center gap-2">
                              <span>{info.flag}</span>
                              <span className="font-semibold">{c}</span>
                              <span className="text-xs text-muted-foreground">
                                ({info.symbol}) {locale === "vi" ? info.nameVi : info.name}
                              </span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Showcase Result Box */}
            <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-muted/30 to-background p-4 text-center shadow-xs">
              {missing ? (
                <p className="text-sm text-destructive">
                  {t.currencyUnsupported.replace("{code}", missing)}
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">{toInfo.flag}</span>
                    <p className="font-mono text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
                      {result != null && Number.isFinite(result)
                        ? `${formatConverted(result, to, tag)}`
                        : "—"}
                    </p>
                    <span className="font-mono text-xl font-semibold text-primary">
                      {toInfo.symbol}
                    </span>
                  </div>

                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    {toInfo.name} ({to})
                  </p>

                  {/* Rates Subline */}
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {rate != null && Number.isFinite(rate) && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 font-mono">
                        <span>1 {from}</span>
                        <span>=</span>
                        <span className="font-semibold text-foreground">
                          {formatRate(rate, tag)} {to}
                        </span>
                      </span>
                    )}
                    {inverse != null && Number.isFinite(inverse) && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 font-mono">
                        <span>1 {to}</span>
                        <span>=</span>
                        <span className="font-semibold text-foreground">
                          {formatRate(inverse, tag)} {from}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyResult}
                      disabled={result == null || !Number.isFinite(result)}
                      className="gap-1.5 text-xs"
                    >
                      <Copy className="size-3.5" />
                      {t.copyResult}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyNumberOnly}
                      disabled={result == null || !Number.isFinite(result)}
                      className="gap-1.5 text-xs"
                    >
                      <span>123</span>
                      {t.copy}
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Advanced Panels Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="converter" className="gap-1.5 text-xs">
                  <TableProperties className="size-3.5" />
                  {t.currencyQuickReference}
                </TabsTrigger>
                <TabsTrigger value="watchlist" className="gap-1.5 text-xs">
                  <TrendingUp className="size-3.5" />
                  {t.currencyWatchlist}
                </TabsTrigger>
                <TabsTrigger value="fee" className="gap-1.5 text-xs">
                  <Percent className="size-3.5" />
                  {t.currencyFeeCalculator}
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: Quick Reference Matrix */}
              <TabsContent value="converter" className="space-y-2 pt-2">
                <div className="rounded-lg border bg-muted/20 p-2 text-xs">
                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div className="space-y-1">
                      <p className="border-b pb-1 font-semibold text-muted-foreground">
                        {from} → {to}
                      </p>
                      {quickConversions.map((q) => (
                        <div
                          key={`fwd-${q.unit}`}
                          className="flex items-center justify-between rounded px-1.5 py-0.5 hover:bg-muted/40 cursor-pointer"
                          onClick={() => {
                            setAmount(String(q.unit));
                            toast.success(`${q.unit} ${from}`);
                          }}
                        >
                          <span className="text-muted-foreground">{q.unit} {from}</span>
                          <span className="font-semibold">{formatConverted(q.forward, to, tag)} {to}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1 border-l pl-2">
                      <p className="border-b pb-1 font-semibold text-muted-foreground">
                        {to} → {from}
                      </p>
                      {quickConversions.map((q) => (
                        <div
                          key={`bwd-${q.unit}`}
                          className="flex items-center justify-between rounded px-1.5 py-0.5 hover:bg-muted/40 cursor-pointer"
                          onClick={() => {
                            swap();
                            setAmount(String(q.unit));
                            toast.success(`${q.unit} ${to}`);
                          }}
                        >
                          <span className="text-muted-foreground">{q.unit} {to}</span>
                          <span className="font-semibold">{formatConverted(q.backward, from, tag)} {from}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: Multi-Currency Watchlist */}
              <TabsContent value="watchlist" className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <Select value={newWatchlistCurrency} onValueChange={addWatchlistCurrency}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={t.currencyAddToWatchlist} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {allCurrencies
                        .filter((c) => !watchlist.includes(c))
                        .map((c) => {
                          const info = getCurrencyInfo(c);
                          return (
                            <SelectItem key={c} value={c}>
                              <span className="flex items-center gap-2 text-xs">
                                <span>{info.flag}</span>
                                <span className="font-semibold">{c}</span>
                                <span>{locale === "vi" ? info.nameVi : info.name}</span>
                              </span>
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="max-h-64 space-y-1 overflow-auto rounded-lg border bg-muted/20 p-2">
                  {watchlistConversions.map((item) => (
                    <div
                      key={item.code}
                      className="group flex items-center justify-between rounded-md bg-background px-2.5 py-1.5 text-xs transition-colors hover:bg-accent/40"
                    >
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => {
                          setTo(item.code);
                          toast.success(`${t.to}: ${item.code}`);
                        }}
                      >
                        <span className="text-base">{item.info.flag}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{item.code}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {locale === "vi" ? item.info.nameVi : item.info.name}
                            </span>
                          </div>
                          {item.rate != null && Number.isFinite(item.rate) && (
                            <p className="font-mono text-[10px] text-muted-foreground">
                              1 {from} = {formatRate(item.rate, tag)} {item.code}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold tabular-nums">
                          {item.val != null && Number.isFinite(item.val)
                            ? `${formatConverted(item.val, item.code, tag)} ${item.info.symbol}`
                            : "—"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
                          onClick={() => {
                            if (item.val != null && Number.isFinite(item.val)) {
                              void navigator.clipboard.writeText(
                                `${formatConverted(item.val, item.code, tag)} ${item.code}`,
                              );
                              toast.success(t.copied);
                            }
                          }}
                          title={t.copy}
                        >
                          <Copy className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
                          onClick={() => removeWatchlistCurrency(item.code)}
                          title={t.currencyRemoveFromWatchlist}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* TAB 3: Fee & Spread Calculator */}
              <TabsContent value="fee" className="space-y-3 pt-2">
                <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">{t.currencyFeePercent}</p>
                    <span className="font-mono text-xs font-bold text-primary">
                      {feePercent}%
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {[0, 1.0, 1.5, 2.0, 2.5, 3.5, 4.0].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => {
                          setFeePercent(f);
                          setCustomFee(String(f));
                        }}
                        className={`rounded px-2 py-0.5 font-mono text-xs transition-colors ${
                          feePercent === f
                            ? "bg-primary font-bold text-primary-foreground"
                            : "border bg-background hover:bg-muted"
                        }`}
                      >
                        {f === 0 ? "0% (Raw)" : `${f}%`}
                      </button>
                    ))}
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="20"
                        value={customFee}
                        onChange={(e) => {
                          setCustomFee(e.target.value);
                          const n = Number(e.target.value);
                          if (Number.isFinite(n) && n >= 0) {
                            setFeePercent(n);
                          }
                        }}
                        className="h-6 w-14 font-mono text-xs"
                        placeholder="%"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>

                  {feeCalculation && (
                    <div className="mt-3 space-y-1.5 border-t pt-2 font-mono text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t.currencyAmount}:</span>
                        <span>{formatConverted(feeCalculation.grossAmount, to, tag)} {to}</span>
                      </div>
                      <div className="flex justify-between text-destructive">
                        <span>{t.currencyFeeAmount} ({feeCalculation.feePercent}%):</span>
                        <span>- {formatConverted(feeCalculation.feeAmount, to, tag)} {to}</span>
                      </div>
                      <div className="flex items-center justify-between rounded bg-primary/10 p-2 font-bold text-primary">
                        <span>{t.currencyNetAmount}:</span>
                        <span className="text-sm">{formatConverted(feeCalculation.netAmount, to, tag)} {to}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                        <span>{t.currencyEffectiveRate}:</span>
                        <span>1 {from} = {formatRate(feeCalculation.effectiveRate, tag)} {to}</span>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Status Footer */}
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
              <Badge variant={fromCache ? "secondary" : "outline"}>
                {fromCache ? t.currencyOffline : t.currencyUpdated}
              </Badge>
              {source && (
                <span className="text-[11px] text-muted-foreground">
                  {t.currencySource}
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
