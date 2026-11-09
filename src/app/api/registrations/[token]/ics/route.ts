import { loadRegistration } from "@/lib/registration";
import { getEvent, eventDays } from "@/lib/event";
import { ics, type IcsEvent } from "@/lib/ics";
import { appUrl } from "@/lib/utils";

/** Calendar file for a registration's tickets; `?item=<id>` = one workshop ticket. */
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const r = await loadRegistration({ accessToken: params.token });
  if (!r) return new Response("Not found", { status: 404 });
  const ev = await getEvent();
  const only = new URL(req.url).searchParams.get("item");
  const link = `${appUrl()}/register/success/${r.accessToken}`;
  const events: IcsEvent[] = [];
  if (r.hasPass && !only) {
    const days = eventDays(ev);
    events.push({ uid: `${r.regNo}-pass@lnh-symposium`, start: days[0], end: days.at(-1)!, allDay: true,
      title: `${ev.name} (Symposium Pass ${r.regNo})`, location: ev.venue, description: `Symposium Pass ${r.regNo}. Show your QR at the entrance. ${link}`, url: link });
  }
  for (const i of r.items) {
    if (only && i.id !== only) continue;
    events.push({ uid: `${i.ticketNo ?? i.id}@lnh-symposium`, start: i.session.startsAt, end: i.session.endsAt, title: `Workshop: ${i.session.title}`,
      location: [i.session.hall, ev.venue].filter(Boolean).join(", "), description: `Workshop ticket ${i.ticketNo ?? r.regNo}. Show its QR at the door. ${link}`, url: link });
  }
  if (!events.length) return new Response("Not found", { status: 404 });
  return new Response(ics(events, ev.name), { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="${only ? "workshop" : r.regNo}.ics"` } });
}
