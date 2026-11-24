import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { COMMON_REGEX_PRESETS, replaceRegex, testRegex } from "@/lib/devtools";

import { copyText } from "@/components/tools/shared";

/* -------------------------------------------------------------
 * 8. REGEX TESTER TAB (Highlighting, Presets, Replace)
 * ------------------------------------------------------------- */
export function RegexTab() {
  const { t } = useI18n();
  const [pattern, setPattern] = useState("(\\w+)@([a-z0-9.]+)\\.([a-z]{2,})");
  const [flags, setFlags] = useState("gi");
  const [text, setText] = useState(
    "Contact us at support@example.com or sales@company.org for assistance.",
  );
  const [replacement, setReplacement] = useState("[$1]@masked.com");

  const { matches, error } = useMemo(() => {
    if (!pattern) return { matches: [], error: null as string | null };
    try {
      return { matches: testRegex(pattern, flags, text), error: null as string | null };
    } catch (err) {
      return { matches: [], error: err instanceof Error ? err.message : String(err) };
    }
  }, [pattern, flags, text]);

  const replacedOutput = useMemo(() => {
    if (!pattern) return text;
    const res = replaceRegex(pattern, flags, text, replacement);
    return res.ok ? res.result : "";
  }, [pattern, flags, text, replacement]);

  return (
    <div className="space-y-3">
      {/* Presets Chips */}
      <div className="flex flex-wrap items-center gap-1 pb-1">
        <span className="text-xs text-muted-foreground mr-1">{t.regexPresets}:</span>
        {COMMON_REGEX_PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => {
              setPattern(p.pattern);
              setFlags(p.flags);
            }}
            className="rounded border bg-muted/40 px-2 py-0.5 text-[11px] font-medium hover:bg-primary/10 hover:text-primary transition-colors"
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Pattern and Flags Input */}
      <div className="flex gap-2">
        <Input
          placeholder={t.pattern}
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          className="flex-1 font-mono text-xs"
        />
        <Input
          placeholder={t.flags}
          value={flags}
          onChange={(e) => setFlags(e.target.value)}
          className="w-20 font-mono text-xs"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t.input}</span>
            <Badge variant="secondary" className="text-[10px] h-4">
              {matches.length} {t.output.toLowerCase()}
            </Badge>
          </div>
          <Textarea
            rows={7}
            placeholder={t.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t.regexReplace}</span>
            {replacedOutput && (
              <Button
                size="sm"
                variant="ghost"
                className="h-5 px-1.5 text-[11px]"
                onClick={() => void copyText(replacedOutput, t.copied)}
              >
                <Copy className="size-3" />
              </Button>
            )}
          </div>
          <Input
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            placeholder={t.regexReplacement}
            className="font-mono text-xs mb-1.5"
          />
          <Textarea
            rows={5}
            readOnly
            value={replacedOutput}
            className="font-mono text-xs bg-muted/20"
            placeholder={t.regexResult}
          />
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Matches List */}
      {matches.length > 0 && (
        <div className="rounded-lg border bg-muted/20 p-2 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground mb-1">
            Matches ({matches.length})
          </p>
          <div className="max-h-36 space-y-1 overflow-auto">
            {matches.map((m, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded bg-background px-2 py-1 font-mono text-xs"
              >
                <span>
                  <span className="text-primary font-bold">[{m.index}]</span> {m.match}
                </span>
                {m.groups.length > 0 && (
                  <span className="text-muted-foreground text-[11px]">({m.groups.join(", ")})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
