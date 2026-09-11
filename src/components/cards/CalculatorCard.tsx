import { useCallback, useEffect, useState } from "react";
import { Delete, Equal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { evaluate, formatResult } from "@/lib/calculator";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type HistoryItem = { expression: string; result: string };

const KEYS = [
  ["C", "CE", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "-"],
  ["1", "2", "3", "+"],
  ["±", "0", ".", "="],
] as const;

export function CalculatorCard() {
  const { t } = useI18n();
  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [fresh, setFresh] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const inputDigit = useCallback((digit: string) => {
    setDisplay((prev) => {
      if (fresh || prev === "0" || prev === "Error") {
        setFresh(false);
        return digit === "." ? "0." : digit;
      }
      if (digit === "." && prev.includes(".")) return prev;
      return prev + digit;
    });
  }, [fresh]);

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
      setHistory((prev) => [{ expression: full, result }, ...prev].slice(0, 12));
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

  return (
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
            <p className="min-h-5 truncate text-xs text-muted-foreground">{expression || "\u00A0"}</p>
            <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight">{display}</p>
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
          <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">{t.history}</p>
          <ScrollArea className="h-[240px] pr-2">
            <div className="space-y-2">
              {history.length === 0 && (
                <p className="px-1 text-xs text-muted-foreground">—</p>
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
                  <p className="truncate font-mono text-xs text-muted-foreground">{item.expression}</p>
                  <p className="font-mono text-sm font-medium">= {item.result}</p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
