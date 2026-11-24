import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";

/* -------------------------------------------------------------
 * 10. DIFF TAB
 * ------------------------------------------------------------- */
export function DiffTab() {
  const { t } = useI18n();
  const [a, setA] = useState(
    "export const version = '0.3.0';\nconsole.log('Starting app...');\nconst debug = false;",
  );
  const [b, setB] = useState(
    "export const version = '0.3.1';\nconsole.log('Starting app...');\nconst debug = true;\nconst verbose = 1;",
  );
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);

  const swap = () => {
    const temp = a;
    setA(b);
    setB(temp);
  };

  const rows = useMemo(() => {
    const la = a.split("\n");
    const lb = b.split("\n");
    const max = Math.max(la.length, lb.length);
    const out: Array<{ n: number; left: string; right: string; same: boolean }> = [];
    for (let i = 0; i < max; i++) {
      const left = la[i] ?? "";
      const right = lb[i] ?? "";
      const isSame = ignoreWhitespace ? left.trim() === right.trim() : left === right;
      out.push({ n: i + 1, left, right, same: isSame });
    }
    return out;
  }, [a, b, ignoreWhitespace]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={swap} className="h-7 text-xs gap-1">
            <ArrowUpDown className="size-3" />
            {t.diffSwap}
          </Button>
          <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={ignoreWhitespace}
              onChange={(e) => setIgnoreWhitespace(e.target.checked)}
              className="rounded"
            />
            <span>{t.diffIgnoreWhitespace}</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setA("");
              setB("");
            }}
            className="h-7 text-xs text-muted-foreground"
          >
            {t.diffClear}
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Textarea
          rows={6}
          value={a}
          onChange={(e) => setA(e.target.value)}
          placeholder="Original (A)"
          className="font-mono text-xs"
        />
        <Textarea
          rows={6}
          value={b}
          onChange={(e) => setB(e.target.value)}
          placeholder="Modified (B)"
          className="font-mono text-xs"
        />
      </div>

      <div className="max-h-64 space-y-0.5 overflow-auto rounded-lg border p-2 font-mono text-xs bg-muted/10">
        {rows.map((r) => (
          <div
            key={r.n}
            className={
              r.same
                ? "grid grid-cols-[2rem_1fr_1fr] gap-2 px-1 py-0.5 text-muted-foreground"
                : "grid grid-cols-[2rem_1fr_1fr] gap-2 bg-destructive/10 text-foreground px-1 py-0.5 rounded"
            }
          >
            <span className="text-muted-foreground/60">{r.n}</span>
            <span className="truncate">{r.left || "∅"}</span>
            <span className="truncate font-semibold">{r.right || "∅"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
