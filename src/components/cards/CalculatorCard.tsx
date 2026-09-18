import { useCallback, useEffect, useMemo, useState } from "react";
import { Delete, Equal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { evaluate, formatResult } from "@/lib/calculator";
import {
  convertData,
  convertLength,
  convertMass,
  convertTemp,
  formatConverted,
  DATA_UNITS,
  LENGTH_UNITS,
  MASS_UNITS,
  TEMP_UNITS,
  type DataUnit,
  type LengthUnit,
  type MassUnit,
  type TempUnit,
} from "@/lib/converter";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type HistoryItem = { expression: string; result: string };

const HISTORY_KEY = "dn-assistant-calc-history";
const KEYS = [
  ["C", "CE", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "-"],
  ["1", "2", "3", "+"],
  ["±", "0", ".", "="],
] as const;

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 12)));
}

export function CalculatorCard() {
  const { t } = useI18n();
  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [fresh, setFresh] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>(() => loadHistory());

  const [lengthValue, setLengthValue] = useState("1");
  const [lengthFrom, setLengthFrom] = useState<LengthUnit>("m");
  const [lengthTo, setLengthTo] = useState<LengthUnit>("ft");
  const [massValue, setMassValue] = useState("1");
  const [massFrom, setMassFrom] = useState<MassUnit>("kg");
  const [massTo, setMassTo] = useState<MassUnit>("lb");
  const [tempValue, setTempValue] = useState("25");
  const [tempFrom, setTempFrom] = useState<TempUnit>("celsius");
  const [tempTo, setTempTo] = useState<TempUnit>("fahrenheit");
  const [dataValue, setDataValue] = useState("1");
  const [dataFrom, setDataFrom] = useState<DataUnit>("GB");
  const [dataTo, setDataTo] = useState<DataUnit>("GiB");

  const inputDigit = useCallback(
    (digit: string) => {
      setDisplay((prev) => {
        if (fresh || prev === "0" || prev === "Error") {
          setFresh(false);
          return digit === "." ? "0." : digit;
        }
        if (digit === "." && prev.includes(".")) return prev;
        return prev + digit;
      });
    },
    [fresh],
  );

  const applyOp = useCallback(
    (op: string) => {
      const mapped = op === "×" ? "×" : op === "÷" ? "÷" : op;
      if (fresh && expression) {
        setExpression((prev) => prev.replace(/[+\-×÷%]\s*$/, `${mapped} `));
        return;
      }
      setExpression((prev) => `${prev}${display} ${mapped} `);
      setFresh(true);
    },
    [display, expression, fresh],
  );

  const compute = useCallback(() => {
    const full = `${expression}${display}`.trim();
    try {
      const result = formatResult(evaluate(full));
      setHistory((prev) => {
        const next = [{ expression: full, result }, ...prev].slice(0, 12);
        saveHistory(next);
        return next;
      });
      setDisplay(result);
      setExpression("");
      setFresh(true);
    } catch {
      setDisplay("Error");
      setExpression("");
      setFresh(true);
    }
  }, [display, expression]);

  const handleKey = useCallback(
    (key: string) => {
      if (key === "C") {
        setDisplay("0");
        setExpression("");
        setFresh(true);
        return;
      }
      if (key === "CE") {
        setDisplay("0");
        setFresh(true);
        return;
      }
      if (key === "±") {
        setDisplay((prev) => {
          if (prev === "0" || prev === "Error") return prev;
          return prev.startsWith("-") ? prev.slice(1) : `-${prev}`;
        });
        return;
      }
      if (key === "=") {
        compute();
        return;
      }
      if (["+", "-", "×", "÷", "%"].includes(key)) {
        applyOp(key);
        return;
      }
      inputDigit(key);
    },
    [applyOp, compute, inputDigit],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;

      const { key } = event;
      if (/^[0-9.]$/.test(key)) {
        event.preventDefault();
        handleKey(key);
        return;
      }
      if (key === "+" || key === "-" || key === "%" || key === "*") {
        event.preventDefault();
        handleKey(key === "*" ? "×" : key);
        return;
      }
      if (key === "/") {
        event.preventDefault();
        handleKey("÷");
        return;
      }
      if (key === "Enter" || key === "=") {
        event.preventDefault();
        handleKey("=");
        return;
      }
      if (key === "Escape") {
        event.preventDefault();
        handleKey("C");
        return;
      }
      if (key === "Backspace") {
        event.preventDefault();
        setDisplay((prev) => {
          if (fresh || prev.length <= 1 || prev === "Error") {
            setFresh(true);
            return "0";
          }
          return prev.slice(0, -1);
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fresh, handleKey]);

  const lengthOut = useMemo(() => {
    const n = Number(lengthValue);
    if (!Number.isFinite(n)) return "—";
    return formatConverted(convertLength(n, lengthFrom, lengthTo));
  }, [lengthValue, lengthFrom, lengthTo]);

  const massOut = useMemo(() => {
    const n = Number(massValue);
    if (!Number.isFinite(n)) return "—";
    return formatConverted(convertMass(n, massFrom, massTo));
  }, [massValue, massFrom, massTo]);

  const tempOut = useMemo(() => {
    const n = Number(tempValue);
    if (!Number.isFinite(n)) return "—";
    return formatConverted(convertTemp(n, tempFrom, tempTo));
  }, [tempValue, tempFrom, tempTo]);

  const dataOut = useMemo(() => {
    const n = Number(dataValue);
    if (!Number.isFinite(n)) return "—";
    return formatConverted(convertData(n, dataFrom, dataTo));
  }, [dataValue, dataFrom, dataTo]);

  return (
    <Tabs defaultValue="calc" className="w-full">
      <TabsList>
        <TabsTrigger value="calc">{t.calculator}</TabsTrigger>
        <TabsTrigger value="converter">{t.converter}</TabsTrigger>
      </TabsList>

      <TabsContent value="calc">
        <Card className="h-full">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{t.calculator}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDisplay("0");
                setExpression("");
                setFresh(true);
              }}
            >
              <Delete className="size-4" />
              {t.clear}
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/40 px-3 py-2 text-right">
                <p className="min-h-5 truncate text-xs text-muted-foreground">
                  {expression || "\u00A0"}
                </p>
                <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight">
                  {display}
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {KEYS.flat().map((key) => {
                  const isOp = ["+", "-", "×", "÷", "%", "="].includes(key);
                  const isAction = ["C", "CE", "±"].includes(key);
                  return (
                    <Button
                      key={key}
                      variant={key === "=" ? "default" : isOp || isAction ? "secondary" : "outline"}
                      className={cn("h-11 font-mono text-base", key === "=" && "bg-primary")}
                      onClick={() => handleKey(key)}
                    >
                      {key === "=" ? <Equal className="size-4" /> : key}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-2">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-medium text-muted-foreground">{t.history}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setHistory([]);
                    saveHistory([]);
                  }}
                >
                  {t.clear}
                </Button>
              </div>
              <ScrollArea className="h-[240px] pr-2">
                <div className="space-y-2">
                  {history.length === 0 && (
                    <p className="px-1 text-xs text-muted-foreground">{t.history}: —</p>
                  )}
                  {history.map((item, index) => (
                    <button
                      key={`${item.expression}-${index}`}
                      type="button"
                      className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-accent"
                      onClick={() => {
                        setDisplay(item.result);
                        setExpression("");
                        setFresh(true);
                      }}
                    >
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {item.expression}
                      </p>
                      <p className="font-mono text-sm font-medium">= {item.result}</p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="converter">
        <Card>
          <CardHeader>
            <CardTitle>{t.converter}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ConverterBlock
              label={t.length}
              value={lengthValue}
              onValue={setLengthValue}
              from={lengthFrom}
              to={lengthTo}
              onFrom={(v) => setLengthFrom(v as LengthUnit)}
              onTo={(v) => setLengthTo(v as LengthUnit)}
              units={LENGTH_UNITS}
              result={lengthOut}
              fromLabel={t.from}
              toLabel={t.to}
            />
            <ConverterBlock
              label={t.mass}
              value={massValue}
              onValue={setMassValue}
              from={massFrom}
              to={massTo}
              onFrom={(v) => setMassFrom(v as MassUnit)}
              onTo={(v) => setMassTo(v as MassUnit)}
              units={MASS_UNITS}
              result={massOut}
              fromLabel={t.from}
              toLabel={t.to}
            />
            <ConverterBlock
              label={t.temperature}
              value={tempValue}
              onValue={setTempValue}
              from={tempFrom}
              to={tempTo}
              onFrom={(v) => setTempFrom(v as TempUnit)}
              onTo={(v) => setTempTo(v as TempUnit)}
              units={TEMP_UNITS}
              result={tempOut}
              fromLabel={t.from}
              toLabel={t.to}
            />
            <ConverterBlock
              label={t.capacity}
              value={dataValue}
              onValue={setDataValue}
              from={dataFrom}
              to={dataTo}
              onFrom={(v) => setDataFrom(v as DataUnit)}
              onTo={(v) => setDataTo(v as DataUnit)}
              units={DATA_UNITS}
              result={dataOut}
              fromLabel={t.from}
              toLabel={t.to}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function ConverterBlock({
  label,
  value,
  onValue,
  from,
  to,
  onFrom,
  onTo,
  units,
  result,
  fromLabel,
  toLabel,
}: {
  label: string;
  value: string;
  onValue: (v: string) => void;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  units: string[];
  result: string;
  fromLabel: string;
  toLabel: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <Input
        type="number"
        value={value}
        onChange={(e) => onValue(e.target.value)}
        className="font-mono"
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">{fromLabel}</p>
          <Select value={from} onValueChange={onFrom}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">{toLabel}</p>
          <Select value={to} onValueChange={onTo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="font-mono text-lg font-semibold tabular-nums">{result}</p>
    </div>
  );
}
