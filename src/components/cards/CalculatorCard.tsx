import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, Coins, Delete, Equal, Sparkles, SplitSquareVertical } from "lucide-react";
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
  convertArea,
  convertData,
  convertLength,
  convertMass,
  convertSpeed,
  convertTemp,
  convertVolume,
  formatConverted,
  AREA_UNITS,
  DATA_UNITS,
  LENGTH_UNITS,
  MASS_UNITS,
  SPEED_UNITS,
  TEMP_UNITS,
  VOLUME_UNITS,
  type AreaUnit,
  type DataUnit,
  type LengthUnit,
  type MassUnit,
  type SpeedUnit,
  type TempUnit,
  type VolumeUnit,
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
  const [calcMode, setCalcMode] = useState<"standard" | "scientific">("standard");
  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [fresh, setFresh] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>(() => loadHistory());

  // Converters state
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

  const [speedValue, setSpeedValue] = useState("100");
  const [speedFrom, setSpeedFrom] = useState<SpeedUnit>("kmh");
  const [speedTo, setSpeedTo] = useState<SpeedUnit>("mph");

  const [areaValue, setAreaValue] = useState("100");
  const [areaFrom, setAreaFrom] = useState<AreaUnit>("sqm");
  const [areaTo, setAreaTo] = useState<AreaUnit>("sqft");

  const [volumeValue, setVolumeValue] = useState("1");
  const [volumeFrom, setVolumeFrom] = useState<VolumeUnit>("l");
  const [volumeTo, setVolumeTo] = useState<VolumeUnit>("gal");

  // Finance State
  const [billAmount, setBillAmount] = useState("500000");
  const [tipPercent, setTipPercent] = useState(10);
  const [numPeople, setNumPeople] = useState(2);

  const [origPrice, setOrigPrice] = useState("1200000");
  const [discountPercent, setDiscountPercent] = useState(20);

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
        setExpression((prev) => prev.replace(/[+\-×÷%^]\s*$/, `${mapped} `));
        return;
      }
      setExpression((prev) => `${prev}${display} ${mapped} `);
      setFresh(true);
    },
    [display, expression, fresh],
  );

  const applyFunction = useCallback(
    (fn: string) => {
      if (fn === "sqrt") {
        setExpression((prev) => `${prev}sqrt(`);
        setFresh(true);
      } else if (fn === "sqr") {
        setExpression((prev) => `${prev}${display} ^ 2`);
        setFresh(true);
      } else if (fn === "cube") {
        setExpression((prev) => `${prev}${display} ^ 3`);
        setFresh(true);
      } else if (fn === "inv") {
        const val = Number(display);
        if (val !== 0) {
          setDisplay(String(1 / val));
          setFresh(true);
        }
      } else if (fn === "abs") {
        setExpression((prev) => `${prev}abs(`);
        setFresh(true);
      } else if (fn === "pi") {
        setDisplay(String(Math.PI));
        setFresh(true);
      } else if (fn === "e") {
        setDisplay(String(Math.E));
        setFresh(true);
      } else if (fn === "(" || fn === ")") {
        setExpression((prev) => `${prev}${fn}`);
      } else {
        setExpression((prev) => `${prev}${fn}(`);
        setFresh(true);
      }
    },
    [display],
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
      setFresh(true);
    }
  }, [display, expression]);

  const clear = useCallback(() => {
    setDisplay("0");
    setExpression("");
    setFresh(true);
  }, []);

  const clearEntry = useCallback(() => {
    setDisplay("0");
    setFresh(true);
  }, []);

  const toggleSign = useCallback(() => {
    setDisplay((prev) => {
      if (prev === "0" || prev === "Error") return prev;
      return prev.startsWith("-") ? prev.slice(1) : `-${prev}`;
    });
  }, []);

  const backspace = useCallback(() => {
    setDisplay((prev) => {
      if (fresh || prev === "Error" || prev.length <= 1) return "0";
      return prev.slice(0, -1);
    });
  }, [fresh]);

  const onKey = useCallback(
    (key: string) => {
      if (key >= "0" && key <= "9") inputDigit(key);
      else if (key === ".") inputDigit(".");
      else if (key === "C") clear();
      else if (key === "CE") clearEntry();
      else if (key === "±") toggleSign();
      else if (key === "=") compute();
      else if (["+", "-", "×", "÷", "%"].includes(key)) applyOp(key);
    },
    [applyOp, clear, clearEntry, compute, inputDigit, toggleSign],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        inputDigit(e.key);
      } else if (e.key === ".") {
        e.preventDefault();
        inputDigit(".");
      } else if (e.key === "+") {
        e.preventDefault();
        applyOp("+");
      } else if (e.key === "-") {
        e.preventDefault();
        applyOp("-");
      } else if (e.key === "*") {
        e.preventDefault();
        applyOp("×");
      } else if (e.key === "/") {
        e.preventDefault();
        applyOp("÷");
      } else if (e.key === "%") {
        e.preventDefault();
        applyOp("%");
      } else if (e.key === "^") {
        e.preventDefault();
        applyOp("^");
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        compute();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
      } else if (e.key === "Escape") {
        e.preventDefault();
        clear();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [applyOp, backspace, clear, compute, inputDigit]);

  // Conversions calculations
  const lengthOut = useMemo(
    () => formatConverted(convertLength(Number(lengthValue) || 0, lengthFrom, lengthTo)),
    [lengthValue, lengthFrom, lengthTo],
  );
  const massOut = useMemo(
    () => formatConverted(convertMass(Number(massValue) || 0, massFrom, massTo)),
    [massValue, massFrom, massTo],
  );
  const tempOut = useMemo(
    () => formatConverted(convertTemp(Number(tempValue) || 0, tempFrom, tempTo)),
    [tempValue, tempFrom, tempTo],
  );
  const dataOut = useMemo(
    () => formatConverted(convertData(Number(dataValue) || 0, dataFrom, dataTo)),
    [dataValue, dataFrom, dataTo],
  );
  const speedOut = useMemo(
    () => formatConverted(convertSpeed(Number(speedValue) || 0, speedFrom, speedTo)),
    [speedValue, speedFrom, speedTo],
  );
  const areaOut = useMemo(
    () => formatConverted(convertArea(Number(areaValue) || 0, areaFrom, areaTo)),
    [areaValue, areaFrom, areaTo],
  );
  const volumeOut = useMemo(
    () => formatConverted(convertVolume(Number(volumeValue) || 0, volumeFrom, volumeTo)),
    [volumeValue, volumeFrom, volumeTo],
  );

  // Financial calculations
  const tipBreakdown = useMemo(() => {
    const total = Number(billAmount) || 0;
    const tip = (total * tipPercent) / 100;
    const grandTotal = total + tip;
    const people = Math.max(1, numPeople || 1);
    const perPerson = grandTotal / people;
    return {
      tipAmount: tip,
      grandTotal,
      perPerson,
    };
  }, [billAmount, tipPercent, numPeople]);

  const discountBreakdown = useMemo(() => {
    const original = Number(origPrice) || 0;
    const savings = (original * discountPercent) / 100;
    const finalPrice = Math.max(0, original - savings);
    return {
      savings,
      finalPrice,
    };
  }, [origPrice, discountPercent]);

  return (
    <Tabs defaultValue="calc" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="calc" className="gap-1.5">
            <Calculator className="size-3.5" />
            {t.calculator}
          </TabsTrigger>
          <TabsTrigger value="converter" className="gap-1.5">
            <SplitSquareVertical className="size-3.5" />
            {t.converter}
          </TabsTrigger>
          <TabsTrigger value="finance" className="gap-1.5">
            <Coins className="size-3.5" />
            {t.financeTab}
          </TabsTrigger>
        </TabsList>
      </div>

      {/* CALCULATOR TAB */}
      <TabsContent value="calc">
        <div className="grid gap-4 md:grid-cols-[1fr_260px]">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.calculator}</CardTitle>
              <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-0.5">
                <Button
                  size="sm"
                  variant={calcMode === "standard" ? "secondary" : "ghost"}
                  className="h-6 px-2 text-[11px]"
                  onClick={() => setCalcMode("standard")}
                >
                  {t.standardCalc}
                </Button>
                <Button
                  size="sm"
                  variant={calcMode === "scientific" ? "secondary" : "ghost"}
                  className="h-6 px-2 text-[11px]"
                  onClick={() => setCalcMode("scientific")}
                >
                  {t.scientificCalc}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Display */}
              <div className="rounded-xl border bg-muted/20 p-4 text-right">
                <p className="min-h-5 font-mono text-xs text-muted-foreground">{expression || " "}</p>
                <p className="overflow-x-auto font-mono text-3xl font-semibold tabular-nums tracking-tight">
                  {display}
                </p>
              </div>

              {/* Scientific Keypad */}
              {calcMode === "scientific" && (
                <div className="grid grid-cols-5 gap-1.5 rounded-xl border bg-card/40 p-2 text-xs font-mono">
                  <Button size="sm" variant="outline" className="h-8" onClick={() => applyFunction("sin")}>
                    sin
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => applyFunction("cos")}>
                    cos
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => applyFunction("tan")}>
                    tan
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => applyFunction("log")}>
                    log
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => applyFunction("ln")}>
                    ln
                  </Button>

                  <Button size="sm" variant="outline" className="h-8" onClick={() => applyFunction("sqrt")}>
                    √
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => applyFunction("sqr")}>
                    x²
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => applyOp("^")}>
                    xʸ
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => applyFunction("(")}>
                    (
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => applyFunction(")")}>
                    )
                  </Button>

                  <Button size="sm" variant="outline" className="h-8" onClick={() => applyFunction("inv")}>
                    1/x
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => applyFunction("abs")}>
                    |x|
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => applyFunction("pi")}>
                    π
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => applyFunction("e")}>
                    e
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={backspace}>
                    <Delete className="size-4" />
                  </Button>
                </div>
              )}

              {/* Standard Keypad */}
              <div className="grid grid-cols-4 gap-2">
                {KEYS.map((row, rIdx) =>
                  row.map((key) => {
                    const isOp = ["+", "-", "×", "÷", "%"].includes(key);
                    const isEquals = key === "=";
                    const isClear = key === "C" || key === "CE";
                    return (
                      <Button
                        key={`${rIdx}-${key}`}
                        variant={isEquals ? "default" : isOp ? "secondary" : isClear ? "outline" : "ghost"}
                        className={cn(
                          "h-12 font-mono text-base",
                          isEquals && "bg-primary text-primary-foreground font-bold shadow",
                          isClear && "text-destructive",
                        )}
                        onClick={() => onKey(key)}
                      >
                        {isEquals ? <Equal className="size-5" /> : key}
                      </Button>
                    );
                  }),
                )}
              </div>
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.history}</CardTitle>
              {history.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs text-muted-foreground"
                  onClick={() => {
                    setHistory([]);
                    saveHistory([]);
                  }}
                >
                  {t.clear}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80 pr-3">
                {history.length === 0 ? (
                  <p className="pt-8 text-center text-xs text-muted-foreground">No recent calculations</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((h, i) => (
                      <div
                        key={i}
                        className="cursor-pointer rounded-lg border bg-muted/20 p-2 text-right transition-colors hover:bg-muted/40"
                        onClick={() => {
                          setDisplay(h.result);
                          setFresh(true);
                        }}
                      >
                        <p className="font-mono text-xs text-muted-foreground">{h.expression}</p>
                        <p className="font-mono text-base font-semibold">{h.result}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* UNIT CONVERTER TAB */}
      <TabsContent value="converter">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t.converter}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              <ConverterBlock
                label={t.unitSpeed}
                value={speedValue}
                onValue={setSpeedValue}
                from={speedFrom}
                to={speedTo}
                onFrom={(v) => setSpeedFrom(v as SpeedUnit)}
                onTo={(v) => setSpeedTo(v as SpeedUnit)}
                units={SPEED_UNITS}
                result={speedOut}
                fromLabel={t.from}
                toLabel={t.to}
              />
              <ConverterBlock
                label={t.unitArea}
                value={areaValue}
                onValue={setAreaValue}
                from={areaFrom}
                to={areaTo}
                onFrom={(v) => setAreaFrom(v as AreaUnit)}
                onTo={(v) => setAreaTo(v as AreaUnit)}
                units={AREA_UNITS}
                result={areaOut}
                fromLabel={t.from}
                toLabel={t.to}
              />
              <ConverterBlock
                label={t.unitVolume}
                value={volumeValue}
                onValue={setVolumeValue}
                from={volumeFrom}
                to={volumeTo}
                onFrom={(v) => setVolumeFrom(v as VolumeUnit)}
                onTo={(v) => setVolumeTo(v as VolumeUnit)}
                units={VOLUME_UNITS}
                result={volumeOut}
                fromLabel={t.from}
                toLabel={t.to}
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* FINANCE & TIPS TAB (PRO SUITE) */}
      <TabsContent value="finance">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Bill Splitter & Tip */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Coins className="size-4 text-primary" />
                {t.billSplitter}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t.billAmount}</label>
                <Input
                  type="number"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  className="font-mono text-base"
                />
              </div>

              {/* Tip Presets */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  {t.tipPercent}: <span className="font-mono font-bold text-primary">{tipPercent}%</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[0, 5, 10, 15, 20].map((pct) => (
                    <Button
                      key={pct}
                      size="sm"
                      variant={tipPercent === pct ? "default" : "outline"}
                      className="h-7 text-xs font-mono"
                      onClick={() => setTipPercent(pct)}
                    >
                      {pct}%
                    </Button>
                  ))}
                  <Input
                    type="number"
                    value={tipPercent}
                    onChange={(e) => setTipPercent(Number(e.target.value) || 0)}
                    className="h-7 w-16 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Number of people */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t.numPeople}</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <Button
                      key={num}
                      size="sm"
                      variant={numPeople === num ? "default" : "outline"}
                      className="h-7 w-8 text-xs font-mono"
                      onClick={() => setNumPeople(num)}
                    >
                      {num}
                    </Button>
                  ))}
                  <Input
                    type="number"
                    min={1}
                    value={numPeople}
                    onChange={(e) => setNumPeople(Number(e.target.value) || 1)}
                    className="h-7 w-16 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Breakdown Cards */}
              <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/20 p-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">{t.totalTip}</p>
                  <p className="font-mono text-sm font-semibold">
                    {tipBreakdown.tipAmount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">{t.totalWithTip}</p>
                  <p className="font-mono text-sm font-semibold">
                    {tipBreakdown.grandTotal.toLocaleString()}
                  </p>
                </div>
                <div className="col-span-2 border-t pt-2 mt-1">
                  <p className="text-xs text-primary font-medium">{t.perPerson}</p>
                  <p className="font-mono text-2xl font-bold text-primary">
                    {Math.round(tipBreakdown.perPerson).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discount Calculator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4 text-primary" />
                {t.discountCalc}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t.originalPrice}</label>
                <Input
                  type="number"
                  value={origPrice}
                  onChange={(e) => setOrigPrice(e.target.value)}
                  className="font-mono text-base"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  {t.discountPercent}: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{discountPercent}%</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[10, 15, 20, 25, 30, 50, 70].map((pct) => (
                    <Button
                      key={pct}
                      size="sm"
                      variant={discountPercent === pct ? "default" : "outline"}
                      className="h-7 text-xs font-mono"
                      onClick={() => setDiscountPercent(pct)}
                    >
                      {pct}%
                    </Button>
                  ))}
                  <Input
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                    className="h-7 w-16 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Discount Results */}
              <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.youSave}:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    -{discountBreakdown.savings.toLocaleString()}
                  </span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">{t.finalPrice}:</span>
                  <span className="font-mono text-2xl font-bold text-primary">
                    {discountBreakdown.finalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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
        className="font-mono text-xs"
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">{fromLabel}</p>
          <Select value={from} onValueChange={onFrom}>
            <SelectTrigger className="h-7 text-xs font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u} value={u} className="text-xs font-mono">
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">{toLabel}</p>
          <Select value={to} onValueChange={onTo}>
            <SelectTrigger className="h-7 text-xs font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u} value={u} className="text-xs font-mono">
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="font-mono text-base font-semibold tabular-nums">{result}</p>
    </div>
  );
}
