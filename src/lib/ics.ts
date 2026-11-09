// Calendar files (.ics, RFC 5545) for tickets: the symposium days for a pass, and each workshop ticket.
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
/** Lines longer than 75 octets are folded (RFC 5545 §3.1). */
const fold = (l: string) => l.length <= 74 ? l : l.match(/.{1,73}/g)!.join("\r\n ");

export type IcsEvent = { uid: string; start: Date; end: Date; title: string; location?: string | null; description?: string; url?: string; allDay?: boolean };

export function ics(events: IcsEvent[], name: string) {
  const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//LNH Symposium//Tickets//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${esc(name)}`];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}`, `DTSTAMP:${stamp(new Date())}`,
      ...(e.allDay ? [`DTSTART;VALUE=DATE:${ymd(e.start)}`, `DTEND;VALUE=DATE:${ymd(new Date(e.end.getTime() + 864e5))}`] : [`DTSTART:${stamp(e.start)}`, `DTEND:${stamp(e.end)}`]),
      `SUMMARY:${esc(e.title)}`, ...(e.location ? [`LOCATION:${esc(e.location)}`] : []), ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []), ...(e.url ? [`URL:${e.url}`] : []),
      "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.title)} tomorrow`, "END:VALARM", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
