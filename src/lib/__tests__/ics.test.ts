import { describe, expect, it } from "vitest";
import { exportEventsToIcs, parseIcs } from "@/lib/ics";
import type { CalendarEvent } from "@/lib/events";

describe("ics", () => {
  it("round-trips an event", () => {
    const start = Date.UTC(2026, 0, 15, 2, 30);
    const event = {
      id: 1,
      title: "Họp nhóm, tuần; 1",
      note: "Line 1\nLine 2",
      start_at: start,
      end_at: start + 3600_000,
      all_day: 0,
      color: null,
      remind_minutes: 0,
      repeat: "weekly",
      repeat_until: null,
      created_at: start,
      updated_at: start,
    } as unknown as CalendarEvent;
    const [parsed] = parseIcs(exportEventsToIcs([event]));
    expect(parsed?.title).toBe(event.title);
    expect(parsed?.start_at).toBe(start);
    expect(parsed?.end_at).toBe(start + 3600_000);
    expect(parsed?.repeat).toBe("weekly");
  });

  it("unfolds long lines", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "SUMMARY:Hello",
      "  world",
      "DTSTART:20260115T023000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    expect(parseIcs(ics)[0]?.title).toBe("Hello world");
  });
});
