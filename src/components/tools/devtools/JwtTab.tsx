import { useState } from "react";
import { Copy, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { decodeJwt } from "@/lib/devtools";

import { copyText } from "@/components/tools/shared";

/* -------------------------------------------------------------
 * 4. JWT TAB (Inspector & Token status)
 * ------------------------------------------------------------- */
export function JwtTab() {
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
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setToken(sampleToken)}
            className="h-5 px-1.5 text-[11px]"
          >
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
