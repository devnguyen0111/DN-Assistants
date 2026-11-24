import { useMemo, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { formatTimestampLocal, getRelativeTime, WORLD_TIMEZONES } from "@/lib/devtools";

import { copyText } from "@/components/tools/shared";

/* -------------------------------------------------------------
 * 9. TIME TAB (Unix, ISO, Relative, World Times)
 * ------------------------------------------------------------- */
export function TimeTab() {
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
            <input type="radio" name="timeunit" checked={!isMs} onChange={() => setIsMs(false)} />
            <span>{t.timeUnitSec}</span>
          </label>
          <label className="flex items-center gap-1 text-xs cursor-pointer">
            <input type="radio" name="timeunit" checked={isMs} onChange={() => setIsMs(true)} />
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
            placeholder={t.unixTimestamp}
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
          <Badge variant="secondary">{getRelativeTime(currentNumeric, locale, isMs)}</Badge>
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
                <div
                  key={wt.zone}
                  className="flex justify-between rounded bg-background px-2 py-1 border"
                >
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
