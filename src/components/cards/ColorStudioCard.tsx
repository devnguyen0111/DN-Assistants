import { useId, useMemo, useState } from "react";
import {
  Copy,
  Image as ImageIcon,
  Palette,
  RefreshCw,
  Sparkles,
  Sliders,
  SunMoon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";
import {
  extractPaletteFromImage,
  generateHarmonies,
  getContrast,
  hexToRgb,
  rgbToCmyk,
  rgbToHex,
  rgbToHsl,
  type HarmonyType,
  type RgbColor,
} from "@/lib/colors";

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : String(err));
  }
}

export function ColorStudioCard() {
  const { t } = useI18n();

  // Active color across tabs
  const [hex, setHex] = useState("#0EA5E9");
  const rgb = useMemo(() => hexToRgb(hex) ?? { r: 14, g: 165, b: 233 }, [hex]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const cmyk = useMemo(() => rgbToCmyk(rgb), [rgb]);

  const updateRgb = (part: Partial<RgbColor>) => {
    const next = { ...rgb, ...part };
    setHex(rgbToHex(next));
  };

  const updateHex = (val: string) => {
    let clean = val.trim();
    if (!clean.startsWith("#")) clean = "#" + clean;
    setHex(clean);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="size-5 text-primary" />
          {t.colorStudioTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="picker" className="w-full">
          <TabsList className="flex-wrap">
            <TabsTrigger value="picker" className="gap-1.5">
              <Sliders className="size-3.5" />
              {t.colorPickerTab}
            </TabsTrigger>
            <TabsTrigger value="harmonies" className="gap-1.5">
              <Sparkles className="size-3.5" />
              {t.colorHarmoniesTab}
            </TabsTrigger>
            <TabsTrigger value="extractor" className="gap-1.5">
              <ImageIcon className="size-3.5" />
              {t.colorExtractorTab}
            </TabsTrigger>
            <TabsTrigger value="contrast" className="gap-1.5">
              <SunMoon className="size-3.5" />
              {t.colorContrastTab}
            </TabsTrigger>
            <TabsTrigger value="gradients" className="gap-1.5">
              <Palette className="size-3.5" />
              {t.colorGradientsTab}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="picker" className="mt-4">
            <PickerTab
              hex={hex}
              rgb={rgb}
              hsl={hsl}
              cmyk={cmyk}
              onUpdateRgb={updateRgb}
              onUpdateHex={updateHex}
            />
          </TabsContent>

          <TabsContent value="harmonies" className="mt-4">
            <HarmoniesTab hex={hex} onSelectHex={setHex} />
          </TabsContent>

          <TabsContent value="extractor" className="mt-4">
            <ExtractorTab onSelectHex={setHex} />
          </TabsContent>

          <TabsContent value="contrast" className="mt-4">
            <ContrastTab initialFg={hex} />
          </TabsContent>

          <TabsContent value="gradients" className="mt-4">
            <GradientsTab initialColor={hex} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PickerTab({
  hex,
  rgb,
  hsl,
  cmyk,
  onUpdateRgb,
  onUpdateHex,
}: {
  hex: string;
  rgb: RgbColor;
  hsl: { h: number; s: number; l: number };
  cmyk: { c: number; m: number; y: number; k: number };
  onUpdateRgb: (part: Partial<RgbColor>) => void;
  onUpdateHex: (val: string) => void;
}) {
  const { t } = useI18n();

  const rgbStr = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const hslStr = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  const cmykStr = `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Visual swatch and hex input */}
      <div className="space-y-4">
        <div
          className="relative flex h-48 w-full items-end justify-between rounded-2xl border p-4 shadow-inner transition-colors"
          style={{ backgroundColor: hex }}
        >
          <div className="rounded-lg bg-black/60 px-3 py-1.5 text-xs font-mono font-medium text-white backdrop-blur">
            {hex}
          </div>

          <Button
            size="sm"
            variant="secondary"
            className="h-8 gap-1.5 bg-black/60 text-white backdrop-blur hover:bg-black/80"
            onClick={() => void copyText(hex, t.copied)}
          >
            <Copy className="size-3.5" />
            {t.copied.replace("Đã sao chép", "Copy").replace("Copied", "Copy")}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={hex}
            onChange={(e) => onUpdateHex(e.target.value)}
            className="font-mono text-base font-semibold"
            maxLength={7}
          />
          <input
            type="color"
            value={hex.length === 7 ? hex : "#000000"}
            onChange={(e) => onUpdateHex(e.target.value)}
            className="size-10 cursor-pointer rounded-lg border bg-transparent p-1"
          />
        </div>

        {/* Formats Copy Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Button
            variant="outline"
            size="sm"
            className="justify-between font-mono"
            onClick={() => void copyText(rgbStr, t.copied)}
          >
            <span>RGB</span>
            <span className="truncate text-muted-foreground">{rgbStr}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-between font-mono"
            onClick={() => void copyText(hslStr, t.copied)}
          >
            <span>HSL</span>
            <span className="truncate text-muted-foreground">{hslStr}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="col-span-2 justify-between font-mono"
            onClick={() => void copyText(cmykStr, t.copied)}
          >
            <span>CMYK</span>
            <span className="truncate text-muted-foreground">{cmykStr}</span>
          </Button>
        </div>
      </div>

      {/* RGB & HSL sliders */}
      <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          RGB Channels
        </p>

        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-red-500 font-semibold">Red (R)</span>
              <span>{rgb.r}</span>
            </div>
            <Slider
              value={[rgb.r]}
              min={0}
              max={255}
              step={1}
              onValueChange={(v) => onUpdateRgb({ r: v[0] ?? 0 })}
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-emerald-500 font-semibold">Green (G)</span>
              <span>{rgb.g}</span>
            </div>
            <Slider
              value={[rgb.g]}
              min={0}
              max={255}
              step={1}
              onValueChange={(v) => onUpdateRgb({ g: v[0] ?? 0 })}
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-blue-500 font-semibold">Blue (B)</span>
              <span>{rgb.b}</span>
            </div>
            <Slider
              value={[rgb.b]}
              min={0}
              max={255}
              step={1}
              onValueChange={(v) => onUpdateRgb({ b: v[0] ?? 0 })}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-center">
          <div className="rounded-lg bg-background p-2 font-mono">
            <p className="text-[10px] text-muted-foreground">Hue</p>
            <p className="text-sm font-semibold">{hsl.h}°</p>
          </div>
          <div className="rounded-lg bg-background p-2 font-mono">
            <p className="text-[10px] text-muted-foreground">Saturation</p>
            <p className="text-sm font-semibold">{hsl.s}%</p>
          </div>
          <div className="rounded-lg bg-background p-2 font-mono">
            <p className="text-[10px] text-muted-foreground">Lightness</p>
            <p className="text-sm font-semibold">{hsl.l}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HarmoniesTab({
  hex,
  onSelectHex,
}: {
  hex: string;
  onSelectHex: (hex: string) => void;
}) {
  const { t } = useI18n();
  const harmonies = useMemo(() => generateHarmonies(hex), [hex]);

  const GROUPS: Array<{ type: HarmonyType; title: string }> = [
    { type: "complementary", title: "Complementary (180°)" },
    { type: "analogous", title: "Analogous (±30°)" },
    { type: "triadic", title: "Triadic (120°)" },
    { type: "tetradic", title: "Tetradic (90°)" },
    { type: "splitComplementary", title: "Split Complementary (150°/210°)" },
    { type: "monochromatic", title: "Monochromatic" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {GROUPS.map(({ type, title }) => {
          const colors = harmonies[type];
          return (
            <div key={type} className="rounded-xl border bg-card/60 p-3.5">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">{title}</p>
              <div className="flex h-16 w-full overflow-hidden rounded-lg border shadow-sm">
                {colors.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    className="group relative flex-1 transition-all hover:flex-[1.5]"
                    style={{ backgroundColor: c }}
                    onClick={() => {
                      onSelectHex(c);
                      void copyText(c, `${t.copied}: ${c}`);
                    }}
                    title={`${c} (click to copy / select)`}
                  >
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/75 px-1 text-[9px] font-mono text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {c}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExtractorTab({ onSelectHex }: { onSelectHex: (hex: string) => void }) {
  const { t } = useI18n();
  const inputId = useId();
  const [extracted, setExtracted] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setExtracting(true);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const palette = await extractPaletteFromImage(file);
      setExtracted(palette);
      toast.success(t.extractedColors);
    } catch {
      toast.error("Failed to extract colors");
    } finally {
      setExtracting(false);
    }
  };

  const onPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          await processFile(file);
          return;
        }
      }
    }
  };

  return (
    <div className="space-y-4" onPaste={onPaste}>
      <label
        htmlFor={inputId}
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) await processFile(file);
        }}
        className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/20 p-6 text-center transition-colors hover:bg-muted/40"
      >
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void processFile(file);
          }}
        />

        {previewUrl ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={previewUrl}
              alt="preview"
              className="max-h-40 rounded-xl border object-contain shadow-sm"
            />
            <p className="text-xs text-muted-foreground">
              Click or drop another image to replace
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ImageIcon className="size-6" />
            </div>
            <p className="text-sm font-medium">{t.dropImageHere}</p>
            <p className="text-xs text-muted-foreground">
              Supports PNG, JPG, WebP, SVG, clipboard paste (Ctrl+V)
            </p>
          </div>
        )}
      </label>

      {extracting && <p className="text-center text-xs text-muted-foreground">Extracting palette...</p>}

      {extracted.length > 0 && (
        <div className="rounded-xl border bg-card/60 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.extractedColors}
          </p>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {extracted.map((c, i) => (
              <button
                key={i}
                type="button"
                className="group flex flex-col items-center gap-1.5 rounded-xl border bg-background p-2 transition-transform hover:scale-105"
                onClick={() => {
                  onSelectHex(c);
                  void copyText(c, `${t.copied}: ${c}`);
                }}
              >
                <div
                  className="size-12 rounded-lg border shadow-sm"
                  style={{ backgroundColor: c }}
                />
                <span className="font-mono text-xs font-medium text-foreground">{c}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ContrastTab({ initialFg }: { initialFg: string }) {
  const { t } = useI18n();
  const [fg, setFg] = useState(initialFg);
  const [bg, setBg] = useState("#FFFFFF");

  const contrast = useMemo(() => {
    const fgRgb = hexToRgb(fg) ?? { r: 14, g: 165, b: 233 };
    const bgRgb = hexToRgb(bg) ?? { r: 255, g: 255, b: 255 };
    return getContrast(fgRgb, bgRgb);
  }, [fg, bg]);

  const swap = () => {
    const temp = fg;
    setFg(bg);
    setBg(temp);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs">{t.contrastForeground}</Label>
          <div className="flex gap-2">
            <Input
              value={fg}
              onChange={(e) => setFg(e.target.value)}
              className="font-mono text-xs"
            />
            <input
              type="color"
              value={fg.length === 7 ? fg : "#000000"}
              onChange={(e) => setFg(e.target.value)}
              className="size-9 cursor-pointer rounded-lg border bg-transparent p-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">{t.contrastBackground}</Label>
          <div className="flex gap-2">
            <Input
              value={bg}
              onChange={(e) => setBg(e.target.value)}
              className="font-mono text-xs"
            />
            <input
              type="color"
              value={bg.length === 7 ? bg : "#FFFFFF"}
              onChange={(e) => setBg(e.target.value)}
              className="size-9 cursor-pointer rounded-lg border bg-transparent p-1"
            />
            <Button size="icon" variant="outline" onClick={swap} title="Swap colors">
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Live Preview Box */}
      <div
        className="rounded-2xl border p-6 transition-colors shadow-inner"
        style={{ backgroundColor: bg, color: fg }}
      >
        <p className="text-2xl font-bold tracking-tight">Large Heading (Bold 18pt+)</p>
        <p className="mt-2 text-base font-medium">{t.previewText}</p>
        <p className="mt-1 text-sm opacity-90">
          Small Body Text (14pt regular) — testing readability and contrast adherence.
        </p>
      </div>

      {/* WCAG Compliance Scorecard */}
      <div className="grid gap-3 sm:grid-cols-5">
        <div className="rounded-xl border bg-card/60 p-3 text-center sm:col-span-1">
          <p className="text-[10px] uppercase font-semibold text-muted-foreground">
            {t.contrastScore}
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-tight">
            {contrast.ratio} : 1
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:col-span-4 sm:grid-cols-4">
          <div className="rounded-xl border bg-card/60 p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Normal AA (≥4.5)</p>
            <Badge
              variant={contrast.normalAa ? "default" : "destructive"}
              className="mt-1 text-xs"
            >
              {contrast.normalAa ? "Pass" : "Fail"}
            </Badge>
          </div>

          <div className="rounded-xl border bg-card/60 p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Normal AAA (≥7.0)</p>
            <Badge
              variant={contrast.normalAaa ? "default" : "destructive"}
              className="mt-1 text-xs"
            >
              {contrast.normalAaa ? "Pass" : "Fail"}
            </Badge>
          </div>

          <div className="rounded-xl border bg-card/60 p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Large AA (≥3.0)</p>
            <Badge
              variant={contrast.largeAa ? "default" : "destructive"}
              className="mt-1 text-xs"
            >
              {contrast.largeAa ? "Pass" : "Fail"}
            </Badge>
          </div>

          <div className="rounded-xl border bg-card/60 p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Large AAA (≥4.5)</p>
            <Badge
              variant={contrast.largeAaa ? "default" : "destructive"}
              className="mt-1 text-xs"
            >
              {contrast.largeAaa ? "Pass" : "Fail"}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function GradientsTab({ initialColor }: { initialColor: string }) {
  const { t } = useI18n();
  const [type, setType] = useState<"linear" | "radial">("linear");
  const [angle, setAngle] = useState(135);
  const [color1, setColor1] = useState(initialColor);
  const [color2, setColor2] = useState("#8B5CF6");
  const [color3, setColor3] = useState("#EC4899");
  const [useThree, setUseThree] = useState(false);

  const gradientRule = useMemo(() => {
    const stops = useThree ? `${color1}, ${color2}, ${color3}` : `${color1}, ${color2}`;
    if (type === "linear") {
      return `linear-gradient(${angle}deg, ${stops})`;
    } else {
      return `radial-gradient(circle, ${stops})`;
    }
  }, [type, angle, color1, color2, color3, useThree]);

  const cssCode = `background: ${gradientRule};`;

  return (
    <div className="space-y-4">
      {/* Live Gradient Swatch */}
      <div
        className="h-44 w-full rounded-2xl border shadow-inner transition-all"
        style={{ background: gradientRule }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Controls */}
        <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs">{t.gradientType}</Label>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={type === "linear" ? "secondary" : "ghost"}
                onClick={() => setType("linear")}
                className="h-7 text-xs"
              >
                Linear
              </Button>
              <Button
                size="sm"
                variant={type === "radial" ? "secondary" : "ghost"}
                onClick={() => setType("radial")}
                className="h-7 text-xs"
              >
                Radial
              </Button>
            </div>
          </div>

          {type === "linear" && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span>{t.gradientAngle}</span>
                <span>{angle}°</span>
              </div>
              <Slider
                value={[angle]}
                min={0}
                max={360}
                step={5}
                onValueChange={(v) => setAngle(v[0] ?? 135)}
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <Label className="text-xs">3 Color Stops</Label>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setUseThree((prev) => !prev)}
            >
              {useThree ? "3 Colors" : "2 Colors"}
            </Button>
          </div>
        </div>

        {/* Color Stops */}
        <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
          <div className="space-y-1">
            <Label className="text-xs">Stop 1</Label>
            <div className="flex gap-2">
              <Input
                value={color1}
                onChange={(e) => setColor1(e.target.value)}
                className="font-mono text-xs"
              />
              <input
                type="color"
                value={color1.length === 7 ? color1 : "#000000"}
                onChange={(e) => setColor1(e.target.value)}
                className="size-9 cursor-pointer rounded-lg border bg-transparent p-1"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Stop 2</Label>
            <div className="flex gap-2">
              <Input
                value={color2}
                onChange={(e) => setColor2(e.target.value)}
                className="font-mono text-xs"
              />
              <input
                type="color"
                value={color2.length === 7 ? color2 : "#000000"}
                onChange={(e) => setColor2(e.target.value)}
                className="size-9 cursor-pointer rounded-lg border bg-transparent p-1"
              />
            </div>
          </div>

          {useThree && (
            <div className="space-y-1">
              <Label className="text-xs">Stop 3</Label>
              <div className="flex gap-2">
                <Input
                  value={color3}
                  onChange={(e) => setColor3(e.target.value)}
                  className="font-mono text-xs"
                />
                <input
                  type="color"
                  value={color3.length === 7 ? color3 : "#000000"}
                  onChange={(e) => setColor3(e.target.value)}
                  className="size-9 cursor-pointer rounded-lg border bg-transparent p-1"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS Code Output */}
      <div className="flex items-center gap-2 rounded-xl border bg-card/60 p-2.5">
        <Input readOnly value={cssCode} className="font-mono text-xs" />
        <Button
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => void copyText(cssCode, t.copied)}
        >
          <Copy className="size-3.5" />
          <span>{t.copyCss}</span>
        </Button>
      </div>
    </div>
  );
}
