import { useId, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  FileCheck2,
  FileDigit,
  HardDrive,
  ImageIcon,
  Type,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { formatBytes } from "@/lib/utils";

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : String(err));
  }
}

async function computeHash(buffer: ArrayBuffer, algorithm: "SHA-256" | "SHA-1" | "SHA-512"): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function FileToolsCard() {
  const { t } = useI18n();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="size-5 text-primary" />
          {t.fileToolsTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="hasher" className="w-full">
          <TabsList className="flex-wrap">
            <TabsTrigger value="hasher" className="gap-1.5">
              <FileCheck2 className="size-3.5" />
              {t.fileHasherTab}
            </TabsTrigger>
            <TabsTrigger value="image" className="gap-1.5">
              <ImageIcon className="size-3.5" />
              {t.imageConverterTab}
            </TabsTrigger>
            <TabsTrigger value="text" className="gap-1.5">
              <Type className="size-3.5" />
              {t.textInspectorTab}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hasher" className="mt-4">
            <HasherTab />
          </TabsContent>

          <TabsContent value="image" className="mt-4">
            <ImageConverterTab />
          </TabsContent>

          <TabsContent value="text" className="mt-4">
            <TextInspectorTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function HasherTab() {
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
            <p className="text-xs text-primary">Click or drop another file to replace</p>
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

      {computing && <p className="text-center text-xs text-muted-foreground">Computing checksums...</p>}

      {sha256 && (
        <div className="space-y-3 rounded-xl border bg-card/60 p-4">
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

          {/* Verification input */}
          <div className="pt-2 border-t space-y-2">
            <Label className="text-xs">Compare against expected checksum</Label>
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

function ImageConverterTab() {
  const inputId = useId();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [origDims, setOrigDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [keepAspect, setKeepAspect] = useState(true);
  const [format, setFormat] = useState<"png" | "jpeg" | "webp">("webp");
  const [quality, setQuality] = useState(85);
  const [processing, setProcessing] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      return;
    }
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    const img = new Image();
    img.onload = () => {
      setOrigDims({ w: img.width, h: img.height });
      setWidth(img.width);
      setHeight(img.height);
    };
    img.src = url;
  };

  const onWidthChange = (w: number) => {
    setWidth(w);
    if (keepAspect && origDims.w > 0) {
      setHeight(Math.round((w / origDims.w) * origDims.h));
    }
  };

  const onHeightChange = (h: number) => {
    setHeight(h);
    if (keepAspect && origDims.h > 0) {
      setWidth(Math.round((h / origDims.h) * origDims.w));
    }
  };

  const downloadProcessed = async () => {
    if (!previewUrl || width <= 0 || height <= 0) return;
    setProcessing(true);

    try {
      const img = new Image();
      img.src = previewUrl;
      await new Promise((res) => (img.onload = res));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = `image/${format}`;
      const dataUrl = canvas.toDataURL(mimeType, quality / 100);

      const a = document.createElement("a");
      a.href = dataUrl;
      const baseName = imageFile?.name.replace(/\.[^/.]+$/, "") || "processed-image";
      a.download = `${baseName}.${format === "jpeg" ? "jpg" : format}`;
      a.click();
      toast.success("Image downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <label
        htmlFor={inputId}
        className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/20 p-4 text-center transition-colors hover:bg-muted/40"
      >
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) processFile(f);
          }}
        />

        {previewUrl ? (
          <div className="flex flex-col items-center gap-2">
            <img
              src={previewUrl}
              alt="preview"
              className="max-h-36 rounded-lg border object-contain shadow-sm"
            />
            <p className="text-xs text-muted-foreground">
              Original: {origDims.w} × {origDims.h} px ({formatBytes(imageFile?.size ?? 0)})
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ImageIcon className="size-5" />
            </div>
            <p className="text-sm font-medium">Select or drop an image</p>
            <p className="text-xs text-muted-foreground">Convert format, resize & optimize</p>
          </div>
        )}
      </label>

      {previewUrl && (
        <div className="space-y-4 rounded-xl border bg-card/60 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Width (px)</Label>
              <Input
                type="number"
                value={width || ""}
                onChange={(e) => onWidthChange(Number(e.target.value))}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Height (px)</Label>
              <Input
                type="number"
                value={height || ""}
                onChange={(e) => onHeightChange(Number(e.target.value))}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="webp">WebP (Recommended)</SelectItem>
                  <SelectItem value="png">PNG (Lossless)</SelectItem>
                  <SelectItem value="jpeg">JPEG (Photo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <Button
              size="sm"
              variant={keepAspect ? "secondary" : "outline"}
              onClick={() => setKeepAspect((prev) => !prev)}
              className="text-xs"
            >
              {keepAspect ? "🔒 Aspect Ratio Locked" : "🔓 Aspect Ratio Unlocked"}
            </Button>

            {format !== "png" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">Quality: {quality}%</span>
                <Slider
                  value={[quality]}
                  min={10}
                  max={100}
                  step={5}
                  onValueChange={(v) => setQuality(v[0] ?? 85)}
                  className="w-28"
                />
              </div>
            )}

            <Button
              size="sm"
              disabled={processing}
              onClick={() => void downloadProcessed()}
              className="gap-1.5"
            >
              <Download className="size-3.5" />
              Download Image
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TextInspectorTab() {
  const { t } = useI18n();
  const [text, setText] = useState("Hello World! DN Assistant v0.3.0 is awesome.");

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s+/g, "").length;
    const lines = text ? text.split("\n").length : 0;
    const readingTimeMins = Math.ceil(words / 200); // 200 WPM average

    return { words, chars, charsNoSpaces, lines, readingTimeMins };
  }, [text]);

  const transformText = (type: string) => {
    let result = text;
    switch (type) {
      case "upper":
        result = text.toUpperCase();
        break;
      case "lower":
        result = text.toLowerCase();
        break;
      case "title":
        result = text.replace(/\b\w/g, (c) => c.toUpperCase());
        break;
      case "camel":
        result = text
          .toLowerCase()
          .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
        break;
      case "kebab":
        result = text
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
        break;
      case "snake":
        result = text
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "");
        break;
      case "slug":
        result = text
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-");
        break;
    }
    setText(result);
  };

  return (
    <div className="space-y-3">
      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border bg-muted/20 p-2.5 text-center font-mono">
          <p className="text-[11px] text-muted-foreground">{t.wordCount}</p>
          <p className="text-lg font-bold">{stats.words}</p>
        </div>
        <div className="rounded-xl border bg-muted/20 p-2.5 text-center font-mono">
          <p className="text-[11px] text-muted-foreground">{t.charCount}</p>
          <p className="text-lg font-bold">{stats.chars}</p>
        </div>
        <div className="rounded-xl border bg-muted/20 p-2.5 text-center font-mono">
          <p className="text-[11px] text-muted-foreground">No Spaces</p>
          <p className="text-lg font-bold">{stats.charsNoSpaces}</p>
        </div>
        <div className="rounded-xl border bg-muted/20 p-2.5 text-center font-mono">
          <p className="text-[11px] text-muted-foreground">{t.readingTime}</p>
          <p className="text-lg font-bold">~{stats.readingTimeMins}m</p>
        </div>
      </div>

      <Textarea
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type or paste text to analyze and transform..."
        className="font-mono text-xs"
      />

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="outline" onClick={() => transformText("upper")}>
          {t.caseUpper}
        </Button>
        <Button size="sm" variant="outline" onClick={() => transformText("lower")}>
          {t.caseLower}
        </Button>
        <Button size="sm" variant="outline" onClick={() => transformText("title")}>
          {t.caseTitle}
        </Button>
        <Button size="sm" variant="outline" onClick={() => transformText("camel")}>
          {t.caseCamel}
        </Button>
        <Button size="sm" variant="outline" onClick={() => transformText("kebab")}>
          {t.caseKebab}
        </Button>
        <Button size="sm" variant="outline" onClick={() => transformText("snake")}>
          {t.caseSnake}
        </Button>
        <Button size="sm" variant="outline" onClick={() => transformText("slug")}>
          URL Slug
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void copyText(text, t.copied)}
          className="ml-auto gap-1.5"
        >
          <Copy className="size-3.5" />
          {t.copied.replace("Đã sao chép", "Copy").replace("Copied", "Copy")}
        </Button>
      </div>
    </div>
  );
}
