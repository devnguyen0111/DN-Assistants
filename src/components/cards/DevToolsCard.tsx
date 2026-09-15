import { useEffect, useMemo, useState } from "react";
import { Code2, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  decodeJwt,
  formatJson,
  generateUuidV4,
  generateUuidV7,
  hashText,
  testRegex,
  urlDecode,
  urlEncode,
  type HashAlgo,
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="size-4 text-primary" />
          {t.devToolsTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="json" className="w-full">
          <TabsList className="flex-wrap">
            <TabsTrigger value="json">JSON</TabsTrigger>
            <TabsTrigger value="base64">Base64</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="jwt">JWT</TabsTrigger>
            <TabsTrigger value="hash">{t.hash}</TabsTrigger>
            <TabsTrigger value="uuid">{t.uuid}</TabsTrigger>
            <TabsTrigger value="qr">{t.qrCode}</TabsTrigger>
            <TabsTrigger value="regex">{t.regexTester}</TabsTrigger>
            <TabsTrigger value="time">Time</TabsTrigger>
            <TabsTrigger value="diff">Diff</TabsTrigger>
          </TabsList>

          <TabsContent value="json"><JsonTab /></TabsContent>
          <TabsContent value="base64"><Base64Tab /></TabsContent>
          <TabsContent value="url"><UrlTab /></TabsContent>
          <TabsContent value="jwt"><JwtTab /></TabsContent>
          <TabsContent value="hash"><HashTab /></TabsContent>
          <TabsContent value="uuid"><UuidTab /></TabsContent>
          <TabsContent value="qr"><QrTab /></TabsContent>
          <TabsContent value="regex"><RegexTab /></TabsContent>
          <TabsContent value="time"><TimeTab /></TabsContent>
          <TabsContent value="diff"><DiffTab /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function JsonTab() {
  const { t } = useI18n();
  const [input, setInput] = useState('{\n  "hello": "world"\n}');
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    const result = formatJson(input);
    if (result.ok) {
      setOutput(result.formatted);
      setError(null);
    } else {
      setError(result.error);
      setOutput("");
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{t.input}</p>
        <Textarea rows={12} value={input} onChange={(e) => setInput(e.target.value)} />
        <Button size="sm" onClick={run}>{t.jsonFormat}</Button>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{t.output}</p>
        <Textarea rows={12} readOnly value={error ? `${t.invalidJson}: ${error}` : output} />
        {output && (
          <Button size="sm" variant="outline" onClick={() => void copyText(output, t.copied)}>
            <Copy className="size-4" />
            {t.copied}
          </Button>
        )}
      </div>
    </div>
  );
}

function Base64Tab() {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const encode = () => {
    try {
      setOutput(base64Encode(input));
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

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{t.input}</p>
        <Textarea rows={10} value={input} onChange={(e) => setInput(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" onClick={encode}>{t.base64Encode}</Button>
          <Button size="sm" variant="outline" onClick={decode}>{t.base64Decode}</Button>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{t.output}</p>
        <Textarea rows={10} readOnly value={error ?? output} />
        {output && (
          <Button size="sm" variant="outline" onClick={() => void copyText(output, t.copied)}>
            <Copy className="size-4" />
            {t.copied}
          </Button>
        )}
      </div>
    </div>
  );
}

function UrlTab() {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{t.input}</p>
        <Textarea rows={10} value={input} onChange={(e) => setInput(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setOutput(urlEncode(input))}>{t.urlEncode}</Button>
          <Button size="sm" variant="outline" onClick={() => setOutput(urlDecode(input))}>
            {t.urlDecode}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{t.output}</p>
        <Textarea rows={10} readOnly value={output} />
        {output && (
          <Button size="sm" variant="outline" onClick={() => void copyText(output, t.copied)}>
            <Copy className="size-4" />
            {t.copied}
          </Button>
        )}
      </div>
    </div>
  );
}

function JwtTab() {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const decode = () => {
    try {
      const { header, payload } = decodeJwt(input);
      setOutput(JSON.stringify({ header, payload }, null, 2));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setOutput("");
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{t.input}</p>
        <Textarea rows={10} value={input} onChange={(e) => setInput(e.target.value)} />
        <Button size="sm" onClick={decode}>{t.jwtDecode}</Button>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{t.output}</p>
        <Textarea rows={10} readOnly value={error ?? output} />
      </div>
    </div>
  );
}

const HASH_ALGOS: HashAlgo[] = ["SHA-1", "SHA-256", "SHA-512"];

function HashTab() {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [algo, setAlgo] = useState<HashAlgo>("SHA-256");
  const [output, setOutput] = useState("");

  const run = async () => {
    try {
      setOutput(await hashText(input, algo));
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-3">
      <Textarea rows={6} placeholder={t.input} value={input} onChange={(e) => setInput(e.target.value)} />
      <div className="flex items-center gap-2">
        <Select value={algo} onValueChange={(v) => setAlgo(v as HashAlgo)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {HASH_ALGOS.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => void run()}>{t.hash}</Button>
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

function UuidTab() {
  const { t } = useI18n();
  const [v4, setV4] = useState(generateUuidV4());
  const [v7, setV7] = useState(generateUuidV7());

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">UUID v4</p>
        <div className="flex items-center gap-2">
          <Input readOnly value={v4} className="font-mono text-xs" />
          <Button size="icon" variant="outline" onClick={() => setV4(generateUuidV4())}>
            <RefreshCw className="size-4" />
          </Button>
          <Button size="icon" variant="outline" onClick={() => void copyText(v4, t.copied)}>
            <Copy className="size-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">UUID v7</p>
        <div className="flex items-center gap-2">
          <Input readOnly value={v7} className="font-mono text-xs" />
          <Button size="icon" variant="outline" onClick={() => setV7(generateUuidV7())}>
            <RefreshCw className="size-4" />
          </Button>
          <Button size="icon" variant="outline" onClick={() => void copyText(v7, t.copied)}>
            <Copy className="size-4" />
          </Button>
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setV4(generateUuidV4());
          setV7(generateUuidV7());
        }}
      >
        {t.generateUuid}
      </Button>
    </div>
  );
}

function QrTab() {
  const { t } = useI18n();
  const [text, setText] = useState("https://");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!text.trim()) {
        setDataUrl(null);
        return;
      }
      try {
        const QRCode = await import("qrcode");
        const url = await QRCode.toDataURL(text, { width: 240, margin: 1 });
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
  }, [text]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{t.input}</p>
        <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-muted/20 p-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {dataUrl && <img src={dataUrl} alt="QR code" className="size-48" />}
      </div>
    </div>
  );
}

function RegexTab() {
  const { t } = useI18n();
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("");

  const { matches, error } = useMemo(() => {
    if (!pattern) return { matches: [], error: null as string | null };
    try {
      return { matches: testRegex(pattern, flags, text), error: null as string | null };
    } catch (err) {
      return { matches: [], error: err instanceof Error ? err.message : String(err) };
    }
  }, [pattern, flags, text]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder={t.pattern}
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          className="flex-1 font-mono"
        />
        <Input
          placeholder={t.flags}
          value={flags}
          onChange={(e) => setFlags(e.target.value)}
          className="w-20 font-mono"
        />
      </div>
      <Textarea rows={8} placeholder={t.input} value={text} onChange={(e) => setText(e.target.value)} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="rounded-lg border bg-muted/20 p-2">
        <p className="mb-2 text-xs text-muted-foreground">
          {matches.length} {t.output.toLowerCase()}
        </p>
        <div className="max-h-48 space-y-1 overflow-auto">
          {matches.map((m, i) => (
            <div key={i} className="rounded bg-background px-2 py-1 font-mono text-xs">
              [{m.index}] {m.match}
              {m.groups.length > 0 && (
                <span className="text-muted-foreground"> → {m.groups.join(", ")}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimeTab() {
  const { t } = useI18n();
  const [unix, setUnix] = useState(() => String(Math.floor(Date.now() / 1000)));
  const [iso, setIso] = useState(() => new Date().toISOString());

  const fromUnix = () => {
    const n = Number(unix);
    if (!Number.isFinite(n)) return;
    setIso(new Date(n * (Math.abs(n) < 1e12 ? 1000 : 1)).toISOString());
  };

  const fromIso = () => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return;
    setUnix(String(Math.floor(d.getTime() / 1000)));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          className="font-mono"
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
          className="font-mono"
          value={iso}
          onChange={(e) => setIso(e.target.value)}
          placeholder="ISO 8601"
        />
        <Button size="sm" variant="secondary" onClick={fromIso}>
          → Unix
        </Button>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          const now = Date.now();
          setUnix(String(Math.floor(now / 1000)));
          setIso(new Date(now).toISOString());
        }}
      >
        <RefreshCw className="size-3.5" />
        Now
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => void copyText(`${unix}\n${iso}`, t.copied)}
      >
        <Copy className="size-3.5" />
        {t.copyResult}
      </Button>
    </div>
  );
}

function DiffTab() {
  const { t } = useI18n();
  const [a, setA] = useState("line one\nline two\nline three");
  const [b, setB] = useState("line one\nline 2\nline three");

  const rows = useMemo(() => {
    const la = a.split("\n");
    const lb = b.split("\n");
    const max = Math.max(la.length, lb.length);
    const out: Array<{ n: number; left: string; right: string; same: boolean }> = [];
    for (let i = 0; i < max; i++) {
      const left = la[i] ?? "";
      const right = lb[i] ?? "";
      out.push({ n: i + 1, left, right, same: left === right });
    }
    return out;
  }, [a, b]);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-2">
        <Textarea rows={8} value={a} onChange={(e) => setA(e.target.value)} placeholder="A" />
        <Textarea rows={8} value={b} onChange={(e) => setB(e.target.value)} placeholder="B" />
      </div>
      <div className="max-h-64 space-y-0.5 overflow-auto rounded-lg border p-2 font-mono text-xs">
        {rows.map((r) => (
          <div
            key={r.n}
            className={
              r.same
                ? "grid grid-cols-[2rem_1fr_1fr] gap-2 px-1 py-0.5 text-muted-foreground"
                : "grid grid-cols-[2rem_1fr_1fr] gap-2 bg-destructive/10 px-1 py-0.5"
            }
          >
            <span>{r.n}</span>
            <span className="truncate">{r.left || "∅"}</span>
            <span className="truncate">{r.right || "∅"}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {rows.filter((r) => !r.same).length} {t.output.toLowerCase()}
      </p>
    </div>
  );
}
