import { PEOPLE_ROLES, SESSION_FORMATS, slotLabel } from "@/lib/scientific";
import type { SessionSlot } from "@/lib/db/schema";
import { fmtDateTime } from "@/lib/utils";

type P = { name: string; phone?: string; email?: string; designation?: string; affiliation?: string; topic?: string; timeSlot?: string; abstractRef?: string };
type Snap = { title?: string; department?: string; sessionFormat?: string; formatOther?: string; preferredSlots?: string[]; expectedAudience?: number | null;
  chair?: P; coChair?: P; moderator?: P; panelists?: P[]; speakers?: P[]; presenters?: P[]; submittedBy?: string };

/** Read-only record of the department's agenda exactly as first submitted (SC feedback, 29 Oct 2026). */
export function OriginalAgenda({ data, at, slots, open }: { data: Snap; at: Date | null; slots: SessionSlot[]; open?: boolean }) {
  const one = (role: string, p?: P) => p?.name ? [{ role, ...p }] : [];
  const people = [...one("CHAIR", data.chair), ...one("CO_CHAIR", data.coChair), ...one("MODERATOR", data.moderator),
    ...(data.panelists ?? []).map((p) => ({ role: "PANELIST", ...p })), ...(data.speakers ?? []).map((p) => ({ role: "SPEAKER", ...p })), ...(data.presenters ?? []).map((p) => ({ role: "PRESENTER", ...p }))];
  return (
    <details className="a-card p-5" open={open}>
      <summary className="cursor-pointer font-semibold">Original agenda as submitted by the department <span className="text-xs font-normal text-slate-500">{at ? `· ${fmtDateTime(at)}` : ""}{data.submittedBy ? ` · ${data.submittedBy}` : ""} · read only</span></summary>
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-slate-500">Title / topic</dt><dd className="font-medium">{data.title || "—"}</dd></div>
        <div><dt className="text-xs text-slate-500">Session type</dt><dd className="font-medium">{SESSION_FORMATS[data.sessionFormat ?? ""] ?? "—"}{data.formatOther ? ` (${data.formatOther})` : ""}</dd></div>
        <div><dt className="text-xs text-slate-500">Preferred day / time</dt><dd className="font-medium">{(data.preferredSlots ?? []).map((k) => { const x = slots.find((y) => y.key === k); return x ? slotLabel(x) : k; }).join(" / ") || "—"}</dd></div>
        <div><dt className="text-xs text-slate-500">Expected participants</dt><dd className="font-medium">{data.expectedAudience ?? "—"}</dd></div>
      </dl>
      <ul className="mt-4 divide-y divide-slate-100 text-sm">{people.map((p, i) => (
        <li key={i} className="py-1.5"><span className="text-xs font-semibold uppercase text-slate-400">{PEOPLE_ROLES[p.role]}{p.timeSlot ? ` · ${p.timeSlot}` : ""}</span> <span className="font-medium text-slate-800">{p.name}</span>
          <span className="text-xs text-slate-500">{[p.designation, p.affiliation, p.email, p.phone].filter(Boolean).length ? ` · ${[p.designation, p.affiliation, p.email, p.phone].filter(Boolean).join(" · ")}` : ""}</span>
          {(p.topic || p.abstractRef) && <span className="block text-xs text-slate-600">{p.abstractRef ? `${p.abstractRef}: ` : ""}{p.topic}</span>}</li>
      ))}{!people.length && <li className="py-1.5 text-slate-400">No people listed.</li>}</ul>
    </details>
  );
}
