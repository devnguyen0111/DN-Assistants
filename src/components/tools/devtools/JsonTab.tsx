import { useState } from "react";
import { Code2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import {
  escapeJsonString,
  formatJson,
  jsonToTypeScript,
  minifyJson,
  unescapeJsonString,
} from "@/lib/devtools";

import { copyText } from "@/components/tools/shared";

/* -------------------------------------------------------------
 * 1. JSON TAB
 * ------------------------------------------------------------- */
export function JsonTab() {
  const { t } = useI18n();
  const [input, setInput] = useState(
    '{\n  "title": "DN Assistant",\n  "version": "0.3.0",\n  "enabled": true,\n  "features": ["currency", "devtools", "soundscape"]\n}',
  );
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const format = (indent = 2) => {
    const result = formatJson(input, indent);
    if (result.ok) {
      setOutput(result.formatted);
      setError(null);
    } else {
      setError(result.error);
      setOutput("");
    }
  };

  const minify = () => {
    const result = minifyJson(input);
    if (result.ok) {
      setOutput(result.formatted);
      setError(null);
    } else {
      setError(result.error);
      setOutput("");
    }
  };

  const toTypeScript = () => {
    const result = jsonToTypeScript(input, "ApiResponse");
    if (result.ok) {
      setOutput(result.code);
      setError(null);
    } else {
      setError(result.error);
      setOutput("");
    }
  };

  const escapeStr = () => {
    setOutput(escapeJsonString(input));
    setError(null);
  };

  const unescapeStr = () => {
    setOutput(unescapeJsonString(input));
    setError(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 pb-1">
        <Button size="sm" variant="default" onClick={() => format(2)}>
          {t.jsonFormat}
        </Button>
        <Button size="sm" variant="outline" onClick={minify}>
          {t.jsonMinify}
        </Button>
        <Button size="sm" variant="outline" onClick={toTypeScript} className="gap-1">
          <Code2 className="size-3.5 text-primary" />
          {t.jsonToTs}
        </Button>
        <Button size="sm" variant="ghost" onClick={escapeStr}>
          {t.jsonEscape}
        </Button>
        <Button size="sm" variant="ghost" onClick={unescapeStr}>
          {t.jsonUnescape}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setInput("");
            setOutput("");
            setError(null);
          }}
          className="ml-auto text-xs text-muted-foreground"
        >
          {t.diffClear}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t.input}</span>
            <span>{input.length} chars</span>
          </div>
          <Textarea
            rows={14}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="font-mono text-xs"
            placeholder="Paste JSON here..."
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t.output}</span>
            {output && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={() => void copyText(output, t.copied)}
              >
                <Copy className="size-3" />
                {t.copy}
              </Button>
            )}
          </div>
          <Textarea
            rows={14}
            readOnly
            value={error ? `${t.invalidJson}: ${error}` : output}
            className={`font-mono text-xs ${error ? "border-destructive text-destructive bg-destructive/5" : ""}`}
            placeholder={t.resultPlaceholder}
          />
        </div>
      </div>
    </div>
  );
}
