import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Coins, RefreshCw } from "lucide-react";
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
import { convert, fetchRates, POPULAR_CURRENCIES } from "@/lib/currency";

export function CurrencyCard() {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("VND");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRates();
      setRates(data.rates);
      setFetchedAt(data.fetchedAt);
      setFromCache(data.fromCache);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const currencies = useMemo(() => {
    const known = new Set<string>(POPULAR_CURRENCIES);
    if (rates) Object.keys(rates).forEach((c) => known.add(c));
    return Array.from(known).sort();
  }, [rates]);

  const result = useMemo(() => {
    if (!rates) return null;
    const n = Number(amount);
    if (!Number.isFinite(n)) return null;
    return convert(n, from, to, rates);
  }, [rates, amount, from, to]);

  const rate = useMemo(() => {
    if (!rates) return null;
    return convert(1, from, to, rates);
  }, [rates, from, to]);

  const fmt = (n: number) =>
    new Intl.NumberFormat(tag, { maximumFractionDigits: 4 }).format(n);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Coins className="size-4 text-primary" />
          {t.currencyTitle}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={() => void load()} disabled={loading}>
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
                type="number"
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
              <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight">
                {result != null && Number.isFinite(result) ? fmt(result) : "—"} {to}
              </p>
              {rate != null && Number.isFinite(rate) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  1 {from} = {fmt(rate)} {to}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
