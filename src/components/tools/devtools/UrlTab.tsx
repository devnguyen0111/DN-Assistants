import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import {
  parseUrlDetails,
  reconstructUrl,
  urlDecode,
  urlEncode,
  type UrlParam,
} from "@/lib/devtools";

import { copyText } from "@/components/tools/shared";

/* -------------------------------------------------------------
 * 3. URL TAB (URL Encoder / Decoder & URL Inspector with Query params)
 * ------------------------------------------------------------- */
export function UrlTab() {
  const { t } = useI18n();
  const [urlInput, setUrlInput] = useState(
    "https://api.github.com/repos/tauri-apps/tauri?page=1&per_page=30&sort=stars#readme",
  );
  const [details, setDetails] = useState(() => parseUrlDetails(urlInput));

  useEffect(() => {
    setDetails(parseUrlDetails(urlInput));
  }, [urlInput]);

  const updateParam = (id: string, field: "key" | "value" | "enabled", val: string | boolean) => {
    setDetails((prev) => {
      const nextParams = prev.params.map((p) => (p.id === id ? { ...p, [field]: val } : p));
      const nextUrl = reconstructUrl({ ...prev, params: nextParams });
      setUrlInput(nextUrl);
      return { ...prev, params: nextParams };
    });
  };

  const addParam = () => {
    const newParam: UrlParam = {
      id: Math.random().toString(36).slice(2, 9),
      key: "key",
      value: "value",
      enabled: true,
    };
    const nextParams = [...details.params, newParam];
    const nextUrl = reconstructUrl({ ...details, params: nextParams });
    setUrlInput(nextUrl);
  };

  const deleteParam = (id: string) => {
    const nextParams = details.params.filter((p) => p.id !== id);
    const nextUrl = reconstructUrl({ ...details, params: nextParams });
    setUrlInput(nextUrl);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>{t.urlInspector}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUrlInput(urlEncode(urlInput))}
              className="hover:text-primary underline text-[11px]"
            >
              {t.urlEncode}
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setUrlInput(urlDecode(urlInput))}
              className="hover:text-primary underline text-[11px]"
            >
              {t.urlDecode}
            </button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs ml-2"
              onClick={() => void copyText(urlInput, t.copied)}
            >
              <Copy className="size-3" />
              {t.copy}
            </Button>
          </div>
        </div>
        <Input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          className="font-mono text-xs"
          placeholder="https://example.com/path?foo=bar#hash"
        />
      </div>

      {details.valid ? (
        <div className="space-y-3 rounded-lg border bg-muted/15 p-3 text-xs">
          {/* URL Structure breakdown */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 font-mono text-[11px]">
            <div className="rounded border bg-background p-1.5">
              <span className="text-muted-foreground block text-[10px]">Protocol</span>
              <span className="font-semibold text-primary">{details.protocol}</span>
            </div>
            <div className="rounded border bg-background p-1.5">
              <span className="text-muted-foreground block text-[10px]">Host</span>
              <span className="font-semibold truncate block">{details.hostname}</span>
            </div>
            <div className="rounded border bg-background p-1.5">
              <span className="text-muted-foreground block text-[10px]">Path</span>
              <span className="font-semibold truncate block">{details.pathname || "/"}</span>
            </div>
            <div className="rounded border bg-background p-1.5">
              <span className="text-muted-foreground block text-[10px]">Hash</span>
              <span className="font-semibold truncate block">{details.hash || "—"}</span>
            </div>
          </div>

          {/* Interactive Query Parameters Editor */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs">
                {t.urlQueryParams} ({details.params.length})
              </span>
              <Button size="sm" variant="outline" onClick={addParam} className="h-6 px-2 text-xs">
                + {t.urlAddParam}
              </Button>
            </div>

            {details.params.length === 0 ? (
              <p className="text-[11px] text-muted-foreground py-2 text-center">{t.urlNoParams}</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-auto">
                {details.params.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5 font-mono">
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={(e) => updateParam(p.id, "enabled", e.target.checked)}
                      className="rounded size-3.5"
                    />
                    <Input
                      value={p.key}
                      onChange={(e) => updateParam(p.id, "key", e.target.value)}
                      placeholder="Key"
                      className="h-7 text-xs font-semibold"
                    />
                    <span className="text-muted-foreground">=</span>
                    <Input
                      value={p.value}
                      onChange={(e) => updateParam(p.id, "value", e.target.value)}
                      placeholder="Value"
                      className="h-7 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteParam(p.id)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        details.error && <p className="text-xs text-destructive">{details.error}</p>
      )}
    </div>
  );
}
