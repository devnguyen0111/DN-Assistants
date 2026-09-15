import type { CalendarEvent, EventInput } from "@/lib/events";

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

/** Format as UTC ICS timestamp: YYYYMMDDTHHMMSSZ */
function toIcsUtc(ms: number): string {
  const d = new Date(ms);
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

/** Format as floating/local all-day date: YYYYMMDD */
function toIcsDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function unfoldIcs(text: string): string {
  return text.replace(/\r\n|\n|\r/g, "\n").replace(/\n[ \t]/g, "");
}

function parseIcsDateTime(raw: string): number | null {
  const cleaned = raw.trim();
  // YYYYMMDD
  if (/^\d{8}$/.test(cleaned)) {
    const y = Number(cleaned.slice(0, 4));
    const m = Number(cleaned.slice(4, 6)) - 1;
    const d = Number(cleaned.slice(6, 8));
    return new Date(y, m, d).getTime();
  }
  // YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  const m = cleaned.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const min = Number(m[5]);
  const sec = Number(m[6]);
  if (m[7] === "Z") {
    return Date.UTC(year, month, day, hour, min, sec);
  }
  return new Date(year, month, day, hour, min, sec).getTime();
}

export function exportEventsToIcs(events: CalendarEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DN Assistant//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const event of events) {
    const uid = `dn-${event.id}@dn-assistant`;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${toIcsUtc(event.updated_at || event.created_at || Date.now())}`);
    if (event.all_day === 1) {
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(event.start_at)}`);
      if (event.end_at != null) {
        // ICS all-day DTEND is exclusive; add one day if same calendar day
        const end = new Date(event.end_at);
        end.setDate(end.getDate() + 1);
        lines.push(`DTEND;VALUE=DATE:${toIcsDate(end.getTime())}`);
      }
    } else {
      lines.push(`DTSTART:${toIcsUtc(event.start_at)}`);
      if (event.end_at != null) {
        lines.push(`DTEND:${toIcsUtc(event.end_at)}`);
      }
    }
    lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
    if (event.note) {
      lines.push(`DESCRIPTION:${escapeIcsText(event.note)}`);
    }
    if (event.repeat === "daily") {
      lines.push("RRULE:FREQ=DAILY");
    } else if (event.repeat === "weekly") {
      lines.push("RRULE:FREQ=WEEKLY");
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export function parseIcs(text: string): EventInput[] {
  const unfolded = unfoldIcs(text);
  const blocks = unfolded.split(/BEGIN:VEVENT/i).slice(1);
  const results: EventInput[] = [];

  for (const block of blocks) {
    const body = block.split(/END:VEVENT/i)[0] ?? "";
    const props = new Map<string, string>();
    for (const line of body.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const colon = trimmed.indexOf(":");
      if (colon < 0) continue;
      const keyPart = trimmed.slice(0, colon);
      const value = trimmed.slice(colon + 1);
      const key = keyPart.split(";")[0]!.toUpperCase();
      props.set(key, value);
      // keep full key for VALUE=DATE detection
      props.set(`__raw_${key}`, keyPart);
    }

    const summary = props.get("SUMMARY");
    const dtStart = props.get("DTSTART");
    if (!summary || !dtStart) continue;

    const startRawKey = props.get("__raw_DTSTART") ?? "DTSTART";
    const allDay = /VALUE=DATE/i.test(startRawKey) || /^\d{8}$/.test(dtStart);
    const start_at = parseIcsDateTime(dtStart);
    if (start_at == null || !Number.isFinite(start_at)) continue;

    let end_at: number | null = null;
    const dtEnd = props.get("DTEND");
    if (dtEnd) {
      end_at = parseIcsDateTime(dtEnd);
      if (allDay && end_at != null) {
        // exclusive end → inclusive previous day for storage
        const d = new Date(end_at);
        d.setDate(d.getDate() - 1);
        end_at = d.getTime();
      }
    }

    let repeat: EventInput["repeat"] = "none";
    const rrule = props.get("RRULE");
    if (rrule) {
      if (/FREQ=DAILY/i.test(rrule)) repeat = "daily";
      else if (/FREQ=WEEKLY/i.test(rrule)) repeat = "weekly";
    }

    results.push({
      title: unescapeIcsText(summary),
      note: props.get("DESCRIPTION") ? unescapeIcsText(props.get("DESCRIPTION")!) : undefined,
      start_at,
      end_at,
      all_day: allDay,
      repeat,
    });
  }

  return results;
}
