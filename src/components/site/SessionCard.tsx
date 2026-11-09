import Link from "next/link";
import { Clock, MapPin, Users, Award, Ticket } from "lucide-react";
import type { ProgrammeSession } from "@/lib/queries";
import { cn, fmtDate, fmtTime, pkr, SESSION_TYPE_LABEL } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { AddTicket } from "@/components/cart/CartDrawer";

export const TYPE_STYLE: Record<string, string> = {
  KEYNOTE: "bg-lnh-red/15 text-lnh-rose border-lnh-red/30",
  PLENARY: "bg-lnh-blue/15 text-lnh-sky border-lnh-blue/30",
  SCIENTIFIC: "bg-cyan-400/10 text-cyan-300 border-cyan-400/30",
  PANEL: "bg-violet-400/10 text-violet-300 border-violet-400/30",
  WORKSHOP: "bg-lnh-gold/10 text-lnh-gold border-lnh-gold/30",
  CEREMONY: "bg-white/5 text-slate-300 border-white/15",
  BREAK: "bg-white/5 text-slate-400 border-white/10",
};

export function SessionCard({ s, taken, early, showDate, cta, href }: { s: ProgrammeSession; taken?: number; early?: boolean; showDate?: boolean; cta?: { href: string; label: string }; href?: string }) {
  const left = s.capacity != null ? Math.max(0, s.capacity - (taken ?? 0)) : null;
  // Workshops are separate tickets with one price (D1, D2); every other session is covered by the Symposium Pass
  const ws = s.type === "WORKSHOP";
  const fee = s.fee;
  return (
    <article className="hud group relative flex h-full flex-col overflow-hidden p-6 transition duration-500 hover:-translate-y-1 sm:p-7">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lnh-sky/60 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest", TYPE_STYLE[s.type])}>{SESSION_TYPE_LABEL[s.type]}</span>
        {s.track && <span className="chip">{s.track}</span>}
        {s.cmeHours ? <span className="chip gap-1"><Award className="h-3 w-3" />{s.cmeHours} CME</span> : null}
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold leading-snug text-white">{href ? <Link href={href} className="hover:text-lnh-sky hover:underline">{s.title}</Link> : s.title}</h3>
      {s.description && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-400">{s.description}</p>}
      <ul className="mt-5 space-y-1.5 text-sm text-slate-300">
        <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-lnh-sky" />{showDate && <>{fmtDate(s.startsAt, { weekday: "short", day: "numeric", month: "short" })} · </>}{fmtTime(s.startsAt)} – {fmtTime(s.endsAt)}</li>
        {s.hall && <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-lnh-sky" />{s.hall}</li>}
        {ws && s.capacity != null && <li className="flex items-center gap-2"><Users className="h-4 w-4 text-lnh-sky" />{left === 0 ? <span className="font-semibold text-lnh-rose">Fully booked</span> : <>{left} seats left</>}</li>}
      </ul>
      {s.speakers.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-3 border-t border-white/10 pt-5">
          {s.speakers.map(({ speaker, role }) => (
            <div key={speaker.id} className="flex items-center gap-2.5">
              <Avatar name={speaker.name} src={speaker.photoUrl} className="h-9 w-9 rounded-full text-[7px]" />
              <div className="leading-tight">
                <p className="text-sm font-medium text-white">{speaker.title} {speaker.name}</p>
                <p className="text-[11px] text-slate-400">{role}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {ws ? (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
          <div><p className="text-[11px] uppercase tracking-widest text-slate-400">Workshop ticket</p><p className="font-display text-lg font-bold text-white">{pkr(fee)}</p></div>
          {s.registrable && <AddTicket disabled={left === 0} item={{ id: s.id, title: s.title, kind: "WORKSHOP", fee, when: fmtDate(s.startsAt, { weekday: "short", day: "numeric", month: "short" }), tag: s.department ?? s.track }} />}
        </div>
      ) : s.type !== "BREAK" && (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-lnh-sky/40 bg-lnh-sky/10 px-3 py-1.5 text-xs font-semibold text-lnh-sky"><Ticket className="h-3.5 w-3.5" />Covered by your Symposium Pass</span>
          {cta && <Link href={cta.href} className="btn-ghost btn-sm">{cta.label}</Link>}
        </div>
      )}
    </article>
  );
}
