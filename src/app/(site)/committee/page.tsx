import { getCommittee } from "@/lib/queries";
import { PageHero } from "@/components/ui/PageHero";
import { CommitteeDirectory } from "./CommitteeDirectory";

export const metadata = { title: "Organizing Committee" };

/** The 30 organising committees (official list, 29 Oct 2026; edited in Admin → Content). */
export default async function Committee() {
  const members = await getCommittee();
  const groups = [...new Set(members.map((m) => m.group))].map((group) => ({
    group, people: members.filter((m) => m.group === group).map(({ id, name, role, designation, department, photoUrl }) => ({ id, name, role, designation, department, photoUrl })),
  }));
  return (
    <>
      <PageHero eyebrow="The team" title={<>Organizing <span className="text-grad">committees</span></>} sub={`${groups.length} committees of Liaquat National Hospital faculty and staff who make the 9th LNH Symposium happen.`} />
      <div className="container-x pb-20"><CommitteeDirectory groups={groups} /></div>
    </>
  );
}
