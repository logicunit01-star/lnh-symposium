import { getCommittee } from "@/lib/queries";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { Avatar } from "@/components/ui/Avatar";

export const metadata = { title: "Organizing Committee" };

export default async function Committee() {
  const members = await getCommittee();
  const groups = [...new Set(members.map((m) => m.group))];
  return (
    <>
      <PageHero eyebrow="The team" title={<>Organizing <span className="text-grad">committee</span></>} sub="The faculty and staff of Liaquat National Hospital who make the symposium happen." />
      <div className="container-x space-y-20">
        {groups.map((g) => (
          <section key={g}>
            <Reveal><h2 className="h-display mb-8 border-b border-white/10 pb-4 text-3xl text-white">{g}</h2></Reveal>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {members.filter((m) => m.group === g).map((m, i) => (
                <Reveal key={m.id} delay={(i % 4) * 80} className="card card-hover flex items-center gap-4 p-5">
                  <Avatar name={m.name} src={m.photoUrl} className="h-16 w-16 shrink-0 rounded-2xl text-[9px]" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lnh-rose">{m.role}</p>
                    <p className="truncate font-display font-semibold text-white">{m.name}</p>
                    <p className="text-xs text-slate-400">{m.designation}{m.department ? ` · ${m.department}` : ""}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
