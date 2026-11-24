import { useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
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
import { generateNanoId, generateUuidBatch, generateUuidV4, generateUuidV7 } from "@/lib/devtools";

import { copyText } from "@/components/tools/shared";

/* -------------------------------------------------------------
 * 6. UUID & ID GENERATOR TAB (v4, v7, Batch & NanoID)
 * ------------------------------------------------------------- */
export function UuidTab() {
  const { t } = useI18n();
  const [v4, setV4] = useState(generateUuidV4());
  const [v7, setV7] = useState(generateUuidV7());

  // Batch states
  const [batchCount, setBatchCount] = useState("10");
  const [batchVersion, setBatchVersion] = useState<"v4" | "v7">("v4");
  const [noHyphen, setNoHyphen] = useState(false);
  const [upper, setUpper] = useState(false);
  const [braces, setBraces] = useState(false);
  const [batchResult, setBatchResult] = useState<string[]>([]);

  // NanoID states
  const [nanoid, setNanoid] = useState(() => generateNanoId());
  const [nanoLen, setNanoLen] = useState("21");

  const runBatch = () => {
    const list = generateUuidBatch(Number(batchCount) || 10, {
      version: batchVersion,
      noHyphen,
      uppercase: upper,
      braces,
    });
    setBatchResult(list);
  };

  return (
    <div className="space-y-4">
      {/* Single UUID generation */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 rounded-lg border bg-muted/20 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">UUID v4 (Random)</span>
            <Button
              size="icon"
              variant="ghost"
              className="size-6"
              onClick={() => setV4(generateUuidV4())}
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <Input readOnly value={v4} className="font-mono text-xs h-7" />
            <Button
              size="icon"
              variant="outline"
              className="size-7"
              onClick={() => void copyText(v4, t.copied)}
            >
              <Copy className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5 rounded-lg border bg-muted/20 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              UUID v7 (Timestamp-sorted)
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="size-6"
              onClick={() => setV7(generateUuidV7())}
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <Input readOnly value={v7} className="font-mono text-xs h-7" />
            <Button
              size="icon"
              variant="outline"
              className="size-7"
              onClick={() => void copyText(v7, t.copied)}
            >
              <Copy className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* NanoID / Short ID */}
      <div className="rounded-lg border bg-card p-3 space-y-2">
        <span className="text-xs font-semibold text-muted-foreground">{t.uuidNanoId}</span>
        <div className="flex items-center gap-2">
          <Input readOnly value={nanoid} className="font-mono text-xs h-8" />
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="6"
              max="64"
              value={nanoLen}
              onChange={(e) => setNanoLen(e.target.value)}
              className="w-14 h-8 text-xs font-mono"
              placeholder="Len"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setNanoid(generateNanoId(Number(nanoLen) || 21))}
            >
              <RefreshCw className="size-3.5" />
            </Button>
            <Button size="sm" variant="default" onClick={() => void copyText(nanoid, t.copied)}>
              <Copy className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Batch UUID Generator */}
      <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">{t.uuidBatch}</span>
          <div className="flex items-center gap-2">
            <Select value={batchVersion} onValueChange={(v) => setBatchVersion(v as "v4" | "v7")}>
              <SelectTrigger className="w-20 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="v4">v4</SelectItem>
                <SelectItem value="v7">v7</SelectItem>
              </SelectContent>
            </Select>

            <Select value={batchCount} onValueChange={setBatchCount}>
              <SelectTrigger className="w-20 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={upper}
              onChange={(e) => setUpper(e.target.checked)}
              className="rounded"
            />
            <span>{t.uuidUppercase}</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={noHyphen}
              onChange={(e) => setNoHyphen(e.target.checked)}
              className="rounded"
            />
            <span>{t.uuidNoHyphen}</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={braces}
              onChange={(e) => setBraces(e.target.checked)}
              className="rounded"
            />
            <span>{t.uuidBraces}</span>
          </label>
          <Button size="sm" onClick={runBatch} className="ml-auto h-7 text-xs">
            {t.generateUuid}
          </Button>
        </div>

        {batchResult.length > 0 && (
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">{batchResult.length} UUIDs generated</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void copyText(batchResult.join("\n"), t.copied)}
                  className="text-primary hover:underline text-xs"
                >
                  {t.uuidCopyAll} (Lines)
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => void copyText(JSON.stringify(batchResult, null, 2), t.copied)}
                  className="text-primary hover:underline text-xs"
                >
                  JSON Array
                </button>
              </div>
            </div>
            <Textarea
              rows={6}
              readOnly
              value={batchResult.join("\n")}
              className="font-mono text-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
}
