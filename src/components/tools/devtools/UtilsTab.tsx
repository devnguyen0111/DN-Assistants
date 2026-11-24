import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import {
  convertCase,
  convertCssUnits,
  decodeHtmlEntities,
  encodeHtmlEntities,
  generateLoremIpsum,
  type CaseType,
  type CssUnit,
} from "@/lib/devtools";

import { copyText } from "@/components/tools/shared";

/* -------------------------------------------------------------
 * 11. CODE & TEXT UTILITIES TAB (HTML Entities, CSS units, Text Case, Lorem)
 * ------------------------------------------------------------- */
export function UtilsTab() {
  const { t } = useI18n();

  // Case Converter state
  const [caseInput, setCaseInput] = useState("hello world from developer tools");
  const cases: CaseType[] = [
    "camel",
    "pascal",
    "snake",
    "kebab",
    "constant",
    "title",
    "upper",
    "lower",
  ];

  // HTML entities state
  const [htmlInput, setHtmlInput] = useState('<div class="title">Hello & Welcome!</div>');
  const [htmlOutput, setHtmlOutput] = useState("");

  // CSS Units state
  const [cssVal, setCssVal] = useState("16");
  const [cssFrom, setCssFrom] = useState<CssUnit>("px");
  const [cssTo, setCssTo] = useState<CssUnit>("rem");
  const [basePx, setBasePx] = useState("16");

  // Lorem state
  const [loremCount, setLoremCount] = useState("2");
  const [loremType, setLoremType] = useState<"paragraphs" | "sentences" | "words">("paragraphs");
  const [loremResult, setLoremResult] = useState(() => generateLoremIpsum(2, "paragraphs"));

  const convertedCss = useMemo(() => {
    const num = parseFloat(cssVal);
    if (!Number.isFinite(num)) return 0;
    return convertCssUnits(num, cssFrom, cssTo, Number(basePx) || 16);
  }, [cssVal, cssFrom, cssTo, basePx]);

  return (
    <div className="space-y-4">
      {/* 1. Case Converter */}
      <div className="rounded-lg border bg-card p-3 space-y-2">
        <span className="text-xs font-semibold">{t.codeCaseConverter}</span>
        <Input
          value={caseInput}
          onChange={(e) => setCaseInput(e.target.value)}
          placeholder={t.textInspectorPlaceholder}
          className="text-xs font-mono"
        />
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 pt-1 font-mono text-[11px]">
          {cases.map((c) => {
            const converted = convertCase(caseInput, c);
            return (
              <div
                key={c}
                onClick={() => void copyText(converted, t.copied)}
                className="flex flex-col rounded border bg-muted/20 p-1.5 cursor-pointer hover:bg-primary/10 hover:border-primary/40 transition-colors"
              >
                <span className="text-[10px] text-muted-foreground uppercase">{c}</span>
                <span className="truncate font-semibold text-foreground">{converted || "—"}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. HTML Entities & CSS Units side by side */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* HTML Entities */}
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <span className="text-xs font-semibold">{t.codeHtmlEntities}</span>
          <Input
            value={htmlInput}
            onChange={(e) => setHtmlInput(e.target.value)}
            placeholder="<html>..."
            className="text-xs font-mono"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setHtmlOutput(encodeHtmlEntities(htmlInput))}>
              Encode
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setHtmlOutput(decodeHtmlEntities(htmlInput))}
            >
              Decode
            </Button>
          </div>
          {htmlOutput && (
            <div className="flex items-center gap-1.5 pt-1">
              <Input readOnly value={htmlOutput} className="font-mono text-xs h-8" />
              <Button
                size="icon"
                variant="outline"
                className="size-8"
                onClick={() => void copyText(htmlOutput, t.copied)}
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* CSS Units */}
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <span className="text-xs font-semibold">{t.codeCssUnits}</span>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              value={cssVal}
              onChange={(e) => setCssVal(e.target.value)}
              className="w-20 text-xs font-mono"
            />
            <Select value={cssFrom} onValueChange={(v) => setCssFrom(v as CssUnit)}>
              <SelectTrigger className="w-20 text-xs font-mono h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="px">px</SelectItem>
                <SelectItem value="rem">rem</SelectItem>
                <SelectItem value="em">em</SelectItem>
                <SelectItem value="pt">pt</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">=</span>
            <span className="font-mono font-bold text-primary text-sm flex-1 truncate">
              {Number(convertedCss.toFixed(4))} {cssTo}
            </span>
            <Select value={cssTo} onValueChange={(v) => setCssTo(v as CssUnit)}>
              <SelectTrigger className="w-20 text-xs font-mono h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="px">px</SelectItem>
                <SelectItem value="rem">rem</SelectItem>
                <SelectItem value="em">em</SelectItem>
                <SelectItem value="pt">pt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>{t.codeBaseFontSize}:</span>
            <Input
              type="number"
              value={basePx}
              onChange={(e) => setBasePx(e.target.value)}
              className="w-16 h-6 text-[11px] font-mono"
            />
          </div>
        </div>
      </div>

      {/* 3. Lorem Ipsum Generator */}
      <div className="rounded-lg border bg-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">{t.codeLoremIpsum}</span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              max="50"
              value={loremCount}
              onChange={(e) => setLoremCount(e.target.value)}
              className="w-16 h-7 text-xs font-mono"
            />
            <Select
              value={loremType}
              onValueChange={(v) => setLoremType(v as "paragraphs" | "sentences" | "words")}
            >
              <SelectTrigger className="w-28 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paragraphs">{t.codeParagraphs}</SelectItem>
                <SelectItem value="sentences">{t.codeSentences}</SelectItem>
                <SelectItem value="words">{t.codeWords}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => setLoremResult(generateLoremIpsum(Number(loremCount) || 2, loremType))}
              className="h-7 text-xs"
            >
              {t.codeGenerateLorem}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void copyText(loremResult, t.copied)}
              className="h-7 text-xs"
            >
              <Copy className="size-3" />
            </Button>
          </div>
        </div>
        <Textarea rows={4} readOnly value={loremResult} className="font-mono text-xs" />
      </div>
    </div>
  );
}
