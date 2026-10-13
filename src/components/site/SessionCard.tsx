import Link from "next/link";
import { Clock, MapPin, Users, Award } from "lucide-react";
import type { ProgrammeSession } from "@/lib/queries";
import { cn, fmtDate, fmtTime, pkr, SESSION_TYPE_LABEL } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";

export const TYPE_STYLE: Record<string, string> = {
  KEYNOTE: "bg-lnh-red/15 text-lnh-rose border-lnh-red/30",
  PLENARY: "bg-lnh-blue/15 text-lnh-sky border-lnh-blue/30",
  SCIENTIFIC: "bg-cyan-400/10 text-cyan-300 border-cyan-400/30",
  PANEL: "bg-violet-400/10 text-violet-300 border-violet-400/30",
  WORKSHOP: "bg-lnh-gold/10 text-lnh-gold border-lnh-gold/30",
  CEREMONY: "bg-white/5 text-slate-300 border-white/15",
  BREAK: "bg-white/5 text-slate-400 border-white/10",
};

export function SessionCard({ s, taken, early, showDate, cta }: { s: ProgrammeSession; taken?: number; early?: boolean; showDate?: boolean; cta?: { href: string; label: string } }) {
  const left = s.capacity != null ? Math.max(0, s.capacity - (taken ?? 0)) : null;
  const fee = early && s.earlyFee != null ? s.earlyFee : s.fee;
  return (
    <article className="card card-hover group relative flex h-full flex-col overflow-hidden p-6 sm:p-7">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lnh-sky/60 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest", TYPE_STYLE[s.type])}>{SESSION_TYPE_LABEL[s.type]}</span>
        {s.track && <span className="chip">{s.track}</span>}
        {s.cmeHours ? <span className="chip gap-1"><Award className="h-3 w-3" />{s.cmeHours} CME</span> : null}
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold leading-snug text-white">{s.title}</h3>
      {s.description && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-400">{s.description}</p>}
      <ul className="mt-5 space-y-1.5 text-sm text-slate-300">
        <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-lnh-sky" />{showDate && <>{fmtDate(s.startsAt, { weekday: "short", day: "numeric", month: "short" })} · </>}{fmtTime(s.startsAt)} – {fmtTime(s.endsAt)}</li>
        {s.hall && <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-lnh-sky" />{s.hall}</li>}
        {s.capacity != null && <li className="flex items-center gap-2"><Users className="h-4 w-4 text-lnh-sky" />{left === 0 ? <span className="font-semibold text-lnh-rose">Fully booked</span> : <>{left} of {s.capacity} seats left</>}</li>}
      </ul>
      {s.capacity != null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-lnh-sky to-lnh-red" style={{ width: `${Math.min(100, ((taken ?? 0) / s.capacity) * 100)}%` }} />
        </div>
      )}
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
      {(s.fee > 0 || cta) && (
        <div className="mt-auto flex items-center justify-between gap-4 pt-6">
          {s.fee > 0 ? <div><p className="text-[10px] uppercase tracking-widest text-slate-500">Fee</p><p className="font-display text-lg font-bold text-white">{pkr(fee)}{early && s.earlyFee != null && s.earlyFee < s.fee && <span className="ml-2 text-xs font-normal text-slate-500 line-through">{pkr(s.fee)}</span>}</p></div> : <span />}
          {cta && left !== 0 && <Link href={cta.href} className="btn-primary btn-sm">{cta.label}</Link>}
        </div>
      )}
    </article>
  );
}
