import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { localeTag, useI18n } from "@/lib/i18n";
import { listUpcoming, type CalendarEvent } from "@/lib/events";

type Props = {
  refreshKey?: number;
};

export function AgendaCard({ refreshKey = 0 }: Props) {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    void listUpcoming()
      .then(setEvents)
      .catch(() => setEvents([]));
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
        <ScrollArea className="h-[180px] pr-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noEvents}</p>
          ) : (
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
                  <div
                    key={event.id}
                    className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-1 size-2 rounded-full"
                        style={{ background: event.color ?? "#38bdf8" }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{when}</p>
                        {event.note && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {event.note}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
