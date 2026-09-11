import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state-block";
import { localeTag, useI18n } from "@/lib/i18n";
import { formatEventRange, listUpcoming, type CalendarEvent } from "@/lib/events";
import { formatTimeHm } from "@/lib/utils";

type Props = {
  refreshKey?: number;
  onEditEvent?: (event: CalendarEvent) => void;
};

export function AgendaCard({ refreshKey = 0, onEditEvent }: Props) {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    void listUpcoming()
      .then((rows) => {
        setEvents(rows);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [refreshKey]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" />
          {t.agenda}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] pr-2">
          {loading && <LoadingState title={t.loading} />}
          {!loading && error && (
            <ErrorState
              title={t.errorTitle}
              description={error}
              action={<button type="button" className="text-sm underline" onClick={load}>{t.retry}</button>}
            />
          )}
          {!loading && !error && events.length === 0 && <EmptyState title={t.noEvents} />}
          {!loading && !error && events.length > 0 && (
            <div className="space-y-2">
              {events.map((event) => {
                const when = new Intl.DateTimeFormat(tag, {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  hour: event.all_day ? undefined : "2-digit",
                  minute: event.all_day ? undefined : "2-digit",
                }).format(new Date(event.start_at));
                return (
                  <button
                    key={event.id}
                    type="button"
                    className="w-full rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-left transition-colors hover:bg-muted/40"
                    onClick={() => onEditEvent?.(event)}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-1 size-2 rounded-full"
                        style={{ background: event.color ?? "#38bdf8" }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-medium">{event.title}</p>
                          <Badge variant="secondary" className="shrink-0 font-mono tabular-nums">
                            {event.all_day === 1 ? t.allDay : formatTimeHm(event.start_at)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{when}</p>
                        <p className="font-mono text-xs tabular-nums text-muted-foreground">
                          {formatEventRange(event, t.allDay)}
                        </p>
                        {event.note && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {event.note}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
