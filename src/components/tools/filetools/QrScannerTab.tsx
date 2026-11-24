import { useEffect, useId, useState } from "react";
import { Copy, ExternalLink, KeyRound, QrCode, Sparkles, Wifi, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { scanQrFromImage, type QrScanResult } from "@/lib/qr-scanner";
import { createVaultEntry, isVaultUnlocked } from "@/lib/vault";

import { copyText } from "@/components/tools/shared";

/* =========================================================================
   3. SMART QR & BARCODE SCANNER TAB (PRO SUITE)
   ========================================================================= */
export function QrScannerTab() {
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
            <p className="text-xs text-primary">
              Click or drop another image, or press Ctrl+V to paste screenshot
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <QrCode className="size-5" />
            </div>
            <p className="text-sm font-medium">{t.dropQrImage}</p>
            <p className="text-xs text-muted-foreground">
              100% offline & client-side • Supports WiFi, 2FA OTP, URLs & Text
            </p>
          </div>
        )}
      </label>

      {scanning && (
        <p className="text-center text-xs text-muted-foreground animate-pulse">
          Scanning image for QR / Barcode...
        </p>
      )}

      {notFound && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <XCircle className="size-4 shrink-0" />
          <span>{t.noQrFound}</span>
        </div>
      )}

      {scanResult && (
        <div className="space-y-3 rounded-xl border bg-card p-4">
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
              <div className="grid gap-2 rounded-lg border bg-surface-1 p-3 text-xs sm:grid-cols-2">
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
                  <p className="font-mono text-muted-foreground">
                    {scanResult.wifi.encryption || "WPA"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Hidden:</span>
                  <p className="font-mono text-muted-foreground">
                    {scanResult.wifi.hidden ? "Yes" : "No"}
                  </p>
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
              <div className="grid gap-2 rounded-lg border bg-surface-1 p-3 text-xs sm:grid-cols-2">
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
