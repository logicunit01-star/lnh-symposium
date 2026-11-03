import { PageHero } from "@/components/ui/PageHero";
import { DEPARTMENTS } from "@/lib/scientific";
import { GuestForm } from "../GuestForm";

export const metadata = { title: "Guests registration" };

export default function GuestRegistration() {
  return (
    <>
      <PageHero eyebrow="Guests registration form" title={<>Invited <span className="text-grad">guests</span></>}
        sub="For invited speakers, chairpersons, moderators and panelists of the scientific sessions. Approved by the Head of your session's department." />
      <div className="container-x max-w-4xl"><GuestForm kind="GUEST" departments={[...DEPARTMENTS].sort()} /></div>
    </>
  );
}
