import type { PublicPerson } from "@/lib/programme-pages";

const LEAD: [string, string][] = [["CHAIR", "Chairperson"], ["CO_CHAIR", "Co-Chairperson"], ["MODERATOR", "Moderator"]];
const ITEM_ROLE: Record<string, string> = { KEYNOTE: "Keynote", SPEAKER: "Guest speaker", PANELIST: "Panelist", PRESENTER: "Research paper" };
const who = (p: PublicPerson) => [p.designation, p.affiliation].filter(Boolean).join(", ");
const start = (t: string | null) => { const m = (t ?? "").match(/(\d{1,2})[:.](\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : 9999; };

/** A session's people and running order (Dashboard Instructions, revised 06-11-2026: "all program details should be shown, including agenda"). */
export function SessionAgenda({ people, compact = false }: { people: PublicPerson[]; compact?: boolean }) {
  const leads = LEAD.map(([k, l]) => [l, people.filter((p) => p.role === k)] as const).filter(([, v]) => v.length);
  const items = people.filter((p) => ITEM_ROLE[p.role]).sort((a, b) => start(a.timeSlot) - start(b.timeSlot) || a.order - b.order);
  if (!leads.length && !items.length) return null;
  return (
    <div className={compact ? "mt-4 space-y-3" : "mt-8 space-y-5"}>
      {leads.length > 0 && (
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          {leads.map(([label, list]) => (
            <div key={label}><dt className="text-xs uppercase tracking-wider text-slate-400">{label}</dt>
              {list.map((p) => <dd key={p.name} className="text-slate-100">{p.name}{who(p) && <span className="block text-xs text-slate-400">{who(p)}</span>}</dd>)}</div>
          ))}
        </dl>
      )}
      {items.length > 0 && (
        <div>
          {!compact && <h2 className="font-display text-xl font-bold text-white">Agenda</h2>}
          <ol className={compact ? "divide-y divide-white/10 text-sm" : "mt-3 divide-y divide-white/10"}>
            {items.map((p, i) => (
              <li key={i} className="grid gap-1 py-2.5 sm:grid-cols-[110px_1fr]">
                <span className="mono text-xs text-lnh-sky">{p.timeSlot || "—"}</span>
                <span><span className="text-slate-100">{p.topic || ITEM_ROLE[p.role]}</span>
                  <span className="block text-xs text-slate-400">{ITEM_ROLE[p.role]}{p.abstractRef ? ` · ${p.abstractRef}` : ""} · {p.name}{who(p) ? `, ${who(p)}` : ""}</span></span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
