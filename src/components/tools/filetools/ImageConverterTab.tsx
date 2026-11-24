import { useId, useState } from "react";
import { Download, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { useI18n } from "@/lib/i18n";
import { formatBytes } from "@/lib/utils";

/* =========================================================================
   4. IMAGE CONVERTER TAB
   ========================================================================= */
export function ImageConverterTab() {
  const { t } = useI18n();
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
            <p className="text-sm font-medium">{t.imageSelectDrop}</p>
            <p className="text-xs text-muted-foreground">Convert format, resize & optimize</p>
          </div>
        )}
      </label>

      {previewUrl && (
        <div className="space-y-4 rounded-xl border bg-card p-4">
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
              {t.imageDownload}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
