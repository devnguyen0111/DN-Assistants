import { useMemo, useState } from "react";
import { Copy, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { copyText } from "@/components/tools/shared";
import { slugify } from "@/lib/text";

/** Word/character statistics and slug generation. Case conversion lives in the Utils section. */
export function TextInspectorTab() {
  const { t } = useI18n();
  const [text, setText] = useState("");

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    return {
      words,
      chars: text.length,
      charsNoSpaces: text.replace(/\s+/g, "").length,
      lines: text ? text.split("\n").length : 0,
      readingTimeMins: Math.ceil(words / 200),
    };
  }, [text]);

  const tiles: [string, string | number][] = [
    [t.wordCount, stats.words],
    [t.charCount, stats.chars],
    [t.textCharsNoSpaces, stats.charsNoSpaces],
    [t.textLines, stats.lines],
    [t.readingTime, `~${stats.readingTimeMins}m`],
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-muted/20 p-2.5 text-center font-mono">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{value}</p>
          </div>
        ))}
      </div>

      <Textarea
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t.textInspectorPlaceholder}
        className="font-mono text-xs"
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={!text.trim()}
          onClick={() => setText(slugify(text))}
        >
          <Link2 className="size-3.5" />
          {t.textMakeSlug}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={!text}
          onClick={() => void copyText(text, t.copied)}
          className="ml-auto gap-1.5"
        >
          <Copy className="size-3.5" />
          {t.copy}
        </Button>
      </div>
    </div>
  );
}
