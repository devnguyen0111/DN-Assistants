import { useEffect, useMemo, useRef, useState } from "react";
import { animate, createScope } from "animejs";
import { Clock3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { localeTag, useI18n } from "@/lib/i18n";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function ClockCard() {
  const { locale, t } = useI18n();
  const [now, setNow] = useState(() => new Date());
  const timeRef = useRef<HTMLDivElement>(null);
  const scope = useRef<ReturnType<typeof createScope> | null>(null);
  const prevSecond = useRef(now.getSeconds());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!timeRef.current) return;
    if (prevSecond.current === now.getSeconds()) return;
    prevSecond.current = now.getSeconds();
    scope.current?.revert();
    scope.current = createScope({ root: timeRef }).add(() => {
      animate(".clock-digit", {
        y: [{ to: -6, duration: 80 }, { to: 0, duration: 180 }],
        opacity: [{ to: 0.55, duration: 80 }, { to: 1, duration: 180 }],
        ease: "outQuad",
      });
    });
    return () => scope.current?.revert();
  }, [now]);

  const tag = localeTag(locale);
  const weekday = useMemo(
    () => new Intl.DateTimeFormat(tag, { weekday: "long" }).format(now),
    [now, tag],
  );
  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(tag, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(now),
    [now, tag],
  );
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );

  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Clock3 className="size-4 text-primary" />
          {t.clock}
        </CardTitle>
        <Badge variant="secondary">{timezone}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col justify-center gap-2">
        <div
          ref={timeRef}
          className="font-mono text-4xl font-semibold tracking-tight tabular-nums md:text-5xl"
        >
          <span className="clock-digit inline-block">{hours}</span>
          <span className="mx-1 text-muted-foreground">:</span>
          <span className="clock-digit inline-block">{minutes}</span>
          <span className="mx-1 text-muted-foreground">:</span>
          <span className="clock-digit inline-block text-primary">{seconds}</span>
        </div>
        <div>
          <p className="text-base font-medium capitalize">{weekday}</p>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        </div>
      </CardContent>
    </Card>
  );
}
