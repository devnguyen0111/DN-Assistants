import { useEffect, useMemo, useState } from "react";
import { Download, QrCode } from "lucide-react";
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

/* -------------------------------------------------------------
 * 7. QR CODE TAB (Presets & Download PNG)
 * ------------------------------------------------------------- */
export function QrTab() {
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
            <span>{t.qrEnterContent}</span>
          </div>
        )}
      </div>
    </div>
  );
}
