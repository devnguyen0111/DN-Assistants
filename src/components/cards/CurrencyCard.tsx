import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Coins, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  convert,
  fetchRates,
  formatConverted,
  formatRate,
  loadSavedPair,
  parseAmount,
  POPULAR_CURRENCIES,
  savePair,
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

  const currencies = useMemo(() => {
    const fromRates = rates ? Object.keys(rates) : [...POPULAR_CURRENCIES];
    const preferred = POPULAR_CURRENCIES.filter((c) => fromRates.includes(c));
    const preferredSet = new Set<string>(preferred);
    const rest = fromRates.filter((c) => !preferredSet.has(c)).sort();
    return [...preferred, ...rest];
  }, [rates]);

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

  const missing =
    rates && (!rates[from] || !rates[to])
      ? !rates[from]
        ? from
        : to
      : null;

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const copyResult = () => {
    if (result == null || !Number.isFinite(result)) return;
    const text = `${formatConverted(parsedAmount, from, tag)} ${from} = ${formatConverted(result, to, tag)} ${to}`;
    void navigator.clipboard.writeText(text).then(() => toast.success(t.copied));
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Coins className="size-4 text-primary" />
          {t.currencyTitle}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void load(true)}
          disabled={loading}
          title={t.refresh}
        >
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
        </Button>
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
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t.currencyAmount}</p>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-mono text-lg"
              />
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t.from}</p>
                <Select value={from} onValueChange={setFrom}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="icon" onClick={swap} className="mb-0.5">
                <ArrowLeftRight className="size-4" />
              </Button>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t.to}</p>
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4 text-center">
              {missing ? (
                <p className="text-sm text-destructive">
                  {t.currencyUnsupported.replace("{code}", missing)}
                </p>
              ) : (
                <>
                  <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight">
                    {result != null && Number.isFinite(result)
                      ? `${formatConverted(result, to, tag)} ${to}`
                      : "—"}
                  </p>
                  {rate != null && Number.isFinite(rate) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      1 {from} = {formatRate(rate, tag)} {to}
                    </p>
                  )}
                  {inverse != null && Number.isFinite(inverse) && (
                    <p className="text-xs text-muted-foreground">
                      1 {to} = {formatRate(inverse, tag)} {from}
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={copyResult}
                    disabled={result == null || !Number.isFinite(result)}
                  >
                    <Copy className="size-3.5" />
                    {t.copyResult}
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <Badge variant={fromCache ? "secondary" : "outline"}>
                {fromCache ? t.currencyOffline : t.currencyUpdated}
              </Badge>
              {fetchedAt && (
                <span className="font-mono">
                  {new Intl.DateTimeFormat(tag, { dateStyle: "short", timeStyle: "short" }).format(
                    new Date(fetchedAt),
                  )}
                </span>
              )}
            </div>
            {source && (
              <p className="text-[11px] text-muted-foreground">{t.currencySource}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
