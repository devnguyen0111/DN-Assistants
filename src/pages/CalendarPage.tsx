import { useState } from "react";
import { AgendaCard } from "@/components/cards/AgendaCard";
import { CalendarCard } from "@/components/cards/CalendarCard";
import { PageLayout } from "@/components/layout/PageLayout";
import type { CalendarEvent } from "@/lib/events";

export function CalendarPage() {
  const [agendaKey, setAgendaKey] = useState(0);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);

  return (
    <PageLayout route="calendar">
      <CalendarCard
        onEventsChanged={() => setAgendaKey((k) => k + 1)}
        editEvent={editEvent}
        onEditConsumed={() => setEditEvent(null)}
        upcoming={<AgendaCard refreshKey={agendaKey} onEditEvent={setEditEvent} variant="rail" />}
      />
    </PageLayout>
  );
}
