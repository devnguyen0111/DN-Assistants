import { useEffect, useId, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  FileDigit,
  FileEdit,
  FolderOpen,
  HardDrive,
  ImageIcon,
  KeyRound,
  QrCode,
  Sparkles,
  Trash2,
  Type,
  Wifi,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { formatBytes } from "@/lib/utils";
import { scanQrFromImage, type QrScanResult } from "@/lib/qr-scanner";
import {
  applyBatchRename,
  DEFAULT_BATCH_RENAME_RULE,
  generateBatchScript,
  type BatchRenameRule,
  type CaseTransform,
  type NumberPosition,
} from "@/lib/batch-renamer";
import { createVaultEntry, isVaultUnlocked } from "@/lib/vault";

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : String(err));
  }
}

async function computeHash(
  buffer: ArrayBuffer,
  algorithm: "SHA-256" | "SHA-1" | "SHA-512",
): Promise<string> {
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
            <TabsTrigger value="batch" className="gap-1.5">
              <FileEdit className="size-3.5" />
              {t.batchRenamerTab}
            </TabsTrigger>
            <TabsTrigger value="qr" className="gap-1.5">
              <QrCode className="size-3.5" />
              {t.qrScannerTab}
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

          <TabsContent value="batch" className="mt-4">
            <BatchRenamerTab />
          </TabsContent>

          <TabsContent value="qr" className="mt-4">
            <QrScannerTab />
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

/* =========================================================================
   1. HASHER TAB
   ========================================================================= */
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

      {computing && (
        <p className="text-center text-xs text-muted-foreground">Computing checksums...</p>
      )}

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

/* =========================================================================
   2. BATCH RENAMER TAB (PRO SUITE)
   ========================================================================= */
function BatchRenamerTab() {
  const { t } = useI18n();
  const inputId = useId();
  const [files, setFiles] = useState<{ id: string; name: string; size: number }[]>([]);
  const [rule, setRule] = useState<BatchRenameRule>(DEFAULT_BATCH_RENAME_RULE);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newItems = Array.from(fileList).map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      name: f.name,
      size: f.size,
    }));
    setFiles((prev) => [...prev, ...newItems]);
    toast.success(`Added ${newItems.length} file(s)`);
  };

  const clearFiles = () => {
    setFiles([]);
  };

  const previewItems = useMemo(() => {
    return applyBatchRename(files, rule);
  }, [files, rule]);

  const hasCollisions = useMemo(() => {
    return previewItems.some((i) => i.hasCollision);
  }, [previewItems]);

  const changedCount = useMemo(() => {
    return previewItems.filter((i) => i.isChanged).length;
  }, [previewItems]);

  const downloadScript = (format: "powershell" | "cmd") => {
    const script = generateBatchScript(previewItems, format);
    if (!script) {
      toast.error("No valid renamed files to export");
      return;
    }
    const ext = format === "powershell" ? "ps1" : "bat";
    const mime = format === "powershell" ? "text/plain" : "application/x-bat";
    const blob = new Blob([script], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dn-rename-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${format === "powershell" ? "PowerShell" : "Batch"} script`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t.batchRenamerDesc}</p>
        <div className="flex items-center gap-2">
          <label htmlFor={inputId}>
            <input
              id={inputId}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            <Button size="sm" variant="outline" asChild className="cursor-pointer gap-1.5">
              <span>
                <FolderOpen className="size-3.5" />
                {t.addFiles}
              </span>
            </Button>
          </label>
          {files.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clearFiles} className="gap-1.5 text-xs text-destructive">
              <Trash2 className="size-3.5" />
              {t.clearFiles} ({files.length})
            </Button>
          )}
        </div>
      </div>

      {files.length === 0 ? (
        <label
          htmlFor={inputId}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
          className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/20 p-6 text-center transition-colors hover:bg-muted/40"
        >
          <div className="space-y-1.5">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileEdit className="size-5" />
            </div>
            <p className="text-sm font-medium">{t.noFilesAdded}</p>
            <p className="text-xs text-muted-foreground">Select dozens or hundreds of files to batch rename</p>
          </div>
        </label>
      ) : (
        <div className="space-y-4">
          {/* Rule Configuration Cards */}
          <div className="grid gap-3 rounded-xl border bg-card/60 p-4 md:grid-cols-2">
            {/* Find & Replace */}
            <div className="space-y-2 rounded-lg border bg-background/50 p-3">
              <p className="text-xs font-semibold">{t.findAndReplace}</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder={t.findPlaceholder}
                  value={rule.find}
                  onChange={(e) => setRule((r) => ({ ...r, find: e.target.value }))}
                  className="font-mono text-xs"
                />
                <Input
                  placeholder={t.replacePlaceholder}
                  value={rule.replace}
                  onChange={(e) => setRule((r) => ({ ...r, replace: e.target.value }))}
                  className="font-mono text-xs"
                />
              </div>
              <div className="flex items-center gap-4 pt-1">
                <div className="flex items-center gap-1.5">
                  <Switch
                    id="matchCase"
                    checked={rule.matchCase}
                    onCheckedChange={(checked) => setRule((r) => ({ ...r, matchCase: checked }))}
                  />
                  <Label htmlFor="matchCase" className="text-[11px] cursor-pointer">
                    {t.matchCase}
                  </Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch
                    id="useRegex"
                    checked={rule.isRegex}
                    onCheckedChange={(checked) => setRule((r) => ({ ...r, isRegex: checked }))}
                  />
                  <Label htmlFor="useRegex" className="text-[11px] cursor-pointer">
                    {t.useRegex}
                  </Label>
                </div>
              </div>
            </div>

            {/* Prefix & Suffix */}
            <div className="space-y-2 rounded-lg border bg-background/50 p-3">
              <p className="text-xs font-semibold">{t.prefixSuffix}</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder={t.prefixPlaceholder}
                  value={rule.prefix}
                  onChange={(e) => setRule((r) => ({ ...r, prefix: e.target.value }))}
                  className="font-mono text-xs"
                />
                <Input
                  placeholder={t.suffixPlaceholder}
                  value={rule.suffix}
                  onChange={(e) => setRule((r) => ({ ...r, suffix: e.target.value }))}
                  className="font-mono text-xs"
                />
              </div>
              <div className="pt-1 flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{t.caseTransform}:</span>
                <Select
                  value={rule.caseTransform}
                  onValueChange={(v) => setRule((r) => ({ ...r, caseTransform: v as CaseTransform }))}
                >
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Preserve (Không đổi)</SelectItem>
                    <SelectItem value="lower">lowercase (chữ thường)</SelectItem>
                    <SelectItem value="upper">UPPERCASE (CHỮ HOA)</SelectItem>
                    <SelectItem value="title">Title Case (Chữ Hoa Đầu)</SelectItem>
                    <SelectItem value="camel">camelCase</SelectItem>
                    <SelectItem value="kebab">kebab-case</SelectItem>
                    <SelectItem value="snake">snake_case</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Numbering Sequence */}
            <div className="col-span-full space-y-2 rounded-lg border bg-background/50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="enableNumbering"
                    checked={rule.enableNumbering}
                    onCheckedChange={(checked) => setRule((r) => ({ ...r, enableNumbering: checked }))}
                  />
                  <Label htmlFor="enableNumbering" className="text-xs font-semibold cursor-pointer">
                    {t.numbering}
                  </Label>
                </div>
                {rule.enableNumbering && (
                  <span className="text-[11px] text-primary font-mono">
                    Example: {String(rule.startNumber).padStart(rule.digits, "0")}
                  </span>
                )}
              </div>

              {rule.enableNumbering && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 pt-1">
                  <div className="space-y-1">
                    <Label className="text-[10px]">{t.startAt}</Label>
                    <Input
                      type="number"
                      value={rule.startNumber}
                      onChange={(e) => setRule((r) => ({ ...r, startNumber: Number(e.target.value) || 1 }))}
                      className="h-7 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">{t.step}</Label>
                    <Input
                      type="number"
                      value={rule.step}
                      onChange={(e) => setRule((r) => ({ ...r, step: Number(e.target.value) || 1 }))}
                      className="h-7 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">{t.padZeros}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={6}
                      value={rule.digits}
                      onChange={(e) => setRule((r) => ({ ...r, digits: Number(e.target.value) || 2 }))}
                      className="h-7 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">{t.position}</Label>
                    <Select
                      value={rule.numberPosition}
                      onValueChange={(v) => setRule((r) => ({ ...r, numberPosition: v as NumberPosition }))}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prefix">{t.posPrefix}</SelectItem>
                        <SelectItem value="suffix">{t.posSuffix}</SelectItem>
                        <SelectItem value="replace">{t.posReplace}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">{t.separator}</Label>
                    <Input
                      value={rule.numberSeparator}
                      onChange={(e) => setRule((r) => ({ ...r, numberSeparator: e.target.value }))}
                      placeholder="_"
                      className="h-7 font-mono text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Collision Warning */}
          {hasCollisions && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{t.collisionWarning}</span>
            </div>
          )}

          {/* Live Preview Table */}
          <div className="rounded-xl border bg-card/40 overflow-hidden">
            <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-xs font-semibold">
              <span>
                Files ({files.length}) · <span className="text-primary">{changedCount} renamed</span>
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadScript("powershell")}
                  className="h-7 text-xs gap-1"
                >
                  <Download className="size-3" />
                  {t.downloadPs1}
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => downloadScript("cmd")}
                  className="h-7 text-xs gap-1"
                >
                  <Download className="size-3" />
                  {t.downloadBat}
                </Button>
              </div>
            </div>

            <ScrollArea className="h-64">
              <div className="divide-y divide-border/60">
                {previewItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 px-3 py-2 text-xs ${
                      item.hasCollision
                        ? "bg-destructive/10"
                        : item.isChanged
                          ? "bg-primary/5 hover:bg-primary/10"
                          : "hover:bg-muted/30"
                    }`}
                  >
                    <span className="w-6 font-mono text-[10px] text-muted-foreground">{idx + 1}</span>
                    <span className="truncate text-muted-foreground font-mono" title={item.originalName}>
                      {item.originalName}
                    </span>
                    <span className="text-muted-foreground font-mono text-[10px]">→</span>
                    <div className="flex items-center justify-between gap-1 overflow-hidden">
                      <span
                        className={`truncate font-mono font-medium ${
                          item.hasCollision
                            ? "text-destructive font-bold"
                            : item.isChanged
                              ? "text-primary"
                              : "text-foreground"
                        }`}
                        title={item.newName}
                      >
                        {item.newName}
                      </span>
                      {item.hasCollision && (
                        <Badge variant="destructive" className="h-4 px-1 text-[9px] shrink-0">
                          Duplicate
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   3. SMART QR & BARCODE SCANNER TAB (PRO SUITE)
   ========================================================================= */
function QrScannerTab() {
  const { t } = useI18n();
  const inputId = useId();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<QrScanResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please provide an image file");
      return;
    }
    setScanning(true);
    setNotFound(false);
    setScanResult(null);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      const res = await scanQrFromImage(file);
      if (res) {
        setScanResult(res);
        toast.success("QR Code detected successfully!");
      } else {
        setNotFound(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      setNotFound(true);
    } finally {
      setScanning(false);
    }
  };

  // Listen to clipboard paste (Ctrl+V) anywhere on the window when this tab is open
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            void processImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleSaveToVault = async () => {
    if (!scanResult?.otp) return;
    const { issuer, label, secret } = scanResult.otp;

    if (!isVaultUnlocked()) {
      await copyText(secret, "Copied secret! Unlock Vault in Passwords to save.");
      return;
    }

    try {
      await createVaultEntry({
        title: issuer ? `${issuer} (2FA)` : label || "2FA Token",
        username: label,
        password: "",
        note: `Imported via QR Scanner on ${new Date().toLocaleDateString()}`,
        totpSecret: secret,
        url: "",
      });
      toast.success(t.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-4">
      <label
        htmlFor={inputId}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) void processImageFile(file);
        }}
        className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/20 p-6 text-center transition-colors hover:bg-muted/40"
      >
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void processImageFile(f);
          }}
        />

        {previewUrl ? (
          <div className="flex flex-col items-center gap-2">
            <img
              src={previewUrl}
              alt="Scan Target"
              className="max-h-40 rounded-xl border object-contain shadow-md bg-background"
            />
            <p className="text-xs text-primary">Click or drop another image, or press Ctrl+V to paste screenshot</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <QrCode className="size-5" />
            </div>
            <p className="text-sm font-medium">{t.dropQrImage}</p>
            <p className="text-xs text-muted-foreground">100% offline & client-side • Supports WiFi, 2FA OTP, URLs & Text</p>
          </div>
        )}
      </label>

      {scanning && <p className="text-center text-xs text-muted-foreground animate-pulse">Scanning image for QR / Barcode...</p>}

      {notFound && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <XCircle className="size-4 shrink-0" />
          <span>{t.noQrFound}</span>
        </div>
      )}

      {scanResult && (
        <div className="space-y-3 rounded-xl border bg-card/60 p-4">
          {/* WiFi Payload */}
          {scanResult.type === "wifi" && scanResult.wifi && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-500 text-white gap-1">
                  <Wifi className="size-3.5" />
                  {t.qrWifiDetected}
                </Badge>
                {scanResult.wifi.password && (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 gap-1 text-xs"
                    onClick={() => void copyText(scanResult.wifi?.password ?? "", t.copied)}
                  >
                    <Copy className="size-3.5" />
                    {t.connectWifi}
                  </Button>
                )}
              </div>
              <div className="grid gap-2 rounded-lg border bg-background/60 p-3 text-xs sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">SSID (Network Name):</span>
                  <p className="font-semibold text-sm">{scanResult.wifi.ssid}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Password:</span>
                  <p className="font-mono font-medium">{scanResult.wifi.password || "(None)"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Encryption:</span>
                  <p className="font-mono text-muted-foreground">{scanResult.wifi.encryption || "WPA"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Hidden:</span>
                  <p className="font-mono text-muted-foreground">{scanResult.wifi.hidden ? "Yes" : "No"}</p>
                </div>
              </div>
            </div>
          )}

          {/* 2FA OTP Auth Payload */}
          {scanResult.type === "otp" && scanResult.otp && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-indigo-500 text-white gap-1">
                  <KeyRound className="size-3.5" />
                  {t.qrOtpDetected}
                </Badge>
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 gap-1 text-xs"
                  onClick={() => void handleSaveToVault()}
                >
                  <Sparkles className="size-3.5" />
                  {t.saveToVault}
                </Button>
              </div>
              <div className="grid gap-2 rounded-lg border bg-background/60 p-3 text-xs sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Issuer / Service:</span>
                  <p className="font-semibold text-sm">{scanResult.otp.issuer || "General"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Account Label:</span>
                  <p className="font-medium">{scanResult.otp.label}</p>
                </div>
                <div className="col-span-full">
                  <span className="text-muted-foreground">Secret Key:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Input readOnly value={scanResult.otp.secret} className="font-mono text-xs" />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 shrink-0"
                      onClick={() => void copyText(scanResult.otp?.secret ?? "", t.copied)}
                    >
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Web URL Payload */}
          {scanResult.type === "url" && scanResult.url && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-blue-500 text-white gap-1">
                  <ExternalLink className="size-3.5" />
                  {t.qrUrlDetected}
                </Badge>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => void copyText(scanResult.url ?? "", t.copied)}
                  >
                    <Copy className="size-3.5" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs gap-1"
                    onClick={() => window.open(scanResult.url, "_blank")}
                  >
                    <ExternalLink className="size-3.5" />
                    {t.openUrl}
                  </Button>
                </div>
              </div>
              <Input readOnly value={scanResult.url} className="font-mono text-xs" />
            </div>
          )}

          {/* Plain Text Payload */}
          {scanResult.type === "text" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{t.rawPayload}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 gap-1 text-xs"
                  onClick={() => void copyText(scanResult.raw, t.copied)}
                >
                  <Copy className="size-3" />
                  Copy
                </Button>
              </div>
              <Textarea readOnly rows={4} value={scanResult.raw} className="font-mono text-xs" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   4. IMAGE CONVERTER TAB
   ========================================================================= */
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

/* =========================================================================
   5. TEXT INSPECTOR TAB
   ========================================================================= */
function TextInspectorTab() {
  const { t } = useI18n();
  const [text, setText] = useState("Hello World! DN Assistant v0.4.0 is awesome.");

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s+/g, "").length;
    const lines = text ? text.split("\n").length : 0;
    const readingTimeMins = Math.ceil(words / 200);

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
