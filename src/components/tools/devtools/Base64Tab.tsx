import { useRef, useState, type ChangeEvent } from "react";
import { Copy, Download, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { base64Decode, base64Encode } from "@/lib/devtools";

import { copyText } from "@/components/tools/shared";

/* -------------------------------------------------------------
 * 2. BASE64 TAB (Text & File/Image to Base64)
 * ------------------------------------------------------------- */
export function Base64Tab() {
  const { t } = useI18n();
  const [subMode, setSubMode] = useState<"text" | "file">("text");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [urlSafe, setUrlSafe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File upload state
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; type: string } | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const encode = () => {
    try {
      setOutput(base64Encode(input, urlSafe));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const decode = () => {
    try {
      setOutput(base64Decode(input));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileInfo({ name: file.name, size: file.size, type: file.type });
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      setFileDataUrl(res);
      toast.success(t.copied);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b pb-2">
        <button
          type="button"
          onClick={() => setSubMode("text")}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            subMode === "text"
              ? "bg-primary text-primary-foreground font-semibold"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Text Base64
        </button>
        <button
          type="button"
          onClick={() => setSubMode("file")}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            subMode === "file"
              ? "bg-primary text-primary-foreground font-semibold"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <ImageIcon className="size-3.5" />
          {t.base64File}
        </button>
      </div>

      {subMode === "text" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{t.input}</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={urlSafe}
                  onChange={(e) => setUrlSafe(e.target.checked)}
                  className="rounded text-xs"
                />
                <span>URL-safe</span>
              </label>
            </div>
            <Textarea
              rows={10}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="font-mono text-xs"
              placeholder={t.b64Placeholder}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={encode}>
                {t.base64Encode}
              </Button>
              <Button size="sm" variant="outline" onClick={decode}>
                {t.base64Decode}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
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
              rows={10}
              readOnly
              value={error ?? output}
              className={`font-mono text-xs ${error ? "border-destructive text-destructive" : ""}`}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.txt,.json"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl border-muted-foreground/30 hover:border-primary/50 cursor-pointer bg-muted/10 transition-colors"
          >
            <ImageIcon className="size-8 text-muted-foreground mb-2" />
            <p className="text-xs font-semibold text-foreground">{t.base64UploadPrompt}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t.b64ImageFormats}</p>
          </div>

          {fileDataUrl && fileInfo && (
            <div className="space-y-3 rounded-lg border bg-card p-3 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">{fileInfo.name}</span>
                <Badge variant="outline">
                  {(fileInfo.size / 1024).toFixed(1)} KB ({fileInfo.type || "file"})
                </Badge>
              </div>

              {fileInfo.type.startsWith("image/") && (
                <div className="flex justify-center rounded border bg-muted/20 p-2">
                  <img
                    src={fileDataUrl}
                    alt="Preview"
                    className="max-h-40 rounded object-contain"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => void copyText(fileDataUrl, t.copied)}
                  className="gap-1.5"
                >
                  <Copy className="size-3.5" />
                  {t.base64DataUri}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const rawB64 = fileDataUrl.split(",")[1] ?? fileDataUrl;
                    void copyText(rawB64, t.copied);
                  }}
                  className="gap-1.5"
                >
                  <Copy className="size-3.5" />
                  Raw Base64
                </Button>
                <a
                  href={fileDataUrl}
                  download={`download-${fileInfo.name}`}
                  className="inline-flex items-center gap-1 text-xs border rounded-md px-3 py-1.5 bg-muted/40 hover:bg-muted font-medium"
                >
                  <Download className="size-3.5" />
                  {t.base64DownloadImage}
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
