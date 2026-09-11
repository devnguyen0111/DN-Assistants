import { useEffect, useRef, useState } from "react";
import { animate, createScope, stagger } from "animejs";
import { AgendaCard } from "@/components/cards/AgendaCard";
import { CalendarCard } from "@/components/cards/CalendarCard";
import type { CalendarEvent } from "@/lib/events";

export function CalendarPage() {
  const root = useRef<HTMLDivElement>(null);
  const scope = useRef<ReturnType<typeof createScope> | null>(null);
  const [agendaKey, setAgendaKey] = useState(0);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    if (!root.current) return;
    scope.current = createScope({ root }).add(() => {
      animate(".page-enter", {
        opacity: [0, 1],
        y: [16, 0],
        delay: stagger(40),
        duration: 420,
        ease: "outCubic",
      });
    });
    return () => scope.current?.revert();
  }, []);

  return (
    <div ref={root} className="space-y-4">
      <div className="page-enter">
        <CalendarCard
          onEventsChanged={() => setAgendaKey((k) => k + 1)}
          editEvent={editEvent}
          onEditConsumed={() => setEditEvent(null)}
        />
      </div>
      <div className="page-enter max-w-xl">
        <AgendaCard refreshKey={agendaKey} onEditEvent={setEditEvent} />
      </div>
    </div>
  );
}
