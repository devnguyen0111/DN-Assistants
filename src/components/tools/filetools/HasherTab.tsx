import { useId, useMemo, useState } from "react";
import { CheckCircle2, Copy, FileDigit, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { formatBytes } from "@/lib/utils";

import { copyText, computeHash } from "@/components/tools/shared";

/* =========================================================================
   1. HASHER TAB
   ========================================================================= */
export function HasherTab() {
  const { t } = useI18n();
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [computing, setComputing] = useState(false);
  const [sha256, setSha256] = useState("");
  const [sha1, setSha1] = useState("");
  const [sha512, setSha512] = useState("");
  const [verifyInput, setVerifyInput] = useState("");

  const processFile = async (f: File) => {
    setFile(f);
    setComputing(true);
    setSha256("");
    setSha1("");
    setSha512("");

    try {
      const buffer = await f.arrayBuffer();
      const [h256, h1, h512] = await Promise.all([
        computeHash(buffer, "SHA-256"),
        computeHash(buffer, "SHA-1"),
        computeHash(buffer, "SHA-512"),
      ]);
      setSha256(h256);
      setSha1(h1);
      setSha512(h512);
    } catch {
      toast.error("Failed to compute hash");
    } finally {
      setComputing(false);
    }
  };

  const isMatch = useMemo(() => {
    const clean = verifyInput.trim().toLowerCase();
    if (!clean) return null;
    return (
      clean === sha256.toLowerCase() ||
      clean === sha1.toLowerCase() ||
      clean === sha512.toLowerCase()
    );
  }, [verifyInput, sha256, sha1, sha512]);

  return (
    <div className="space-y-4">
      <label
        htmlFor={inputId}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = e.dataTransfer.files[0];
          if (dropped) void processFile(dropped);
        }}
        className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/20 p-6 text-center transition-colors hover:bg-muted/40"
      >
        <input
          id={inputId}
          type="file"
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) void processFile(picked);
          }}
        />

        {file ? (
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{file.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            <p className="text-xs text-primary">{t.fileDropReplace}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileDigit className="size-5" />
            </div>
            <p className="text-sm font-medium">{t.dropFileToCheck}</p>
            <p className="text-xs text-muted-foreground">Any file format up to 500MB</p>
          </div>
        )}
      </label>

      {computing && (
        <p className="text-center text-xs text-muted-foreground">Computing checksums...</p>
      )}

      {sha256 && (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">SHA-256</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 gap-1 px-1.5 text-[11px]"
                  onClick={() => void copyText(sha256, t.copied)}
                >
                  <Copy className="size-3" />
                  Copy
                </Button>
              </div>
              <Input readOnly value={sha256} className="font-mono text-xs" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">SHA-1</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 gap-1 px-1.5 text-[11px]"
                  onClick={() => void copyText(sha1, t.copied)}
                >
                  <Copy className="size-3" />
                  Copy
                </Button>
              </div>
              <Input readOnly value={sha1} className="font-mono text-xs" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">SHA-512</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 gap-1 px-1.5 text-[11px]"
                  onClick={() => void copyText(sha512, t.copied)}
                >
                  <Copy className="size-3" />
                  Copy
                </Button>
              </div>
              <Input readOnly value={sha512} className="font-mono text-xs" />
            </div>
          </div>

          <div className="pt-2 border-t space-y-2">
            <Label className="text-xs">{t.hashCompareExpected}</Label>
            <div className="flex items-center gap-2">
              <Input
                placeholder={t.compareHashPlaceholder}
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                className="font-mono text-xs"
              />
              {isMatch === true && (
                <Badge className="bg-emerald-500 text-white gap-1 shrink-0">
                  <CheckCircle2 className="size-3.5" />
                  {t.hashMatch}
                </Badge>
              )}
              {isMatch === false && (
                <Badge variant="destructive" className="gap-1 shrink-0">
                  <XCircle className="size-3.5" />
                  {t.hashMismatch}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
