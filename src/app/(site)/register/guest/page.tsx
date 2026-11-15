import { PageHero } from "@/components/ui/PageHero";
import { getEvent } from "@/lib/event";
import { guestCodeOk } from "@/lib/guest-access";
import { listDepartments } from "@/lib/departments";
import { GuestForm } from "../GuestForm";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false }, title: "Guests registration" };

export default async function GuestRegistration({ searchParams }: { searchParams: { code?: string } }) {
  // 14.11.2026: not public; opens only from the invitation link (access code in Event Settings)
  const ev = await getEvent();
  if (!guestCodeOk(ev, searchParams.code)) return <InviteOnly />;
  return (
    <>
      <PageHero eyebrow="Guests registration form" title={<>Invited <span className="text-grad">guests</span></>}
        sub="For invited speakers, chairpersons, moderators and panelists of the scientific sessions. Approved by the Head of your session's department." />
      <div className="container-x max-w-4xl"><GuestForm code={searchParams.code} kind="GUEST" departments={await listDepartments()} /></div>
    </>
  );
}

function InviteOnly() {
  return (
    <>
      <PageHero eyebrow="By invitation" title={<>Invitation <span className="text-grad">only</span></>} sub="This registration form is for invited guests and volunteers. Please use the link you received from the symposium secretariat." />
      <div className="container-x max-w-2xl"><a href="/register" className="btn-primary">Register for the Symposium</a></div>
    </>
  );
}
