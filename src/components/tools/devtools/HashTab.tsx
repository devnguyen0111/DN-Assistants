import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
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
import { hashText, hmacText, md5, type HashAlgo } from "@/lib/devtools";

import { copyText } from "@/components/tools/shared";

/* -------------------------------------------------------------
 * 5. HASH & HMAC TAB
 * ------------------------------------------------------------- */
export function HashTab() {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"hash" | "hmac">("hash");
  const [algo, setAlgo] = useState<HashAlgo | "MD5">("SHA-256");
  const [secret, setSecret] = useState("");
  const [uppercase, setUppercase] = useState(false);
  const [output, setOutput] = useState("");

  const run = async () => {
    try {
      if (mode === "hash") {
        if (algo === "MD5") {
          setOutput(md5(input, uppercase));
        } else {
          setOutput(await hashText(input, algo, uppercase));
        }
      } else {
        if (!secret) {
          toast.error("Please enter a secret key for HMAC");
          return;
        }
        setOutput(
          await hmacText(input, secret, algo === "SHA-512" ? "SHA-512" : "SHA-256", uppercase),
        );
      }
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-3">
      <Textarea
        rows={4}
        placeholder={t.input}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="font-mono text-xs"
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border bg-muted/30 p-0.5">
          <button
            type="button"
            onClick={() => setMode("hash")}
            className={`px-2 py-1 text-xs rounded font-medium ${mode === "hash" ? "bg-background shadow-xs font-semibold" : "text-muted-foreground"}`}
          >
            Standard Hash
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("hmac");
              if (algo === "MD5" || algo === "SHA-1") setAlgo("SHA-256");
            }}
            className={`px-2 py-1 text-xs rounded font-medium ${mode === "hmac" ? "bg-background shadow-xs font-semibold" : "text-muted-foreground"}`}
          >
            HMAC
          </button>
        </div>

        <Select value={algo} onValueChange={(v) => setAlgo(v as HashAlgo | "MD5")}>
          <SelectTrigger className="w-32 h-8 text-xs font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {mode === "hash" && <SelectItem value="MD5">MD5</SelectItem>}
            {mode === "hash" && <SelectItem value="SHA-1">SHA-1</SelectItem>}
            <SelectItem value="SHA-256">SHA-256</SelectItem>
            <SelectItem value="SHA-512">SHA-512</SelectItem>
          </SelectContent>
        </Select>

        {mode === "hmac" && (
          <Input
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={t.hashHmacSecret}
            className="h-8 w-40 text-xs font-mono"
          />
        )}

        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={uppercase}
            onChange={(e) => setUppercase(e.target.checked)}
            className="rounded size-3.5"
          />
          <span>{t.hashUpper}</span>
        </label>

        <Button size="sm" onClick={() => void run()} className="ml-auto">
          {t.hash}
        </Button>
      </div>

      {output && (
        <div className="flex items-center gap-2">
          <Input readOnly value={output} className="font-mono text-xs" />
          <Button size="icon" variant="outline" onClick={() => void copyText(output, t.copied)}>
            <Copy className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
