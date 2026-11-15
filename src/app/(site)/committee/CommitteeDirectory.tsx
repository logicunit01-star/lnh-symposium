"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

type P = { id: string; name: string; role: string; designation: string | null; department: string | null; photoUrl: string | null };
type G = { group: string; people: P[] };
const LEAD = /chair|secretary/i;
const slug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** 30 committees, about 290 people: compact cards (leadership first, then members), jump links and a name search. */
export function CommitteeDirectory({ groups }: { groups: G[] }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return groups;
    return groups.map((g) => ({ ...g, people: g.group.toLowerCase().includes(t) ? g.people : g.people.filter((p) => p.name.toLowerCase().includes(t)) })).filter((g) => g.people.length);
  }, [q, groups]);
  const total = groups.reduce((a, g) => a + g.people.length, 0);
  return (
    <>
      <div className="mb-10 space-y-5">
        <label className="relative block max-w-md">
          <span className="sr-only">Search the committees</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${total} names or a committee…`} className="input pl-11" />
        </label>
        {!q && (
          <nav aria-label="Committees" className="flex flex-wrap gap-2">
            {groups.map((g, i) => <a key={g.group} href={`#${slug(g.group)}`} className="rounded-full border border-white/20 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-lnh-sky/60 hover:text-white">{String(i + 1).padStart(2, "0")} · {g.group}</a>)}
          </nav>
        )}
        {q && <p className="text-sm text-slate-400" aria-live="polite">{shown.reduce((a, g) => a + g.people.length, 0)} match{shown.length ? "es" : ""} in {shown.length} committee{shown.length === 1 ? "" : "s"}</p>}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {shown.map((g) => {
          const n = groups.findIndex((x) => x.group === g.group) + 1;
          const lead = g.people.filter((p) => LEAD.test(p.role)), rest = g.people.filter((p) => !LEAD.test(p.role));
          return (
            <section key={g.group} id={slug(g.group)} className="card scroll-mt-28 p-6">
              <h2 className="flex items-baseline gap-3 font-display text-xl font-bold text-white"><span className="font-mono text-sm text-lnh-rose">{String(n).padStart(2, "0")}</span>{g.group}</h2>
              {lead.length > 0 && (
                <ul className="mt-5 space-y-3">{lead.map((p) => (
                  <li key={p.id} className="flex items-center gap-3">
                    <Avatar name={p.name} src={p.photoUrl} className="h-11 w-11 shrink-0 rounded-xl text-[8px]" />
                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-lnh-rose">{p.role}</p>
                      <p className="font-semibold text-white">{p.name}</p>{(p.designation || p.department) && <p className="text-xs text-slate-400">{[p.designation, p.department].filter(Boolean).join(" · ")}</p>}</div>
                  </li>
                ))}</ul>
              )}
              {rest.length > 0 && (
                <>
                  <p className="mt-5 border-t border-white/10 pt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{rest.every((p) => p.role === rest[0].role) && rest[0].role !== "Member" ? (rest[0].role.endsWith("Member") && rest.length > 1 ? `${rest[0].role}s` : rest[0].role) : "Members"}</p>
                  <ul className="mt-2 grid gap-x-6 gap-y-1.5 text-sm text-slate-200 sm:grid-cols-2">{rest.map((p) => <li key={p.id}>{p.name}{p.role !== "Member" && p.role !== rest[0].role ? <span className="text-xs text-slate-400"> · {p.role}</span> : null}</li>)}</ul>
                </>
              )}
            </section>
          );
        })}
      </div>
      {!shown.length && <p className="py-16 text-center text-slate-400">No one matches “{q}”.</p>}
    </>
  );
}
