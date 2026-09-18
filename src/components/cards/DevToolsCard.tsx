import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowUpDown,
  Code2,
  Copy,
  Download,
  Image as ImageIcon,
  QrCode,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import {
  base64Decode,
  base64Encode,
  COMMON_REGEX_PRESETS,
  convertCase,
  convertCssUnits,
  decodeHtmlEntities,
  decodeJwt,
  encodeHtmlEntities,
  escapeJsonString,
  formatJson,
  formatTimestampLocal,
  generateLoremIpsum,
  generateNanoId,
  generateUuidBatch,
  generateUuidV4,
  generateUuidV7,
  getRelativeTime,
  hashText,
  hmacText,
  jsonToTypeScript,
  md5,
  minifyJson,
  parseUrlDetails,
  reconstructUrl,
  replaceRegex,
  testRegex,
  unescapeJsonString,
  urlDecode,
  urlEncode,
  WORLD_TIMEZONES,
  type CaseType,
  type CssUnit,
  type HashAlgo,
  type UrlParam,
} from "@/lib/devtools";

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : String(err));
  }
}

export function DevToolsCard() {
  const { t } = useI18n();

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Code2 className="size-4 text-primary" />
          {t.devToolsTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="json" className="w-full">
          <TabsList className="flex-wrap h-auto gap-1 p-1 bg-muted/40">
            <TabsTrigger value="json" className="text-xs">JSON</TabsTrigger>
            <TabsTrigger value="base64" className="text-xs">Base64</TabsTrigger>
            <TabsTrigger value="url" className="text-xs">URL</TabsTrigger>
            <TabsTrigger value="jwt" className="text-xs">JWT</TabsTrigger>
            <TabsTrigger value="hash" className="text-xs">{t.hash}</TabsTrigger>
            <TabsTrigger value="uuid" className="text-xs">{t.uuid}</TabsTrigger>
            <TabsTrigger value="qr" className="text-xs">{t.qrCode}</TabsTrigger>
            <TabsTrigger value="regex" className="text-xs">{t.regexTester}</TabsTrigger>
            <TabsTrigger value="time" className="text-xs">Time</TabsTrigger>
            <TabsTrigger value="diff" className="text-xs">Diff</TabsTrigger>
            <TabsTrigger value="utils" className="text-xs gap-1">
              <Wand2 className="size-3 text-primary" />
              {t.codeUtils}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="json" className="pt-2">
            <JsonTab />
          </TabsContent>
          <TabsContent value="base64" className="pt-2">
            <Base64Tab />
          </TabsContent>
          <TabsContent value="url" className="pt-2">
            <UrlTab />
          </TabsContent>
          <TabsContent value="jwt" className="pt-2">
            <JwtTab />
          </TabsContent>
          <TabsContent value="hash" className="pt-2">
            <HashTab />
          </TabsContent>
          <TabsContent value="uuid" className="pt-2">
            <UuidTab />
          </TabsContent>
          <TabsContent value="qr" className="pt-2">
            <QrTab />
          </TabsContent>
          <TabsContent value="regex" className="pt-2">
            <RegexTab />
          </TabsContent>
          <TabsContent value="time" className="pt-2">
            <TimeTab />
          </TabsContent>
          <TabsContent value="diff" className="pt-2">
            <DiffTab />
          </TabsContent>
          <TabsContent value="utils" className="pt-2">
            <UtilsTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------
 * 1. JSON TAB
 * ------------------------------------------------------------- */
function JsonTab() {
  const { t } = useI18n();
  const [input, setInput] = useState('{\n  "title": "DN Assistant",\n  "version": "0.3.0",\n  "enabled": true,\n  "features": ["currency", "devtools", "soundscape"]\n}');
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
            placeholder="Result will appear here..."
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 2. BASE64 TAB (Text & File/Image to Base64)
 * ------------------------------------------------------------- */
function Base64Tab() {
  const { t } = useI18n();
  const [subMode, setSubMode] = useState<"text" | "file">("text");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [urlSafe, setUrlSafe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File upload state
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; type: string } | null>(null);
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
            subMode === "text" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Text Base64
        </button>
        <button
          type="button"
          onClick={() => setSubMode("file")}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            subMode === "file" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted"
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
              placeholder="String to encode or base64 to decode..."
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
            <p className="text-[11px] text-muted-foreground mt-0.5">Supports PNG, JPG, SVG, WebP, GIF</p>
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
                  <img src={fileDataUrl} alt="Preview" className="max-h-40 rounded object-contain" />
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

/* -------------------------------------------------------------
 * 3. URL TAB (URL Encoder / Decoder & URL Inspector with Query params)
 * ------------------------------------------------------------- */
function UrlTab() {
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
              <span className="font-semibold text-xs">{t.urlQueryParams} ({details.params.length})</span>
              <Button size="sm" variant="outline" onClick={addParam} className="h-6 px-2 text-xs">
                + {t.urlAddParam}
              </Button>
            </div>

            {details.params.length === 0 ? (
              <p className="text-[11px] text-muted-foreground py-2 text-center">No query parameters found.</p>
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

/* -------------------------------------------------------------
 * 4. JWT TAB (Inspector & Token status)
 * ------------------------------------------------------------- */
function JwtTab() {
  const { t } = useI18n();
  const sampleToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldk5ndXllbiIsImVtYWlsIjoiZGV2QGV4YW1wbGUuY29tIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxODk5OTk5OTk5fQ.signature";
  const [token, setToken] = useState(sampleToken);
  const [decoded, setDecoded] = useState<ReturnType<typeof decodeJwt> | null>(() => {
    try {
      return decodeJwt(sampleToken);
    } catch {
      return null;
    }
  });
  const [error, setError] = useState<string | null>(null);

  const runDecode = () => {
    try {
      setDecoded(decodeJwt(token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDecoded(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>{t.input} (JWT Token)</span>
          <Button size="sm" variant="ghost" onClick={() => setToken(sampleToken)} className="h-5 px-1.5 text-[11px]">
            {t.diffSample}
          </Button>
        </div>
        <Textarea
          rows={3}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="font-mono text-xs"
          placeholder="eyJhbGci..."
        />
        <Button size="sm" onClick={runDecode}>
          {t.jwtDecode}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {decoded && (
        <div className="space-y-3 rounded-lg border bg-muted/15 p-3">
          {/* Token Status Badge & Expiry Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">{t.jwtTokenStatus}:</span>
              {decoded.isExpired === null ? (
                <Badge variant="outline">{t.jwtNoExp}</Badge>
              ) : decoded.isExpired ? (
                <Badge variant="destructive" className="gap-1">
                  <ShieldAlert className="size-3" />
                  {t.jwtExpired}
                </Badge>
              ) : (
                <Badge variant="default" className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                  <ShieldCheck className="size-3" />
                  {t.jwtActive}
                  {decoded.expiresInSeconds != null && (
                    <span className="ml-1 text-[10px] opacity-90">
                      ({Math.floor(decoded.expiresInSeconds / 60)}m left)
                    </span>
                  )}
                </Badge>
              )}
            </div>

            {decoded.issuedAt && (
              <span className="text-[11px] text-muted-foreground">
                Issued: {decoded.issuedAt.toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Header & Payload View */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold">{t.jwtHeader}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1.5 text-[11px]"
                  onClick={() => void copyText(JSON.stringify(decoded.header, null, 2), t.copied)}
                >
                  <Copy className="size-3" />
                </Button>
              </div>
              <pre className="max-h-52 overflow-auto rounded bg-background p-2 font-mono text-[11px] border">
                {JSON.stringify(decoded.header, null, 2)}
              </pre>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold">{t.jwtPayload}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1.5 text-[11px]"
                  onClick={() => void copyText(JSON.stringify(decoded.payload, null, 2), t.copied)}
                >
                  <Copy className="size-3" />
                </Button>
              </div>
              <pre className="max-h-52 overflow-auto rounded bg-background p-2 font-mono text-[11px] border">
                {JSON.stringify(decoded.payload, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------
 * 5. HASH & HMAC TAB
 * ------------------------------------------------------------- */
function HashTab() {
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
        setOutput(await hmacText(input, secret, algo === "SHA-512" ? "SHA-512" : "SHA-256", uppercase));
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

/* -------------------------------------------------------------
 * 6. UUID & ID GENERATOR TAB (v4, v7, Batch & NanoID)
 * ------------------------------------------------------------- */
function UuidTab() {
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
            <Button size="icon" variant="ghost" className="size-6" onClick={() => setV4(generateUuidV4())}>
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <Input readOnly value={v4} className="font-mono text-xs h-7" />
            <Button size="icon" variant="outline" className="size-7" onClick={() => void copyText(v4, t.copied)}>
              <Copy className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5 rounded-lg border bg-muted/20 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">UUID v7 (Timestamp-sorted)</span>
            <Button size="icon" variant="ghost" className="size-6" onClick={() => setV7(generateUuidV7())}>
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <Input readOnly value={v7} className="font-mono text-xs h-7" />
            <Button size="icon" variant="outline" className="size-7" onClick={() => void copyText(v7, t.copied)}>
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
            <input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} className="rounded" />
            <span>{t.uuidUppercase}</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={noHyphen} onChange={(e) => setNoHyphen(e.target.checked)} className="rounded" />
            <span>{t.uuidNoHyphen}</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={braces} onChange={(e) => setBraces(e.target.checked)} className="rounded" />
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
            <Textarea rows={6} readOnly value={batchResult.join("\n")} className="font-mono text-xs" />
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 7. QR CODE TAB (Presets & Download PNG)
 * ------------------------------------------------------------- */
function QrTab() {
  const { t } = useI18n();
  const [preset, setPreset] = useState<"text" | "wifi">("text");
  const [text, setText] = useState("https://github.com/tauri-apps/tauri");

  // WiFi fields
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [authType, setAuthType] = useState("WPA");

  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const qrRaw = useMemo(() => {
    if (preset === "wifi") {
      if (!ssid) return "";
      return `WIFI:T:${authType};S:${ssid};P:${password};;`;
    }
    return text;
  }, [preset, text, ssid, password, authType]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!qrRaw.trim()) {
        setDataUrl(null);
        return;
      }
      try {
        const QRCode = await import("qrcode");
        const url = await QRCode.toDataURL(qrRaw, { width: 280, margin: 2 });
        if (!cancelled) {
          setDataUrl(url);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [qrRaw]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 border-b pb-2">
          <button
            type="button"
            onClick={() => setPreset("text")}
            className={`px-2.5 py-1 text-xs rounded font-medium ${preset === "text" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted"}`}
          >
            {t.qrPresetText}
          </button>
          <button
            type="button"
            onClick={() => setPreset("wifi")}
            className={`px-2.5 py-1 text-xs rounded font-medium ${preset === "wifi" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted"}`}
          >
            {t.qrPresetWifi}
          </button>
        </div>

        {preset === "text" ? (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">{t.input}</p>
            <Textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="font-mono text-xs"
              placeholder="https://..."
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t.qrSsid}</label>
              <Input
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                placeholder="My-WiFi-Network"
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t.qrPassword}</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t.qrSecurity}</label>
              <Select value={authType} onValueChange={setAuthType}>
                <SelectTrigger className="h-8 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WPA">WPA / WPA2</SelectItem>
                  <SelectItem value="WEP">WEP</SelectItem>
                  <SelectItem value="nopass">None (Open)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border bg-muted/20 p-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {dataUrl ? (
          <>
            <img src={dataUrl} alt="QR code" className="size-48 rounded bg-white p-2 shadow-xs" />
            <a
              href={dataUrl}
              download="qrcode.png"
              className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1 text-xs font-medium shadow-xs hover:bg-accent"
            >
              <Download className="size-3.5" />
              {t.qrDownload}
            </a>
          </>
        ) : (
          <div className="flex flex-col items-center text-muted-foreground text-xs py-8">
            <QrCode className="size-10 mb-2 opacity-40" />
            <span>Enter content to generate QR code</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 8. REGEX TESTER TAB (Highlighting, Presets, Replace)
 * ------------------------------------------------------------- */
function RegexTab() {
  const { t } = useI18n();
  const [pattern, setPattern] = useState("(\\w+)@([a-z0-9.]+)\\.([a-z]{2,})");
  const [flags, setFlags] = useState("gi");
  const [text, setText] = useState("Contact us at support@example.com or sales@company.org for assistance.");
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
              <div key={i} className="flex items-center justify-between rounded bg-background px-2 py-1 font-mono text-xs">
                <span>
                  <span className="text-primary font-bold">[{m.index}]</span> {m.match}
                </span>
                {m.groups.length > 0 && (
                  <span className="text-muted-foreground text-[11px]">
                    ({m.groups.join(", ")})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------
 * 9. TIME TAB (Unix, ISO, Relative, World Times)
 * ------------------------------------------------------------- */
function TimeTab() {
  const { locale, t } = useI18n();
  const [unix, setUnix] = useState(() => String(Math.floor(Date.now() / 1000)));
  const [isMs, setIsMs] = useState(false);
  const [iso, setIso] = useState(() => new Date().toISOString());

  const currentNumeric = useMemo(() => Number(unix) || 0, [unix]);

  const fromUnix = () => {
    const n = Number(unix);
    if (!Number.isFinite(n)) return;
    const ms = isMs ? n : n * (Math.abs(n) < 1e12 ? 1000 : 1);
    setIso(new Date(ms).toISOString());
  };

  const fromIso = () => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return;
    setUnix(String(isMs ? d.getTime() : Math.floor(d.getTime() / 1000)));
  };

  const setNow = () => {
    const now = Date.now();
    setUnix(String(isMs ? now : Math.floor(now / 1000)));
    setIso(new Date(now).toISOString());
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs cursor-pointer">
            <input
              type="radio"
              name="timeunit"
              checked={!isMs}
              onChange={() => setIsMs(false)}
            />
            <span>{t.timeUnitSec}</span>
          </label>
          <label className="flex items-center gap-1 text-xs cursor-pointer">
            <input
              type="radio"
              name="timeunit"
              checked={isMs}
              onChange={() => setIsMs(true)}
            />
            <span>{t.timeUnitMs}</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={setNow} className="h-7 text-xs gap-1">
            <RefreshCw className="size-3" />
            Now
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void copyText(`${unix}\n${iso}`, t.copied)}
            className="h-7 text-xs"
          >
            <Copy className="size-3" />
            {t.copy}
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex gap-2">
          <Input
            className="font-mono text-xs"
            value={unix}
            onChange={(e) => setUnix(e.target.value)}
            placeholder="Unix timestamp"
          />
          <Button size="sm" variant="secondary" onClick={fromUnix}>
            → ISO
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            className="font-mono text-xs"
            value={iso}
            onChange={(e) => setIso(e.target.value)}
            placeholder="ISO 8601"
          />
          <Button size="sm" variant="secondary" onClick={fromIso}>
            → Unix
          </Button>
        </div>
      </div>

      {/* Human formatted times & World Timezones preview */}
      <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
          <span className="font-semibold text-foreground">
            {formatTimestampLocal(currentNumeric, isMs)}
          </span>
          <Badge variant="secondary">
            {getRelativeTime(currentNumeric, locale, isMs)}
          </Badge>
        </div>

        <div className="pt-2 border-t space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground">{t.timeWorld}</span>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 font-mono text-[11px]">
            {WORLD_TIMEZONES.map((wt) => {
              const ms = isMs ? currentNumeric : currentNumeric * 1000;
              const formatted = new Intl.DateTimeFormat(undefined, {
                timeZone: wt.zone,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              }).format(new Date(ms));

              return (
                <div key={wt.zone} className="flex justify-between rounded bg-background px-2 py-1 border">
                  <span className="text-muted-foreground truncate">{wt.label.split(" ")[0]}</span>
                  <span className="font-semibold">{formatted}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 10. DIFF TAB
 * ------------------------------------------------------------- */
function DiffTab() {
  const { t } = useI18n();
  const [a, setA] = useState("export const version = '0.3.0';\nconsole.log('Starting app...');\nconst debug = false;");
  const [b, setB] = useState("export const version = '0.3.1';\nconsole.log('Starting app...');\nconst debug = true;\nconst verbose = 1;");
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
        <Textarea rows={6} value={a} onChange={(e) => setA(e.target.value)} placeholder="Original (A)" className="font-mono text-xs" />
        <Textarea rows={6} value={b} onChange={(e) => setB(e.target.value)} placeholder="Modified (B)" className="font-mono text-xs" />
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

/* -------------------------------------------------------------
 * 11. CODE & TEXT UTILITIES TAB (HTML Entities, CSS units, Text Case, Lorem)
 * ------------------------------------------------------------- */
function UtilsTab() {
  const { t } = useI18n();

  // Case Converter state
  const [caseInput, setCaseInput] = useState("hello world from developer tools");
  const cases: CaseType[] = ["camel", "pascal", "snake", "kebab", "constant", "title", "upper", "lower"];

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
          placeholder="Type or paste text..."
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
            <Button size="sm" variant="outline" onClick={() => setHtmlOutput(decodeHtmlEntities(htmlInput))}>
              Decode
            </Button>
          </div>
          {htmlOutput && (
            <div className="flex items-center gap-1.5 pt-1">
              <Input readOnly value={htmlOutput} className="font-mono text-xs h-8" />
              <Button size="icon" variant="outline" className="size-8" onClick={() => void copyText(htmlOutput, t.copied)}>
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
            <Select value={loremType} onValueChange={(v) => setLoremType(v as "paragraphs" | "sentences" | "words")}>
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
