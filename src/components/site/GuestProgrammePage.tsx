import Link from "next/link";
import { CalendarDays, Presentation } from "lucide-react";
import { getEvent } from "@/lib/event";
import { currentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getProgrammePage, type PageKey } from "@/lib/programme-pages";
import { PageHero } from "@/components/ui/PageHero";
import { Alert } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";

/** Pre-Symposium Webinar / Panel Discussion and Meet the Experts (Dashboard Instructions, revised 06-11-2026):
 *  programme format plus each guest's photograph, name, affiliation and qualification. Meet the Experts guests
 *  appear after the agenda is finalised (programme released); staff can preview with ?preview=1. */
export async function GuestProgrammePage({ k, preview }: { k: PageKey; preview?: boolean }) {
  const [ev, { page, guests }, staff] = await Promise.all([getEvent(), getProgrammePage(k), currentUser()]);
  const pv = !!preview && can(staff?.role, "programme");
  const visible = pv || (page.published && (k !== "EXPERTS" || !!ev.programmeReleasedAt));
  const [first, ...rest] = page.title.split(" ");
  return (
    <>
      <PageHero eyebrow="Programme" title={<>{first} <span className="text-grad">{rest.join(" ")}</span></>}
        sub={k === "EXPERTS" ? "Meet the guest experts of the 9th LNH Symposium." : "The pre-symposium webinar and panel discussion ahead of the 9th LNH Symposium."} />
      <div className="container-x max-w-5xl space-y-8">
        {pv && !(page.published && (k !== "EXPERTS" || ev.programmeReleasedAt)) && <Alert kind="info">Preview for the Scientific Committee; not yet public.</Alert>}
        {!visible ? (
          <div className="hud p-8"><p className="text-slate-200">{k === "EXPERTS" ? "Our guest experts will be introduced here once the Scientific Committee finalises the agenda." : "Details of the pre-symposium webinar / panel discussion will be announced here soon."}</p>
            <p className="mt-3 text-sm text-slate-400"><Link href="/agenda" className="text-lnh-sky underline">See the agenda</Link></p></div>
        ) : (
          <>
            {(page.dateText || page.format || page.description) && (
              <div className="hud grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
                {page.dateText && <p className="flex items-start gap-2 text-slate-100"><CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-lnh-sky" /><span><span className="block text-xs uppercase tracking-wider text-slate-400">Date and time</span>{page.dateText}</span></p>}
                {page.format && <p className="flex items-start gap-2 text-slate-100"><Presentation className="mt-0.5 h-5 w-5 shrink-0 text-lnh-sky" /><span><span className="block text-xs uppercase tracking-wider text-slate-400">Programme format</span><span className="whitespace-pre-line">{page.format}</span></span></p>}
                {page.description && <p className="whitespace-pre-line text-slate-300 sm:col-span-2">{page.description}</p>}
              </div>
            )}
            {guests.length > 0 ? (
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {guests.map((g) => (
                  <li key={g.id} className="hud flex flex-col items-center p-6 text-center">
                    <Avatar name={g.name} src={g.photo} className="h-32 w-32 rounded-full text-[16px]" />
                    <p className="mt-4 font-display text-lg font-bold text-white">{g.name}</p>
                    {g.qualification && <p className="text-sm text-lnh-sky">{g.qualification}</p>}
                    {g.affiliation && <p className="mt-1 text-sm text-slate-300">{g.affiliation}</p>}
                    {g.topic && <p className="mt-3 text-sm text-slate-400">{g.topic}</p>}
                  </li>
                ))}
              </ul>
            ) : <p className="text-slate-400">Guests will be announced soon.</p>}
          </>
        )}
      </div>
    </>
  );
}
